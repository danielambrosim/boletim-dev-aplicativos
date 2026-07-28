# Boletim — Desenvolvimento de Aplicativos

Dashboard para lançar e acompanhar notas de turma. Vanilla JS (ES modules),
sem framework, sem build step.

## Estrutura

```
boletim-dev-aplicativos/
├── index.html                 # shell + markup
└── src/
    ├── styles/
    │   ├── tokens.css          # cores, tipografia, espaçamento (única fonte)
    │   ├── base.css            # reset e fundamentos
    │   ├── layout.css          # shell, cabeçalho, grid de stats, toolbar
    │   ├── components.css      # botões, tiles, pills, menu, toast
    │   └── table.css           # tabela de notas
    └── scripts/
        ├── state.js            # estado + persistência (localStorage)
        ├── grades.js           # cálculo puro: média, status (testável sem DOM)
        ├── actions.js          # mutações de estado (não toca DOM)
        ├── render.js           # estado -> DOM (não muta estado)
        ├── exportData.js       # backup .json / planilha .csv / import
        └── main.js             # wiring: delegação de evento + orquestração
```

Separação: `grades.js` é puro (fácil de testar isolado), `actions.js` só
muta estado, `render.js` só lê estado e escreve DOM. `main.js` é a única
camada que conhece os três.

## Rodar localmente

ES modules exigem HTTP — abrir `index.html` direto via `file://` quebra
por CORS. Use um servidor estático:

```bash
npx serve boletim-dev-aplicativos
```

ou, com a extensão **Live Server** do VSCode, botão direito em
`index.html` → "Open with Live Server".

## Dados

Tudo fica salvo em `localStorage`, escopado ao navegador/origem. Use
**Exportar backup (.json)** no menu ↗ para levar os dados entre
dispositivos, ou **Exportar planilha (.csv)** para abrir no Excel/Sheets.
Importar um backup substitui o estado atual.

## Critérios de aprovação

Padrão: média ≥ 6,0 aprova, 4,0–5,9 recuperação, abaixo de 4,0 reprovado.
Ajustável em "Critérios" na toolbar.
