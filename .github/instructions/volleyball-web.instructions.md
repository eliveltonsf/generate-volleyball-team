---
description: "Use when editing HTML, CSS, and JavaScript files for this volleyball team generator project. Enforce pt-BR copy, responsive layout, accessibility, clear validation messages, and modern beach-inspired visual style."
applyTo: "**/*.{html,css,js}"
---
## Objetivo do Projeto
Este projeto deve permanecer simples, rápido e fácil de manter, com foco em gerar times de vôlei a partir de texto colado pelo usuário.

## Linguagem e Comunicação
- Escrever textos da interface em português do Brasil.
- Usar mensagens claras para validação, erro e sucesso.
- Explicar limitações de regras de forma transparente quando não for possível cumprir tudo.

## Regras de Produto
- Entrada principal: linhas no formato Nome - F/M - INI/INT/PRO.
- Cada time deve ter 4 jogadores.
- Priorizar balanceamento de nível entre os times.
- Tentar garantir ao menos uma mulher e presença de INI, INT e PRO por time quando viável.
- Quando faltar jogador para fechar múltiplo de 4, manter reserva separada.

## UI e Responsividade
- Mobile-first, com bom comportamento em 320px+, tablet e desktop.
- Visual moderno com direção praia/areia por padrão: tons quentes, contraste alto e hierarquia visual forte.
- Evitar layouts genéricos; manter identidade visual consistente.
- Inserir estado de loading temático de vôlei durante a geração.

## Acessibilidade e UX
- Garantir contraste adequado e foco visível em elementos interativos.
- Labels claros para campos e botões.
- Mensagens de erro próximas ao campo relevante.
- Não depender apenas de cor para comunicar estado.

## Qualidade Técnica
- Preferir JavaScript puro sem dependências externas pesadas.
- Separar responsabilidades entre parsing, validação, formação e renderização.
- Manter código legível, com nomes descritivos e funções pequenas.
- Evitar efeitos visuais que prejudiquem performance em celulares.
