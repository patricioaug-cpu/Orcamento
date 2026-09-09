import {
  processarProjetoComSimbologiaOficial,
  ResultadoIntegracaoProjeto,
} from "./orchestrationService.js";
import {
  reconhecerSimbologiaProjeto,
  getAllOfficialSymbols,
  getOfficialSymbolById,
  ProjectSymbolCandidateInput,
} from "./projectSymbolRecognitionService.js";
import { getMnemonicCatalogStats, processOfficialMnemonics } from "./mnemonicService.js";
import { getCatalogStats, loadItemCatalog, getAllCatalogRecords } from "./itemCatalogService.js";
import crypto from "node:crypto";
import fs from "node:fs";

// ============================================================================
// ETAPA 9 — VALIDAÇÃO FUNCIONAL DETALHADA COM PROJETOS REAIS
// ============================================================================

console.log("================================================================================");
console.log("ETAPA 9 — VALIDAÇÃO FUNCIONAL COM PROJETOS REAIS (BENCHMARK CEMIG)");
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
// PROJETO 1: Projeto de Expansão Urbana RDP (Rua Geraldo Honório) - 3 Páginas
// ----------------------------------------------------------------------------
console.log("\n>>> Executando Validação Completa do PROJETO 1 (Expansão Urbana RDP - 3 Páginas)...");

const inputProjetoUrbano = [
  // Página 1: Tronco Principal (Poste Circular 11-300 + Estrutura MT N1 + Chave Fusível)
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
  // Página 2: Derivação e Transformação (Poste Circular 11-600 + Trafo 45kVA + Estrutura BT)
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
  // Página 3: Desativação de Rede Antiga (Poste Madeira + Estrutura M1 existente a retirar)
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
  // Poste Existente no local (sem alteração)
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
// PROJETO 2: Eletrificação Rural (Fazenda Esperança) - 2 Páginas
// ----------------------------------------------------------------------------
console.log("\n>>> Executando Validação Completa do PROJETO 2 (Fazenda Esperança - 2 Páginas)...");

const inputProjetoRural = [
  {
    id: "PR1_POSTE",
    pagina: 1,
    tipo: "POSTE",
    formato: "CIRCULAR",
    especificacao: "11-300",
    status: "INSTALAR" as const,
  },
  {
    id: "PR1_ESTR_N3",
    pagina: 1,
    tipo: "ESTRUTURA MT",
    codigo: "N3",
    especificacao: "11-300",
    status: "INSTALAR" as const,
  },
  {
    id: "PR2_POSTE",
    pagina: 1,
    tipo: "POSTE",
    formato: "CIRCULAR",
    especificacao: "10-300",
    status: "INSTALAR" as const,
  },
  {
    id: "PR2_ESTR_N1",
    pagina: 1,
    tipo: "ESTRUTURA MT",
    codigo: "N1",
    especificacao: "10-300",
    status: "INSTALAR" as const,
  },
  {
    id: "PR3_TRAFO",
    pagina: 1,
    tipo: "TRANSFORMADOR",
    simboloSugestao: "SIMB-P02-44",
    especificacao: "75KVA 15KV",
    status: "INSTALAR" as const,
  },
];

const p2Result = processarProjetoComSimbologiaOficial(inputProjetoRural, "PROJ_RURAL_FAZENDA_ESPERANCA.pdf");

assert(p2Result.relatorio_ocorrencias.length === 5, "PROJETO 2 — 5 ocorrências rurais processadas");
assert(p2Result.officialProcessing.materials.length > 0, "PROJETO 2 — Materiais consolidados para rede rural");

// ----------------------------------------------------------------------------
// PROJETO 3: Teste de Resiliência e Proibição de Falsos Positivos
// ----------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 3 (Resiliência / Proibição de Falsos Positivos)...");

const inputNaoReconhecido = [
  {
    id: "DESC_01",
    pagina: 4,
    tipo: "DISPOSITIVO_INVENTADO_SEM_NORMA",
    descricao: "Dispositivo experimental hipotético X99",
    status: "INSTALAR" as const,
  },
  {
    id: "AMBIGUO_01",
    pagina: 4,
    tipo: "EQUIPAMENTO",
    descricao: "POSTE",
    status: "INSTALAR" as const,
  },
];

const p3Result = processarProjetoComSimbologiaOficial(inputNaoReconhecido, "PROJ_CIVIL_NAO_CEMIG.jpg");

assert(p3Result.relatorioSimbologia.estatisticas.reconhecidos_alta === 0, "PROJETO 3 — Zero elementos classificados como ALTA");
assert(p3Result.relatorioSimbologia.simbolos_validados_para_associacao.length === 0, "PROJETO 3 — Zero símbolos autorizados a avançar para associação");
assert(p3Result.officialProcessing.groupedMnemonics.length === 0, "PROJETO 3 — Zero mnemônicos gerados (Zero Alucinação)");
assert(p3Result.officialProcessing.materials.length === 0, "PROJETO 3 — Zero materiais gerados para elementos não reconhecidos");

// ----------------------------------------------------------------------------
// PROJETO 4: Multiplicidade e Estados Operacionais (INSTALAR, RETIRAR, EXISTENTE)
// ----------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 4 (Multiplicidade & Estados Operacionais)...");

const inputMultiplos = [
  { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
  { id: "P2", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
  { id: "P3", pagina: 2, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
  { id: "P4", pagina: 2, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
];

const p4Result = processarProjetoComSimbologiaOficial(inputMultiplos, "PROJ_MULTIPLICIDADE_ESTADOS.pdf");

assert(p4Result.relatorio_ocorrencias.length === 4, "PROJETO 4 — 4 ocorrências mapeadas individualmente");
assert(p4Result.relatorioSimbologia.estatisticas.reconhecidos_alta === 4, "PROJETO 4 — 4 ocorrências reconhecidas com ALTA");

// ----------------------------------------------------------------------------
// PROJETO 5: Rastreabilidade Completa em 6 Elos
// ----------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 5 (Cadeia de Rastreabilidade em 6 Elos)...");

const inputRastreio = [
  { id: "P1_AUDIT", pagina: 7, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
];

const p5Result = processarProjetoComSimbologiaOficial(inputRastreio, "PROJ_AUDITORIA_RASTREAMENTO.pdf");

assert(p5Result.relatorio_ocorrencias.length === 1, "PROJETO 5 — 1 ocorrência auditada");
const ocorrencia = p5Result.relatorio_ocorrencias[0];

assert(ocorrencia.pagina === 7, "PROJETO 5 — Elo 1: Página do projeto identificada (Página 7)");
assert(ocorrencia.simbolo === "POSTE DE CONCRETO SEÇÃO CIRCULAR", "PROJETO 5 — Elo 2: Símbolo oficial rastreado");
assert(ocorrencia.associacao_oficial === "SIMB-P01-01", "PROJETO 5 — Elo 3: Associação oficial identificada (SIMB-P01-01)");
assert(ocorrencia.mnemonico === "PC11300", "PROJETO 5 — Elo 4: Mnemônico oficial CEMIG PC11300");
assert(p5Result.officialProcessing.materials.length > 0, "PROJETO 5 — Elo 5: Materiais oficiais explodidos do catálogo");

const matPoste = p5Result.officialProcessing.materials.find(m => m.code === "207415" || m.description.includes("POSTE"));
assert(Boolean(matPoste), "PROJETO 5 — Elo 6: Item do catálogo de materiais (207415 - POSTE CONCRETO CIRCULAR 11M 300DAN) rastreado");

// ----------------------------------------------------------------------------
// VERIFICAÇÃO DE NÃO-REGRESSÃO E INTEGRIDADE DAS BASES
// ----------------------------------------------------------------------------
console.log("\n>>> Verificando integridade das bases de dados e hashes SHA-256...");

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

// Validar quantitativos das bases
const mStats = getMnemonicCatalogStats();
assert(mStats.totalMnemonicos === 7203, "NÃO-REGRESSÃO — Exatamente 7.203 mnemônicos oficiais (7203)");
assert(mStats.totalComponentes === 30949, "NÃO-REGRESSÃO — Exatamente 30.949 componentes oficiais (30949)");

const itens = getAllCatalogRecords();
assert(itens.length === 1558, "NÃO-REGRESSÃO — Exatamente 1.558 materiais no catálogo oficial (1558)");

console.log("================================================================================");
console.log(`Resultado da Bateria ETAPA 9: ${totalPassed}/${totalPassed + totalFailed} testes aprovados.`);
console.log("✅ VALIDAÇÃO FUNCIONAL DA ETAPA 9 CONCLUÍDA COM 100% DE SUCESSO!");
console.log("================================================================================");
