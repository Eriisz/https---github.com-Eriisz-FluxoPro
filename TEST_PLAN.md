# FluxoPro — Plano de QA

## Contexto

- Produto: FluxoPro, aplicativo de controle financeiro e fluxo de caixa pessoal.
- Interface: português brasileiro (`pt-BR`).
- Repositório: https://github.com/Eriisz/https---github.com-Eriisz-FluxoPro
- Produção: https://https-githubcom-eriisz-fluxopro.vercel.app
- Stack: Next.js 15, React, TypeScript, Tailwind, Firebase/Firestore e Recharts.

## Requisitos de produto

### Aparência profissional

- Manter a experiência financeira profissional em tema claro/escuro.
- Manter os fluxos existentes do Firebase e os dados do usuário.
- Dashboard com cards e gráficos alinhados.

### Busca e filtros

- Busca global com `Ctrl+K` / `Cmd+K`.
- Barra de busca no topo funcionando.
- Busca avançada com texto, tipo, status, categoria, conta, período, valor mínimo/máximo e recorrentes.
- Consultas em linguagem natural:
  - `uber`
  - `pendente`
  - `acima de 200`
  - `despesas`
- A página `/search` deve continuar funcionando diretamente, mas não deve aparecer como item do menu lateral.
- A página de histórico deve exibir a barra de filtros.
- Pesquisas salvas podem existir em `/search`.

### APIs

- `GET /api/market` deve retornar JSON. Cotações vazias são aceitáveis.
- `POST /api/search` deve responder sem quebrar a aplicação.
- `POST /api/insights` deve responder sem quebrar a aplicação.
- A interface não deve exibir ticker de mercado.

### Aparência configurável

Manter em `Ajustes → Aparência`:

- Tema claro, escuro e sistema.
- Paletas Ouro, Oceano, Floresta, Rubi e Grafite.
- Modo daltônico com azul/laranja no lugar de vermelho/verde.

Não pode existir:

- Alternância de visualização compacta/mobile.
- Botão que force layout de celular.
- Texto ou switch “Visualização celular”.

### Gráficos

- Usar somente gráficos 2D.
- Exibir gráfico de barras de fluxo de caixa mensal.
- Exibir gráfico de rosca/pizza por categoria.
- Aplicar a paleta selecionada e as cores do modo daltônico.

Não pode existir:

- Cilindros ou torres 3D.
- Cenas WebGL.
- Cards “AO VIVO” de gráficos.
- Ticker ou campo “Mercado ao vivo”.

## Plano de execução

### 1. Repositório e produção

- [ ] Atualizar para a `main` mais recente.
- [ ] Confirmar que a aplicação local instala e compila.
- [ ] Confirmar que a URL de produção responde.
- [ ] Confirmar que a página de login tem título contendo `FluxoPro`.
- [ ] Fazer hard refresh para evitar cache antigo.

### 2. Dashboard

- [ ] Confirmar ausência de gráficos 3D.
- [ ] Confirmar gráfico 2D de barras visível e alinhado.
- [ ] Confirmar gráfico 2D de rosca/pizza visível e alinhado.
- [ ] Confirmar ausência de “Mercado ao vivo”.
- [ ] Verificar cards de visão geral, insights, metas e transações recentes.

### 3. Busca

- [ ] Confirmar abertura da busca global com `Ctrl+K` / `Cmd+K`.
- [ ] Confirmar funcionamento do controle de busca no topo.
- [ ] Confirmar que o menu lateral não contém “Pesquisa”.
- [ ] Confirmar que o cabeçalho do menu lateral não contém ícone de busca extra.
- [ ] Confirmar filtros na página de histórico.
- [ ] Confirmar que `pendente` filtra corretamente.
- [ ] Confirmar que `acima de 200` filtra corretamente.
- [ ] Confirmar funcionamento direto de `/search`.

### 4. Aparência

- [ ] Confirmar temas claro, escuro e sistema.
- [ ] Confirmar as cinco paletas.
- [ ] Confirmar o switch do modo daltônico.
- [ ] Confirmar ausência de opção compacta/mobile.
- [ ] Confirmar que trocar a paleta altera cor primária e cores dos gráficos.
- [ ] Confirmar que o modo daltônico substitui o par vermelho/verde por azul/laranja.

### 5. APIs

- [ ] Testar `GET /api/market`.
- [ ] Testar `POST /api/search`.
- [ ] Testar `POST /api/insights`.

### 6. Regressão

- [ ] Adicionar transação.
- [ ] Editar transação.
- [ ] Excluir transação.
- [ ] Trocar mês.
- [ ] Verificar contas.
- [ ] Verificar categorias.
- [ ] Verificar orçamentos.
- [ ] Verificar metas.
- [ ] Verificar calculadoras.
- [ ] Verificar configurações.
- [ ] Verificar importação/exportação.
- [ ] Verificar ocultar/mostrar saldos pelo ícone de olho.
- [ ] Verificar layout responsivo real em viewport mobile.
- [ ] Verificar console no dashboard, histórico e configurações.

## Resultado esperado

Registrar para cada item:

- Passou ou falhou.
- Evidência observada.
- Caminho do arquivo relacionado, quando houver bug.
- Correção mínima necessária.
- Reteste após a correção.

Não reintroduzir gráficos 3D, ticker de mercado, item de busca no menu lateral ou modo mobile compacto.