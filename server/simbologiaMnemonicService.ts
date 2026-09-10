import fs from "node:fs";
import path from "node:path";
import { resolveDataPath } from "./dataPath";

export type TipoAssociacao =
  | "DIRETA"
  | "POR_CODIGO"
  | "POR_DESCRICAO"
  | "POR_ESTRUTURA"
  | "MULTIPLA"
  | "PENDENTE"
  | "NAO_ENCONTRADO";

export type StatusAssociacao = "ASSOCIADO" | "MULTIPLO" | "PENDENTE" | "NAO_ENCONTRADO";
export type NivelConfianca = "ALTA" | "MEDIA" | "BAIXA";

export interface CandidatoMnemonico {
  mnemonico_codigo: string;
  mnemonico_descricao: string;
  tipo_associacao: TipoAssociacao;
  confianca: NivelConfianca;
  justificativa: string;
}

export interface ItemAssociacao {
  id: string;
  simbolo_id: string;
  categoria_simbolo: string;
  codigo_simbolo?: string | null;
  nome_simbolo: string;
  pagina_fonte: number;
  secao_fonte: string;
  tipo_associacao: TipoAssociacao;
  status: StatusAssociacao;
  confianca: NivelConfianca;
  total_candidatos: number;
  candidatos: CandidatoMnemonico[];
  justificativa: string;
  fontes: string[];
}

export interface BaseAssociacoesSimbologia {
  fonte_oficial: {
    arquivo: string;
    base: string;
  };
  versao_associacao: string;
  status: string;
  total_associacoes: number;
  associacoes: ItemAssociacao[];
}

export interface AuditoriaAssociacao {
  estatisticas: {
    total_simbolos: number;
    simbolos_com_associacao: number;
    simbolos_pendentes: number;
    simbolos_sem_mnemonico: number;
    total_mnemonicos: number;
    mnemonicos_relacionados: number;
    mnemonicos_sem_associacao: number;
  };
  distribuicao_por_tipo: Record<TipoAssociacao, number>;
  distribuicao_por_status: Record<StatusAssociacao, number>;
  distribuicao_por_categoria: {
    categoria: string;
    total_itens: number;
    com_associacao: number;
    pendentes: number;
    sem_associacao: number;
  }[];
}

let associacoesCache: BaseAssociacoesSimbologia | null = null;
let auditoriaCache: AuditoriaAssociacao | null = null;

/**
 * Carrega a base de associações controladas entre Simbologia Oficial e Mnemônicos.
 */
export function loadAssociacoesBase(): BaseAssociacoesSimbologia {
  if (associacoesCache) return associacoesCache;
  const filePath = resolveDataPath("simbologia_mnemonicos.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Base de associações não encontrada: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  associacoesCache = JSON.parse(content) as BaseAssociacoesSimbologia;
  return associacoesCache;
}

/**
 * Retorna todas as associações cadastradas.
 */
export function getAllAssociacoes(): ItemAssociacao[] {
  const base = loadAssociacoesBase();
  return base.associacoes || [];
}

/**
 * Consulta a associação pelo identificador do símbolo (ex: SIMB-P01-01).
 */
export function getAssociacaoPorSimboloId(simboloId: string): ItemAssociacao | null {
  const base = loadAssociacoesBase();
  const idKey = String(simboloId || "").trim().toUpperCase();
  return (
    base.associacoes.find(
      (a) => a.simbolo_id.toUpperCase() === idKey || a.id.toUpperCase() === idKey
    ) || null
  );
}

/**
 * Retorna os candidatos a mnemônico para um determinado símbolo.
 */
export function getCandidatosPorSimbolo(simboloId: string): CandidatoMnemonico[] {
  const assoc = getAssociacaoPorSimboloId(simboloId);
  return assoc ? assoc.candidatos : [];
}

/**
 * Consulta todas as associações que referenciam um código de mnemônico específico.
 */
export function getAssociacoesPorMnemonico(mnemonicoCodigo: string): ItemAssociacao[] {
  const base = loadAssociacoesBase();
  const codeKey = String(mnemonicoCodigo || "").trim().toUpperCase();
  if (!codeKey) return [];
  return base.associacoes.filter((a) =>
    a.candidatos.some((c) => c.mnemonico_codigo.toUpperCase() === codeKey)
  );
}

/**
 * Retorna as estatísticas e matriz de auditoria de cobertura da associação.
 */
export function getAssociacoesStats(): AuditoriaAssociacao {
  if (auditoriaCache) return auditoriaCache;
  const filePath = resolveDataPath("simbologia_mnemonicos_auditoria.json");
  if (!fs.existsSync(filePath)) {
    const base = loadAssociacoesBase();
    // Fallback calculation if file does not exist
    const assoc = base.associacoes;
    const relatedSet = new Set(assoc.flatMap((a) => a.candidatos.map((c) => c.mnemonico_codigo)));
    auditoriaCache = {
      estatisticas: {
        total_simbolos: assoc.length,
        simbolos_com_associacao: assoc.filter((a) => a.status === "ASSOCIADO" || a.status === "MULTIPLO").length,
        simbolos_pendentes: assoc.filter((a) => a.status === "PENDENTE").length,
        simbolos_sem_mnemonico: assoc.filter((a) => a.status === "NAO_ENCONTRADO").length,
        total_mnemonicos: 7203,
        mnemonicos_relacionados: relatedSet.size,
        mnemonicos_sem_associacao: 7203 - relatedSet.size,
      },
      distribuicao_por_tipo: {
        DIRETA: assoc.filter((a) => a.tipo_associacao === "DIRETA").length,
        POR_CODIGO: assoc.filter((a) => a.tipo_associacao === "POR_CODIGO").length,
        POR_DESCRICAO: assoc.filter((a) => a.tipo_associacao === "POR_DESCRICAO").length,
        POR_ESTRUTURA: assoc.filter((a) => a.tipo_associacao === "POR_ESTRUTURA").length,
        MULTIPLA: assoc.filter((a) => a.tipo_associacao === "MULTIPLA").length,
        PENDENTE: assoc.filter((a) => a.tipo_associacao === "PENDENTE").length,
        NAO_ENCONTRADO: assoc.filter((a) => a.tipo_associacao === "NAO_ENCONTRADO").length,
      },
      distribuicao_por_status: {
        ASSOCIADO: assoc.filter((a) => a.status === "ASSOCIADO").length,
        MULTIPLO: assoc.filter((a) => a.status === "MULTIPLO").length,
        PENDENTE: assoc.filter((a) => a.status === "PENDENTE").length,
        NAO_ENCONTRADO: assoc.filter((a) => a.status === "NAO_ENCONTRADO").length,
      },
      distribuicao_por_categoria: [],
    };
    return auditoriaCache;
  }
  const content = fs.readFileSync(filePath, "utf8");
  auditoriaCache = JSON.parse(content) as AuditoriaAssociacao;
  return auditoriaCache;
}
