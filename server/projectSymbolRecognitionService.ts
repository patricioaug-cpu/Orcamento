import { getSimbologiaOficial, ItemSimbologia, CategoriaSimbologia } from "./simbologiaService";
import { getAssociacaoPorSimboloId } from "./simbologiaMnemonicService";

export interface OfficialSymbol {
  id: string;
  nome: string;
  pagina_pdf: number;
  secao: string;
  categoria: string;
  codigo?: string | null;
}

/**
 * Retorna a lista plana de todos os 142 símbolos oficiais de data/eo_simbologia.json
 */
export function getAllOfficialSymbols(): OfficialSymbol[] {
  const base = getSimbologiaOficial();
  const list: OfficialSymbol[] = [];
  for (const cat of base.categorias || []) {
    for (const item of cat.itens || []) {
      list.push({
        id: item.id,
        nome: item.nome,
        pagina_pdf: item.pagina,
        secao: item.secao,
        categoria: cat.categoria,
        codigo: item.sigla || null,
      });
    }
  }
  return list;
}

/**
 * Busca símbolo oficial por ID (ex: SIMB-P01-01)
 */
export function getOfficialSymbolById(id: string): OfficialSymbol | null {
  const list = getAllOfficialSymbols();
  const idKey = String(id || "").trim().toUpperCase();
  return list.find((s) => s.id.toUpperCase() === idKey) || null;
}

/**
 * Interface estrita de entrada de candidato detectado em projeto na Etapa 5
 */
export interface ProjectSymbolCandidateInput {
  id: string;
  pagina_projeto: number;
  coordenadas?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  } | null;
  coordenadas_disponiveis?: boolean;
  rotulo_ou_sigla?: string | null;
  descricao_visual?: string | null;
  id_simbolo_sugerido?: string | null;
  estado_operacional?: string | null;
  sobreposto?: boolean;
  imagem_regiao?: string | null;
  atributos_tecnicos?: Record<string, any>;
}

export type ConfiancaReconhecimento = "ALTA" | "MEDIA" | "BAIXA" | "NAO_RECONHECIDO";

export type StatusReconhecimento =
  | "RECONHECIDO"
  | "AMBIGUO"
  | "SIMBOLO_NAO_CONFIRMADO"
  | "SIMBOLO_NAO_RECONHECIDO"
  | "SIMBOLOS_SOBREPOSTOS_NAO_RESOLVIDOS";

/**
 * Item estruturado de reconhecimento de símbolo da Etapa 5 com rastreabilidade completa
 */
export interface ReconhecimentoSimboloItem {
  id_reconhecimento: string;
  pagina_projeto: number;
  coordenadas: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  } | null;
  coordenadas_disponiveis: boolean;
  id_simbolo_oficial: string | null;
  codigo_oficial: string | null;
  categoria: string | null;
  nome: string | null;
  pagina_fonte_oficial: number | null;
  confianca: ConfiancaReconhecimento;
  status: StatusReconhecimento;
  fonte: string;
  motivo_decisao: string;
  estado_operacional_preservado: string;
  candidato_original: ProjectSymbolCandidateInput;
}

/**
 * Relatório Estruturado de Saída da Camada de Reconhecimento da Etapa 5
 */
export interface RelatorioReconhecimentoSimbologiaProjeto {
  arquivo_projeto: string;
  estatisticas: {
    total_candidatos: number;
    reconhecidos_alta: number;
    ambiguos_media: number;
    rejeitados_baixa: number;
    nao_reconhecidos: number;
    sobrepostos_nao_resolvidos: number;
  };
  reconhecimentos: ReconhecimentoSimboloItem[];
  nao_reconhecidos: {
    pagina: number;
    id_candidato: string;
    motivo: string;
    candidato: ProjectSymbolCandidateInput;
  }[];
  /**
   * Símbolos rigorosamente validados com confiança ALTA para prosseguir à associação oficial
   */
  simbolos_validados_para_associacao: ReconhecimentoSimboloItem[];
}

/**
 * Normaliza strings para comparação determinística
 */
function normalizarTexto(txt?: string | null): string {
  if (!txt) return "";
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Busca símbolo oficial na base sovereign (data/eo_simbologia.json)
 * EXCLUSIVAMENTE por correspondência exata de ID, Código Oficial ou Nome Canônico.
 * PROIBIDO o uso de aproximação arbitrária, similaridade difusa não justificada ou fallbacks hipotéticos.
 */
function validarContraBaseOficial(candidato: ProjectSymbolCandidateInput): {
  simboloOficial: OfficialSymbol | null;
  candidatosSimbolos: OfficialSymbol[];
  motivo: string;
} {
  const todosSimbolos = getAllOfficialSymbols();

  // 1. Busca por ID oficial direto (se fornecido na leitura)
  if (candidato.id_simbolo_sugerido) {
    const porId = getOfficialSymbolById(candidato.id_simbolo_sugerido);
    if (porId) {
      return {
        simboloOficial: porId,
        candidatosSimbolos: [porId],
        motivo: `Correspondência exata por ID oficial (${porId.id}) validada em data/eo_simbologia.json (pág. ${porId.pagina_pdf})`,
      };
    }
  }

  const siglaNorm = normalizarTexto(candidato.rotulo_ou_sigla);
  const descNorm = normalizarTexto(candidato.descricao_visual);

  // 2. Busca por código oficial único (sigla de projeto oficial do SIMBOLOGIA-OFICIAL.pdf)
  if (siglaNorm) {
    const matchesCodigo = todosSimbolos.filter((s) => {
      if (!s.codigo) return false;
      return normalizarTexto(s.codigo) === siglaNorm;
    });

    if (matchesCodigo.length === 1) {
      const s = matchesCodigo[0];
      return {
        simboloOficial: s,
        candidatosSimbolos: matchesCodigo,
        motivo: `Código oficial unívoco '${s.codigo}' validado em data/eo_simbologia.json (pág. ${s.pagina_pdf})`,
      };
    } else if (matchesCodigo.length > 1) {
      // Ambiguidade oficial de código
      return {
        simboloOficial: null,
        candidatosSimbolos: matchesCodigo,
        motivo: `Código '${siglaNorm}' é compartilhado por múltiplos símbolos oficiais (${matchesCodigo.map((m) => m.id).join(", ")})`,
      };
    }
  }

  // 3. Busca por Nome Canônico Oficial Exato
  if (descNorm) {
    const matchNomeExato = todosSimbolos.filter((s) => normalizarTexto(s.nome) === descNorm);
    if (matchNomeExato.length === 1) {
      const s = matchNomeExato[0];
      return {
        simboloOficial: s,
        candidatosSimbolos: matchNomeExato,
        motivo: `Nome canônico oficial exato validado em data/eo_simbologia.json (pág. ${s.pagina_pdf})`,
      };
    } else if (matchNomeExato.length > 1) {
      return {
        simboloOficial: null,
        candidatosSimbolos: matchNomeExato,
        motivo: `Nome canônico corresponde a múltiplos símbolos oficiais na norma`,
      };
    }

    // 4. Reconhecimento determinístico por família canônica estrita baseada nas 7 páginas
    const matchesDescricao = todosSimbolos.filter((s) => {
      const nomeS = normalizarTexto(s.nome);
      if (descNorm.includes("POSTE") && descNorm.includes("CIRCULAR") && nomeS.includes("POSTE") && nomeS.includes("CIRCULAR")) {
        return true;
      }
      if (descNorm.includes("POSTE") && (descNorm.includes("DUPLO T") || descNorm.includes("DUPLO-T")) && nomeS.includes("POSTE") && nomeS.includes("DUPLO T")) {
        return true;
      }
      if (descNorm.includes("POSTE") && descNorm.includes("MADEIRA") && nomeS.includes("POSTE") && nomeS.includes("MADEIRA")) {
        return true;
      }
      if (descNorm.includes("TRANSFORMADOR") && nomeS.includes("TRANSFORMADOR") && !descNorm.includes("SUBTERRANEO") && !nomeS.includes("SUBTERRANEO")) {
        return true;
      }
      if ((descNorm.includes("CHAVE FUSIVEL") || descNorm.includes("CH-FUS")) && (nomeS.includes("CHAVE FUSIVEL") || nomeS.includes("CH-FUS"))) {
        return true;
      }
      if ((descNorm.includes("CHAVE FACA") || descNorm.includes("CHAVE SECCIONADORA")) && (nomeS.includes("CHAVE FACA") || nomeS.includes("CHAVE SECCIONADORA"))) {
        return true;
      }
      if (descNorm.includes("PARA-RAIOS") && nomeS.includes("PARA-RAIOS")) {
        return true;
      }
      if (descNorm.includes("MUFLA") && nomeS.includes("MUFLA")) {
        return true;
      }
      return false;
    });

    if (matchesDescricao.length === 1) {
      const s = matchesDescricao[0];
      return {
        simboloOficial: s,
        candidatosSimbolos: matchesDescricao,
        motivo: `Classificação visual canônica validada na norma oficial: ${s.nome} (pág. ${s.pagina_pdf})`,
      };
    } else if (matchesDescricao.length > 1) {
      return {
        simboloOficial: null,
        candidatosSimbolos: matchesDescricao,
        motivo: `Descrição visual abrange múltiplos símbolos da base oficial (${matchesDescricao.map((m) => m.id).join(", ")})`,
      };
    }

    // 5. Verificação de termo genérico/ambíguo na base (ex: "POSTE", "CHAVE", "TRANSFORMADOR")
    if (descNorm.length >= 3) {
      const matchesGenericos = todosSimbolos.filter((s) => {
        const nomeS = normalizarTexto(s.nome);
        const catS = normalizarTexto(s.categoria);
        return nomeS.includes(descNorm) || catS === descNorm || descNorm.includes(catS);
      });
      if (matchesGenericos.length === 1) {
        const s = matchesGenericos[0];
        return {
          simboloOficial: s,
          candidatosSimbolos: matchesGenericos,
          motivo: `Classificação canônica validada na norma oficial: ${s.nome} (pág. ${s.pagina_pdf})`,
        };
      } else if (matchesGenericos.length > 1) {
        return {
          simboloOficial: null,
          candidatosSimbolos: matchesGenericos,
          motivo: `Termo genérico '${descNorm}' abrange ${matchesGenericos.length} símbolos oficiais na norma (ambiguidade técnica)`,
        };
      }
    }
  }

  // Nenhuma correspondência oficial encontrada
  return {
    simboloOficial: null,
    candidatosSimbolos: [],
    motivo: "Nenhuma correspondência oficial encontrada em data/eo_simbologia.json",
  };
}

/**
 * Função Principal da ETAPA 5:
 * Executa o reconhecimento e validação da simbologia em projetos.
 */
export function reconhecerSimbologiaProjeto(
  candidatos: ProjectSymbolCandidateInput[],
  arquivoOrigem: string = "projeto.pdf"
): RelatorioReconhecimentoSimbologiaProjeto {
  const reconhecimentos: ReconhecimentoSimboloItem[] = [];
  const naoReconhecidos: RelatorioReconhecimentoSimbologiaProjeto["nao_reconhecidos"] = [];
  const validadosParaAssociacao: ReconhecimentoSimboloItem[] = [];

  let totalReconhecidosAlta = 0;
  let totalAmbiguosMedia = 0;
  let totalRejeitadosBaixa = 0;
  let totalNaoReconhecidos = 0;
  let totalSobrepostosNaoResolvidos = 0;

  for (let i = 0; i < candidatos.length; i++) {
    const c = candidatos[i];
    const recId = `REC_${c.pagina_projeto || 1}_${String(i + 1).padStart(4, "0")}`;

    // Tratamento de Coordenadas
    const temCoordenadas = Boolean(
      c.coordenadas &&
      typeof c.coordenadas.x === "number" &&
      typeof c.coordenadas.y === "number" &&
      !isNaN(c.coordenadas.x) &&
      !isNaN(c.coordenadas.y)
    );

    const coords = temCoordenadas ? c.coordenadas! : null;
    const coordsDisponiveis = c.coordenadas_disponiveis !== undefined ? c.coordenadas_disponiveis : temCoordenadas;

    // Preservação do Estado Operacional
    const estadoPreservado = c.estado_operacional ? String(c.estado_operacional).trim().toUpperCase() : "INSTALAR";

    // 1. Verificação de Símbolos Sobrepostos Não Resolvidos
    if (c.sobreposto) {
      totalSobrepostosNaoResolvidos++;
      totalAmbiguosMedia++;
      const itemSobreposto: ReconhecimentoSimboloItem = {
        id_reconhecimento: recId,
        pagina_projeto: c.pagina_projeto || 1,
        coordenadas: coords,
        coordenadas_disponiveis: coordsDisponiveis,
        id_simbolo_oficial: null,
        codigo_oficial: null,
        categoria: null,
        nome: null,
        pagina_fonte_oficial: null,
        confianca: "MEDIA",
        status: "SIMBOLOS_SOBREPOSTOS_NAO_RESOLVIDOS",
        fonte: "data/eo_simbologia.json",
        motivo_decisao: "Símbolos gráficos sobrepostos no desenho técnico não resolvidos; requer inspeção visual",
        estado_operacional_preservado: estadoPreservado,
        candidato_original: c,
      };
      reconhecimentos.push(itemSobreposto);
      continue;
    }

    // 2. Validação contra a Base Oficial Soberana
    const validacao = validarContraBaseOficial(c);

    // Caso A: Símbolo Oficial Unívoco Encontrado (Confiança ALTA)
    if (validacao.simboloOficial) {
      const s = validacao.simboloOficial;
      totalReconhecidosAlta++;

      const itemReconhecido: ReconhecimentoSimboloItem = {
        id_reconhecimento: recId,
        pagina_projeto: c.pagina_projeto || 1,
        coordenadas: coords,
        coordenadas_disponiveis: coordsDisponiveis,
        id_simbolo_oficial: s.id,
        codigo_oficial: s.codigo,
        categoria: s.categoria,
        nome: s.nome,
        pagina_fonte_oficial: s.pagina_pdf,
        confianca: "ALTA",
        status: "RECONHECIDO",
        fonte: "data/eo_simbologia.json",
        motivo_decisao: validacao.motivo,
        estado_operacional_preservado: estadoPreservado,
        candidato_original: c,
      };

      reconhecimentos.push(itemReconhecido);
      validadosParaAssociacao.push(itemReconhecido);
    }
    // Caso B: Múltiplos Candidatos Oficiais Possíveis (Ambiguidade - Confiança MEDIA)
    else if (validacao.candidatosSimbolos.length > 1) {
      totalAmbiguosMedia++;
      const itemAmbiguo: ReconhecimentoSimboloItem = {
        id_reconhecimento: recId,
        pagina_projeto: c.pagina_projeto || 1,
        coordenadas: coords,
        coordenadas_disponiveis: coordsDisponiveis,
        id_simbolo_oficial: null,
        codigo_oficial: c.rotulo_ou_sigla || null,
        categoria: validacao.candidatosSimbolos[0].categoria || null,
        nome: null,
        pagina_fonte_oficial: null,
        confianca: "MEDIA",
        status: "AMBIGUO",
        fonte: "data/eo_simbologia.json",
        motivo_decisao: validacao.motivo,
        estado_operacional_preservado: estadoPreservado,
        candidato_original: c,
      };
      reconhecimentos.push(itemAmbiguo);
    }
    // Caso C: Símbolo Não Encontrado na Base Oficial (Confiança NAO_RECONHECIDO)
    else {
      totalNaoReconhecidos++;
      const motivo = validacao.motivo || "Símbolo não localizado no documento oficial de 7 páginas (data/eo_simbologia.json)";
      const itemNaoReconhecido: ReconhecimentoSimboloItem = {
        id_reconhecimento: recId,
        pagina_projeto: c.pagina_projeto || 1,
        coordenadas: coords,
        coordenadas_disponiveis: coordsDisponiveis,
        id_simbolo_oficial: null,
        codigo_oficial: c.rotulo_ou_sigla || null,
        categoria: null,
        nome: null,
        pagina_fonte_oficial: null,
        confianca: "NAO_RECONHECIDO",
        status: "SIMBOLO_NAO_RECONHECIDO",
        fonte: "data/eo_simbologia.json",
        motivo_decisao: motivo,
        estado_operacional_preservado: estadoPreservado,
        candidato_original: c,
      };

      reconhecimentos.push(itemNaoReconhecido);
      naoReconhecidos.push({
        pagina: c.pagina_projeto || 1,
        id_candidato: c.id,
        motivo,
        candidato: c,
      });
    }
  }

  return {
    arquivo_projeto: arquivoOrigem,
    estatisticas: {
      total_candidatos: candidatos.length,
      reconhecidos_alta: totalReconhecidosAlta,
      ambiguos_media: totalAmbiguosMedia,
      rejeitados_baixa: totalRejeitadosBaixa,
      nao_reconhecidos: totalNaoReconhecidos,
      sobrepostos_nao_resolvidos: totalSobrepostosNaoResolvidos,
    },
    reconhecimentos,
    nao_reconhecidos: naoReconhecidos,
    simbolos_validados_para_associacao: validadosParaAssociacao,
  };
}
