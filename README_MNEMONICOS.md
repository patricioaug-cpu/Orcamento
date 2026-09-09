# Projeto modificado — Leitor de Projetos / Lista de Materiais

## O que foi implementado

Esta versão integra o catálogo oficial derivado da planilha `base_mnemonicos.xlsx`:

- 7.203 mnemônicos
- 30.949 componentes
- catálogo em `data/mnemonicos_catalogo.json`
- índice em `data/mnemonicos_indice.json`
- consulta no backend
- agrupamento por mnemônico + status
- multiplicação da quantidade do mnemônico pela quantidade de cada componente
- consolidação por material + unidade + status
- tratamento de INSTALAR, RETIRAR e EXISTENTE
- suporte a mnemônicos de um ou vários componentes
- relatório de mnemônicos não encontrados
- nenhum componente é inventado quando o código não está no catálogo
- fallback fictício removido
- interface, tabela, preços e exportações existentes preservados

## Arquivos principais

- `server.ts`: chama o Gemini e, em seguida, processa a composição pelo catálogo oficial.
- `server/mnemonicService.ts`: motor determinístico de agrupamento/explosão/consolidação.
- `data/mnemonicos_catalogo.json`: catálogo completo.
- `data/mnemonicos_indice.json`: índice leve.
- `src/App.tsx`: consome o resultado oficial e exibe alertas de mnemônicos não encontrados.
- `src/types.ts`: adiciona campos de auditoria do catálogo.

## Regra de segurança contra alucinação

O Gemini identifica o que aparece no projeto. A composição de um mnemônico nunca é inventada pelo modelo. O backend só aceita códigos presentes no catálogo oficial.

Se um código não existir no catálogo:
- ele entra em `mnemonicosNaoEncontrados`;
- nenhum componente é criado para ele;
- o restante do projeto continua sendo processado.

## Status

- `INSTALAR`: entra na lista de materiais.
- `RETIRAR`: entra na lista com status RETIRAR e descrição marcada `[A RETIRAR]`.
- `EXISTENTE`: é mantido para auditoria, mas não entra na lista de aquisição/retirada.
