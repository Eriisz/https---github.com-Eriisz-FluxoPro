# Planos e novos recursos financeiros

## Simulação de planos

Abra **Planos** (ou `/demo`, sem login) e escolha **Simular Free**, **Simular Premium** ou **Simular Vitalício**. A seleção muda o acesso às funções nesta interface e fica salva por usuário neste navegador. Trocar de plano preserva os dados.

| Recurso | Free | Premium | Vitalício |
| --- | --- | --- | --- |
| Contas, categorias, transações manuais e parcelas | Sim | Sim | Sim |
| Faturas: fechamento, vencimento, pagamento e reversão | Sim | Sim | Sim |
| Metas e orçamento total por mês | Sim | Sim | Sim |
| Backup e restauração | Sim | Sim | Sim |
| Lembretes no site | 3 dias e limite de 80% | Configuráveis | Configuráveis |
| Previsão diária de saldo | 7 dias | 90 dias | 90 dias |
| Orçamento por categoria | Consulta de dados existentes | Criar e editar | Criar e editar |
| Importação e conciliação CSV | Não | Sim | Sim |
| Relatórios e exportação PDF | Não | Sim | Sim |
| Cobrança proposta | Gratuito | Recorrente | Única, sem renovação |

Não há checkout, cobrança, preço definido ou assinatura real. Premium e Vitalício têm os mesmos recursos nesta proposta. A seleção no navegador **não comprova pagamento** e os bloqueios atuais são uma simulação de produto. Para comercializar, implementar checkout, confirmação por webhook, direitos de acesso no servidor/regras, cancelamento e termos do plano vitalício. Nunca usar o valor do localStorage como autorização de cobrança ou de acesso pago real.

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

Os lembretes aparecem no painel e em **Lembretes**. Incluem contas vencidas, valores a receber, faturas agrupadas e limites atingidos. No Premium/Vitalício, configure antecedência de 0 a 30 dias, percentual do orçamento e inclusão de receitas. É possível ocultar um aviso até o fim do dia. Preferências são locais e separadas por usuário.

A atualização ocorre enquanto o site está aberto; não há envio por e-mail, WhatsApp nem notificações em segundo plano. Ao simular Free, os parâmetros básicos são aplicados sem apagar as preferências Premium.

## Previsão diária e importação bancária

A previsão usa centavos inteiros e dias de calendário. Considera saldos iniciais de contas, pagamentos já registrados, recebimentos e pendências; compras do cartão entram na data de vencimento da fatura. Atrasos são projetados para hoje. O menor saldo e sua data ajudam a identificar falta de caixa entre dias. A previsão agrega cada dia, sem garantir disponibilidade dentro de um mesmo dia.

Em **Importação bancária**, o CSV permite revisar e selecionar lançamentos e possíveis duplicatas. Importações para cartão são compras pendentes, com ciclo calculado; receitas em cartão são rejeitadas. A conexão bancária automática está explicitamente indisponível: falta selecionar/contratar e configurar um provedor. Não é uma função vendida nesta simulação.

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

Execute build e typecheck sequencialmente. O comando Firebase requer o ambiente descrito no README. Os testes de produto cobrem datas, parcelas, caixa, limites, lembretes, planos e backup; os testes Firebase cobrem pagamentos/reversões, concorrência, permissões e restauração com SDK real nos emuladores.
