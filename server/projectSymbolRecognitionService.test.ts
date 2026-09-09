import {
  reconhecerSimbologiaProjeto,
  ProjectSymbolCandidateInput,
  getAllOfficialSymbols,
} from "./projectSymbolRecognitionService";
import { getAssociacaoPorSimboloId } from "./simbologiaMnemonicService";
import { processOfficialMnemonics } from "./mnemonicService";
import { loadItemCatalog } from "./itemCatalogService";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function calculateSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

console.log("====================================================");
console.log("BATERIA DE TESTES OBRIGATÓRIOS — ETAPA 5");
console.log("RECONHECIMENTO DA SIMBOLOGIA OFICIAL EM PROJETOS");
console.log("====================================================");

let totalPassed = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    totalPassed++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   Detalhe: ${detail}`);
    process.exit(1);
  }
}

// ----------------------------------------------------
// TESTE 1 — Símbolo oficial claramente reconhecido
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    {
      id: "CAND_01",
      pagina_projeto: 1,
      coordenadas: { x: 120, y: 340, width: 30, height: 30 },
      coordenadas_disponiveis: true,
      id_simbolo_sugerido: "SIMB-P01-01",
      descricao_visual: "POSTE DE CONCRETO SEÇÃO CIRCULAR",
      estado_operacional: "A INSTALAR",
    },
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_teste.pdf");
  assert(res.estatisticas.reconhecidos_alta === 1, "TESTE 1 — Estatística de reconhecidos com confiança ALTA == 1");
  assert(res.reconhecimentos.length === 1, "TESTE 1 — Array de reconhecimentos com 1 item");
  const r = res.reconhecimentos[0];
  assert(r.status === "RECONHECIDO", "TESTE 1 — Status == RECONHECIDO");
  assert(r.confianca === "ALTA", "TESTE 1 — Confiança == ALTA");
  assert(r.id_simbolo_oficial === "SIMB-P01-01", "TESTE 1 — ID do símbolo oficial correto (SIMB-P01-01)");
  assert(r.pagina_fonte_oficial === 1, "TESTE 1 — Página fonte oficial correta (Pág. 1)");
  assert(res.simbolos_validados_para_associacao.length === 1, "TESTE 1 — Exatamente 1 símbolo validado para associação");
}

// ----------------------------------------------------
// TESTE 2 — Símbolo inexistente na base
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    {
      id: "CAND_DESCONHECIDO",
      pagina_projeto: 2,
      coordenadas: { x: 400, y: 500 },
      rotulo_ou_sigla: "DISJUNTOR_FANTASMA_XYZ",
      descricao_visual: "EQUIPAMENTO DESCONHECIDO ALIENÍGENA",
      estado_operacional: "A INSTALAR",
    },
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_teste.pdf");
  assert(res.estatisticas.nao_reconhecidos === 1, "TESTE 2 — Estatística de não reconhecidos == 1");
  assert(res.simbolos_validados_para_associacao.length === 0, "TESTE 2 — 0 símbolos validados para associação (Zero Alucinação)");
  assert(res.nao_reconhecidos.length === 1, "TESTE 2 — Relatório estruturado de não reconhecidos com 1 item");
  const nr = res.nao_reconhecidos[0];
  assert(nr.pagina === 2, "TESTE 2 — Página do símbolo não reconhecido registrada");
  assert(nr.motivo.length > 0, "TESTE 2 — Motivo do não reconhecimento devidamente registrado");
}

// ----------------------------------------------------
// TESTE 3 — Símbolo ambíguo
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    {
      id: "CAND_AMBIGUO",
      pagina_projeto: 1,
      descricao_visual: "POSTE", // Descrição genérica que abrange múltiplos símbolos da base
      estado_operacional: "EXISTENTE",
    },
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_teste.pdf");
  assert(res.estatisticas.ambiguos_media === 1, "TESTE 3 — Símbolo com ambiguidade visual recebe confiança MEDIA");
  assert(res.simbolos_validados_para_associacao.length === 0, "TESTE 3 — Símbolo ambíguo NÃO avança automaticamente para associação");
  const amb = res.reconhecimentos[0];
  assert(amb.status === "AMBIGUO", "TESTE 3 — Status formal == AMBIGUO");
  assert(amb.confianca === "MEDIA", "TESTE 3 — Confiança == MEDIA");
}

// ----------------------------------------------------
// TESTE 4 — Mesmo símbolo aparecendo múltiplas vezes
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    { id: "C1", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "A INSTALAR" },
    { id: "C2", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "A INSTALAR" },
    { id: "C3", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "A INSTALAR" },
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_multi.pdf");
  assert(res.reconhecimentos.length === 3, "TESTE 4 — Multiplicidade: 3 ocorrências mantidas individualmente");
  assert(
    res.reconhecimentos[0].id_reconhecimento !== res.reconhecimentos[1].id_reconhecimento,
    "TESTE 4 — IDs de reconhecimento únicos para cada ocorrência"
  );
  assert(res.simbolos_validados_para_associacao.length === 3, "TESTE 4 — Todas as 3 ocorrências validadas para associação posterior");
}

// ----------------------------------------------------
// TESTE 5 — Símbolos em páginas diferentes
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    { id: "C_P1", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01" },
    { id: "C_P2", pagina_projeto: 2, id_simbolo_sugerido: "SIMB-P01-02" },
    { id: "C_P3", pagina_projeto: 3, id_simbolo_sugerido: "SIMB-P02-12" }, // Transformador
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_3_paginas.pdf");
  assert(res.reconhecimentos[0].pagina_projeto === 1, "TESTE 5 — Ocorrência 1 preserva Página 1");
  assert(res.reconhecimentos[1].pagina_projeto === 2, "TESTE 5 — Ocorrência 2 preserva Página 2");
  assert(res.reconhecimentos[2].pagina_projeto === 3, "TESTE 5 — Ocorrência 3 preserva Página 3");
}

// ----------------------------------------------------
// TESTE 6 — Símbolo com estado operacional
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    { id: "C_INST", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "A INSTALAR" },
    { id: "C_RET", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "A RETIRAR" },
    { id: "C_EXIST", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "EXISTENTE" },
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_estados.pdf");
  assert(res.reconhecimentos[0].estado_operacional_preservado === "A INSTALAR", "TESTE 6 — Estado A INSTALAR rigorosamente preservado");
  assert(res.reconhecimentos[1].estado_operacional_preservado === "A RETIRAR", "TESTE 6 — Estado A RETIRAR rigorosamente preservado");
  assert(res.reconhecimentos[2].estado_operacional_preservado === "EXISTENTE", "TESTE 6 — Estado EXISTENTE rigorosamente preservado");
}

// ----------------------------------------------------
// TESTE 7 — Símbolo sobreposto
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [
    {
      id: "C_SOBREPOSTO",
      pagina_projeto: 1,
      sobreposto: true,
      rotulo_ou_sigla: "SIMBOLOS_SOBREPOSTOS_DESENHO",
      estado_operacional: "A INSTALAR",
    },
  ];

  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_sobreposto.pdf");
  assert(res.estatisticas.sobrepostos_nao_resolvidos === 1, "TESTE 7 — Estatística de sobrepostos não resolvidos == 1");
  const sob = res.reconhecimentos[0];
  assert(sob.status === "SIMBOLOS_SOBREPOSTOS_NAO_RESOLVIDOS", "TESTE 7 — Status formal SIMBOLOS_SOBREPOSTOS_NAO_RESOLVIDOS");
  assert(res.simbolos_validados_para_associacao.length === 0, "TESTE 7 — Símbolos sobrepostos não resolvidos NÃO avançam para associação");
}

// ----------------------------------------------------
// TESTE 8 — Projeto sem símbolos reconhecíveis
// ----------------------------------------------------
{
  const candidatos: ProjectSymbolCandidateInput[] = [];
  const res = reconhecerSimbologiaProjeto(candidatos, "projeto_vazio.pdf");
  assert(res.estatisticas.total_candidatos === 0, "TESTE 8 — Total candidatos == 0");
  assert(res.reconhecimentos.length === 0, "TESTE 8 — Reconhecimentos == 0");
  assert(res.simbolos_validados_para_associacao.length === 0, "TESTE 8 — 0 símbolos para associação (Zero Alucinação)");
}

// ----------------------------------------------------
// TESTE 9 — Regressão dos mnemônicos (7.203 preservados)
// ----------------------------------------------------
{
  const mnemonicosRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/mnemonicos_catalogo.json"), "utf8"));
  const count = mnemonicosRaw.length;
  assert(count === 7203, `TESTE 9 — Catálogo Soberano contém exatamente 7.203 mnemônicos (encontrado: ${count})`);
}

// ----------------------------------------------------
// TESTE 10 — Regressão dos componentes (30.949 preservados)
// ----------------------------------------------------
{
  const mnemonicosRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/mnemonicos_catalogo.json"), "utf8"));
  let totalComp = 0;
  for (const m of mnemonicosRaw) {
    totalComp += (m.componentes || []).length;
  }
  assert(totalComp === 30949, `TESTE 10 — Total de Componentes oficiais é exatamente 30.949 (encontrado: ${totalComp})`);
}

// ----------------------------------------------------
// TESTE 11 — Regressão do catálogo (1.558 materiais preservados)
// ----------------------------------------------------
{
  const catalog = loadItemCatalog();
  const total = catalog.records.length;
  assert(total === 1558, `TESTE 11 — Catálogo Oficial contém exatamente 1.558 materiais (encontrado: ${total})`);
}

// ----------------------------------------------------
// TESTE 12 — Regressão da geração de materiais
// ----------------------------------------------------
{
  // Simula fluxo integrado: Reconhecimento ALTA -> Associação Oficial -> Mnemônico -> Explosão
  const candidatos: ProjectSymbolCandidateInput[] = [
    { id: "P1", pagina_projeto: 1, id_simbolo_sugerido: "SIMB-P01-01", estado_operacional: "A INSTALAR" },
  ];

  const rec = reconhecerSimbologiaProjeto(candidatos, "teste_fluxo.pdf");
  assert(rec.simbolos_validados_para_associacao.length === 1, "TESTE 12 — Símbolo validado com ALTA");

  const simbValido = rec.simbolos_validados_para_associacao[0];
  const assoc = getAssociacaoPorSimboloId(simbValido.id_simbolo_oficial!);
  assert(assoc !== null && assoc.candidatos.length > 0, "TESTE 12 — Associação oficial obtida");

  const mnemonicoEscolhido = assoc!.candidatos[0].mnemonico_codigo; // ex: PC09150
  const explosion = processOfficialMnemonics({
    detectedPoles: [{ id: "P1", mnemonicCode: mnemonicoEscolhido, status: "INSTALAR", quantity: 1 }],
  });

  assert(explosion.materials.length > 0, "TESTE 12 — Materiais oficiais explodidos com sucesso");
  assert(explosion.groupedMnemonics.length === 1, "TESTE 12 — Mnemônico agrupado com sucesso");
  assert(explosion.groupedMnemonics[0].mnemonicCode === mnemonicoEscolhido, "TESTE 12 — Código de mnemônico preservado");
}

// ----------------------------------------------------
// TESTE EXTRA NÃO-REGRESSÃO — Hashes SHA256 de todas as bases
// ----------------------------------------------------
{
  const hSimb = calculateSha256("data/eo_simbologia.json");
  const hAssoc = calculateSha256("data/simbologia_mnemonicos.json");
  const hMnem = calculateSha256("data/mnemonicos_catalogo.json");
  const hItens = calculateSha256("data/itens_catalogo.json");

  assert(hSimb === "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d", "TESTE HASH — data/eo_simbologia.json perfeitamente intacto");
  assert(hAssoc === "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6", "TESTE HASH — data/simbologia_mnemonicos.json perfeitamente intacto");
  assert(hMnem === "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629", "TESTE HASH — data/mnemonicos_catalogo.json perfeitamente intacto");
  assert(hItens === "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4", "TESTE HASH — data/itens_catalogo.json perfeitamente intacto");
}

console.log("-------------------------------------------------");
console.log(`Resultado da Bateria ETAPA 5: ${totalPassed}/${totalTests} testes aprovados.`);
console.log("✅ TODOS OS TESTES DA ETAPA 5 PASSARAM COM SUCESSO!");
