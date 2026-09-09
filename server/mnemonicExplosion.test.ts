import {
  processOfficialMnemonics,
  getAllOfficialMnemonics,
  getMnemonicCatalogStats,
  resolveMnemonicRecords,
} from "./mnemonicService.js";
import { consultarItemPorDescricao } from "./itemCatalogService.js";
import fs from "node:fs";

console.log("================================================================================");
console.log("TESTE DE DECOMPOSIÇÃO E CONSOLIDAÇÃO DE MNEMÔNICOS EM MATERIAIS");
console.log("================================================================================");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    totalPassed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    totalFailed++;
    process.exit(1);
  }
}

// 1. Validar Catálogo
const stats = getMnemonicCatalogStats();
assert(stats.totalMnemonicos === 7203, `Catálogo oficial carregado: ${stats.totalMnemonicos} mnemônicos`);
assert(stats.totalComponentes === 30949, `Total de componentes no catálogo: ${stats.totalComponentes}`);

// 2. Testar Decomposição e Consolidação com Lista Duplicada (Passos 1 a 6)
// Exemplo: 
// 2x PC11300 + 3x PC11300 = 5x PC11300
// 2x N115170CZ24CIL
// 1x S12N
// 1x CFS1RP10071KA15KV
const projetoInput = {
  mnemonicos: [
    { mnemonicCode: "PC11300", quantity: 2, status: "INSTALAR" },
    { mnemonicCode: "PC11300", quantity: 3, status: "INSTALAR" },
    { mnemonicCode: "N115170CZ24CIL", quantity: 2, status: "INSTALAR" },
    { mnemonicCode: "S12N", quantity: 1, status: "INSTALAR" },
    { mnemonicCode: "CFS1RP10071KA15KV", quantity: 3, status: "INSTALAR" },
  ],
};

const res = processOfficialMnemonics(projetoInput);

// PASSO 1 & 2: Agrupar e Somar
const pc11300 = res.groupedMnemonics.find((m) => m.mnemonicCode === "PC11300");
assert(!!pc11300, "PC11300 agrupado com sucesso");
assert(pc11300?.totalQuantity === 5, `PC11300 somado corretamente: 2 + 3 = 5 (obtido: ${pc11300?.totalQuantity})`);

const n1 = res.groupedMnemonics.find((m) => m.mnemonicCode === "N115170CZ24CIL");
assert(!!n1, "N115170CZ24CIL agrupado com sucesso");
assert(n1?.totalQuantity === 2, `N115170CZ24CIL somado: 2 (obtido: ${n1?.totalQuantity})`);

// PASSO 3 & 4: Explodir e Multiplicar
assert(Array.isArray(n1?.compositionItems) && n1!.compositionItems.length > 0, `N115170CZ24CIL possui ${n1?.compositionItems.length} componentes explodidos`);

// PASSO 5: Consolidar materiais
assert(Array.isArray(res.materials) && res.materials.length > 0, `Lista de materiais consolidada contém ${res.materials.length} itens únicos`);

const posteMaterial = res.materials.find((m) => m.description.includes("POSTE CONCRETO CIRCULAR 11M 300DAN"));
assert(!!posteMaterial, "Material do poste localizado na lista consolidada");
assert(posteMaterial?.quantity === 5, `Quantidade do poste multiplicada e consolidada: 5 (obtido: ${posteMaterial?.quantity})`);
assert(posteMaterial?.code === "207415" || posteMaterial?.codigo === "207415", `Código oficial do item associado corretamente: ${posteMaterial?.code}`);

// PASSO 6: Formatar e não-encontrados
assert(res.mnemonicosNaoEncontrados.length === 0, "Zero mnemônicos não encontrados no lote válido");

// 3. Teste com mnemônico inexistente (deve avisar)
const projetoComInexistente = {
  mnemonicos: [
    { mnemonicCode: "MNEM_INEXISTENTE_999", quantity: 1, status: "INSTALAR" },
    { mnemonicCode: "PC11300", quantity: 1, status: "INSTALAR" },
  ],
};

const resInexistente = processOfficialMnemonics(projetoComInexistente);
assert(resInexistente.mnemonicosNaoEncontrados.includes("MNEM_INEXISTENTE_999"), "Mnemônico inexistente reportado em mnemonicosNaoEncontrados");

console.log("\n================================================================================");
console.log(`Resultado da Bateria de Explosão: ${totalPassed} testes aprovados.`);
console.log("✅ TODAS AS ETAPAS DE EXPLOSÃO E CONSOLIDAÇÃO VALIDADAS COM SUCESSO!");
console.log("================================================================================");
