import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
const load = (name, overrides) => loadTs(new URL(`../src/lib/${name}.ts`, import.meta.url), overrides);
const { parseMoney, splitInstallments } = load('money');
for (const [input, expected] of [['1.234,56',1234.56],['R$ 1.234,56',1234.56],['1234.56',1234.56],['1.234',1234],['-12,50',-12.5],['0',0],[' 10,05 ',10.05]]) assert.equal(parseMoney(input), expected, input);
for (const input of ['', 'abc12', '12abc', '1 2', '1,2,3', '1.23.4', 'Infinity', 'NaN', '1e3', '12.3456', '99999999999999999']) assert.equal(parseMoney(input), null, input);
assert.deepEqual(splitInstallments(100, 3), [33.34,33.33,33.33]);
for (let count=1; count<=120; count++) assert.equal(splitInstallments(1234.56,count).reduce((sum,value)=>sum+Math.round(value*100),0),123456);
for (const args of [[1,0],[1,1.5],[1,121],[0.01,2],[NaN,2]]) assert.throws(()=>splitInstallments(...args));

const { transactionFormSchema, buildTransactions, transactionChanges } = load('transactions');
const input = {description:'Compra',value:'100',date:new Date('2027-01-31T12:00:00Z'),accountId:'account',categoryId:'expense',type:'expense',status:'PAID',frequency:'installment',installments:'3',updateScope:'all'};
let id=0;
const rows=buildTransactions(transactionFormSchema.parse(input),'user',()=>`id-${++id}`);
assert.deepEqual(rows.map(row=>row.value),[-33.34,-33.33,-33.33]);
assert.deepEqual(rows.map(row=>row.date.slice(0,10)),['2027-01-31','2027-02-28','2027-03-31']);
assert.deepEqual(rows.map(row=>row.status),['PAID','PENDING','PENDING']);
assert.equal(new Set(rows.map(row=>row.groupId)).size,1);
assert.equal(new Set(rows.map(row=>row.id)).size,3);
for (const installments of ['0','2.5','121','abc','']) assert.equal(transactionFormSchema.safeParse({...input,installments}).success,false);
for (const value of ['0','-1','1abc']) assert.equal(transactionFormSchema.safeParse({...input,value}).success,false);
assert.throws(()=>buildTransactions({...input,value:'0.01'},'user',()=>`${++id}`));
const recurring=buildTransactions({...input,frequency:'recurring',type:'income',categoryId:'income'},'user',()=>`${++id}`);
assert.equal(recurring.length,24);
assert.equal(recurring[0].status,'RECEIVED');
assert.equal(recurring[1].status,'PENDING');
assert.equal(recurring[1].value,100);
const edit={...input,value:'33,34',description:'Descrição corrigida'};
assert.deepEqual(transactionChanges(edit,rows[0],rows[1]),{description:'Descrição corrigida'},'editing a description preserves different cents and open status');
assert.deepEqual(transactionChanges({...edit,value:'40'},rows[0],rows[1]),{description:'Descrição corrigida',value:-40});
assert.equal(transactionChanges({...edit,type:'income',categoryId:'income'},rows[0],rows[1]).value,33.33);
assert.equal(transactionChanges({...edit,type:'income'},rows[0],rows[1]).status,'PENDING');

const { parseCsvAmount, parseCsvDate }=load('csv-import');
for (const [value,expected] of [['1.234,56',1234.56],['(R$ 10,00)',-10],['1,234.56',1234.56],['1,234',1234],['abc12',null],['--10',null],['',null]]) assert.equal(parseCsvAmount(value),expected);
for (const date of ['2026-02-30','2026-13-01','2026-10-03garbage','31/02/2026','abc','2026-10-03T99:00:00Z']) assert.equal(parseCsvDate(date),null,date);
for (const date of ['2028-02-29','29/02/2028','2026-10-03T12:00:00Z']) assert.ok(parseCsvDate(date),date);
const {calculate}=load('calculator');
assert.equal(calculate('10+2*3'),16);
assert.equal(calculate('20/2-3'),7);
assert.equal(calculate('-2*-3'),6);
assert.equal(calculate('0.1+0.2'),0.3);
for (const value of ['1/0','0/0','alert(1)','1+','1..2','1**2','']) assert.throws(()=>calculate(value));

const {parseBackup,backupRestorePlan,BACKUP_COLLECTIONS}=load('backup');
const empty=Object.fromEntries(BACKUP_COLLECTIONS.map(name=>[name,[]]));
const fixture={...empty,accounts:[{id:'account',userId:'user',name:'Banco',type:'ContaCorrente',initialBalance:0}],categories:[{id:'expense',userId:'user',name:'Compras',type:'expense',color:'#ffffff'}],transactions:rows};
assert.throws(()=>parseBackup({...fixture,accounts:[{...fixture.accounts[0],unknownMetadata:'must not be silently discarded'}]}));
const backup=parseBackup(fixture);
assert.equal(backup.transactions.length,3);
assert.deepEqual(parseBackup(empty),empty);
for (const invalid of [{}, {...fixture,accounts:[]}, {...fixture,categories:[]}, {...fixture,extra:[]}, {...fixture,accounts:[fixture.accounts[0],fixture.accounts[0]]}, {...fixture,transactions:[{...rows[0],value:100}]}, {...fixture,accounts:[{...fixture.accounts[0],id:'bad/path'}]}, {...fixture,goals:[{id:'g',userId:'user',name:'Moto',targetAmount:-1,currentAmount:0,targetDate:null}]}]) assert.throws(()=>parseBackup(invalid));
const current={...empty,accounts:[{id:'old'},{id:'account'}]};
const plan=backupRestorePlan(current,backup);
assert.deepEqual(plan.filter(item=>item.data===null).map(item=>item.id),['old']);
assert.equal(plan.filter(item=>item.id==='account').length,1,'preserved ids are overwritten without redundant deletes');
assert.deepEqual(current.accounts,[{id:'old'},{id:'account'}]);
assert.throws(()=>backupRestorePlan({...empty,accounts:Array.from({length:501},(_,i)=>({id:`old-${i}`}))},parseBackup(empty)));

const {contributionTotal}=load('goals');
assert.equal(contributionTotal(0.1,1,0.2),0.3);
assert.equal(contributionTotal(99.99,100,0.01),100);
for (const args of [[100,100,1],[99,100,2],[0,100,0],[0,100,-1],[NaN,100,1],[0,100,Infinity]]) assert.throws(()=>contributionTotal(...args));
const {confirmWrite}=load('write-feedback');
let complete; const notifications=[];
let confirmed=false;
const pending=confirmWrite(new Promise(resolve=>complete=resolve),v=>notifications.push(v)).then(result=>confirmed=result);
await Promise.resolve(); assert.equal(confirmed,false); complete(); await pending; assert.equal(confirmed,true);
assert.equal(await confirmWrite(Promise.reject(new Error('offline')),v=>notifications.push(v)),false);
assert.equal(notifications.length,1);

// SDK boundary tests: stage operations until commit; inject rejection and verify no premature deletion.
const stored=new Map(rows.map(row=>[row.id,row])); let rejectCommit=true; let commits=0; let deletes=0;
const sdk={
  collection:(_db,path)=>({path}),doc:(parent,id)=>({id,path:`${parent.path}/${id}`}),where:()=>null,query:ref=>ref,
  getDocs:async()=>({size:stored.size,docs:[...stored.keys()].map(id=>({ref:{id}})),forEach:fn=>[...stored.keys()].forEach(id=>fn({ref:{id}}))}),
  deleteDoc:async ref=>{deletes++; stored.delete(ref.id);},
  writeBatch:()=>{const staged=[];return {delete:ref=>staged.push(()=>stored.delete(ref.id)),set:(ref,data)=>staged.push(()=>stored.set(ref.id,data)),commit:async()=>{commits++;if(rejectCommit)throw new Error('offline');staged.forEach(fn=>fn());}};},
};
const {replaceTransactions,deleteTransactions}=load('transaction-writes',{'firebase/firestore':sdk});
const replacements=[{...rows[0],id:'replacement'}];
await assert.rejects(replaceTransactions({},'user',replacements,rows[0]));
assert.deepEqual([...stored.keys()],rows.map(row=>row.id));
assert.equal(commits,1); assert.equal(deletes,0);
rejectCommit=false; await replaceTransactions({},'user',replacements,rows[0]);
assert.deepEqual([...stored.keys()],['replacement']);
rejectCommit=true; await assert.rejects(deleteTransactions({},'user',replacements[0],true));
assert.equal(stored.size,1);
rejectCommit=false; await deleteTransactions({},'user',replacements[0],true); assert.equal(stored.size,0);

// Replay the contribution callback with a newer snapshot, as Firestore does on conflict.
let latest={currentAmount:10,targetAmount:100};let retry=true;let exists=true;let updates=[];
const goalSdk={doc:(_db,path,id)=>({path,id}),runTransaction:async(_db,callback)=>{
  const invoke=()=>callback({get:async()=>({exists:()=>exists,data:()=>latest}),update:(_ref,data)=>updates.push(data)});
  await invoke(); if(retry){updates=[];latest={...latest,currentAmount:30};await invoke();}
}};
const {contributeToGoal}=load('goal-writes',{'firebase/firestore':goalSdk});
await contributeToGoal({},'user','goal',20);assert.deepEqual(updates,[{currentAmount:50}]);
retry=false;updates=[];latest={currentAmount:90,targetAmount:100};await assert.rejects(contributeToGoal({},'user','goal',20));assert.deepEqual(updates,[]);
exists=false;await assert.rejects(contributeToGoal({},'user','goal',1));
console.log('Integrity checks passed: money, installment totals/dates/status, group edits, CSV, calculator, backup preflight, write failures and contribution retries.');

let used=true,referenceDeletes=0;
const refSdk={collection:()=>null,where:()=>null,limit:()=>null,query:()=>null,doc:()=>null,getDocs:async()=>({empty:!used}),deleteDoc:async()=>{referenceDeletes++;}};
const {deleteUnusedReference,assertReferenceUnused}=load('reference-writes',{'firebase/firestore':refSdk});
await assert.rejects(deleteUnusedReference({},'user','accounts','account'),/transações vinculadas/);
assert.equal(referenceDeletes,0);
await assert.rejects(assertReferenceUnused({},'user','categories','expense'),/transações vinculadas/);
used=false;await deleteUnusedReference({},'user','accounts','account');assert.equal(referenceDeletes,1);
console.log('Reference checks passed: linked accounts/categories are protected before destructive writes.');
