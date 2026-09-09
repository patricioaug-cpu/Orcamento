import fs from "node:fs";
import path from "node:path";

export interface MetadadosSimbologia {
  fonte_oficial: string;
  documento: string;
  classificacao?: string;
  paginas_analisadas: number;
  paginas_intervalo?: string;
  origem_dos_dados: string;
}

export interface ConvencaoOperacional {
  estado: string;
  pagina: number;
  secao: string;
  representacao_grafica: string;
  descricao: string;
}

export interface ItemSimbologia {
  id: string;
  nome: string;
  pagina: number;
  secao: string;
  simbolo_instalado?: string;
  simbolo_a_instalar?: string;
  estado_a_instalar?: string;
  sigla?: string;
  observacoes?: string;
}

export interface CategoriaSimbologia {
  categoria: string;
  pagina: number;
  secao: string;
  itens: ItemSimbologia[];
}

export interface BaseSimbologiaOficial {
  metadados: MetadadosSimbologia;
  convencoes_operacionais: ConvencaoOperacional[];
  categorias: CategoriaSimbologia[];
}

let simbologiaCache: BaseSimbologiaOficial | null = null;

/**
 * Carrega a base oficial de simbologia CEMIG ND-3.1 (7 páginas) de forma estática e determinística.
 */
export function loadSimbologiaBase(): BaseSimbologiaOficial {
  if (simbologiaCache) return simbologiaCache;
  const filePath = path.join(process.cwd(), "data", "eo_simbologia.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Base de simbologia oficial não encontrada: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  simbologiaCache = JSON.parse(content) as BaseSimbologiaOficial;
  return simbologiaCache;
}

/**
 * Retorna a base completa de simbologia oficial extraída do PDF oficial de 7 páginas.
 */
export function getSimbologiaOficial(): BaseSimbologiaOficial {
  return loadSimbologiaBase();
}

/**
 * Retorna a lista de nomes de categorias extraídas exclusivamente do documento oficial.
 */
export function getSimbologiaCategorias(): string[] {
  const base = loadSimbologiaBase();
  return (base.categorias || []).map((c) => c.categoria);
}

/**
 * Retorna os itens de uma categoria específica da base oficial.
 */
export function getSimbologiaPorCategoria(categoria: string): CategoriaSimbologia | null {
  const base = loadSimbologiaBase();
  const catKey = String(categoria || "").trim().toLowerCase();
  return (
    base.categorias.find(
      (c) => c.categoria.toLowerCase() === catKey
    ) || null
  );
}

/**
 * Verifica se uma categoria existe no PDF oficial.
 */
export function verificarCategoriaReconhecida(categoria: string): boolean {
  return Boolean(getSimbologiaPorCategoria(categoria));
}

/**
 * Retorna estatísticas de contagem e metadados da base oficial.
 */
export function getSimbologiaStats() {
  const base = loadSimbologiaBase();
  const totalItens = (base.categorias || []).reduce(
    (acc, cat) => acc + (cat.itens ? cat.itens.length : 0),
    0
  );
  return {
    documento: base.metadados.documento,
    fonte_oficial: base.metadados.fonte_oficial,
    paginas_analisadas: base.metadados.paginas_analisadas,
    totalCategorias: (base.categorias || []).length,
    totalItens,
    categorias: (base.categorias || []).map((c) => ({
      categoria: c.categoria,
      pagina: c.pagina,
      totalItens: c.itens ? c.itens.length : 0,
    })),
    convencoesOperacionais: (base.convencoes_operacionais || []).map((c) => c.estado),
  };
}
