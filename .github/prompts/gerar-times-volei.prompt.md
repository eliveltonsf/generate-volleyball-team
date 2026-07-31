---
mode: "agent"
description: "Gerar ou atualizar o sistema de times de vôlei com entrada em texto, balanceamento, capitão, loading e explicação das formações."
argument-hint: "Cole a lista de jogadores e descreva regras extras, se houver."
model: "GPT-5 (copilot)"
---
Use o agente Volleyball Team Builder para implementar ou melhorar o sistema de geração de times de vôlei neste projeto.

## Entrada Esperada
Receba jogadores em texto, uma linha por pessoa, por exemplo:
Maria - F - PRO
Joao - M - INT

## Requisitos Base
- Formar times com 4 jogadores.
- Balancear níveis entre os times.
- Tentar atender regras de composição por time: ao menos uma mulher, INI, INT e PRO.
- Escolher e justificar capitão de cada time.
- Criar loading temático de vôlei.
- Exibir explicação da lógica de distribuição.
- Se houver sobra, exibir seção de reservas.

## Entrega
1. Implementar alterações necessárias nos arquivos HTML, CSS e JavaScript.
2. Validar entrada e exibir erros por linha inválida.
3. Explicar como a distribuição foi feita e quais exceções foram aplicadas.
4. Garantir responsividade em mobile e desktop.
