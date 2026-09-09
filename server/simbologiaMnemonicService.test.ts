import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  loadAssociacoesBase,
  getAllAssociacoes,
  getAssociacaoPorSimboloId,
  getAssociacoesPorMnemonico,
  getAssociacoesStats,
} from "./simbologiaMnemonicService";

export function runValidationSuite() {
  console.log("====================================================");
  console.log("TESTES DE VALIDAÇÃO: ASSOCIAÇÃO SIMBOLOGIA -> MNEMÔNICOS");
  console.log("====================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  // 1. Carregamento dos dados
  const base = loadAssociacoesBase();
  const stats = getAssociacoesStats();
  const simbologia = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "eo_simbologia.json"), "utf8"));
  const mnemonicos = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "mnemonicos_catalogo.json"), "utf8"));

  assert(base && Array.isArray(base.associacoes), "Carregamento da Base de Associações");
  assert(base.associacoes.length === 142, "Quantidade de Associações igual a 142 (1:1 com os símbolos oficiais)", `Encontrado: ${base.associacoes.length}`);

  // 2. Unicidade de IDs de Associação
  const assocIds = new Set<string>();
  let hasDuplicateAssocId = false;
  for (const a of base.associacoes) {
    if (assocIds.has(a.id)) hasDuplicateAssocId = true;
    assocIds.add(a.id);
  }
  assert(!hasDuplicateAssocId, "Unicidade de IDs das Associações (ASSOC-XXXXXX)");

  // 3. Integridade de Símbolos Oficiais
  const simbologiaIds = new Set<string>();
  simbologia.categorias.forEach((c: any) => c.itens.forEach((i: any) => simbologiaIds.add(i.id)));

  let allSymbolsValid = true;
  let symbolValidationErr = "";
  for (const a of base.associacoes) {
    if (!simbologiaIds.has(a.simbolo_id)) {
      allSymbolsValid = false;
      symbolValidationErr = `Símbolo ${a.simbolo_id} não existe na base oficial.`;
      break;
    }
  }
  assert(allSymbolsValid, "Integridade dos Símbolos Oficiais (Todo simbolo_id existe em eo_simbologia.json)", symbolValidationErr);

  // 4. Integridade de Páginas Oficiais
  const symbolPageMap = new Map<string, number>();
  simbologia.categorias.forEach((c: any) => c.itens.forEach((i: any) => symbolPageMap.set(i.id, i.pagina)));

  let allPagesValid = true;
  for (const a of base.associacoes) {
    if (symbolPageMap.get(a.simbolo_id) !== a.pagina_fonte) {
      allPagesValid = false;
      break;
    }
  }
  assert(allPagesValid, "Integridade das Páginas Oficiais (Páginas 1 a 7 correspondem exatamente à base oficial)");

  // 5. Integridade dos Mnemônicos Candidatos
  const mnemonicMap = new Map<string, any>();
  mnemonicos.forEach((m: any) => mnemonicMap.set(m.codigo.trim().toUpperCase(), m));

  let allCandidatesValid = true;
  let invalidCandidateInfo = "";
  for (const a of base.associacoes) {
    for (const c of a.candidatos) {
      if (!mnemonicMap.has(c.mnemonico_codigo.trim().toUpperCase())) {
        allCandidatesValid = false;
        invalidCandidateInfo = `Mnemônico ${c.mnemonico_codigo} associado ao símbolo ${a.simbolo_id} não existe no catálogo de 7.203 mnemônicos.`;
        break;
      }
    }
    if (!allCandidatesValid) break;
  }
  assert(allCandidatesValid, "Integridade dos Mnemônicos (Todos os mnemônicos candidatos existem em mnemonicos_catalogo.json)", invalidCandidateInfo);

  // 6. Ausência de candidatos duplicados no mesmo símbolo
  let noDuplicateCandidatePerSymbol = true;
  for (const a of base.associacoes) {
    const seen = new Set<string>();
    for (const c of a.candidatos) {
      const code = c.mnemonico_codigo.trim().toUpperCase();
      if (seen.has(code)) {
        noDuplicateCandidatePerSymbol = false;
        break;
      }
      seen.add(code);
    }
    if (!noDuplicateCandidatePerSymbol) break;
  }
  assert(noDuplicateCandidatePerSymbol, "Ausência de candidatos duplicados dentro do mesmo símbolo");

  // 7. Teste de Consulta por Símbolo ID e Mnemônico
  const testSymbol = getAssociacaoPorSimboloId("SIMB-P01-01");
  assert(testSymbol !== null && testSymbol.candidatos.length > 0, "Consulta de Associação por Símbolo ID (SIMB-P01-01)");

  const testMnemonics = getAssociacoesPorMnemonico("PC10300");
  assert(testMnemonics.length > 0, "Consulta Reversa de Associação por Mnemônico (PC10300)");

  // 8. Integridade dos Arquivos Críticos (Hashes de Não-Regressão)
  const criticalFiles = [
    { name: "data/mnemonicos_catalogo.json", expectedHash: "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629" },
    { name: "data/itens_catalogo.json", expectedHash: "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4" },
    { name: "data/mnemonicos_indice.json", expectedHash: "ffbd2247b8f1e58f6e0531e01b197d716c4eda2810743e3796ad9f500023dd5d" },
    { name: "data/itens_ambiguidades.json", expectedHash: "6490fb168cacf281853b35f68096f042b4f9143b0d6b2900856fe39a8f3ce13e" }
  ];

  let allHashesPreserved = true;
  for (const f of criticalFiles) {
    const buf = fs.readFileSync(path.join(process.cwd(), f.name));
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    if (hash !== f.expectedHash) {
      allHashesPreserved = false;
      console.error(`Hash divergente para ${f.name}: obtido ${hash}, esperado ${f.expectedHash}`);
    }
  }
  assert(allHashesPreserved, "Não-Regressão: Hashes SHA256 dos 4 arquivos de catálogo intactos");

  console.log("-------------------------------------------------");
  console.log(`Resultado da Bateria: ${passed}/${passed + failed} testes aprovados.`);
  if (failed === 0) {
    console.log("✅ TODOS OS TESTES PASSARAM COM SUCESSO!");
  } else {
    throw new Error(`Falha em ${failed} testes de validação.`);
  }

  return { passed, failed, stats };
}

if (process.argv[1] && process.argv[1].endsWith("simbologiaMnemonicService.test.ts")) {
  runValidationSuite();
}
