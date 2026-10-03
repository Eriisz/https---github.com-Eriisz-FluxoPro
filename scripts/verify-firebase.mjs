import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadTs } from './load-ts.mjs';

const projectId = 'demo-fluxopro-tests';

// Refuse to initialize any SDK unless emulators:exec supplies local endpoints.
function localEndpoint(variable) {
  const value = process.env[variable];
  assert.ok(value, `${variable} ausente. Execute npm run verify:firebase.`);
  const url = new URL(`http://${value}`);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port &&
    url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash,
    `${variable} precisa apontar para um emulador local.`,
  );
  return url;
}

assert.equal(process.env.GCLOUD_PROJECT, projectId, 'Use exclusivamente o projeto demo-fluxopro-tests.');
const authEndpoint = localEndpoint('FIREBASE_AUTH_EMULATOR_HOST');
const firestoreEndpoint = localEndpoint('FIRESTORE_EMULATOR_HOST');

// The TS loader uses CommonJS; use the same SDK instance for helpers and clients.
const require = createRequire(import.meta.url);
const { initializeApp, deleteApp } = require('firebase/app');
const {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, deleteUser,
} = require('firebase/auth');
const firestore = require('firebase/firestore');
firestore.setLogLevel('silent'); // Expected permission denials are asserted below.
const cache = new Map();
const load = name => loadTs(new URL(`../src/lib/${name}.ts`, import.meta.url), {}, cache);
const { buildTransactions, transactionFormSchema, transactionChanges } = load('transactions');
const { prepareCardTransaction, invoiceKey, accountBalance, buildCardInvoices } = load('cards');
const { settleInvoice, reopenInvoice } = load('invoice-writes');
const { saveBudget } = load('budget-writes');
const { replaceTransactions, deleteTransactions, updateTransactions } = load('transaction-writes');
const { contributeToGoal } = load('goal-writes');
const { assertReferenceUnused, deleteUnusedReference } = load('reference-writes');
const { BACKUP_COLLECTIONS, parseBackup, backupRestorePlan } = load('backup');
const runId = randomUUID();
const password = randomBytes(24).toString('base64url');
const clients = [];
const accounts = [];
let passed = 0;

function client(name) {
  const app = initializeApp({ projectId, apiKey: 'demo-local-only' }, `${name}-${runId}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, authEndpoint.href, { disableWarnings: true });
  const db = firestore.getFirestore(app);
  firestore.connectFirestoreEmulator(db, firestoreEndpoint.hostname, Number(firestoreEndpoint.port));
  const result = { app, auth, db };
  clients.push(result);
  return result;
}

async function createAccount(client, name) {
  const email = `${name}-${runId}@example.test`;
  const { user } = await createUserWithEmailAndPassword(client.auth, email, password);
  accounts.push({ client, user });
  return { user, email };
}

function pass(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

const denied = error => error.code === 'permission-denied';
const canonical = data => Object.fromEntries(
  BACKUP_COLLECTIONS.map(name => [name, [...data[name]].sort((a, b) => a.id.localeCompare(b.id))]),
);

async function cleanup() {
  const errors = [];
  // Only documents belonging to identities created by this invocation are removed.
  for (const { client, user } of accounts) {
    try {
      for (const name of BACKUP_COLLECTIONS) {
        const collection = firestore.collection(client.db, `users/${user.uid}/${name}`);
        const documents = await firestore.getDocs(collection);
        const batch = firestore.writeBatch(client.db);
        documents.forEach(item => batch.delete(item.ref));
        await batch.commit();
        assert.equal((await firestore.getDocs(collection)).size, 0);
      }
      const profile = firestore.doc(client.db, `users/${user.uid}`);
      if ((await firestore.getDoc(profile)).exists()) await firestore.deleteDoc(profile);
      await deleteUser(user);
    } catch (error) {
      errors.push(error);
    }
  }
  for (const { app, db } of clients) {
    try {
      await firestore.terminate(db);
      await deleteApp(app);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Falha na limpeza dos dados sintéticos.');
}

let testError;
try {
  const owner = client('owner');
  const other = client('other');
  const second = client('second-owner-session');
  const { user, email } = await createAccount(owner, 'owner');
  const { user: intruder } = await createAccount(other, 'other');
  await signInWithEmailAndPassword(second.auth, email, password);
  const uid = user.uid;
  const collection = name => firestore.collection(owner.db, `users/${uid}/${name}`);
  const ref = (name, id) => firestore.doc(collection(name), id);
  const profileRef = firestore.doc(owner.db, `users/${uid}`);

  await firestore.setDoc(profileRef, {
    id: uid, userId: uid, name: 'Conta sintética', phoneNumber: '00000000000',
    createdAt: new Date().toISOString(),
  });
  assert.equal((await firestore.getDoc(profileRef)).data().userId, uid);
  pass('Cadastro autenticado e perfil com userId');

  await assert.rejects(firestore.getDoc(firestore.doc(other.db, `users/${uid}`)), denied);
  await assert.rejects(firestore.setDoc(ref('accounts', 'invalid-owner'), { userId: intruder.uid }), denied);
  pass('Regras rejeitam leitura de outro usuário e proprietário incompatível');

  await firestore.setDoc(ref('accounts', 'bank'), {
    id: 'bank', userId: uid, name: 'Banco Teste', type: 'ContaCorrente', initialBalance: 0,
  });
  for (const [id, type] of [['salary', 'income'], ['purchase', 'expense']]) {
    await firestore.setDoc(ref('categories', id), { id, userId: uid, name: id, type, color: '#112233' });
  }
  const input = transactionFormSchema.parse({
    description: 'Compra sintética', value: '100,00', date: new Date('2026-10-03T12:00:00Z'),
    accountId: 'bank', categoryId: 'purchase', type: 'expense', status: 'PAID',
    frequency: 'installment', installments: '3', updateScope: 'all',
  });
  let sequence = 0;
  const nextId = () => `transaction-${++sequence}`;
  const installments = buildTransactions(input, uid, nextId);
  await replaceTransactions(owner.db, uid, installments);
  const groupRows = async () => (await firestore.getDocs(collection('transactions'))).docs
    .map(item => item.data())
    .filter(item => item.groupId === installments[0].groupId)
    .sort((a, b) => a.installments.current - b.installments.current);
  let stored = await groupRows();
  assert.deepEqual(stored.map(item => item.value), [-33.34, -33.33, -33.33]);
  assert.deepEqual(stored.map(item => item.status), ['PAID', 'PENDING', 'PENDING']);
  pass('Parcelas persistidas com centavos exatos e situações futuras pendentes');

  const incomeInput = transactionFormSchema.parse({
    ...input, value: '1.234,56', description: 'Receita teste', type: 'income',
    categoryId: 'salary', frequency: 'single', status: 'RECEIVED',
  });
  let income = buildTransactions(incomeInput, uid, nextId)[0];
  await replaceTransactions(owner.db, uid, [income]);
  assert.equal((await firestore.getDoc(ref('transactions', income.id))).data().value, 1234.56);
  await firestore.updateDoc(ref('transactions', income.id), transactionChanges(
    { ...incomeInput, value: '1.200,55', description: 'Receita editada' }, income, income,
  ));
  income = (await firestore.getDoc(ref('transactions', income.id))).data();
  assert.equal(income.value, 1200.55);
  assert.equal(income.description, 'Receita editada');
  assert.equal(income.status, 'RECEIVED');
  pass('Criação e edição de receita em formato brasileiro');

  const edit = firestore.writeBatch(owner.db);
  for (const item of stored) {
    edit.update(ref('transactions', item.id), transactionChanges(
      { ...input, value: '33,34', description: 'Descrição editada' }, stored[0], item,
    ));
  }
  await edit.commit();
  stored = await groupRows();
  assert.deepEqual(stored.map(item => item.id), installments.map(item => item.id));
  assert.deepEqual(stored.map(item => item.value), [-33.34, -33.33, -33.33]);
  assert.deepEqual(stored.map(item => item.status), ['PAID', 'PENDING', 'PENDING']);
  assert.ok(stored.every(item => item.description === 'Descrição editada'));
  pass('Edição do grupo preserva IDs, valores e situações');

  const beforeFailure = (await firestore.getDocs(collection('transactions'))).docs.map(item => item.data());
  await assert.rejects(replaceTransactions(owner.db, uid, [
    { ...installments[0], id: 'invalid-replacement', userId: intruder.uid },
  ], installments[0]), denied);
  const afterFailure = (await firestore.getDocs(collection('transactions'))).docs.map(item => item.data());
  const byId = items => [...items].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(byId(afterFailure), byId(beforeFailure));
  pass('Falha real das regras mantém intactos os registros do lote');

  await assert.rejects(deleteUnusedReference(owner.db, uid, 'accounts', 'bank'), /transações vinculadas/);
  await assert.rejects(assertReferenceUnused(owner.db, uid, 'categories', 'purchase'), /transações vinculadas/);
  await firestore.setDoc(ref('accounts', 'unused'), {
    id: 'unused', userId: uid, name: 'Conta sem uso', type: 'Outro', initialBalance: 0,
  });
  await deleteUnusedReference(owner.db, uid, 'accounts', 'unused');
  assert.equal((await firestore.getDoc(ref('accounts', 'unused'))).exists(), false);
  pass('Referências utilizadas protegidas; referência sem uso excluída');

  await firestore.setDoc(ref('goals', 'goal'), {
    id: 'goal', userId: uid, name: 'Meta de teste', targetAmount: 100,
    currentAmount: 10, targetDate: null,
  });
  await Promise.all([
    contributeToGoal(owner.db, uid, 'goal', 20),
    contributeToGoal(second.db, uid, 'goal', 30),
  ]);
  assert.equal((await firestore.getDoc(ref('goals', 'goal'))).data().currentAmount, 60);
  await contributeToGoal(owner.db, uid, 'goal', 30);
  const race = await Promise.allSettled([
    contributeToGoal(owner.db, uid, 'goal', 10),
    contributeToGoal(second.db, uid, 'goal', 10),
  ]);
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(race.find(result => result.status === 'rejected').reason.message, /excede/);
  assert.equal((await firestore.getDoc(ref('goals', 'goal'))).data().currentAmount, 100);
  await assert.rejects(contributeToGoal(owner.db, uid, 'goal', 1), /excede/);
  pass('Aportes concorrentes não perdem valores nem ultrapassam o alvo');

  await firestore.setDoc(ref('budgets', 'budget'), { id: 'budget', userId: uid, limit: 500, month: '2026-10' });
  async function exportData() {
    const data = {};
    for (const name of BACKUP_COLLECTIONS) {
      const snapshot = await firestore.getDocs(collection(name));
      data[name] = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    }
    return data;
  }
  const exported = parseBackup(JSON.parse(JSON.stringify(await exportData())));
  await firestore.setDoc(ref('accounts', 'extra'), {
    id: 'extra', userId: uid, name: 'Registro extra', type: 'Outro', initialBalance: 3,
  });
  await firestore.updateDoc(ref('goals', 'goal'), { currentAmount: 0 });
  await firestore.deleteDoc(ref('transactions', income.id));
  const restore = firestore.writeBatch(owner.db);
  for (const item of backupRestorePlan(await exportData(), exported)) {
    if (item.data) restore.set(ref(item.collection, item.id), { ...item.data, userId: uid });
    else restore.delete(ref(item.collection, item.id));
  }
  await restore.commit();
  assert.deepEqual(canonical(await exportData()), canonical(exported));
  const beforeInvalid = await exportData();
  assert.throws(() => parseBackup({ ...exported, accounts: [] }));
  assert.deepEqual(canonical(await exportData()), canonical(beforeInvalid));
  pass('Restauração recupera as cinco coleções e backup inválido não modifica dados');

  await assert.rejects(firestore.getDocs(firestore.collection(other.db, `users/${uid}/transactions`)), denied);
  await assert.rejects(firestore.deleteDoc(firestore.doc(other.db, `users/${uid}/goals/goal`)), denied);
  pass('Outro usuário não lista transações nem exclui metas');

  await deleteTransactions(owner.db, uid, installments[0], true);
  assert.equal((await firestore.getDocs(collection('transactions'))).size, 1);
  await deleteTransactions(owner.db, uid, income, false);
  assert.equal((await firestore.getDocs(collection('transactions'))).size, 0);
  pass('Exclusão do grupo e da receita confirmada no banco');

  const card = { id: 'card', userId: uid, name: 'Cartão Teste', type: 'CartaoCredito', initialBalance: 0, limit: 2000, closingDay: 20, dueDay: 5 };
  await firestore.setDoc(ref('accounts', 'card'), card);
  const bank = (await firestore.getDoc(ref('accounts', 'bank'))).data();
  const cardInput = transactionFormSchema.parse({ ...input, accountId: 'card', date: new Date('2026-09-10T12:00:00Z'), frequency: 'single', value: '100,00' });
  const purchase = prepareCardTransaction(buildTransactions(cardInput, uid, nextId)[0], card);
  await replaceTransactions(owner.db, uid, [purchase]);
  const invoiceId = invoiceKey(card.id, purchase);
  const paymentDate = new Date('2026-10-03T12:00:00Z');
  await assert.rejects(settleInvoice(owner.db, uid, card.id, invoiceId, bank.id, paymentDate, 200), /valor da fatura mudou/);
  assert.equal((await firestore.getDoc(ref('transactions', purchase.id))).data().status, 'PENDING');
  const payments = await Promise.allSettled([
    settleInvoice(owner.db, uid, card.id, invoiceId, bank.id, paymentDate),
    settleInvoice(second.db, uid, card.id, invoiceId, bank.id, paymentDate),
  ]);
  assert.equal(payments.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(payments.find(result => result.status === 'rejected').reason.message, /já foi paga/);
  let settled = (await firestore.getDoc(ref('transactions', purchase.id))).data();
  assert.equal(settled.status, 'PAID');
  assert.equal(settled.paidFromAccountId, bank.id);
  assert.equal(accountBalance(bank, [settled], paymentDate), -100);
  assert.equal((await firestore.getDocs(collection('transactions'))).size, 1);
  pass('Pagamento concorrente de fatura debita uma vez e não cria despesa duplicada');

  await assert.rejects(deleteTransactions(owner.db, uid, settled, false), /Desfaça o pagamento/);
  await assert.rejects(updateTransactions(owner.db, uid, settled, { ...cardInput, description: 'Mudança indevida' }, [card, bank]), /Desfaça o pagamento/);
  await assert.rejects(deleteUnusedReference(owner.db, uid, 'accounts', bank.id), /vinculado/);
  await assert.rejects(settleInvoice(other.db, uid, card.id, invoiceId, bank.id, paymentDate), denied);
  const cardBackup = parseBackup(await exportData());
  assert.equal(cardBackup.transactions[0].paidFromAccountId, bank.id);
  await assert.rejects(settleInvoice(owner.db, uid, card.id, invoiceId, card.id, paymentDate), /conta de origem/);
  pass('Pagamento vinculado protegido contra edição, exclusão, conta inválida e outro usuário');

  await reopenInvoice(owner.db, uid, card.id, invoiceId);
  settled = (await firestore.getDoc(ref('transactions', purchase.id))).data();
  assert.equal(settled.status, 'PENDING');
  assert.equal(settled.paidFromAccountId, undefined);
  assert.equal(accountBalance(bank, [settled], paymentDate), 0);
  await assert.rejects(reopenInvoice(owner.db, uid, card.id, invoiceId), /Não há pagamento/);
  await assert.rejects(settleInvoice(owner.db, uid, card.id, invoiceId, bank.id, new Date('2026-09-20T12:00:00Z')), /Aguarde o fechamento/);
  await settleInvoice(owner.db, uid, card.id, invoiceId, bank.id, paymentDate);
  assert.equal(buildCardInvoices([card], [(await firestore.getDoc(ref('transactions', purchase.id))).data()], paymentDate)[0].remaining, 0);
  pass('Reversão retorna saldo, fechamento é respeitado e novo pagamento funciona');

  const categoryBudget = { month: '2026-10', limit: 250, categoryId: 'purchase' };
  const budgetRace = await Promise.allSettled([
    saveBudget(owner.db, uid, categoryBudget), saveBudget(second.db, uid, categoryBudget),
  ]);
  assert.equal(budgetRace.filter(result => result.status === 'fulfilled').length, 1);
  const categoryBudgetRows = (await firestore.getDocs(collection('budgets'))).docs.filter(row => row.data().categoryId === 'purchase');
  assert.equal(categoryBudgetRows.length, 1);
  const categoryBudgetId = categoryBudgetRows[0].id;
  await saveBudget(owner.db, uid, { ...categoryBudget, limit: 300 }, categoryBudgetId);
  assert.equal((await firestore.getDoc(ref('budgets', categoryBudgetId))).data().limit, 300);
  await assert.rejects(saveBudget(owner.db, uid, { ...categoryBudget, categoryId: 'salary' }), /categoria de despesa/);
  await firestore.setDoc(ref('categories', 'budget-only'), { id: 'budget-only', userId: uid, name: 'Só orçamento', type: 'expense', color: '#112233' });
  await saveBudget(owner.db, uid, { month: '2026-10', limit: 10, categoryId: 'budget-only' });
  await assert.rejects(deleteUnusedReference(owner.db, uid, 'categories', 'budget-only'), /vinculado/);
  const longCategoryId = 'x'.repeat(128);
  await firestore.setDoc(ref('categories', longCategoryId), { id: longCategoryId, userId: uid, name: 'Categoria importada', type: 'expense', color: '#112233' });
  await saveBudget(owner.db, uid, { month: '2026-10', limit: 10, categoryId: longCategoryId });
  assert.ok((await firestore.getDocs(collection('budgets'))).docs.every(row => row.id.length <= 128));
  pass('Orçamento por categoria grava, evita duplicação concorrente e protege referências');

  const extendedBackup = parseBackup(await exportData());
  await firestore.updateDoc(ref('transactions', purchase.id), { paidFromAccountId: firestore.deleteField(), paidAt: firestore.deleteField(), status: 'PENDING' });
  await firestore.deleteDoc(ref('budgets', categoryBudgetId));
  const extendedRestore = firestore.writeBatch(owner.db);
  for (const item of backupRestorePlan(await exportData(), extendedBackup)) {
    if (item.data) extendedRestore.set(ref(item.collection, item.id), { ...item.data, userId: uid });
    else extendedRestore.delete(ref(item.collection, item.id));
  }
  await extendedRestore.commit();
  assert.deepEqual(canonical(await exportData()), canonical(extendedBackup));
  pass('Backup restaura ciclos, pagamentos de fatura e limites por categoria');

} catch (error) {
  testError = error;
  throw error;
} finally {
  try {
    await cleanup();
  } catch (error) {
    if (!testError) throw error;
    console.error('A limpeza também falhou:', error.message);
  }
}
console.log(`${passed} cenários Firebase aprovados; dados sintéticos removidos.`);
