# Recursos financeiros

Todas as funcionalidades estão disponíveis sem seleção de plano: orçamentos por
categoria, lembretes configuráveis, previsão de 90 dias, importação CSV e relatórios/PDF.
As antigas seleções salvas no navegador não afetam o acesso. O endereço `/plans`
redireciona ao painel. Dados financeiros e preferências de lembretes são preservados.

## Alteração rápida de status

No histórico e no painel, clique no status e escolha **Marcar como pago**,
**Marcar como recebido** ou **Marcar como pendente**. Apenas o lançamento selecionado
é alterado, mesmo em grupos recorrentes ou parcelados. Pendências vencidas aparecem
como **Atrasado**; o formulário de edição também exibe esse estado.

Compras de cartão oferecem **Gerenciar pagamento da fatura**, para registrar ou
desfazer o pagamento com a conta de origem e evitar diferenças no saldo.

## Faturas e saldos

- Em **Contas**, cadastre um cartão com limite, dia de fechamento e dia de vencimento (1 a 31).
- Compras no dia do fechamento entram nessa fatura. Quando um dia não existe no mês, usa-se seu último dia. O vencimento ocorre após o fechamento; se os dias ajustados coincidirem, vai para o mês seguinte.
- Compras novas guardam seu ciclo. Alterar a configuração do cartão não muda esses ciclos já registrados. Faturas com datas diferentes permanecem separadas.
- Parcelas de uma compra seguem faturas consecutivas, inclusive quando a compra ocorre no fim do mês.
- A tela **Faturas** mostra compras, parcelas futuras, limite comprometido e valor disponível. O limite comprometido soma todos os lançamentos de despesa ainda não pagos.
- **Registrar pagamento** quita integralmente as compras pendentes daquela fatura na conta selecionada, a partir do dia seguinte ao fechamento. Registra a operação no FluxoPro; não transfere dinheiro no banco.
- O pagamento atualiza as compras existentes, registra conta de origem/data e afeta o saldo dessa conta uma vez. Não gera uma segunda despesa. O valor é conferido novamente antes de gravar.
- **Desfazer pagamento** remove os vínculos de pagamento dessa fatura e reabre as compras. Para editar/excluir uma compra vinculada, primeiro desfaça o pagamento.
- Pagamentos, reversões e alterações de compras usam transações do Firestore para evitar sobrescrever pagamentos concorrentes. Uma operação comporta até 450 compras; não há pagamento parcial, rotativo, juros ou estornos parciais nesta versão.
- Cartões antigos sem ciclo exigem configurar fechamento/vencimento. Lançamentos antigos marcados como pagos sem conta de origem não são debitados automaticamente de outra conta. Seu saldo deve ser conciliado com o banco; nenhum pagamento histórico é inventado.

## Orçamentos e lembretes

O orçamento total do mês permanece separado dos limites por categoria: não são somados no indicador principal. Os gastos consideram despesas pagas, pendentes e atrasadas do mês do lançamento. A tabela mostra gasto, percentual, restante ou excesso.

Existe um limite por mês/escopo. Mês e categoria de um orçamento existente são fixos; o valor pode ser alterado. A criação usa um identificador determinístico e verifica concorrência. Categorias vinculadas a orçamentos e contas usadas em pagamentos ficam protegidas contra exclusão pela interface.

Os lembretes aparecem no painel e em **Lembretes**. Incluem contas vencidas, valores a receber, faturas agrupadas e limites atingidos. Configure antecedência de 0 a 30 dias, percentual do orçamento e inclusão de receitas. É possível ocultar um aviso até o fim do dia. Preferências são locais e separadas por usuário.

A atualização ocorre enquanto o site está aberto; não há envio por e-mail, WhatsApp nem notificações em segundo plano.

## Previsão diária e importação bancária

A previsão usa centavos inteiros e dias de calendário. Considera saldos iniciais de contas, pagamentos já registrados, recebimentos e pendências; compras do cartão entram na data de vencimento da fatura. Atrasos são projetados para hoje. O menor saldo e sua data ajudam a identificar falta de caixa entre dias. A previsão agrega cada dia, sem garantir disponibilidade dentro de um mesmo dia.

Em **Importação bancária**, o CSV permite revisar e selecionar lançamentos e possíveis duplicatas. Importações para cartão são compras pendentes, com ciclo calculado; receitas em cartão são rejeitadas. A conexão bancária automática está explicitamente indisponível: falta selecionar/contratar e configurar um provedor.

## Compatibilidade e testes

Os novos campos são opcionais no modelo e no backup. Backups antigos continuam aceitos; novos backups incluem ciclos, origem/data de pagamento e categoria do orçamento. A validação rejeita referências incompletas antes da restauração.

```bash
npm run verify:product
npm run verify:expenses
npm run verify:integrity
npm run verify:goals
node scripts/verify-search.mjs
npm run verify:firebase
npm run typecheck
npm run build
```

Execute build e typecheck sequencialmente. O comando Firebase requer o ambiente descrito no README. Os testes de produto cobrem datas, parcelas, caixa, limites, lembretes e backup; os testes Firebase cobrem pagamentos/reversões, concorrência, permissões e restauração com SDK real nos emuladores.
