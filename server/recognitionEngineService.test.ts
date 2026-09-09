import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  executarMotorReconhecimento,
  ElementoDetectadoInput,
  RelatorioReconhecimentoProjeto,
} from "./recognitionEngineService";
import { processOfficialMnemonics } from "./mnemonicService";
import { getAllCatalogRecords } from "./itemCatalogService";

export function runEtapa3ValidationSuite() {
  console.log("====================================================");
  console.log("BATERIA DE TESTES OBRIGATÓRIOS — ETAPA 3");
  console.log("MOTOR DE RECONHECIMENTO E MAPEAMENTO DETERMINÍSTICO");
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

  // ----------------------------------------------------
  // TESTE 1: Símbolo oficialmente conhecido -> símbolo → estrutura → mnemônico correto
  // ----------------------------------------------------
  const inputT1: ElementoDetectadoInput[] = [
    {
      id: "P1",
      tipo: "POSTE",
      formato: "CIRCULAR",
      material: "CONCRETO",
      especificacao: "11-300",
      status: "INSTALAR",
      pagina: 1,
    },
    {
      id: "P2",
      tipo: "ESTAI",
      descricao: "ESTAI DE CRUZETA A CRUZETA",
      status: "INSTALAR",
      pagina: 1,
    },
  ];
  const resT1 = executarMotorReconhecimento(inputT1, "PROJETO_TESTE_1.pdf");
  const p1 = resT1.elementos_reconhecidos.find((e) => e.id === "P1");
  const p2 = resT1.elementos_reconhecidos.find((e) => e.id === "P2");

  assert(
    p1?.status === "RECONHECIDO" &&
      p1.simbolo_id === "SIMB-P01-01" &&
      p1.mnemonico_identificado === "PC11300" &&
      p2?.status === "RECONHECIDO" &&
      p2.simbolo_id === "SIMB-P03-61" &&
      p2.mnemonico_identificado === "EST64CZCZ",
    "TESTE 1 — Símbolo oficialmente conhecido → símbolo → estrutura → mnemônico correto",
    `P1: ${p1?.mnemonico_identificado} | P2: ${p2?.mnemonico_identificado}`
  );

  // ----------------------------------------------------
  // TESTE 2: Símbolo inexistente -> NÃO RECONHECIDO / SIMBOLO_NAO_COMPROVADO
  // ----------------------------------------------------
  const inputT2: ElementoDetectadoInput[] = [
    {
      id: "X1",
      tipo: "TURBINA_EOLICA_FICTICIA_99",
      descricao: "ELEMENTO ESTRANHO NAO EXISTENTE NA ND-3.1",
      pagina: 1,
    },
  ];
  const resT2 = executarMotorReconhecimento(inputT2, "PROJETO_TESTE_2.pdf");
  const x1 = resT2.elementos_pendentes_ou_nao_encontrados.find((e) => e.id === "X1");

  assert(
    x1?.status === "NAO_RECONHECIDO" && x1.mnemonico_identificado === null,
    "TESTE 2 — Símbolo inexistente → NÃO RECONHECIDO (Sem inventar mnemônico)",
    `Status obtido: ${x1?.status}`
  );

  // ----------------------------------------------------
  // TESTE 3: Símbolo conhecido, mas sem mnemônico -> MNEMÔNICO NÃO ENCONTRADO
  // ----------------------------------------------------
  const inputT3: ElementoDetectadoInput[] = [
    {
      id: "COB1",
      simboloSugestao: "SIMB-P01-14", // Cobertura protetora para rede BT (Não é mais instalado)
      descricao: "COBERTURA PROTETORA PARA REDE AÉREA BT",
      pagina: 1,
    },
  ];
  const resT3 = executarMotorReconhecimento(inputT3, "PROJETO_TESTE_3.pdf");
  const cob1 = resT3.elementos_pendentes_ou_nao_encontrados.find((e) => e.id === "COB1");

  assert(
    cob1?.status === "MNEMONICO_NAO_ENCONTRADO" && cob1.simbolo_id === "SIMB-P01-14",
    "TESTE 3 — Símbolo oficial conhecido sem mnemônico no catálogo → MNEMÔNICO NÃO ENCONTRADO",
    `Status: ${cob1?.status}, Símbolo: ${cob1?.simbolo_id}`
  );

  // ----------------------------------------------------
  // TESTE 4: Símbolo ambíguo -> AMBÍGUO (com opções e sem escolha arbitrária)
  // ----------------------------------------------------
  const inputT4: ElementoDetectadoInput[] = [
    {
      id: "P_AMB",
      tipo: "POSTE",
      formato: "CIRCULAR",
      material: "CONCRETO",
      // Sem especificação de altura e esforço
      pagina: 1,
    },
  ];
  const resT4 = executarMotorReconhecimento(inputT4, "PROJETO_TESTE_4.pdf");
  const pAmb = resT4.elementos_ambiguos.find((e) => e.id === "P_AMB");

  assert(
    pAmb?.status === "AMBIGUO" &&
      pAmb.mnemonico_identificado === null &&
      Array.isArray(pAmb.possibilidades_oficiais) &&
      pAmb.possibilidades_oficiais.length > 1,
    "TESTE 4 — Símbolo ambíguo sem dados suficientes → AMBÍGUO (Apresenta alternativas oficiais sem escolha arbitrária)",
    `Possibilidades listadas: ${pAmb?.possibilidades_oficiais?.length}`
  );

  // ----------------------------------------------------
  // TESTE 5: Símbolo com estado operacional -> Verificar preservação correta do estado
  // ----------------------------------------------------
  const inputT5: ElementoDetectadoInput[] = [
    { id: "P_INST", tipo: "POSTE", especificacao: "11-300", formato: "CIRCULAR", status: "INSTALAR", pagina: 1 },
    { id: "P_RET", tipo: "POSTE", especificacao: "11-300", formato: "CIRCULAR", status: "RETIRAR", pagina: 1 },
    { id: "P_EXIST", tipo: "POSTE", especificacao: "11-300", formato: "CIRCULAR", status: "EXISTENTE", pagina: 1 },
  ];
  const resT5 = executarMotorReconhecimento(inputT5, "PROJETO_TESTE_5.pdf");
  const inst = resT5.elementos_reconhecidos.find((e) => e.id === "P_INST");
  const ret = resT5.elementos_reconhecidos.find((e) => e.id === "P_RET");
  const exist = resT5.elementos_reconhecidos.find((e) => e.id === "P_EXIST");

  assert(
    inst?.status_operacional === "INSTALAR" &&
      ret?.status_operacional === "RETIRAR" &&
      exist?.status_operacional === "EXISTENTE",
    "TESTE 5 — Preservação rigorosa dos estados operacionais (INSTALAR, RETIRAR, EXISTENTE)"
  );

  // ----------------------------------------------------
  // TESTE 6: PDF com múltiplas páginas -> Verificar rastreabilidade da página
  // ----------------------------------------------------
  const inputT6: ElementoDetectadoInput[] = [
    { id: "P1_FL1", tipo: "POSTE", especificacao: "11-300", formato: "CIRCULAR", pagina: 1 },
    { id: "P10_FL2", tipo: "POSTE", especificacao: "12-600", formato: "CIRCULAR", pagina: 2 },
    { id: "P25_FL3", tipo: "POSTE", especificacao: "10-300", formato: "DUPLO T", pagina: 3 },
  ];
  const resT6 = executarMotorReconhecimento(inputT6, "PROJETO_MULTIPAGINA.pdf");
  const fl1 = resT6.elementos_reconhecidos.find((e) => e.id === "P1_FL1");
  const fl2 = resT6.elementos_reconhecidos.find((e) => e.id === "P10_FL2");
  const fl3 = resT6.elementos_reconhecidos.find((e) => e.id === "P25_FL3");

  assert(
    fl1?.pagina === 1 && fl2?.pagina === 2 && fl3?.pagina === 3,
    "TESTE 6 — Rastreabilidade completa do número da página do documento (Páginas 1, 2, 3)"
  );

  // ----------------------------------------------------
  // TESTE 7: Imagem JPEG -> Verificar compatibilidade de entrada
  // ----------------------------------------------------
  const inputT7: ElementoDetectadoInput[] = [
    { id: "P_JPEG", tipo: "POSTE", formato: "CIRCULAR", especificacao: "10-300", status: "INSTALAR", pagina: 1 },
  ];
  const resT7 = executarMotorReconhecimento(inputT7, "DESENHO_SCAN.jpg");
  const pJpeg = resT7.elementos_reconhecidos.find((e) => e.id === "P_JPEG");

  assert(
    pJpeg?.status === "RECONHECIDO" && pJpeg.mnemonico_identificado === "PC10300",
    "TESTE 7 — Imagem JPEG / Desenho técnico → Reconhecimento determinístico correto"
  );

  // ----------------------------------------------------
  // TESTE 8: Projeto com múltiplos símbolos -> Todos processados individualmente
  // ----------------------------------------------------
  const inputT8: ElementoDetectadoInput[] = [
    { id: "P1", tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", pagina: 1 },
    { id: "P2", tipo: "POSTE", formato: "DUPLO T", especificacao: "12-600", pagina: 1 },
    { id: "TR1", tipo: "TRANSFORMADOR", descricao: "TRANSFORMADOR 45KVA 15KV", pagina: 1 },
    { id: "CAB1", tipo: "CABO", descricao: "CONDUTOR CAA 1/0 AWG", pagina: 1, quantidade: 150 },
  ];
  const resT8 = executarMotorReconhecimento(inputT8, "PROJETO_COMPLETO.pdf");

  assert(
    resT8.total_elementos_analisados === 4 &&
      resT8.elementos_reconhecidos.length === 4 &&
      resT8.mnemonicos_para_explosao.length === 4,
    "TESTE 8 — Projeto com múltiplos símbolos → Processamento e rastreabilidade individual completa"
  );

  // ----------------------------------------------------
  // TESTE 9: Projeto sem símbolos reconhecíveis -> Nenhum mnemônico inventado
  // ----------------------------------------------------
  const inputT9: ElementoDetectadoInput[] = [
    { id: "DES1", descricao: "DESENHO DE ARVORE E VEGETACAO" },
    { id: "DES2", descricao: "LIMITE DE PROPRIEDADE RURAL" },
  ];
  const resT9 = executarMotorReconhecimento(inputT9, "PLANTA_TOPOGRAFICA.pdf");

  assert(
    resT9.elementos_reconhecidos.length === 0 &&
      resT9.mnemonicos_para_explosao.length === 0 &&
      resT9.resumo_status.NAO_RECONHECIDO === 2,
    "TESTE 9 — Projeto sem símbolos elétricos reconhecíveis → 0 mnemônicos gerados (Proibição de alucinação)"
  );

  // ----------------------------------------------------
  // TESTE 10: Teste de Não-Regressão Absoluta
  // ----------------------------------------------------
  const criticalFiles = [
    { name: "data/mnemonicos_catalogo.json", expectedHash: "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629" },
    { name: "data/itens_catalogo.json", expectedHash: "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4" },
    { name: "data/mnemonicos_indice.json", expectedHash: "ffbd2247b8f1e58f6e0531e01b197d716c4eda2810743e3796ad9f500023dd5d" },
    { name: "data/itens_ambiguidades.json", expectedHash: "6490fb168cacf281853b35f68096f042b4f9143b0d6b2900856fe39a8f3ce13e" },
    { name: "data/eo_simbologia.json", expectedHash: "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d" },
    { name: "data/simbologia_mnemonicos.json", expectedHash: "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6" },
  ];

  let hashesIntact = true;
  for (const f of criticalFiles) {
    const buf = fs.readFileSync(path.join(process.cwd(), f.name));
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    if (hash !== f.expectedHash) {
      hashesIntact = false;
      console.error(`Hash divergente para ${f.name}: obtido ${hash}, esperado ${f.expectedHash}`);
    }
  }

  const mnemonicos = JSON.parse(fs.readFileSync("data/mnemonicos_catalogo.json", "utf8"));
  let totalComp = 0;
  mnemonicos.forEach((m: any) => (totalComp += m.componentes.length));
  const itens = getAllCatalogRecords();

  const explosionTest = processOfficialMnemonics({
    detectedPoles: [{ mnemonicCode: "PC11300", status: "INSTALAR" }],
  });

  assert(
    hashesIntact &&
      mnemonicos.length === 7203 &&
      totalComp === 30949 &&
      itens.length === 1558 &&
      explosionTest.materials.length > 0,
    "TESTE 10 — Não-Regressão: 7.203 mnemônicos, 30.949 componentes, 1.558 materiais e explosão intactos",
    `Mnemonicos: ${mnemonicos.length}, Componentes: ${totalComp}, Materiais: ${itens.length}`
  );

  console.log("-------------------------------------------------");
  console.log(`Resultado da Bateria ETAPA 3: ${passed}/${passed + failed} testes aprovados.`);
  if (failed === 0) {
    console.log("✅ TODOS OS 10 TESTES DA ETAPA 3 PASSARAM COM SUCESSO!");
  } else {
    throw new Error(`Falha em ${failed} testes.`);
  }

  return { passed, failed };
}

if (process.argv[1] && process.argv[1].endsWith("recognitionEngineService.test.ts")) {
  runEtapa3ValidationSuite();
}
