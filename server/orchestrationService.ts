import {
  executarMotorReconhecimento,
  ElementoDetectadoInput,
  RelatorioReconhecimentoProjeto,
  ReconhecimentoAuditItem,
  RecognitionStatus,
  OperationalStatus,
} from "./recognitionEngineService";
import {
  reconhecerSimbologiaProjeto,
  ProjectSymbolCandidateInput,
  RelatorioReconhecimentoSimbologiaProjeto,
  ReconhecimentoSimboloItem,
} from "./projectSymbolRecognitionService";
import { processOfficialMnemonics } from "./mnemonicService";

/**
 * Interface estrita de Ocorrência rastreável para a Etapa 4 e Etapa 6
 */
export interface OcorrenciaRastreavel {
  ocorrencia_id: string;
  arquivo: string;
  pagina: number;
  simbolo: string | null;
  codigo: string | null;
  categoria: string | null;
  estado: string;
  associacao_oficial: string | null;
  estrutura: string | null;
  mnemonico: string | null;
  status: "ASSOCIADO" | "NAO_ASSOCIADO" | "ESTADO_NAO_COMPROVADO" | "AMBIGUO";
  confianca: "OFICIAL" | "ALTA" | "MEDIA" | "BAIXA" | "NENHUMA";
  motivo?: string;
  fonte_consultada: string;
  possibilidades?: { codigo: string; descricao: string }[];
}

export interface ResultadoIntegracaoProjeto {
  arquivo: string;
  total_ocorrencias: number;
  total_associados: number;
  total_nao_associados: number;
  total_ambiguos: number;
  relatorio_ocorrencias: OcorrenciaRastreavel[];
  recognitionAudit: RelatorioReconhecimentoProjeto;
  relatorioSimbologia: RelatorioReconhecimentoSimbologiaProjeto;
  officialProcessing: ReturnType<typeof processOfficialMnemonics>;
}

export type ProjetoProcessadoOficial = ResultadoIntegracaoProjeto;

/**
 * Normaliza o estado operacional estritamente conforme a norma e regras:
 * INSTALADO (ou INSTALAR) -> INSTALAR
 * A INSTALAR -> INSTALAR
 * A RETIRAR (ou RETIRAR) -> RETIRAR
 * NÃO É MAIS INSTALADO -> NÃO É MAIS INSTALADO
 * EXISTENTE -> EXISTENTE
 * Se indefinido ou inválido -> ESTADO NÃO COMPROVADO
 */
export function normalizarEstadoOperacional(estadoRaw?: string): {
  estadoPadrao: OperationalStatus;
  estadoNormativo: string;
  comprovado: boolean;
} {
  const s = String(estadoRaw || "").trim().toUpperCase();

  if (s === "A RETIRAR" || s === "RETIRAR" || s === "A_RETIRAR") {
    return { estadoPadrao: "RETIRAR", estadoNormativo: "A RETIRAR", comprovado: true };
  }
  if (s === "A INSTALAR" || s === "INSTALAR" || s === "A_INSTALAR" || s === "NOVO" || s === "PROJETADO") {
    return { estadoPadrao: "INSTALAR", estadoNormativo: "A INSTALAR", comprovado: true };
  }
  if (s === "EXISTENTE" || s === "INSTALADO" || s === "CONSERVADO") {
    return { estadoPadrao: "EXISTENTE", estadoNormativo: "INSTALADO", comprovado: true };
  }
  if (s === "NÃO É MAIS INSTALADO" || s === "NAO E MAIS INSTALADO" || s === "OBSOLETO") {
    return { estadoPadrao: "EXISTENTE", estadoNormativo: "NÃO É MAIS INSTALADO", comprovado: true };
  }

  // Estado não comprovado
  return { estadoPadrao: "INSTALAR", estadoNormativo: "ESTADO NÃO COMPROVADO", comprovado: false };
}

/**
 * Orquestrador da Integração de Projetos:
 * Conecta a leitura/interpretação do projeto ao Reconhecimento de Simbologia Oficial (Etapa 5)
 * e ao Mapeamento Oficial da Etapa 3/4, repassando os mnemônicos estritamente validados com confiança ALTA
 * para os mecanismos existentes de explosão, agrupamento, cálculo e consolidação de materiais.
 */
export function processarProjetoComSimbologiaOficial(
  elementos: ElementoDetectadoInput[],
  arquivoOrigem: string = "projeto.pdf"
): ResultadoIntegracaoProjeto {
  // 1. Executa a camada de Reconhecimento Oficial de Simbologia (Etapa 5)
  const candidatosSimbologia: ProjectSymbolCandidateInput[] = elementos.map((el) => {
    let desc = el.descricao || `${el.tipo || ""} ${el.especificacao || ""}`.trim();
    if (el.formato) {
      desc = `${desc} ${el.formato}`.trim();
    }
    return {
      id: el.id,
      pagina_projeto: el.pagina || 1,
      id_simbolo_sugerido: el.simboloSugestao || null,
      rotulo_ou_sigla: el.codigo || el.mnemonicCode || null,
      descricao_visual: desc,
      estado_operacional: el.status,
      sobreposto: false,
    };
  });

  const relatorioSimbologia = reconhecerSimbologiaProjeto(candidatosSimbologia, arquivoOrigem);

  // 2. Executa o motor determinístico da Etapa 3
  const recognitionAudit = executarMotorReconhecimento(elementos, arquivoOrigem);

  // 3. Constrói o Relatório de Ocorrências Rastreáveis
  const ocorrencias: OcorrenciaRastreavel[] = [];
  let totalAssociados = 0;
  let totalNaoAssociados = 0;
  let totalAmbiguos = 0;

  const todosItensAuditados: ReconhecimentoAuditItem[] = [
    ...recognitionAudit.elementos_reconhecidos,
    ...recognitionAudit.elementos_ambiguos,
    ...recognitionAudit.elementos_pendentes_ou_nao_encontrados,
  ];

  // Ordena por página e ID para apresentação determinística
  todosItensAuditados.sort((a, b) => {
    if (a.pagina !== b.pagina) return a.pagina - b.pagina;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  for (const item of todosItensAuditados) {
    const estadoNorm = normalizarEstadoOperacional(item.status_operacional);

    if (item.status === "RECONHECIDO" || item.status === "RECONHECIDO_COM_RESSALVA") {
      totalAssociados++;
      ocorrencias.push({
        ocorrencia_id: item.id,
        arquivo: arquivoOrigem,
        pagina: item.pagina,
        simbolo: item.simbolo_oficial,
        codigo: item.codigo_simbolo || item.mnemonico_identificado,
        categoria: item.categoria,
        estado: estadoNorm.estadoNormativo,
        associacao_oficial: item.simbolo_id,
        estrutura: item.estrutura,
        mnemonico: item.mnemonico_identificado,
        status: estadoNorm.comprovado ? "ASSOCIADO" : "ESTADO_NAO_COMPROVADO",
        confianca: "OFICIAL",
        motivo: item.justificativa,
        fonte_consultada: item.fonte_simbologia,
      });
    } else if (item.status === "AMBIGUO") {
      totalAmbiguos++;
      ocorrencias.push({
        ocorrencia_id: item.id,
        arquivo: arquivoOrigem,
        pagina: item.pagina,
        simbolo: item.simbolo_oficial,
        codigo: item.codigo_simbolo,
        categoria: item.categoria,
        estado: estadoNorm.estadoNormativo,
        associacao_oficial: item.simbolo_id,
        estrutura: item.estrutura,
        mnemonico: null,
        status: "AMBIGUO",
        confianca: "MEDIA",
        motivo: item.justificativa,
        fonte_consultada: item.fonte_simbologia,
        possibilidades: item.possibilidades_oficiais,
      });
    } else {
      totalNaoAssociados++;
      ocorrencias.push({
        ocorrencia_id: item.id,
        arquivo: arquivoOrigem,
        pagina: item.pagina,
        simbolo: item.simbolo_oficial || item.elemento_detectado,
        codigo: item.codigo_simbolo,
        categoria: item.categoria,
        estado: estadoNorm.estadoNormativo,
        associacao_oficial: item.simbolo_id,
        estrutura: item.estrutura,
        mnemonico: null,
        status: "NAO_ASSOCIADO",
        confianca: "NENHUMA",
        motivo: item.justificativa || "Não existe associação oficial validada na norma CEMIG",
        fonte_consultada: item.fonte_simbologia,
      });
    }
  }

  // Helper para extrair o identificador do elemento ou poste da string de localização
  const extractLocationId = (loc: string | undefined, fallback: string): string => {
    if (!loc) return fallback;
    const match = loc.match(/(?:Poste\/Elemento\s+|Poste\s+|Elemento\s+)([A-Za-z0-9_\-]+)/i);
    return match ? match[1] : fallback;
  };

  // 4. Encaminha EXCLUSIVAMENTE os mnemônicos oficiais associados para a lógica existente de explosão
  // sem inferências, sem fallbacks e sem materiais inventados (garantindo que 100% dos mnemônicos sejam explodidos)
  const rawDataForExplosion = {
    detectedStructures: recognitionAudit.mnemonicos_para_explosao
      .filter((m) => {
        const k = String(m.kind || "").toUpperCase();
        return (
          !k.includes("POSTE") &&
          !k.includes("CONDUTOR") &&
          !k.includes("CABO") &&
          !k.includes("TRANSFORMADOR") &&
          !k.includes("ESTAI") &&
          !k.includes("CHAVE") &&
          !k.includes("EQUIPAMENTO") &&
          !k.includes("PROTEÇÃO") &&
          !k.includes("PARA-RAIO")
        );
      })
      .map((m, idx) => {
        const poleId = extractLocationId(m.location, `ESTR_${idx + 1}`);
        return {
          id: poleId,
          mnemonicCode: m.mnemonicCode,
          status: m.status,
          quantity: m.quantity,
          type: m.kind,
          associatedPost: poleId,
          locationHint: m.location,
        };
      }),
    detectedPoles: recognitionAudit.mnemonicos_para_explosao
      .filter((m) => String(m.kind || "").toUpperCase().includes("POSTE"))
      .map((m, idx) => {
        const poleId = extractLocationId(m.location, `P${idx + 1}`);
        return {
          id: poleId,
          mnemonicCode: m.mnemonicCode,
          status: m.status,
          quantity: m.quantity,
          associatedPost: poleId,
          locationHint: m.location,
        };
      }),
    detectedEquipment: recognitionAudit.mnemonicos_para_explosao
      .filter((m) => {
        const k = String(m.kind || "").toUpperCase();
        return (
          k.includes("CHAVE") ||
          k.includes("EQUIPAMENTO") ||
          k.includes("PROTEÇÃO") ||
          k.includes("PARA-RAIO") ||
          k.includes("MEDICAO") ||
          k.includes("ATERRAMENTO")
        );
      })
      .map((m, idx) => {
        const poleId = extractLocationId(m.location, `EQ_${idx + 1}`);
        return {
          id: poleId,
          mnemonicCode: m.mnemonicCode,
          status: m.status,
          quantity: m.quantity,
          type: m.kind,
          associatedPole: poleId,
          locationHint: m.location,
        };
      }),
    detectedCables: recognitionAudit.mnemonicos_para_explosao
      .filter((m) => {
        const k = String(m.kind || "").toUpperCase();
        return k.includes("CONDUTOR") || k.includes("CABO");
      })
      .map((m, idx) => ({
        id: extractLocationId(m.location, `CABO_${idx + 1}`),
        mnemonicCode: m.mnemonicCode,
        status: m.status,
        quantity: m.quantity,
        estimatedLengthMeters: m.quantity,
        locationHint: m.location,
      })),
    detectedTransformers: recognitionAudit.mnemonicos_para_explosao
      .filter((m) => String(m.kind || "").toUpperCase().includes("TRANSFORMADOR"))
      .map((m, idx) => {
        const poleId = extractLocationId(m.location, `TR_${idx + 1}`);
        return {
          id: poleId,
          associatedPole: poleId,
          mnemonicCode: m.mnemonicCode,
          status: m.status,
          quantity: m.quantity,
          locationHint: m.location,
        };
      }),
    detectedGuys: recognitionAudit.mnemonicos_para_explosao
      .filter((m) => String(m.kind || "").toUpperCase().includes("ESTAI"))
      .map((m, idx) => {
        const poleId = extractLocationId(m.location, `ESTAI_${idx + 1}`);
        return {
          id: poleId,
          associatedPole: poleId,
          mnemonicCode: m.mnemonicCode,
          status: m.status,
          quantity: m.quantity,
          locationHint: m.location,
        };
      }),
  };

  const officialProcessing = processOfficialMnemonics(rawDataForExplosion);

  return {
    arquivo: arquivoOrigem,
    total_ocorrencias: ocorrencias.length,
    total_associados: totalAssociados,
    total_nao_associados: totalNaoAssociados,
    total_ambiguos: totalAmbiguos,
    relatorio_ocorrencias: ocorrencias,
    recognitionAudit,
    relatorioSimbologia,
    officialProcessing,
  };
}
