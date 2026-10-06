npx fix-react2shell-next
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Testes de persistência com Firebase local

Pré-requisitos: dependências do projeto instaladas com `npm ci`, Node.js 24,
Java 21 e Firebase CLI disponível no `PATH`. A versão da CLI validada é 15.32.1:

```bash
npm install --global firebase-tools@15.32.1
npm run verify:firebase
```

O comando inicia os emuladores oficiais de Authentication e Firestore, executa
os testes e encerra os emuladores ao terminar. Não exige login no Firebase.
Na primeira execução, a CLI baixa o emulador de Firestore. As portas locais
9199 e 8180 precisam estar disponíveis; a CLI também usa suas portas de
coordenação (4400 e 4500).

Os testes usam o projeto fictício `demo-fluxopro-tests`, as regras do arquivo
`firestore.rules` e os mesmos módulos de gravação utilizados pela aplicação.
O script rejeita outros projetos e endpoints que não sejam locais antes de
inicializar os clientes. As contas e os documentos sintéticos são removidos
ao terminar, inclusive quando uma verificação falha.

Cobertura: perfil autenticado, isolamento entre usuários, centavos das parcelas,
criação e edição de receita, edição de grupos, atomicidade de lotes rejeitados,
proteção de referências, aportes concorrentes em metas, restauração de backup
e exclusão de transações. Essa execução verifica a persistência local; o fluxo
visual do navegador e a configuração do ambiente publicado são verificações
separadas.

Os testes de cálculo e validação continuam disponíveis:

```bash
npm run verify:expenses
npm run verify:goals
npm run verify:integrity
```

## Faturas e planejamento

Todas as funcionalidades estão disponíveis diretamente, sem seleção de plano.
Acesse `/demo` para explorar dados fictícios. Veja o funcionamento das faturas,
lembretes, previsão de 90 dias e importação em
[Recursos financeiros](docs/plans-and-financial-features.md).

No histórico e no painel, clique no status para marcar uma receita como recebida,
uma despesa como paga ou reabrir o lançamento como pendente. Compras de cartão
são pagas ou reabertas pela fatura, com a conta de origem vinculada.

Execute `npm run verify:product` para verificar ciclos de fatura, parcelas,
previsão diária, limites por categoria, lembretes e backup.
