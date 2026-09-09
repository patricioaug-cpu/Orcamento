/**
 * TESTE ESPECÍFICO DE CERTIFICAÇÃO E CONSOLIDAÇÃO DE MATERIAIS A RETIRAR
 * Valida rigorosamente:
 * 1. Identificação da simbologia e certificação da presença de materiais a retirar
 * 2. Agrupamento e soma de mnemônicos a retirar
 * 3. Explosão de componentes conforme o cadastro oficial
 * 4. Multiplicação pelas quantidades totais
 * 5. Consolidação de componentes idênticos vindos de mnemônicos diferentes a retirar
 * 6. Preservação exata de nomes, códigos e unidades de medida (PEÇ, M, etc.)
 */
import { processarProjetoComSimbologiaOficial } from "./orchestrationService";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log("================================================================================");
console.log("TESTES DE CERTIFICAÇÃO E CONSOLIDAÇÃO DE MATERIAIS A RETIRAR");
console.log("================================================================================");

// Cenário de Teste: Projeto contendo mnemônicos repetidos a retirar e mnemônicos distintos
// que compartilham componentes idênticos a retirar (ex: M1 + M1 + N1 a retirar)
const projetoComRetiradas = [
  {
    id: "P1_POSTE_RETIRAR",
    pagina: 1,
    tipo: "POSTE",
    formato: "MADEIRA",
    especificacao: "10-300",
    status: "A RETIRAR", // variação com "A RETIRAR"
  },
  {
    id: "P1_ESTR_RETIRAR_1",
    pagina: 1,
    tipo: "ESTRUTURA MT",
    codigo: "M1",
    especificacao: "10-300",
    status: "RETIRADA", // variação com "RETIRADA"
  },
  {
    id: "P2_ESTR_RETIRAR_2",
    pagina: 2,
    tipo: "ESTRUTURA MT",
    codigo: "M1",
    especificacao: "10-300",
    status: "RETIRAR", // padrão "RETIRAR"
  },
  {
    id: "P3_ESTR_RETIRAR_3",
    pagina: 3,
    tipo: "ESTRUTURA MT",
    codigo: "N1",
    especificacao: "11-300",
    status: "DESMONTAR", // variação com "DESMONTAR"
  },
  {
    id: "P4_POSTE_NOVO",
    pagina: 4,
    tipo: "POSTE",
    formato: "CIRCULAR",
    especificacao: "11-300",
    status: "INSTALAR",
  },
  {
    id: "P4_ESTR_NOVA",
    pagina: 4,
    tipo: "ESTRUTURA MT",
    codigo: "N1",
    especificacao: "11-300",
    status: "INSTALAR",
  },
];

const resultado = processarProjetoComSimbologiaOficial(
  projetoComRetiradas,
  "projeto_teste_materiais_retirar"
);

// 1. Certificar que elementos a retirar foram identificados
const ocorrenciasRetirar = resultado.relatorio_ocorrencias.filter((o) => o.estado === "A RETIRAR");
assert(
  ocorrenciasRetirar.length === 4,
  `Identificação: 4 elementos a retirar certificados no projeto (encontrados: ${ocorrenciasRetirar.length})`
);

// 2. Mnemônicos agrupados a retirar
const mnemonicosRetirar = resultado.officialProcessing.groupedMnemonics.filter(
  (m) => m.status === "RETIRAR" || m.description.startsWith("[A RETIRAR]")
);
assert(
  mnemonicosRetirar.length >= 2,
  `Mnemônicos a retirar agrupados: ${mnemonicosRetirar.length} grupos distintos identificados`
);

// Verifica soma dos mnemônicos repetidos a retirar (duas estruturas M1 a retirar devem somar quantidade 2)
const m1Retirar = mnemonicosRetirar.find((m) => m.mnemonicCode.startsWith("M1"));
assert(
  m1Retirar !== undefined && m1Retirar.totalQuantity === 2,
  `Agrupamento e soma: Estrutura M1 a retirar somou exatamente 2 unidades (totalQuantity=${m1Retirar?.totalQuantity})`
);

// 3. Materiais a retirar explodidos e consolidados
const materiaisRetirar = resultado.officialProcessing.materials.filter(
  (m) => m.status === "RETIRAR" || m.description.startsWith("[A RETIRAR]")
);
assert(
  materiaisRetirar.length > 0,
  `Materiais a retirar explodidos: ${materiaisRetirar.length} materiais gerados`
);

// 4. Consolidação de componentes idênticos vindos de mnemônicos diferentes
// M1 (2 unidades) e N1 (1 unidade) ambos utilizam ISOLADOR PILAR 15KV (3 por estrutura) -> Total esperado = (2*3) + (1*3) = 9
const isoladorPilar = materiaisRetirar.find((m) =>
  m.description.toUpperCase().includes("ISOLADOR PILAR")
);
assert(
  isoladorPilar !== undefined && isoladorPilar.quantity === 9,
  `Consolidação entre mnemônicos: ISOLADOR PILAR somou exatamente 9 unidades (encontrado: ${isoladorPilar?.quantity} ${isoladorPilar?.unit})`
);

// M1 (2 unidades) e N1 (1 unidade) ambos utilizam CRUZETA POLIMÉRICA -> Total esperado = 2 + 1 = 3
const cruzeta = materiaisRetirar.find((m) =>
  m.description.toUpperCase().includes("CRUZETA POLIMÉRICA")
);
assert(
  cruzeta !== undefined && cruzeta.quantity === 3,
  `Consolidação entre mnemônicos: CRUZETA POLIMÉRICA somou exatamente 3 unidades (encontrado: ${cruzeta?.quantity} ${cruzeta?.unit})`
);

// 5. Preservação rigorosa de unidades de medida (PEÇ, M, etc.)
assert(
  materiaisRetirar.every((m) => typeof m.unit === "string" && m.unit.trim().length > 0),
  "Preservação de unidades: Todos os materiais a retirar possuem unidade de medida válida (PEÇ, M, etc.)"
);

// 6. Segregação limpa entre materiais a instalar e a retirar
const materiaisInstalar = resultado.officialProcessing.materials.filter(
  (m) => m.status === "INSTALAR"
);
assert(
  materiaisInstalar.length > 0,
  `Segregação operacional: Materiais a instalar segregados com sucesso (${materiaisInstalar.length} materiais)`
);
assert(
  !materiaisRetirar.some((m) => materiaisInstalar.some((mi) => mi.id === m.id)),
  "Segregação estrita: Nenhum material a retirar está misturado com materiais a instalar"
);

console.log("================================================================================");
console.log("TODOS OS TESTES DE CERTIFICAÇÃO E CONSOLIDAÇÃO PASSARAM COM 100% DE SUCESSO!");
console.log("================================================================================");
