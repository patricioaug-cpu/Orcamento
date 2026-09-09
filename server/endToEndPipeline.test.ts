import {
  processarProjetoComSimbologiaOficial,
  ResultadoIntegracaoProjeto,
} from "./orchestrationService";
import {
  reconhecerSimbologiaProjeto,
  getAllOfficialSymbols,
  getOfficialSymbolById,
} from "./projectSymbolRecognitionService";
import { getMnemonicCatalogStats } from "./mnemonicService";
import { getCatalogStats } from "./itemCatalogService";
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

console.log("====================================================");
console.log("BATERIA DE TESTES END-TO-END — ETAPA 6");
console.log("CONEXÃO INTEGRADA: PROJETO -> RECONHECIMENTO -> CLASSIFICAÇÃO -> ASSOCIAÇÃO -> MNEMÔNICO -> EXPLOSÃO -> MATERIAIS");
console.log("====================================================");

// ----------------------------------------------------
// TESTE 1 — Rastreabilidade completa com relatório de simbologia integrado
// ----------------------------------------------------
{
  const res = processarProjetoComSimbologiaOficial(
    [
      {
        id: "P1",
        pagina: 1,
        tipo: "POSTE",
        formato: "CIRCULAR",
        especificacao: "11-300",
        status: "INSTALAR",
      },
      {
        id: "TR1",
        pagina: 2,
        tipo: "TRANSFORMADOR",
        simboloSugestao: "SIMB-P02-44",
        especificacao: "45KVA 13.8KV",
        status: "INSTALAR",
      },
    ],
    "projeto_e2e.pdf"
  );

  assert(res.arquivo === "projeto_e2e.pdf", "TESTE 1 — Arquivo de origem registrado");
  assert(Boolean(res.relatorioSimbologia), "TESTE 1 — Relatório de simbologia oficial presente na saída");
  assert(res.relatorioSimbologia.estatisticas.reconhecidos_alta === 2, "TESTE 1 — Estatística de reconhecidos com confiança ALTA == 2");
  assert(res.relatorioSimbologia.simbolos_validados_para_associacao.length === 2, "TESTE 1 — 2 símbolos validados para associação");
  assert(res.officialProcessing.materials.length > 0, "TESTE 1 — Materiais oficiais gerados a partir do fluxo integrado");
}

// ----------------------------------------------------
// TESTE 2 — Símbolo não reconhecido reportado no relatório sem gerar materiais
// ----------------------------------------------------
{
  const res = processarProjetoComSimbologiaOficial(
    [
      {
        id: "UNKNOWN_1",
        pagina: 3,
        tipo: "DISPOSITIVO_INVENTADO",
        descricao: "Elemento fantasma sem correspondência",
        status: "INSTALAR",
      },
    ],
    "projeto_desconhecido.pdf"
  );

  assert(res.relatorioSimbologia.estatisticas.nao_reconhecidos === 1, "TESTE 2 — Relatório de simbologia registra 1 não-reconhecido");
  assert(res.relatorioSimbologia.simbolos_validados_para_associacao.length === 0, "TESTE 2 — 0 símbolos validados para associação");
  assert(res.officialProcessing.materials.length === 0, "TESTE 2 — Zero materiais gerados para elemento não reconhecido (Zero Alucinação)");
}

// ----------------------------------------------------
// TESTE 3 — Multi-páginas com preservação estrita de números de página
// ----------------------------------------------------
{
  const res = processarProjetoComSimbologiaOficial(
    [
      { id: "P1", pagina: 1, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
      { id: "P2", pagina: 5, tipo: "POSTE", formato: "CIRCULAR", especificacao: "11-300", status: "INSTALAR" },
    ],
    "projeto_multipaginas.pdf"
  );

  assert(res.relatorioSimbologia.reconhecimentos[0].pagina_projeto === 1, "TESTE 3 — Ocorrência 1 preserva Página 1");
  assert(res.relatorioSimbologia.reconhecimentos[1].pagina_projeto === 5, "TESTE 3 — Ocorrência 2 preserva Página 5");
  assert(res.officialProcessing.groupedMnemonics[0].totalQuantity === 2, "TESTE 3 — Consolidação de 2 unidades do mesmo mnemônico entre páginas");
}

// ----------------------------------------------------
// TESTE 4 — Integridade do endpoint de símbolos oficiais
// ----------------------------------------------------
{
  const symbols = getAllOfficialSymbols();
  assert(symbols.length === 142, `TESTE 4 — Base oficial contém exatamente 142 símbolos (encontrado: ${symbols.length})`);
  const s1 = getOfficialSymbolById("SIMB-P01-01");
  assert(s1 !== null && s1.pagina_pdf === 1, "TESTE 4 — Símbolo SIMB-P01-01 localizado com página oficial 1");
}

// ----------------------------------------------------
// TESTE 5 — Auditoria de Não-Regressão das 4 Bases Críticas
// ----------------------------------------------------
{
  const mStats = getMnemonicCatalogStats();
  const iStats = getCatalogStats();
  const hMnemonicos = hashFile(path.join(process.cwd(), "data", "mnemonicos_catalogo.json"));
  const hItens = hashFile(path.join(process.cwd(), "data", "itens_catalogo.json"));
  const hSimbologia = hashFile(path.join(process.cwd(), "data", "eo_simbologia.json"));
  const hAssoc = hashFile(path.join(process.cwd(), "data", "simbologia_mnemonicos.json"));

  assert(mStats.totalMnemonicos === 7203, `TESTE 5 — Catálogo contém 7.203 mnemônicos (encontrado: ${mStats.totalMnemonicos})`);
  assert(mStats.totalComponentes === 30949, `TESTE 5 — Catálogo contém 30.949 componentes (encontrado: ${mStats.totalComponentes})`);
  assert(iStats.totalRegistros === 1558, `TESTE 5 — Catálogo contém 1.558 materiais (encontrado: ${iStats.totalRegistros})`);

  assert(
    hSimbologia === "d54b6047c8ffefd894a249dc12ac769de8df3b33d3c5067aff5e3d3fa790bc5d",
    "TESTE 5 — data/eo_simbologia.json perfeitamente intacto"
  );
  assert(
    hAssoc === "c5b97f2b8f364341915204aecfc1a23769c03f39f2cc726eace97758d0ecacb6",
    "TESTE 5 — data/simbologia_mnemonicos.json perfeitamente intacto"
  );
  assert(
    hMnemonicos === "111443b11e3ae9bbbf21ea255148e8909c2d9dfad60d0d4931dac699f26d0629",
    "TESTE 5 — data/mnemonicos_catalogo.json perfeitamente intacto"
  );
  assert(
    hItens === "a52cd12b6cc351a44abc4031f6de76bfa48942a7b95379928b2e5c6c19ee9cc4",
    "TESTE 5 — data/itens_catalogo.json perfeitamente intacto"
  );
}

console.log("-------------------------------------------------");
console.log(`Resultado da Bateria ETAPA 6: ${passedTests}/${totalTests} testes aprovados.`);
console.log("✅ TODOS OS TESTES DA ETAPA 6 PASSARAM COM SUCESSO!");
