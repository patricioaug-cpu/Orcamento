import {
  analysisCache,
  buildOptimizedSystemPrompt,
} from "./tokenOptimizationService.js";
import { processarProjetoComSimbologiaOficial } from "./orchestrationService.js";
import { getMnemonicCatalogStats } from "./mnemonicService.js";
import { getAllCatalogRecords } from "./itemCatalogService.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

console.log("================================================================================");
console.log("ETAPA 12A — TESTES DE REGRESSÃO E VALIDAÇÃO DE OTIMIZAÇÃO DE TOKENS");
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

// ----------------------------------------------------------------------------
// TESTE 1: Otimização de Prompt e Redução de Tamanho de Contexto
// ----------------------------------------------------------------------------
console.log(">>> Validando Prompt Otimizado de Sistema...");
const prompt138 = buildOptimizedSystemPrompt(
  "13,8 kV (Padrão MT CEMIG Urbano/Rural - Classe 15 kV)",
  "13.8kV"
);

assert(
  prompt138.length < 1800,
  `Prompt compacto (< 1800 caracteres vs ~5000 do anterior). Atual: ${prompt138.length} chars`
);
assert(prompt138.includes("ND-3.1"), "Prompt contém normas regulatórias essenciais");
assert(prompt138.includes("INSTALAR"), "Prompt preserva status INSTALAR");
assert(prompt138.includes("RETIRAR"), "Prompt preserva status RETIRAR");
assert(prompt138.includes("EXISTENTE"), "Prompt preserva status EXISTENTE");
assert(
  !prompt138.includes("PC09150, PC09300, PC10150, PC10600"),
  "Prompt não despeja listas gigantescas de mnemônicos (economia de tokens)"
);

// ----------------------------------------------------------------------------
// TESTE 2: Cache SHA-256 e Economia de 100% em Arquivos Repetidos
// ----------------------------------------------------------------------------
console.log(">>> Validando Cache Criptográfico SHA-256...");
analysisCache.clear();
const mockBase64 = "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFI...";
const voltage = "13.8kV";
const hash1 = analysisCache.computeHash(mockBase64, voltage);

assert(
  typeof hash1 === "string" && hash1.length === 64,
  `Hash SHA-256 computado com sucesso: ${hash1.slice(0, 16)}...`
);
assert(analysisCache.get(hash1) === undefined, "Cache inicialmente vazio para o hash");

const fakeResult = {
  hash: hash1,
  voltageLevel: voltage,
  timestamp: Date.now(),
  data: { projectName: "Projeto Urbanizacao CEMIG", detectedPoles: [{ id: "P1" }] },
  source: "gemini",
};

analysisCache.set(hash1, fakeResult);
const cached = analysisCache.get(hash1);
assert(cached !== undefined, "Resultado recuperado do cache com sucesso");
assert(cached?.data.projectName === "Projeto Urbanizacao CEMIG", "Dados do cache preservados com integridade");

// ----------------------------------------------------------------------------
// TESTE 3: Invalidação de Cache por Alteração de Conteúdo ou Tensão
// ----------------------------------------------------------------------------
console.log(">>> Validando Invalidação de Cache...");
const hashDiffVoltage = analysisCache.computeHash(mockBase64, "34.5kV");
const hashDiffContent = analysisCache.computeHash(mockBase64 + "_MODIFIED", voltage);

assert(hash1 !== hashDiffVoltage, "Hash diferencia alteração de nível de tensão");
assert(hash1 !== hashDiffContent, "Hash diferencia alteração no conteúdo do arquivo");
assert(analysisCache.get(hashDiffVoltage) === undefined, "Cache miss correto para tensão alterada");
assert(analysisCache.get(hashDiffContent) === undefined, "Cache miss correto para conteúdo alterado");

// ----------------------------------------------------------------------------
// TESTE 4: Não-Regressão Técnica com PROJETO 1 (Expansão Urbana RDP - Benchmark Etapa 9)
// ----------------------------------------------------------------------------
console.log(">>> Validando Não-Regressão Funcional (PROJETO 1)...");
const inputProjetoUrbano = [
  {
    id: "P1_POSTE",
    pagina: 1,
    tipo: "POSTE",
    formato: "CIRCULAR",
    especificacao: "11-300",
    status: "INSTALAR" as const,
  },
  {
    id: "P1_ESTR_N1",
    pagina: 1,
    tipo: "ESTRUTURA MT",
    codigo: "N1",
    especificacao: "11-300",
    status: "INSTALAR" as const,
  },
  {
    id: "P1_CHAVE_FUSIVEL",
    pagina: 1,
    tipo: "CHAVE",
    codigo: "CFS110010KA",
    descricao: "CHAVE FUSÍVEL BASE C",
    status: "INSTALAR" as const,
  },
  {
    id: "P2_POSTE",
    pagina: 2,
    tipo: "POSTE",
    formato: "CIRCULAR",
    especificacao: "11-600",
    status: "INSTALAR" as const,
  },
  {
    id: "P2_TRAFO",
    pagina: 2,
    tipo: "TRANSFORMADOR",
    simboloSugestao: "SIMB-P02-44",
    especificacao: "45KVA 13.8KV",
    status: "INSTALAR" as const,
  },
  {
    id: "P2_ESTR_BT",
    pagina: 2,
    tipo: "ESTRUTURA BT",
    codigo: "S12N",
    especificacao: "11-600",
    status: "INSTALAR" as const,
  },
  {
    id: "P3_POSTE_RETIRAR",
    pagina: 3,
    tipo: "POSTE",
    formato: "MADEIRA",
    especificacao: "10-300",
    status: "RETIRAR" as const,
  },
  {
    id: "P3_ESTR_RETIRAR",
    pagina: 3,
    tipo: "ESTRUTURA MT",
    codigo: "M1",
    especificacao: "10-300",
    status: "RETIRAR" as const,
  },
  {
    id: "P3_POSTE_EXISTENTE",
    pagina: 3,
    tipo: "POSTE",
    formato: "DUPLO T",
    especificacao: "11-300",
    status: "EXISTENTE" as const,
  },
];

const p1Result = processarProjetoComSimbologiaOficial(inputProjetoUrbano, "PROJ_RDP_URBANO_GERALDO_HONORIO.pdf");

assert(p1Result.relatorioSimbologia.estatisticas.total_candidatos === 9, "PROJETO 1 — Total de 9 candidatos processados");
assert(p1Result.relatorioSimbologia.estatisticas.reconhecidos_alta === 3, "PROJETO 1 — Exatamente 3 elementos reconhecidos com confiança ALTA (PC1, PC2, TR)");
assert(p1Result.relatorioSimbologia.estatisticas.ambiguos_media === 4, "PROJETO 1 — Exatamente 4 elementos ambíguos com confiança MEDIA");
assert(p1Result.relatorioSimbologia.estatisticas.nao_reconhecidos === 2, "PROJETO 1 — Exatamente 2 elementos não reconhecidos");
assert(p1Result.officialProcessing.materials.length > 0, "PROJETO 1 — Lista consolidada de materiais gerada");
assert(p1Result.officialProcessing.materials.reduce((acc, m) => acc + m.quantity, 0) === 50, "PROJETO 1 — Exatamente 50 itens/unidades de materiais calculados");

// ----------------------------------------------------------------------------
// TESTE 5: Preservação de Integridade das Bases de Dados e Hashes SHA-256
// ----------------------------------------------------------------------------
console.log(">>> Validando Integridade das Bases Oficiais e Hashes SHA-256...");
const filesToCheck = [
  { path: "data/eo_simbologia.json", expectedHash: "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d" },
  { path: "data/simbologia_mnemonicos.json", expectedHash: "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6" },
  { path: "data/simbologia_mnemonicos_auditoria.json", expectedHash: "cbb3e7e05ce57308ba2c2709e2f095152388417547d54698a818a82a16510f5d" },
  { path: "data/mnemonicos_catalogo.json", expectedHash: "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629" },
  { path: "data/itens_catalogo.json", expectedHash: "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4" },
];

for (const f of filesToCheck) {
  const buf = fs.readFileSync(f.path);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  assert(hash === f.expectedHash, `NÃO-REGRESSÃO HASH — ${f.path} perfeitamente intacto`);
}

const mStats = getMnemonicCatalogStats();
assert(mStats.totalMnemonicos === 7203, "NÃO-REGRESSÃO — Exatamente 7.203 mnemônicos oficiais (7203)");
assert(mStats.totalComponentes === 30949, "NÃO-REGRESSÃO — Exatamente 30.949 componentes oficiais (30949)");

const itens = getAllCatalogRecords();
assert(itens.length === 1558, "NÃO-REGRESSÃO — Exatamente 1.558 materiais no catálogo oficial (1558)");

console.log("================================================================================");
console.log(`Resultado da Bateria ETAPA 12A: ${totalPassed} testes aprovados.`);
console.log("✅ VALIDAÇÃO DA OTIMIZAÇÃO DE TOKENS E CACHE CONCLUÍDA COM 100% DE SUCESSO!");
console.log("================================================================================");
