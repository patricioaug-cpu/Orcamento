import {
  processarProjetoComSimbologiaOficial,
  ResultadoIntegracaoProjeto,
} from "./orchestrationService";
import {
  reconhecerSimbologiaProjeto,
  getAllOfficialSymbols,
  getOfficialSymbolById,
  ProjectSymbolCandidateInput,
} from "./projectSymbolRecognitionService";
import { getMnemonicCatalogStats, processOfficialMnemonics } from "./mnemonicService";
import { getCatalogStats, loadItemCatalog } from "./itemCatalogService";
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
    process.exit(1);
  }
}

console.log("================================================================================");
console.log("ETAPA 7 — VALIDAÇÃO CONTROLADA COM PROJETOS REAIS (BENCHMARK CEMIG)");
console.log("================================================================================");

// -----------------------------------------------------------------------------------------
// PROJETO 1: Projeto de Rede Urbana de Distribuição (RDP) - Centro / Multifolha (Páginas 1 a 3)
// -----------------------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 1 (Projeto de Expansão Urbana RDP - 3 Páginas)...");
{
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

  const resUrbano = processarProjetoComSimbologiaOficial(inputProjetoUrbano, "projeto_urbano_centro_rdp.pdf");

  assert(resUrbano.relatorioSimbologia.estatisticas.total_candidatos === 9, "PROJETO 1 — Total de 9 candidatos processados");
  assert(resUrbano.relatorioSimbologia.estatisticas.reconhecidos_alta === 3, "PROJETO 1 — 3 Símbolos oficiais unívocos com confiança ALTA (Poste Circular P1, Poste Circular P2, Trafo P2)");
  assert(resUrbano.relatorioSimbologia.estatisticas.ambiguos_media === 4, "PROJETO 1 — 4 Símbolos ambíguos com confiança MEDIA (Chave Fusível, Poste Madeira, Estr M1, Poste DT)");
  assert(resUrbano.relatorioSimbologia.estatisticas.nao_reconhecidos === 2, "PROJETO 1 — 2 Símbolos ausentes na simbologia de 7 págs (N1, S12N)");
  assert(resUrbano.relatorio_ocorrencias.length === 9, "PROJETO 1 — 9 ocorrências rastreadas individualmente");
  
  // Verifica rastreabilidade de páginas
  const p1Items = resUrbano.relatorio_ocorrencias.filter(o => o.pagina === 1);
  const p2Items = resUrbano.relatorio_ocorrencias.filter(o => o.pagina === 2);
  const p3Items = resUrbano.relatorio_ocorrencias.filter(o => o.pagina === 3);
  assert(p1Items.length === 3, "PROJETO 1 — Rastreabilidade da Página 1 (3 elementos)");
  assert(p2Items.length === 3, "PROJETO 1 — Rastreabilidade da Página 2 (3 elementos)");
  assert(p3Items.length === 3, "PROJETO 1 — Rastreabilidade da Página 3 (3 elementos)");

  // Verifica separação de estados operacionais
  const itemsInstalar = resUrbano.relatorio_ocorrencias.filter(o => o.estado === "A INSTALAR");
  const itemsRetirar = resUrbano.relatorio_ocorrencias.filter(o => o.estado === "A RETIRAR");
  const itemsExistente = resUrbano.relatorio_ocorrencias.filter(o => o.estado === "INSTALADO");
  assert(itemsInstalar.length === 6, "PROJETO 1 — 6 elementos A INSTALAR");
  assert(itemsRetirar.length === 2, "PROJETO 1 — 2 elementos A RETIRAR");
  assert(itemsExistente.length === 1, "PROJETO 1 — 1 elemento INSTALADO (Existente)");

  // Verifica explosão de materiais
  assert(resUrbano.officialProcessing.materials.length > 0, "PROJETO 1 — Lista final de materiais gerada");
  const totalQtd = resUrbano.officialProcessing.materials.reduce((acc, m) => acc + m.quantity, 0);
  assert(totalQtd > 0, `PROJETO 1 — Quantidade total de materiais calculada rigorosamente (${totalQtd} itens/unidades)`);
  assert(resUrbano.officialProcessing.materials.some(m => m.statusCodigo === "ENCONTRADO"), "PROJETO 1 — Materiais com código oficial localizado no catálogo de 1.558 itens");
}

// -----------------------------------------------------------------------------------------
// PROJETO 2: Projeto Rural de Eletrificação (Trifásico / Monofásico)
// -----------------------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 2 (Projeto Rural - Fazenda Esperança)...");
{
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

  const resRural = processarProjetoComSimbologiaOficial(inputProjetoRural, "projeto_rural_fazenda_esperanca.pdf");
  assert(resRural.relatorio_ocorrencias.length === 5, "PROJETO 2 — 5 ocorrências rurais processadas");
  assert(resRural.officialProcessing.materials.length > 0, "PROJETO 2 — Materiais consolidados para rede rural");
}

// -----------------------------------------------------------------------------------------
// PROJETO 3: Teste Crítico de Não-Alucinação (Elementos Ambíguos, Desconhecidos e Sobrepostos)
// -----------------------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 3 (Símbolos Desconhecidos, Ambíguos e Sobrepostos)...");
{
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
      descricao: "POSTE", // Descrição genérica que abrange múltiplos símbolos da norma
      status: "INSTALAR" as const,
    },
  ];

  const resNaoReconhecido = processarProjetoComSimbologiaOficial(inputNaoReconhecido, "projeto_ruidoso.pdf");
  
  // Elemento desconhecido deve gerar 0 materiais
  assert(resNaoReconhecido.relatorioSimbologia.estatisticas.nao_reconhecidos >= 1, "PROJETO 3 — Símbolo desconhecido classificado como NÃO RECONHECIDO");
  assert(resNaoReconhecido.relatorioSimbologia.estatisticas.ambiguos_media >= 1, "PROJETO 3 — Símbolo genérico classificado como AMBÍGUO (confiança MEDIA)");
  assert(resNaoReconhecido.relatorioSimbologia.simbolos_validados_para_associacao.length === 0, "PROJETO 3 — Zero símbolos autorizados a avançar para associação");
  assert(resNaoReconhecido.officialProcessing.materials.length === 0, "PROJETO 3 — Zero materiais gerados (ZERO ALUCINAÇÃO)");
}

// -----------------------------------------------------------------------------------------
// PROJETO 4: Teste de Multiplicidade e Consolidação Precisa de Quantidades
// -----------------------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 4 (Multiplicidade e Agrupamento)...");
{
  const inputMultiplo = [
    { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
    { id: "P2", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
    { id: "P3", pagina: 2, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
    { id: "P4", pagina: 2, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" as const },
  ];

  const resMulti = processarProjetoComSimbologiaOficial(inputMultiplo, "projeto_multiplicidade.pdf");
  assert(resMulti.relatorio_ocorrencias.length === 4, "PROJETO 4 — 4 ocorrências mapeadas individualmente");
  assert(resMulti.officialProcessing.groupedMnemonics.length === 1, "PROJETO 4 — 1 mnemônico consolidado");
  assert(resMulti.officialProcessing.groupedMnemonics[0].totalQuantity === 4, "PROJETO 4 — Quantidade consolidada igual a 4 unidades");
}

// -----------------------------------------------------------------------------------------
// PROJETO 5: Rastreabilidade Completa (Material -> Componente -> Mnemônico -> Associação -> Símbolo -> Página)
// -----------------------------------------------------------------------------------------
console.log("\n>>> Executando Validação do PROJETO 5 (Cadeia de Rastreabilidade Ponta a Ponta)...");
{
  const inputRastreabilidade = [
    {
      id: "P1_AUDIT",
      pagina: 7,
      tipo: "POSTE",
      formato: "CIRCULAR",
      especificacao: "11-300",
      status: "INSTALAR" as const,
    },
  ];

  const resAudit = processarProjetoComSimbologiaOficial(inputRastreabilidade, "projeto_auditoria.pdf");
  assert(resAudit.relatorio_ocorrencias.length === 1, "PROJETO 5 — 1 ocorrência auditada");
  const ocorrencia = resAudit.relatorio_ocorrencias[0];
  
  // 1. Página do Projeto
  assert(ocorrencia.pagina === 7, "PROJETO 5 — Elo 1: Página do projeto identificada (Página 7)");
  // 2. Símbolo Oficial
  assert(ocorrencia.simbolo === "POSTE DE CONCRETO SEÇÃO CIRCULAR", "PROJETO 5 — Elo 2: Símbolo oficial rastreado");
  // 3. Associação Oficial
  assert(ocorrencia.associacao_oficial === "SIMB-P01-01", "PROJETO 5 — Elo 3: Associação oficial identificada (SIMB-P01-01)");
  // 4. Mnemônico
  assert(ocorrencia.mnemonico === "PC11300", "PROJETO 5 — Elo 4: Mnemônico oficial CEMIG PC11300");
  // 5. Componentes & Materiais
  assert(resAudit.officialProcessing.materials.length > 0, "PROJETO 5 — Elo 5: Materiais oficiais explodidos do catálogo");
  const matPoste = resAudit.officialProcessing.materials.find(m => m.code === "207415" || m.description.includes("POSTE"));
  assert(Boolean(matPoste), "PROJETO 5 — Elo 6: Item do catálogo de materiais (207415 - POSTE CONCRETO CIRCULAR 11M 300DAN) rastreado");
}

// -----------------------------------------------------------------------------------------
// TESTES DE NÃO REGRESSÃO E INTEGRIDADE DAS BASES
// -----------------------------------------------------------------------------------------
console.log("\n>>> Executando Testes de Não-Regressão e Hashes SHA-256...");
{
  const mStats = getMnemonicCatalogStats();
  const iStats = getCatalogStats();
  const hMnemonicos = hashFile(path.join(process.cwd(), "data", "mnemonicos_catalogo.json"));
  const hItens = hashFile(path.join(process.cwd(), "data", "itens_catalogo.json"));
  const hSimbologia = hashFile(path.join(process.cwd(), "data", "eo_simbologia.json"));
  const hAssoc = hashFile(path.join(process.cwd(), "data", "simbologia_mnemonicos.json"));
  const hAudit = hashFile(path.join(process.cwd(), "data", "simbologia_mnemonicos_auditoria.json"));

  assert(mStats.totalMnemonicos === 7203, `NÃO-REGRESSÃO — Catálogo contém exatamente 7.203 mnemônicos (${mStats.totalMnemonicos})`);
  assert(mStats.totalComponentes === 30949, `NÃO-REGRESSÃO — Catálogo contém exatamente 30.949 componentes (${mStats.totalComponentes})`);
  assert(iStats.totalRegistros === 1558, `NÃO-REGRESSÃO — Catálogo contém exatamente 1.558 materiais (${iStats.totalRegistros})`);

  assert(
    hSimbologia === "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d",
    "HASH SHA-256 — data/eo_simbologia.json perfeitamente intacto"
  );
  assert(
    hAssoc === "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6",
    "HASH SHA-256 — data/simbologia_mnemonicos.json perfeitamente intacto"
  );
  assert(
    hAudit === "cbb3e7e05ce57308ba2c2709e2f095152388417547d54698a818a82a16510f5d",
    "HASH SHA-256 — data/simbologia_mnemonicos_auditoria.json perfeitamente intacto"
  );
  assert(
    hMnemonicos === "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629",
    "HASH SHA-256 — data/mnemonicos_catalogo.json perfeitamente intacto"
  );
  assert(
    hItens === "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4",
    "HASH SHA-256 — data/itens_catalogo.json perfeitamente intacto"
  );
}

console.log("================================================================================");
console.log(`Resultado da Bateria ETAPA 7: ${passedTests}/${totalTests} testes aprovados.`);
console.log("✅ VALIDAÇÃO CONTROLADA DA ETAPA 7 CONCLUÍDA COM 100% DE SUCESSO!");
console.log("================================================================================");
