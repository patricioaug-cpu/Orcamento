import fs from "node:fs";
import path from "node:path";
import {
  loadAssociacoesBase,
  getAssociacaoPorSimboloId,
  ItemAssociacao,
  CandidatoMnemonico,
} from "./simbologiaMnemonicService";
import { getAllOfficialMnemonics, OfficialMnemonic, resolveMnemonicRecords } from "./mnemonicService";
import { getSimbologiaOficial, ItemSimbologia, CategoriaSimbologia } from "./simbologiaService";

export type RecognitionStatus =
  | "RECONHECIDO"
  | "RECONHECIDO_COM_RESSALVA"
  | "NAO_RECONHECIDO"
  | "MNEMONICO_NAO_ENCONTRADO"
  | "AMBIGUO"
  | "SIMBOLO_NAO_COMPROVADO";

export type OperationalStatus = "INSTALAR" | "RETIRAR" | "EXISTENTE";
export type NivelConfianca = "ALTA" | "MEDIA" | "BAIXA";

export interface ElementoDetectadoInput {
  id?: string;
  pagina?: number;
  tipo?: string;
  codigo?: string;
  mnemonicCode?: string;
  simboloSugestao?: string;
  descricao?: string;
  formato?: string;
  material?: string;
  especificacao?: string;
  tensao?: string;
  status?: string;
  localizacao?: string;
  observacoes?: string;
  quantidade?: number;
}

export interface ReconhecimentoAuditItem {
  id: string;
  pagina: number;
  elemento_detectado: string;
  simbolo_oficial: string | null;
  simbolo_id: string | null;
  codigo_simbolo: string | null;
  categoria: string | null;
  estrutura: string | null;
  mnemonico_identificado: string | null;
  mnemonico_descricao: string | null;
  status: RecognitionStatus;
  confianca: NivelConfianca;
  status_operacional: OperationalStatus;
  quantidade: number;
  fonte_simbologia: string;
  justificativa: string;
  possibilidades_oficiais?: {
    codigo: string;
    descricao: string;
  }[];
  observacoes?: string;
}

export interface RelatorioReconhecimentoProjeto {
  versao_motor: string;
  arquivo_origem?: string;
  total_elementos_analisados: number;
  resumo_status: Record<RecognitionStatus, number>;
  elementos_reconhecidos: ReconhecimentoAuditItem[];
  elementos_ambiguos: ReconhecimentoAuditItem[];
  elementos_pendentes_ou_nao_encontrados: ReconhecimentoAuditItem[];
  mnemonicos_para_explosao: {
    mnemonicCode: string;
    quantity: number;
    status: OperationalStatus;
    location: string;
    kind: string;
  }[];
}

let mnemonicMapCache: Map<string, OfficialMnemonic> | null = null;
let symbolMapCache: Map<string, ItemSimbologia> | null = null;

function getMnemonicMap(): Map<string, OfficialMnemonic> {
  if (mnemonicMapCache) return mnemonicMapCache;
  const list = getAllOfficialMnemonics();
  mnemonicMapCache = new Map();
  for (const m of list) {
    mnemonicMapCache.set(m.codigo.trim().toUpperCase(), m);
  }
  return mnemonicMapCache;
}

function getSymbolMap(): Map<string, ItemSimbologia> {
  if (symbolMapCache) return symbolMapCache;
  const base = getSimbologiaOficial();
  symbolMapCache = new Map();
  for (const cat of base.categorias) {
    for (const item of cat.itens) {
      symbolMapCache.set(item.id.toUpperCase(), item);
      if (item.sigla) {
        symbolMapCache.set(`SIGLA_${item.sigla.toUpperCase()}`, item);
      }
    }
  }
  return symbolMapCache;
}

function normalizeOperationalStatus(raw: unknown, contextText?: string): OperationalStatus {
  const s = String(raw || "").trim().toUpperCase();
  if (
    s === "RETIRAR" ||
    s === "A RETIRAR" ||
    s === "A_RETIRAR" ||
    s === "RETIRADA" ||
    s === "RETIRADO" ||
    s === "DESMONTAR" ||
    s === "DESMONTAGEM" ||
    s === "REMOVER" ||
    s === "REMOCAO" ||
    s === "REMOÇÃO" ||
    s === "X" ||
    s === "[X]" ||
    s === "(X)" ||
    s.includes("RETIR") ||
    s.includes("DESMONT")
  ) {
    return "RETIRAR";
  }
  if (contextText) {
    const ctx = contextText.toUpperCase();
    if (ctx.includes("[A RETIRAR]") || ctx.includes("A RETIRAR") || ctx.includes("RETIRADA") || ctx.includes("DESMONTAGEM")) {
      return "RETIRAR";
    }
  }
  if (s === "EXISTENTE" || s.startsWith("(") || s.includes("EXIST")) return "EXISTENTE";
  return "INSTALAR";
}

/**
 * Encontra a associação oficial correspondente para um elemento detectado.
 */
function matchSymbolAssociation(input: ElementoDetectadoInput): {
  assoc: ItemAssociacao | null;
  simbolo: ItemSimbologia | null;
  matchReason: string;
} {
  const baseAssoc = loadAssociacoesBase();
  const symbolMap = getSymbolMap();

  const codeUpper = String(input.codigo || "").trim().toUpperCase();
  const mnemonicUpper = String(input.mnemonicCode || "").trim().toUpperCase();
  const descUpper = String(input.descricao || "").trim().toUpperCase();
  const typeUpper = String(input.tipo || "").trim().toUpperCase();
  const formatUpper = String(input.formato || "").trim().toUpperCase();
  const specUpper = String(input.especificacao || "").trim().toUpperCase();
  const simbSugestao = String(input.simboloSugestao || "").trim().toUpperCase();

  // 1. Busca direta por ID de símbolo se fornecido
  if (simbSugestao && (simbSugestao.startsWith("SIMB-") || simbSugestao.startsWith("ASSOC-"))) {
    const direct = getAssociacaoPorSimboloId(simbSugestao);
    if (direct) {
      const symb = symbolMap.get(direct.simbolo_id.toUpperCase()) || null;
      return { assoc: direct, simbolo: symb, matchReason: `Correspondência direta por identificador de símbolo oficial ${direct.simbolo_id}.` };
    }
  }

  // 2. Busca por categoria Postes
  if (typeUpper.includes("POSTE") || formatUpper.includes("CIRCULAR") || formatUpper.includes("DUPLO") || descUpper.includes("POSTE")) {
    let targetSymbolId = "SIMB-P01-01"; // Circular default
    if (formatUpper.includes("DUPLO") || descUpper.includes("DUPLO") || codeUpper.startsWith("PD")) {
      targetSymbolId = "SIMB-P01-02"; // Duplo T
    } else if (formatUpper.includes("MADEIRA") || descUpper.includes("MADEIRA") || codeUpper.startsWith("PM")) {
      targetSymbolId = "SIMB-P01-03"; // Madeira
    } else if (formatUpper.includes("RETANGULAR") || descUpper.includes("RETANGULAR") || codeUpper.startsWith("PRT")) {
      targetSymbolId = "SIMB-P01-04"; // Retangular
    }

    const assoc = getAssociacaoPorSimboloId(targetSymbolId);
    const symb = symbolMap.get(targetSymbolId) || null;
    if (assoc) {
      return { assoc, simbolo: symb, matchReason: `Identificado símbolo oficial ${targetSymbolId} (${assoc.nome_simbolo}) a partir de atributos geométricos e de material do poste.` };
    }
  }

  // 3. Busca por sigla/código oficial no catálogo de simbologia (ex: M1, M2, N2, N3, CE4, UT, CFS)
  for (const assoc of baseAssoc.associacoes) {
    const assocCode = assoc.codigo_simbolo?.toUpperCase() || "";
    const hasSymbolCodeMatch =
      assocCode &&
      (assocCode === codeUpper || (assocCode.length >= 3 && codeUpper.startsWith(assocCode)));
    const hasCandidateMatch =
      (codeUpper && assoc.candidatos.some((c) => c.mnemonico_codigo.toUpperCase() === codeUpper)) ||
      (mnemonicUpper && assoc.candidatos.some((c) => c.mnemonico_codigo.toUpperCase() === mnemonicUpper));

    if (hasSymbolCodeMatch || hasCandidateMatch) {
      const symb = symbolMap.get(assoc.simbolo_id.toUpperCase()) || null;
      return {
        assoc,
        simbolo: symb,
        matchReason: `Correspondência por código/sigla oficial [${codeUpper || mnemonicUpper || assoc.codigo_simbolo}] em ${assoc.nome_simbolo}.`,
      };
    }
  }

  // 4. Busca por transformadores
  if (typeUpper.includes("TRANSFORMADOR") || descUpper.includes("TRANSFORMADOR") || codeUpper.startsWith("TR") || mnemonicUpper.startsWith("TR")) {
    const targetSymbolId = descUpper.includes("CONVENCIONAL") ? "SIMB-P02-46" : "SIMB-P02-44";
    const assoc = getAssociacaoPorSimboloId(targetSymbolId);
    const symb = symbolMap.get(targetSymbolId) || null;
    if (assoc) return { assoc, simbolo: symb, matchReason: `Identificado símbolo oficial de Transformador (${targetSymbolId} - ${assoc.nome_simbolo}).` };
  }

  // 5. Busca por chaves
  if (typeUpper.includes("CHAVE") || descUpper.includes("CHAVE") || codeUpper.startsWith("CFS") || codeUpper.startsWith("CFC")) {
    if (descUpper.includes("FUSÍVEL") || descUpper.includes("FUSIVEL") || codeUpper.startsWith("CFS") || mnemonicUpper.startsWith("CFS")) {
      const assoc = getAssociacaoPorSimboloId("SIMB-P01-30");
      const symb = symbolMap.get("SIMB-P01-30") || null;
      if (assoc) return { assoc, simbolo: symb, matchReason: "Identificado símbolo oficial de Chave Fusível 100/200 A (SIMB-P01-30)." };
    }
    if (descUpper.includes("FACA") || descUpper.includes("SECCIONADORA") || codeUpper.startsWith("CFC")) {
      const assoc = getAssociacaoPorSimboloId("SIMB-P01-25");
      const symb = symbolMap.get("SIMB-P01-25") || null;
      if (assoc) return { assoc, simbolo: symb, matchReason: "Identificado símbolo oficial de Chave Faca Unipolar (SIMB-P01-25)." };
    }
  }

  // 6. Busca por para-raios
  if (typeUpper.includes("PARA-RAIO") || typeUpper.includes("PÁRA-RAIO") || descUpper.includes("PARA-RAIO") || descUpper.includes("PÁRA-RAIO") || codeUpper.startsWith("PR") || mnemonicUpper.startsWith("PR")) {
    const assoc = getAssociacaoPorSimboloId("SIMB-P02-42");
    const symb = symbolMap.get("SIMB-P02-42") || null;
    if (assoc) return { assoc, simbolo: symb, matchReason: "Identificado símbolo oficial de Pára-raios de M.T. (SIMB-P02-42)." };
  }

  // 7. Busca por estais
  if (typeUpper.includes("ESTAI") || descUpper.includes("ESTAI") || codeUpper.startsWith("EST") || mnemonicUpper.startsWith("EST")) {
    let targetSymbolId = "SIMB-P03-66"; // Estai de Âncora padrão
    if (descUpper.includes("CRUZETA A CRUZETA") || codeUpper.includes("CZCZ") || formatUpper.includes("CZ/CZ")) {
      targetSymbolId = "SIMB-P03-61";
    } else if (descUpper.includes("CRUZETA A POSTE")) {
      targetSymbolId = "SIMB-P03-60";
    }
    const assoc = getAssociacaoPorSimboloId(targetSymbolId);
    const symb = symbolMap.get(targetSymbolId) || null;
    if (assoc) return { assoc, simbolo: symb, matchReason: `Identificado símbolo oficial de Estai (${targetSymbolId} - ${assoc.nome_simbolo}).` };
  }

  // 8. Busca por condutores
  if (typeUpper.includes("CABO") || typeUpper.includes("CONDUTOR") || descUpper.includes("CABO") || descUpper.includes("CONDUTOR") || codeUpper.startsWith("CAA") || codeUpper.startsWith("CA") || mnemonicUpper.startsWith("CAA")) {
    const targetSymbolId = descUpper.includes("SECUNDÁRIO") || descUpper.includes("BT") ? "SIMB-P03-71" : "SIMB-P03-69";
    const assoc = getAssociacaoPorSimboloId(targetSymbolId);
    const symb = symbolMap.get(targetSymbolId) || null;
    if (assoc) return { assoc, simbolo: symb, matchReason: `Identificado símbolo oficial de Condutores (${targetSymbolId} - ${assoc.nome_simbolo}).` };
  }

  // 9. Busca por aterramento
  if (typeUpper.includes("ATERRAMENTO") || descUpper.includes("ATERRAMENTO") || codeUpper.startsWith("AT") || mnemonicUpper.startsWith("AT")) {
    const assoc = getAssociacaoPorSimboloId("SIMB-P01-17");
    const symb = symbolMap.get("SIMB-P01-17") || null;
    if (assoc) return { assoc, simbolo: symb, matchReason: "Identificado símbolo oficial de Aterramento (SIMB-P01-17)." };
  }

  // 10. Busca por nome aproximado na base oficial de símbolos
  for (const assoc of baseAssoc.associacoes) {
    if (descUpper && assoc.nome_simbolo && (descUpper.includes(assoc.nome_simbolo) || assoc.nome_simbolo.includes(descUpper))) {
      const symb = symbolMap.get(assoc.simbolo_id.toUpperCase()) || null;
      return { assoc, simbolo: symb, matchReason: `Correspondência textual com símbolo oficial ${assoc.nome_simbolo} (${assoc.simbolo_id}).` };
    }
  }

  return { assoc: null, simbolo: null, matchReason: "Nenhum símbolo correspondente localizado na base oficial de simbologia CEMIG." };
}

/**
 * Filtra e desambigua candidatos a mnemônico a partir de evidências concretas do desenho.
 */
function desambiguarCandidatos(
  input: ElementoDetectadoInput,
  candidatos: CandidatoMnemonico[]
): {
  escolhido: CandidatoMnemonico | null;
  filtrados: CandidatoMnemonico[];
  motivo: string;
} {
  if (!candidatos || candidatos.length === 0) {
    return { escolhido: null, filtrados: [], motivo: "Nenhum mnemônico candidato associado a este símbolo no catálogo." };
  }

  const mnemonicRaw = String(input.mnemonicCode || "").trim().toUpperCase();
  const codeRaw = String(input.codigo || "").trim().toUpperCase();
  const specRaw = String(input.especificacao || "").trim().toUpperCase();
  const descRaw = String(input.descricao || "").trim().toUpperCase();

  // 1. Se foi fornecido um código exato de mnemônico e ele consta na lista de candidatos oficiais
  if (mnemonicRaw) {
    const exact = candidatos.find((c) => c.mnemonico_codigo.toUpperCase() === mnemonicRaw);
    if (exact) {
      return {
        escolhido: exact,
        filtrados: [exact],
        motivo: `Mnemônico exato [${mnemonicRaw}] validado contra os candidatos oficiais da estrutura.`,
      };
    }
  }

  // 2. Se a especificação dimensional/técnica do elemento (ex: 11-300, 12-600, 45kVA, 1/0) coincide unívocamente
  const combinedSpecs = `${codeRaw} ${specRaw} ${descRaw}`.toUpperCase();

  // Caso Poste: extrair altura e esforço (ex: "11-300" -> "11300" ou "11" e "300")
  const poleMatch = combinedSpecs.match(/(\d{1,2})[\s\-_/]+(\d{3,4})/);
  if (poleMatch) {
    const altura = poleMatch[1].padStart(2, "0");
    const esforco = poleMatch[2];
    const key = `${altura}${esforco}`;
    let matches = candidatos.filter((c) => c.mnemonico_codigo.includes(key));

    const matUpper = String(input.material || "").toUpperCase();
    const formatUpper = String(input.formato || "").toUpperCase();

    // Se especificado Concreto ou formato Duplo T / Circular padrão
    if (matUpper.includes("CONCRETO") || (!matUpper && !formatUpper.includes("PRFV") && !formatUpper.includes("FIBRA"))) {
      if (formatUpper.includes("DUPLO") || codeRaw.startsWith("PD")) {
        matches = matches.filter((c) => c.mnemonico_codigo.startsWith("PD"));
      } else {
        // Concreto circular padronizado (PC sem PCPC)
        const concMatches = matches.filter(
          (c) => c.mnemonico_codigo.startsWith("PC") && !c.mnemonico_codigo.startsWith("PCPC")
        );
        if (concMatches.length > 0) matches = concMatches;
      }
    } else if (matUpper.includes("PRFV") || matUpper.includes("FIBRA") || formatUpper.includes("PRFV")) {
      matches = matches.filter((c) => c.mnemonico_codigo.startsWith("PCPC"));
    } else if (matUpper.includes("MADEIRA")) {
      matches = matches.filter((c) => c.mnemonico_codigo.startsWith("PM"));
    }

    if (matches.length === 1) {
      return {
        escolhido: matches[0],
        filtrados: matches,
        motivo: `Especificação técnica ${altura}-${esforco} determina unívocamente o mnemônico ${matches[0].mnemonico_codigo}.`,
      };
    }
    if (matches.length > 1) {
      // Se há um mnemônico padrão sem sufixo especializado (ex: PD10300 vs PD10300MED)
      const baseStandard = matches.find(
        (c) => c.mnemonico_codigo === `PD${key}` || c.mnemonico_codigo === `PC${key}` || c.mnemonico_codigo === `PM${key}`
      );
      const hasSpecialSpec = combinedSpecs.includes("MED") || combinedSpecs.includes("2P") || combinedSpecs.includes("IN");
      if (baseStandard && !hasSpecialSpec) {
        return {
          escolhido: baseStandard,
          filtrados: [baseStandard],
          motivo: `Especificação ${altura}-${esforco} corresponde ao mnemônico padrão oficial ${baseStandard.mnemonico_codigo}.`,
        };
      }
      return {
        escolhido: null,
        filtrados: matches,
        motivo: `Especificação ${altura}-${esforco} resultou em ${matches.length} candidatos oficiais compatíveis.`,
      };
    }
  }

  // Caso Transformador: potência (ex: "45", "75", "112.5", "150", "30", "15")
  const trafoMatch = combinedSpecs.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:KVA|K)/);
  if (trafoMatch) {
    const kva = trafoMatch[1].replace(".", "").replace(",", "");
    let matches = candidatos.filter((c) => c.mnemonico_codigo.includes(kva) || c.mnemonico_descricao.includes(kva));

    const tensaoInput = String(input.tensao || "").toUpperCase();
    const is345 = combinedSpecs.includes("34.5") || combinedSpecs.includes("345") || tensaoInput.includes("34.5") || tensaoInput.includes("19.9");
    const is138 = combinedSpecs.includes("15") || combinedSpecs.includes("13.8") || tensaoInput.includes("13.8") || tensaoInput.includes("7.97");

    if (is345) {
      const match34k = matches.filter((c) => (c.mnemonico_codigo.startsWith("TR3") || c.mnemonico_codigo.startsWith("TR1")) && (c.mnemonico_codigo.includes("35") || c.mnemonico_codigo.includes("34")));
      if (match34k.length > 0) matches = match34k;
    } else if (is138 || !combinedSpecs.includes("34.5")) {
      const match15k = matches.filter((c) => c.mnemonico_codigo.startsWith("TR3") && c.mnemonico_codigo.includes("15"));
      if (match15k.length > 0) matches = match15k;
    }

    if (matches.length === 1) {
      return {
        escolhido: matches[0],
        filtrados: matches,
        motivo: `Potência de ${trafoMatch[1]}kVA determina unívocamente o mnemônico de transformador ${matches[0].mnemonico_codigo}.`,
      };
    }
    if (matches.length > 1) {
      const targetSuffix = is345 ? "35" : "15";
      const baseTrafo = matches.find((c) => c.mnemonico_codigo === `TR3${kva}${targetSuffix}` || c.mnemonico_codigo === `TR1${kva}${targetSuffix}` || c.mnemonico_codigo === `TR3${kva}15` || c.mnemonico_codigo === `TR1${kva}15`);
      if (baseTrafo) {
        return {
          escolhido: baseTrafo,
          filtrados: [baseTrafo],
          motivo: `Potência de ${trafoMatch[1]}kVA corresponde ao mnemônico padrão ${baseTrafo.mnemonico_codigo}.`,
        };
      }
      return {
        escolhido: null,
        filtrados: matches,
        motivo: `Potência identificada (${trafoMatch[1]}kVA) possui múltiplos mnemônicos oficiais compatíveis (monofásico/trifásico/tensão).`,
      };
    }
  }

  // Caso Cabo: bitola (ex: "1/0", "4/0", "2", "4", "336", "70", "35", "9.5", "3N5")
  const isCAA = combinedSpecs.includes("CAA");

  if (combinedSpecs.includes("1/0") || combinedSpecs.includes("CAA10") || combinedSpecs.includes("10AWG") || combinedSpecs.includes("CA 1/0") || combinedSpecs.includes("53MM")) {
    const target = isCAA ? "CAA10" : "CA10";
    const match = candidatos.find((c) => c.mnemonico_codigo === target) || candidatos.find((c) => c.mnemonico_codigo === (isCAA ? "CA10" : "CAA10"));
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: `Bitola 1/0 AWG determina unívocamente o mnemônico oficial de condutor ${match.mnemonico_codigo}.`,
      };
    }
  }

  if (combinedSpecs.match(/\b4\s*AWG\b/i) || combinedSpecs.includes("CAA 4") || combinedSpecs.includes("CAA4") || combinedSpecs.includes("CA 4") || combinedSpecs.includes("21MM")) {
    const target = isCAA ? "CAA4" : "CA4";
    const match = candidatos.find((c) => c.mnemonico_codigo === target) || candidatos.find((c) => c.mnemonico_codigo === (isCAA ? "CA4" : "CAA4"));
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: `Bitola 4 AWG determina unívocamente o mnemônico oficial de condutor ${match.mnemonico_codigo}.`,
      };
    }
  }

  if (combinedSpecs.match(/\b2\s*AWG\b/i) || combinedSpecs.includes("CAA 2") || combinedSpecs.includes("CAA2") || combinedSpecs.includes("CA 2") || combinedSpecs.includes("34MM")) {
    const target = isCAA ? "CAA2" : "CA2";
    const match = candidatos.find((c) => c.mnemonico_codigo === target) || candidatos.find((c) => c.mnemonico_codigo === (isCAA ? "CA2" : "CAA2"));
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: `Bitola 2 AWG determina unívocamente o mnemônico oficial de condutor ${match.mnemonico_codigo}.`,
      };
    }
  }

  if (combinedSpecs.includes("4/0") || combinedSpecs.includes("CAA40") || combinedSpecs.includes("40AWG") || combinedSpecs.includes("CA 4/0") || combinedSpecs.includes("107MM")) {
    const target = isCAA ? "CAA40" : "CA40";
    const match = candidatos.find((c) => c.mnemonico_codigo === target) || candidatos.find((c) => c.mnemonico_codigo === (isCAA ? "CA40" : "CAA40"));
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: `Bitola 4/0 AWG determina unívocamente o mnemônico oficial de condutor ${match.mnemonico_codigo}.`,
      };
    }
  }

  if (combinedSpecs.includes("336") || combinedSpecs.includes("170MM")) {
    const target = isCAA ? "CAA336" : "CA336";
    const match = candidatos.find((c) => c.mnemonico_codigo === target) || candidatos.find((c) => c.mnemonico_codigo === (isCAA ? "CA336" : "CAA336"));
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: `Bitola 336,4 MCM determina unívocamente o mnemônico oficial de condutor ${match.mnemonico_codigo}.`,
      };
    }
  }

  if (combinedSpecs.includes("70") && (combinedSpecs.includes("ABCN") || combinedSpecs.includes("MULTIPLEX") || combinedSpecs.includes("BT") || combinedSpecs.includes("CQP"))) {
    const match = candidatos.find((c) => c.mnemonico_codigo === "CQP701" || c.mnemonico_codigo === "CATN70");
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: "Cabo multiplexado 70mm² determina mnemônico oficial correspondente.",
      };
    }
  }

  if (combinedSpecs.includes("35") && (combinedSpecs.includes("ABCN") || combinedSpecs.includes("MULTIPLEX") || combinedSpecs.includes("BT") || combinedSpecs.includes("CQP"))) {
    const match = candidatos.find((c) => c.mnemonico_codigo === "CQP351" || c.mnemonico_codigo === "CQP35");
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: "Cabo multiplexado 35mm² determina mnemônico oficial correspondente.",
      };
    }
  }

  if (combinedSpecs.includes("9.5") || combinedSpecs.includes("9,5") || combinedSpecs.includes("3/8") || combinedSpecs.includes("CACO95")) {
    const match = candidatos.find((c) => c.mnemonico_codigo === "CACO95");
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: "Cabo de aço 9,5mm (3/8) determina unívocamente o mnemônico CACO95.",
      };
    }
  }

  if (combinedSpecs.includes("3N5") || combinedSpecs.includes("CACO3N5")) {
    const match = candidatos.find((c) => c.mnemonico_codigo === "CACO3N5");
    if (match) {
      return {
        escolhido: match,
        filtrados: [match],
        motivo: "Cabo de aço 3N5 determina unívocamente o mnemônico CACO3N5.",
      };
    }
  }

  // Resolução determinística direta via resolveMnemonicRecords caso seja cabo ou aplicável aos candidatos
  const directResolvedCandidate = resolveMnemonicRecords(input.codigo || input.mnemonicCode || input.descricao, input.tensao);
  if (directResolvedCandidate.length > 0) {
    const primary = directResolvedCandidate[0];
    const candMatch = candidatos.find((c) => c.mnemonico_codigo === primary.codigo);
    if (candMatch) {
      return {
        escolhido: candMatch,
        filtrados: [candMatch],
        motivo: `Resolução determinística direta compatível com o catálogo oficial (${candMatch.mnemonico_codigo}).`,
      };
    }
    // Se for tipo cabo, adota o mnemônico oficial resolvido diretamente do catálogo
    const tUpper = String(input.tipo || "").toUpperCase();
    const dUpper = String(input.descricao || "").toUpperCase();
    if (tUpper.includes("CABO") || tUpper.includes("CONDUTOR") || dUpper.includes("CABO") || dUpper.includes("CONDUTOR") || dUpper.includes("MULTIPLEX")) {
      return {
        escolhido: {
          mnemonico_codigo: primary.codigo,
          mnemonico_descricao: primary.descricao,
          tipo_associacao: "POR_ESTRUTURA",
          confianca: "ALTA",
          justificativa: `Especificação de condutor/cabo (${input.codigo || input.descricao}) mapeada ao mnemônico oficial ${primary.codigo}.`,
        },
        filtrados: [],
        motivo: `Especificação de cabo determina unívocamente o mnemônico ${primary.codigo}.`,
      };
    }
  }

  // Caso Chave Fusível: corrente/tensão (ex: 100A, 200A, 15kV vs 35kV)
  if (combinedSpecs.includes("100A") || combinedSpecs.includes("100 A") || combinedSpecs.includes("FUSÍVEL") || combinedSpecs.includes("FUSIVEL")) {
    const tensaoInput = String(input.tensao || "").toUpperCase();
    const is345 = combinedSpecs.includes("34.5") || combinedSpecs.includes("35") || tensaoInput.includes("34.5");
    
    if (is345) {
      const match35k = candidatos.find((c) => c.mnemonico_codigo.includes("35KV") || (c.mnemonico_codigo.includes("100") && c.mnemonico_codigo.includes("35")));
      if (match35k) {
        return {
          escolhido: match35k,
          filtrados: [match35k],
          motivo: "Especificação de chave fusível 100A / 34,5kV determina mnemônico oficial correspondente.",
        };
      }
    }
    
    const match100 = candidatos.find((c) => c.mnemonico_codigo === "CFS1RP10071KA15KV" || c.mnemonico_codigo.includes("100"));
    if (match100) {
      return {
        escolhido: match100,
        filtrados: [match100],
        motivo: "Especificação de chave fusível 100A determina mnemônico oficial correspondente.",
      };
    }
  }

  // Se houver apenas 1 candidato na lista original
  if (candidatos.length === 1) {
    return {
      escolhido: candidatos[0],
      filtrados: candidatos,
      motivo: "Mnemônico oficial único associado ao símbolo no catálogo.",
    };
  }

  // Se restaram múltiplos candidatos sem evidência para desambiguar
  return {
    escolhido: null,
    filtrados: candidatos,
    motivo: `Símbolo possui ${candidatos.length} mnemônicos oficiais candidatos e o desenho não forneceu especificações unívocas suficientes.`,
  };
}

/**
 * Função principal do motor: interpreta um conjunto de elementos detectados
 * e executa a cadeia determinística oficial:
 * SÍMBOLO IDENTIFICADO -> REGISTRO DA SIMBOLOGIA OFICIAL -> ASSOCIAÇÃO OFICIAL -> ESTRUTURA -> MNEMÔNICO EXISTENTE
 */
export function executarMotorReconhecimento(
  elementos: ElementoDetectadoInput[],
  arquivoOrigem?: string
): RelatorioReconhecimentoProjeto {
  const mnemonicCatalog = getMnemonicMap();
  const auditList: ReconhecimentoAuditItem[] = [];

  const statusCount: Record<RecognitionStatus, number> = {
    RECONHECIDO: 0,
    RECONHECIDO_COM_RESSALVA: 0,
    NAO_RECONHECIDO: 0,
    MNEMONICO_NAO_ENCONTRADO: 0,
    AMBIGUO: 0,
    SIMBOLO_NAO_COMPROVADO: 0,
  };

  const mnemonicosParaExplosao: RelatorioReconhecimentoProjeto["mnemonicos_para_explosao"] = [];

  elementos.forEach((el, index) => {
    const elementId = el.id || `ELEM_${String(index + 1).padStart(3, "0")}`;
    const pagina = Number(el.pagina) > 0 ? Number(el.pagina) : 1;
    const opStatus = normalizeOperationalStatus(
      el.status,
      `${el.descricao || ""} ${el.observacoes || ""} ${el.codigo || ""}`
    );
    const qtd = Number(el.quantidade) > 0 ? Number(el.quantidade) : 1;

    // 1. Localizar símbolo oficial e associação (prioridade da norma)
    const { assoc, simbolo, matchReason } = matchSymbolAssociation(el);

    if (assoc && simbolo) {
      // 2. Se a associação oficial não possui candidatos (status NAO_ENCONTRADO ou 0 candidatos)
      if (assoc.status === "NAO_ENCONTRADO" || assoc.candidatos.length === 0) {
        const directResolved = resolveMnemonicRecords(
          el.codigo || el.mnemonicCode || el.descricao,
          el.tensao
        );
        if (directResolved.length > 0) {
          const primary = directResolved[0];
          const auditItem: ReconhecimentoAuditItem = {
            id: elementId,
            pagina,
            elemento_detectado: el.descricao || el.codigo || assoc.nome_simbolo,
            simbolo_oficial: assoc.nome_simbolo,
            simbolo_id: assoc.simbolo_id,
            codigo_simbolo: assoc.codigo_simbolo || null,
            categoria: assoc.categoria_simbolo,
            estrutura: assoc.nome_simbolo,
            mnemonico_identificado: primary.codigo,
            mnemonico_descricao: primary.descricao,
            status: "RECONHECIDO",
            confianca: "ALTA",
            status_operacional: opStatus,
            quantidade: qtd,
            fonte_simbologia: `SIMBOLOGIA-OFICIAL.pdf (p. ${assoc.pagina_fonte}) / CADASTRO-MNEMONICOS`,
            justificativa: `Símbolo oficial [${assoc.simbolo_id}] mapeado ao mnemônico oficial direto [${primary.codigo}].`,
            observacoes: el.observacoes,
          };
          statusCount.RECONHECIDO++;
          auditList.push(auditItem);

          directResolved.forEach((m) => {
            mnemonicosParaExplosao.push({
              mnemonicCode: m.codigo,
              quantity: qtd,
              status: opStatus,
              location: el.localizacao || `Poste/Elemento ${elementId} (Pág. ${pagina})`,
              kind: assoc.categoria_simbolo,
            });
          });
          return;
        }

        const auditItem: ReconhecimentoAuditItem = {
          id: elementId,
          pagina,
          elemento_detectado: el.descricao || el.codigo || assoc.nome_simbolo,
          simbolo_oficial: assoc.nome_simbolo,
          simbolo_id: assoc.simbolo_id,
          codigo_simbolo: assoc.codigo_simbolo || null,
          categoria: assoc.categoria_simbolo,
          estrutura: assoc.nome_simbolo,
          mnemonico_identificado: null,
          mnemonico_descricao: null,
          status: "MNEMONICO_NAO_ENCONTRADO",
          confianca: "ALTA",
          status_operacional: opStatus,
          quantidade: qtd,
          fonte_simbologia: `SIMBOLOGIA-OFICIAL.pdf (p. ${assoc.pagina_fonte}, ${assoc.secao_fonte})`,
          justificativa: `Símbolo oficial cadastrado (${assoc.simbolo_id} - ${assoc.nome_simbolo}), porém sem mnemônico de montagem correspondente no catálogo (ex: item gráfico ou obsoleto). Justificativa técnica: ${assoc.justificativa}`,
          observacoes: el.observacoes,
        };
        statusCount.MNEMONICO_NAO_ENCONTRADO++;
        auditList.push(auditItem);
        return;
      }

      // 3. Desambiguação determinística
      const { escolhido, filtrados, motivo } = desambiguarCandidatos(el, assoc.candidatos);

      if (!escolhido) {
        // Caso Ambíguo: existem múltiplos candidatos e não há evidência suficiente
        const auditItem: ReconhecimentoAuditItem = {
          id: elementId,
          pagina,
          elemento_detectado: el.descricao || el.codigo || assoc.nome_simbolo,
          simbolo_oficial: assoc.nome_simbolo,
          simbolo_id: assoc.simbolo_id,
          codigo_simbolo: assoc.codigo_simbolo || null,
          categoria: assoc.categoria_simbolo,
          estrutura: assoc.nome_simbolo,
          mnemonico_identificado: null,
          mnemonico_descricao: null,
          status: "AMBIGUO",
          confianca: "MEDIA",
          status_operacional: opStatus,
          quantidade: qtd,
          fonte_simbologia: `SIMBOLOGIA-OFICIAL.pdf (p. ${assoc.pagina_fonte}, ${assoc.secao_fonte})`,
          justificativa: `Ambiguidade controlada: ${motivo}`,
          possibilidades_oficiais: filtrados.map((c) => ({
            codigo: c.mnemonico_codigo,
            descricao: c.mnemonico_descricao,
          })),
          observacoes: el.observacoes,
        };
        statusCount.AMBIGUO++;
        auditList.push(auditItem);
        return;
      }

      // 4. Validação do mnemônico identificado no catálogo oficial de 7.203 itens
      const mnemonicFound = mnemonicCatalog.get(escolhido.mnemonico_codigo.trim().toUpperCase());
      if (!mnemonicFound) {
        const auditItem: ReconhecimentoAuditItem = {
          id: elementId,
          pagina,
          elemento_detectado: el.descricao || el.codigo || assoc.nome_simbolo,
          simbolo_oficial: assoc.nome_simbolo,
          simbolo_id: assoc.simbolo_id,
          codigo_simbolo: assoc.codigo_simbolo || null,
          categoria: assoc.categoria_simbolo,
          estrutura: assoc.nome_simbolo,
          mnemonico_identificado: escolhido.mnemonico_codigo,
          mnemonico_descricao: escolhido.mnemonico_descricao,
          status: "MNEMONICO_NAO_ENCONTRADO",
          confianca: "ALTA",
          status_operacional: opStatus,
          quantidade: qtd,
          fonte_simbologia: `SIMBOLOGIA-OFICIAL.pdf (p. ${assoc.pagina_fonte}, ${assoc.secao_fonte})`,
          justificativa: `O código [${escolhido.mnemonico_codigo}] não existe no cadastro soberano de 7.203 mnemônicos.`,
          observacoes: el.observacoes,
        };
        statusCount.MNEMONICO_NAO_ENCONTRADO++;
        auditList.push(auditItem);
        return;
      }

      // 5. Sucesso: Reconhecido (ou Reconhecido com Ressalva)
      const hasRessalva = Boolean(el.observacoes && el.observacoes.length > 5);
      const finalStatus: RecognitionStatus = hasRessalva ? "RECONHECIDO_COM_RESSALVA" : "RECONHECIDO";

      const auditItem: ReconhecimentoAuditItem = {
        id: elementId,
        pagina,
        elemento_detectado: el.descricao || el.codigo || assoc.nome_simbolo,
        simbolo_oficial: assoc.nome_simbolo,
        simbolo_id: assoc.simbolo_id,
        codigo_simbolo: assoc.codigo_simbolo || null,
        categoria: assoc.categoria_simbolo,
        estrutura: assoc.nome_simbolo,
        mnemonico_identificado: mnemonicFound.codigo,
        mnemonico_descricao: mnemonicFound.descricao,
        status: finalStatus,
        confianca: "ALTA",
        status_operacional: opStatus,
        quantidade: qtd,
        fonte_simbologia: `SIMBOLOGIA-OFICIAL.pdf (p. ${assoc.pagina_fonte}, ${assoc.secao_fonte})`,
        justificativa: `${motivo} Cadeia determinística: Símbolo [${assoc.simbolo_id}] -> Estrutura [${assoc.nome_simbolo}] -> Mnemônico Oficial [${mnemonicFound.codigo}].`,
        observacoes: el.observacoes,
      };

      statusCount[finalStatus]++;
      auditList.push(auditItem);

      // Encaminha para lista de mnemônicos a serem explodidos
      mnemonicosParaExplosao.push({
        mnemonicCode: mnemonicFound.codigo,
        quantity: qtd,
        status: opStatus,
        location: el.localizacao || `Poste/Elemento ${elementId} (Pág. ${pagina})`,
        kind: assoc.categoria_simbolo,
      });
      return;
    }

    // Se não encontrou símbolo oficial via matchSymbolAssociation, verifica se é um código direto de mnemônico (ex: N1, N2, S12N, 11-300, CFS)
    const directResolvedFallback =
      resolveMnemonicRecords(el.codigo || el.mnemonicCode || el.especificacao || el.descricao, el.tensao).length > 0
        ? resolveMnemonicRecords(el.codigo || el.mnemonicCode || el.especificacao || el.descricao, el.tensao)
        : resolveMnemonicRecords(el.especificacao, el.tensao);
    if (directResolvedFallback.length > 0) {
      const primary = directResolvedFallback[0];
      const auditItem: ReconhecimentoAuditItem = {
        id: elementId,
        pagina,
        elemento_detectado: el.descricao || el.codigo || primary.codigo,
        simbolo_oficial: primary.descricao,
        simbolo_id: "MNEM_DIRETO",
        codigo_simbolo: el.codigo || primary.codigo,
        categoria: el.tipo || "ESTRUTURA",
        estrutura: primary.descricao,
        mnemonico_identificado: primary.codigo,
        mnemonico_descricao: primary.descricao,
        status: "RECONHECIDO",
        confianca: "ALTA",
        status_operacional: opStatus,
        quantidade: qtd,
        fonte_simbologia: "CADASTRO-MNEMONICOS-CEMIG.csv",
        justificativa: `Mnemônico padrão oficial CEMIG [${primary.codigo}] validado no cadastro soberano.`,
        observacoes: el.observacoes,
      };
      statusCount.RECONHECIDO++;
      auditList.push(auditItem);

      directResolvedFallback.forEach((m) => {
        mnemonicosParaExplosao.push({
          mnemonicCode: m.codigo,
          quantity: qtd,
          status: opStatus,
          location: el.localizacao || `Poste/Elemento ${elementId} (Pág. ${pagina})`,
          kind: el.tipo || "ESTRUTURA",
        });
      });
      return;
    }

    // Não reconhecido
    const auditItem: ReconhecimentoAuditItem = {
      id: elementId,
      pagina,
      elemento_detectado: el.descricao || el.codigo || el.tipo || elementId,
      simbolo_oficial: null,
      simbolo_id: null,
      codigo_simbolo: null,
      categoria: null,
      estrutura: null,
      mnemonico_identificado: null,
      mnemonico_descricao: null,
      status: "NAO_RECONHECIDO",
      confianca: "BAIXA",
      status_operacional: opStatus,
      quantidade: qtd,
      fonte_simbologia: "SIMBOLOGIA-OFICIAL.pdf",
      justificativa: `Símbolo inexistente ou não comprovado na norma oficial CEMIG. Motivo: ${matchReason}`,
      observacoes: el.observacoes,
    };
    statusCount.NAO_RECONHECIDO++;
    auditList.push(auditItem);
  });

  return {
    versao_motor: "1.0 - Reconhecimento e Mapeamento Determinístico Oficial",
    arquivo_origem: arquivoOrigem || "projeto_carregado",
    total_elementos_analisados: auditList.length,
    resumo_status: statusCount,
    elementos_reconhecidos: auditList.filter(
      (a) => a.status === "RECONHECIDO" || a.status === "RECONHECIDO_COM_RESSALVA"
    ),
    elementos_ambiguos: auditList.filter((a) => a.status === "AMBIGUO"),
    elementos_pendentes_ou_nao_encontrados: auditList.filter(
      (a) =>
        a.status === "NAO_RECONHECIDO" ||
        a.status === "MNEMONICO_NAO_ENCONTRADO" ||
        a.status === "SIMBOLO_NAO_COMPROVADO"
    ),
    mnemonicos_para_explosao: mnemonicosParaExplosao,
  };
}
