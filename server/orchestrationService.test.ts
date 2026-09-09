import {
  processarProjetoComSimbologiaOficial,
  normalizarEstadoOperacional,
} from "./orchestrationService";
import { getMnemonicCatalogStats, getAllOfficialMnemonics } from "./mnemonicService";
import { getCatalogStats, getAllCatalogRecords } from "./itemCatalogService";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("====================================================");
console.log("BATERIA DE TESTES OBRIGATÓRIOS — ETAPA 4");
console.log("INTEGRAÇÃO OFICIAL: PROJETO -> SIMBOLOGIA -> MNEMÔNICO -> MATERIAIS");
console.log("====================================================");

// 1. Teste 1: Símbolo conhecido -> Associação correta
const res1 = processarProjetoComSimbologiaOficial([
  {
    id: "P1",
    pagina: 1,
    tipo: "POSTE",
    formato: "CIRCULAR",
    especificacao: "11-300",
    status: "INSTALAR",
  },
]);
assert(
  res1.relatorio_ocorrencias.length === 1 &&
    res1.relatorio_ocorrencias[0].status === "ASSOCIADO" &&
    res1.relatorio_ocorrencias[0].associacao_oficial === "SIMB-P01-01",
  "TESTE 1 — Símbolo conhecido → associação oficial correta (SIMB-P01-01)"
);

// 2. Teste 2: Símbolo conhecido -> Mnemônico correto
assert(
  res1.relatorio_ocorrencias[0].mnemonico === "PC11300",
  "TESTE 2 — Símbolo conhecido → mnemônico oficial correto (PC11300)"
);

// 3. Teste 3: Símbolo conhecido -> Explosão correta
const grouped1 = res1.officialProcessing.groupedMnemonics;
assert(
  grouped1.length === 1 &&
    grouped1[0].mnemonicCode === "PC11300" &&
    grouped1[0].compositionItems.length > 0,
  "TESTE 3 — Símbolo conhecido → explosão correta com componentes oficiais"
);

// 4. Teste 4: Mnemônico -> Materiais corretos
const materials1 = res1.officialProcessing.materials;
assert(
  materials1.length > 0 &&
    materials1.every((m) => m.quantity > 0 && m.unit && m.description),
  "TESTE 4 — Mnemônico → materiais consolidados corretos com unidades e códigos do catálogo"
);

// 5. Teste 5: Múltiplas ocorrências -> Agrupamento correto
const res5 = processarProjetoComSimbologiaOficial([
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
  { id: "P2", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
  { id: "P3", pagina: 2, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
]);
const grouped5 = res5.officialProcessing.groupedMnemonics;
assert(
  grouped5.length === 1 &&
    grouped5[0].mnemonicCode === "PC11300" &&
    grouped5[0].totalQuantity === 3,
  "TESTE 5 — Múltiplas ocorrências do mesmo mnemônico → agrupamento correto (Qtd = 3)"
);

// 6. Teste 6: Quantidade multiplicada -> Cálculo correto
const singleCompQty = grouped1[0].compositionItems[0].qtyPerUnit;
const totalCompQty5 = res5.officialProcessing.materials.find(
  (m) => m.description === grouped1[0].compositionItems[0].description
)?.quantity;
assert(
  totalCompQty5 === singleCompQty * 3,
  "TESTE 6 — Quantidade multiplicada rigorosamente pela quantidade total do mnemônico"
);

// 7. Teste 7: INSTALAR -> Tratamento correto
const res7 = processarProjetoComSimbologiaOficial([
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
]);
assert(
  res7.officialProcessing.groupedMnemonics[0].status === "INSTALAR" &&
    res7.officialProcessing.materials.length > 0,
  "TESTE 7 — INSTALAR → tratamento correto (materiais gerados para aquisição/instalação)"
);

// 8. Teste 8: RETIRAR -> Tratamento correto
const res8 = processarProjetoComSimbologiaOficial([
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "RETIRAR" },
]);
assert(
  res8.officialProcessing.groupedMnemonics[0].status === "RETIRAR" &&
    res8.officialProcessing.materials.every((m) => m.status === "RETIRAR" && m.description.startsWith("[A RETIRAR]")),
  "TESTE 8 — RETIRAR → tratamento correto (status preservado e prefixado [A RETIRAR])"
);

// 9. Teste 9: EXISTENTE -> Tratamento correto
const res9 = processarProjetoComSimbologiaOficial([
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "EXISTENTE" },
]);
assert(
  res9.officialProcessing.groupedMnemonics[0].status === "EXISTENTE" &&
    res9.officialProcessing.materials.length === 0,
  "TESTE 9 — EXISTENTE → tratamento correto (rastreado no projeto, mas 0 compras geradas)"
);

// 10. Teste 10: Símbolo não associado -> NÃO ASSOCIADO
const res10 = processarProjetoComSimbologiaOficial([
  {
    id: "S_SEM_MNEMONICO",
    pagina: 1,
    tipo: "POSTE",
    simboloSugestao: "SIMB-P01-14", // POSTE COM BASE CONCRETADA (status: NAO_ENCONTRADO / 0 candidatos)
    descricao: "Poste com base concretada",
  },
]);
assert(
  res10.relatorio_ocorrencias[0].status === "NAO_ASSOCIADO" &&
    res10.relatorio_ocorrencias[0].mnemonico === null,
  "TESTE 10 — Símbolo oficial sem mnemônico no catálogo → status 'NAO_ASSOCIADO' (Sem alucinar)"
);

// 11. Teste 11: Símbolo desconhecido -> NÃO ASSOCIADO
const res11 = processarProjetoComSimbologiaOficial([
  {
    id: "DESCONHECIDO_1",
    pagina: 1,
    tipo: "DISPOSITIVO_INVENTADO",
    descricao: "Elemento alienígena não existente na norma CEMIG",
  },
]);
assert(
  res11.relatorio_ocorrencias[0].status === "NAO_ASSOCIADO" &&
    res11.relatorio_ocorrencias[0].mnemonico === null &&
    res11.relatorio_ocorrencias[0].confianca === "NENHUMA",
  "TESTE 11 — Símbolo desconhecido → status 'NAO_ASSOCIADO' com confiança NENHUMA"
);

// 12. Teste 12: Ausência de associação -> Nenhum material inventado
assert(
  res10.officialProcessing.materials.length === 0 &&
    res11.officialProcessing.materials.length === 0,
  "TESTE 12 — Ausência de associação oficial → 0 materiais gerados (Zero Alucinação)"
);

// 13. Teste 13: Nenhum fallback
assert(
  res10.officialProcessing.groupedMnemonics.length === 0 &&
    res11.officialProcessing.groupedMnemonics.length === 0,
  "TESTE 13 — Nenhum fallback (Proibição absoluta de aproximação arbitrária)"
);

// 14. Teste 14: Projeto com múltiplos símbolos
const res14 = processarProjetoComSimbologiaOficial([
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
  { id: "TR1", pagina: 1, tipo: "TRANSFORMADOR", especificacao: "45KVA 13.8KV", status: "INSTALAR" },
  { id: "CFS1", pagina: 1, tipo: "CHAVE", descricao: "Chave Fusível 100A", status: "INSTALAR" },
  { id: "CAB1", pagina: 2, tipo: "CABO", descricao: "Condutor Alumínio CA 1/0", quantidade: 120, status: "INSTALAR" },
]);
assert(
  res14.total_associados === 4 &&
    res14.officialProcessing.groupedMnemonics.length === 4 &&
    res14.officialProcessing.materials.length > 5,
  "TESTE 14 — Projeto com múltiplos símbolos oficiais distintos → processamento completo e integrado"
);

// 15. Teste 15: Projeto com símbolos repetidos
const res15 = processarProjetoComSimbologiaOficial([
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
  { id: "P2", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
  { id: "P3", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
  { id: "P4", pagina: 2, tipo: "POSTE", formato: "DUPLO T", especificacao: "11-300", status: "INSTALAR" },
  { id: "P5", pagina: 2, tipo: "POSTE", formato: "DUPLO T", especificacao: "11-300", status: "INSTALAR" },
]);
const grp15 = res15.officialProcessing.groupedMnemonics;
const pc11 = grp15.find((g) => g.mnemonicCode === "PC11300");
const pd11 = grp15.find((g) => g.mnemonicCode === "PD11300");
assert(
  grp15.length === 2 &&
    pc11?.totalQuantity === 3 &&
    pd11?.totalQuantity === 2,
  "TESTE 15 — Projeto com símbolos repetidos → agrupamento correto por mnemônico e quantidade (PC=3, PD=2)"
);

// Teste de Não-Regressão
const mStats = getMnemonicCatalogStats();
const iStats = getCatalogStats();
const hMnemonicos = hashFile(path.join(process.cwd(), "data", "mnemonicos_catalogo.json"));
const hItens = hashFile(path.join(process.cwd(), "data", "itens_catalogo.json"));
const hSimbologia = hashFile(path.join(process.cwd(), "data", "eo_simbologia.json"));
const hAssoc = hashFile(path.join(process.cwd(), "data", "simbologia_mnemonicos.json"));

assert(
  mStats.totalMnemonicos === 7203 && mStats.totalComponentes === 30949,
  "TESTE NÃO-REGRESSÃO — Catálogo de Mnemônicos intacto (7.203 mnemônicos / 30.949 componentes)"
);
assert(
  iStats.totalRegistros === 1558,
  "TESTE NÃO-REGRESSÃO — Catálogo de Itens intacto (1.558 materiais)"
);
assert(
  hMnemonicos === "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629" &&
    hItens === "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4" &&
    hSimbologia === "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d" &&
    hAssoc === "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6",
  "TESTE NÃO-REGRESSÃO — Hashes SHA256 dos 4 arquivos de dados perfeitamente preservados"
);

console.log("-------------------------------------------------");
console.log(`Resultado da Bateria ETAPA 4: ${passedTests}/${totalTests} testes aprovados.`);
if (passedTests === totalTests) {
  console.log("✅ TODOS OS TESTES DA ETAPA 4 PASSARAM COM SUCESSO!");
} else {
  console.error("❌ HOUVE FALHA EM TESTES DA ETAPA 4.");
  process.exit(1);
}
