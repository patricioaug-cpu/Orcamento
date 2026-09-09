import fs from "node:fs";
import crypto from "node:crypto";
import { processOfficialMnemonics, getMnemonicCatalogStats } from "./server/mnemonicService";
import { loadItemCatalog, consultarItemPorDescricao } from "./server/itemCatalogService";
import { processarProjetoComSimbologiaOficial } from "./server/orchestrationService";

console.log("============================================================");
console.log("SUÍTE DE AUDITORIA E VALIDAÇÃO COMPLETA DA ETAPA 12");
console.log("EXPLOSÃO DOS MNEMÔNICOS E GERAÇÃO DA LISTA DE MATERIAIS");
console.log("============================================================\n");

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    process.exit(1);
  }
}

// ------------------------------------------------------------
// 1. INTEGRIDADE DAS 7 BASES SOBERANAS (HASHES SHA-256)
// ------------------------------------------------------------
console.log("--- 1. CHECAGEM DE INTEGRIDADE DAS BASES NORMATIVAS ---");
const sovereignHashes: Record<string, string> = {
  "data/eo_simbologia.json": "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d",
  "data/simbologia_mnemonicos.json": "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6",
  "data/simbologia_mnemonicos_auditoria.json": "cbb3e7e05ce57308ba2c2709e2f095152388417547d54698a818a82a16510f5d",
  "data/mnemonicos_catalogo.json": "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629",
  "data/mnemonicos_indice.json": "ffbd2247b8f1e58f6e0531e01b197d716c4eda2810743e3796ad9f500023dd5d",
  "data/itens_catalogo.json": "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4",
  "data/itens_ambiguidades.json": "6490fb168cacf281853b35f68096f042b4f9143b0d6b2900856fe39a8f3ce13e",
};

for (const [file, expectedHash] of Object.entries(sovereignHashes)) {
  const buf = fs.readFileSync(file);
  const actualHash = crypto.createHash("sha256").update(buf).digest("hex");
  assert(
    actualHash === expectedHash,
    `Integridade SHA-256 de ${file}`,
    `Esperado: ${expectedHash}, Atual: ${actualHash}`
  );
}

// ------------------------------------------------------------
// 2. CENÁRIO: MNEMÔNICO ÚNICO COM 1 COMPONENTE
// ------------------------------------------------------------
console.log("\n--- 2. CENÁRIO: MNEMÔNICO ÚNICO COM 1 COMPONENTE (PC11300) ---");
const resSingle = processOfficialMnemonics({
  detectedPoles: [{ id: "P1", mnemonicCode: "PC11300", quantity: 1, status: "INSTALAR" }],
});
assert(resSingle.groupedMnemonics.length === 1, "Mnemônico agrupado identificado: 1");
assert(resSingle.groupedMnemonics[0].compositionItems.length === 1, "Composição possui 1 item");
assert(resSingle.materials.length === 1, "Gera exatamente 1 material consolidado");
assert(resSingle.materials[0].quantity === 1, "Quantidade final = 1");
assert(resSingle.materials[0].code === "207415", "Código oficial resolvido: 207415");

// ------------------------------------------------------------
// 3. CENÁRIO: MNEMÔNICO MULTICOMPONENTE (ATCFARPPARALEL0)
// ------------------------------------------------------------
console.log("\n--- 3. CENÁRIO: MNEMÔNICO MULTICOMPONENTE (ATCFARPPARALEL0 - 4 COMPONENTES) ---");
const resMultiComp = processOfficialMnemonics({
  detectedStructures: [{ id: "AT1", mnemonicCode: "ATCFARPPARALEL0", quantity: 1, status: "INSTALAR" }],
});
assert(resMultiComp.groupedMnemonics.length === 1, "Mnemônico agrupado: 1");
assert(resMultiComp.groupedMnemonics[0].compositionItems.length === 4, "Mnemônico explodido em 4 componentes");
assert(resMultiComp.materials.length === 4, "Lista final possui 4 materiais individuais");
assert(
  resMultiComp.materials.every((m) => m.quantity > 0 && typeof m.description === "string" && m.unit),
  "Todos os 4 materiais possuem descrições, quantidades e unidades oficiais preservadas"
);

// ------------------------------------------------------------
// 4. CENÁRIO: MULTIPLICAÇÃO MATEMÁTICA EXATA (QTD = 4)
// ------------------------------------------------------------
console.log("\n--- 4. CENÁRIO: MULTIPLICAÇÃO MATEMÁTICA (ATCFARPPARALEL0 x 4) ---");
const resQty4 = processOfficialMnemonics({
  detectedStructures: [{ id: "AT1", mnemonicCode: "ATCFARPPARALEL0", quantity: 4, status: "INSTALAR" }],
});
assert(resQty4.groupedMnemonics[0].totalQuantity === 4, "Quantidade total do mnemônico = 4");
// Componentes padrão de ATCFARPPARALEL0:
// 1. CONECTOR TERM COMP: 2 * 4 = 8
// 2. HASTE ATERRAMENTO: 2 * 4 = 8
// 3. CABO AÇO: 6 * 4 = 24
// 4. SECCIONADOR: 10 * 4 = 40
const conector = resQty4.materials.find((m) => m.description.includes("CONECTOR"));
const haste = resQty4.materials.find((m) => m.description.includes("HASTE"));
const caboAco = resQty4.materials.find((m) => m.description.includes("CABO AÇO"));
const seccionador = resQty4.materials.find((m) => m.description.includes("SECCIONADOR"));

assert(conector?.quantity === 8, "Conector: 2 * 4 = 8");
assert(haste?.quantity === 8, "Haste: 2 * 4 = 8");
assert(caboAco?.quantity === 24, "Cabo de aço: 6 * 4 = 24");
assert(seccionador?.quantity === 40, "Seccionador: 10 * 4 = 40");

// ------------------------------------------------------------
// 5. CENÁRIO: MÚLTIPLOS MNEMÔNICOS COM COMPONENTES COMUNS (CONSOLIDAÇÃO)
// ------------------------------------------------------------
console.log("\n--- 5. CENÁRIO: MÚLTIPLOS MNEMÔNICOS COM COMPONENTES EM COMUM ---");
// ATCFARPPARALEL0 (contém CABO AÇO SM 1/4" - 6m) e EST64CZCZ (contém CABO AÇO SM 1/4" - 5m)
const resConsolidation = processOfficialMnemonics({
  detectedStructures: [{ id: "AT1", mnemonicCode: "ATCFARPPARALEL0", quantity: 2, status: "INSTALAR" }],
  detectedGuys: [{ id: "EST1", mnemonicCode: "EST64CZCZ", quantity: 3, status: "INSTALAR" }],
});
assert(resConsolidation.groupedMnemonics.length === 2, "2 Mnemônicos agrupados distintos");
// Cabo de aço esperado: (2 * 6m) + (3 * 5m) = 12 + 15 = 27m
const caboConsolidado = resConsolidation.materials.find((m) => m.description.includes("CABO AÇO SM 1/4"));
assert(caboConsolidado?.quantity === 27, `Cabo de aço consolidado perfeitamente: 2*6 + 3*5 = 27m (Obtido: ${caboConsolidado?.quantity})`);

// ------------------------------------------------------------
// 6. CENÁRIO: SEGREGAÇÃO DE ESTADOS OPERACIONAIS (INSTALAR, RETIRAR, EXISTENTE)
// ------------------------------------------------------------
console.log("\n--- 6. CENÁRIO: SEGREGAÇÃO DE ESTADOS OPERACIONAIS ---");
const resStates = processOfficialMnemonics({
  detectedStructures: [
    { id: "S1", mnemonicCode: "ATCFARPPARALEL0", quantity: 1, status: "INSTALAR" },
    { id: "S2", mnemonicCode: "ATCFARPPARALEL0", quantity: 1, status: "RETIRAR" },
    { id: "S3", mnemonicCode: "ATCFARPPARALEL0", quantity: 1, status: "EXISTENTE" },
  ],
});
assert(resStates.groupedMnemonics.length === 3, "3 Mnemônicos agrupados (1 por estado)");
const instalarMats = resStates.materials.filter((m) => m.status === "INSTALAR");
const retirarMats = resStates.materials.filter((m) => m.status === "RETIRAR");
const existenteMats = resStates.materials.filter((m) => m.status === "EXISTENTE");

assert(instalarMats.length === 4, "4 Materiais com status INSTALAR");
assert(retirarMats.length === 4, "4 Materiais com status RETIRAR");
assert(existenteMats.length === 0, "0 Materiais com status EXISTENTE (não compõem lista de aquisição/obra ativa)");

// ------------------------------------------------------------
// 7. CENÁRIO: GARANTIA DE QUE MNEMÔNICO ≠ MATERIAL FINAL
// ------------------------------------------------------------
console.log("\n--- 7. CENÁRIO: GARANTIA DE QUE NENHUM MNEMÔNICO É TRATADO COMO MATERIAL FINAL ---");
const rawMnemonicosCatalog = JSON.parse(fs.readFileSync("data/mnemonicos_catalogo.json", "utf8"));
const mnemonicosCodigosSet = new Set(rawMnemonicosCatalog.map((m: any) => m.codigo.trim().toUpperCase()));

const allGeneratedMaterials = [
  ...resSingle.materials,
  ...resMultiComp.materials,
  ...resQty4.materials,
  ...resConsolidation.materials,
  ...resStates.materials,
];

for (const mat of allGeneratedMaterials) {
  const descUpper = mat.description.trim().toUpperCase();
  assert(
    !mnemonicosCodigosSet.has(descUpper),
    `Material [${mat.description}] é um componente individual explodido e não um código de mnemônico não explodido`
  );
}

// ------------------------------------------------------------
// 8. CENÁRIO: MNEMÔNICO NÃO ENCONTRADO (SEM FALLBACKS/INVENÇÃO)
// ------------------------------------------------------------
console.log("\n--- 8. CENÁRIO: MNEMÔNICO NÃO ENCONTRADO ---");
const resNotFound = processOfficialMnemonics({
  detectedStructures: [{ id: "X1", mnemonicCode: "CODIGO_FICTICIO_999", quantity: 2, status: "INSTALAR" }],
});
assert(resNotFound.mnemonicosNaoEncontrados.includes("CODIGO_FICTICIO_999"), "Mnemônico fictício reportado em mnemonicosNaoEncontrados");
assert(resNotFound.groupedMnemonics.length === 0, "0 Mnemônicos agrupados gerados");
assert(resNotFound.materials.length === 0, "0 Materiais gerados para mnemônico inexistente");

// ------------------------------------------------------------
// RESUMO FINAL
// ------------------------------------------------------------
console.log("\n============================================================");
console.log(`RELATÓRIO DA VALIDAÇÃO: ${passedTests} de ${totalTests} TESTES APROVADOS COM SUCESSO!`);
console.log("TODAS AS REGRAS E DIRETRIZES DA ETAPA 12 FORAM CUMPRIDAS RIGOROSAMENTE.");
console.log("============================================================");
