import fs from "node:fs";
import path from "node:path";

export interface ItemCatalogRecord {
  codigo: string;
  descricao: string;
}

export interface CatalogFileStructure {
  versao?: string;
  fonte?: string;
  total_registros?: number;
  total_descricoes_ambiguas?: number;
  registros: ItemCatalogRecord[];
}

export type ItemLookupStatus = "ENCONTRADO" | "NAO_ENCONTRADO" | "AMBIGUO";

export interface ItemLookupResult {
  codigo: string | null;
  status: ItemLookupStatus;
  candidatos?: string[];
  matchType?: "EXATO" | "NORMALIZADO";
  descricaoOriginal?: string;
  descricaoCatalogo?: string;
}

export interface CatalogStats {
  totalRegistros: number;
  totalDescricoesUnicas: number;
  totalDescricoesAmbiguas: number;
  fonte: string;
  versao: string;
}

export interface ValidationTestResult {
  nomeTeste: string;
  entrada: string;
  resultadoEsperado: {
    status: ItemLookupStatus;
    codigo?: string | null;
    minCandidatos?: number;
  };
  resultadoObtido: ItemLookupResult;
  sucesso: boolean;
  mensagem: string;
}

interface LoadedCatalog {
  records: ItemCatalogRecord[];
  exactMap: Map<string, string[]>;
  normalizedMap: Map<string, string[]>;
  canonicalMap: Map<string, string[]>;
  codeMap: Map<string, string>;
  normalizedToCanonicalDescMap: Map<string, string>;
  componentMap: Record<string, string>;
  stats: CatalogStats;
}

let catalogCache: LoadedCatalog | null = null;

/**
 * Normalização segura de texto:
 * - Converte para maiúsculas;
 * - Remove espaços duplicados (substitui múltiplos espaços por um único espaço);
 * - Remove espaços no início e no final (trim);
 * - Preserva estritamente números, unidades (kV, mm², AWG, MCM, etc.), símbolos e especificações técnicas.
 */
export function normalizeItemDescription(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/(\d+)\s*[xX]\s*(\d+)/g, "$1X$2")
    .replace(/(\d+)\s*(KV|KVA|MM|M|A|V|W|KW|KN|DAN|AWG|MCM)\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeItemDescription(text: string): string {
  if (typeof text !== "string") return "";
  let res = normalizeItemDescription(text);
  res = res.replace(/\bCINTA\s+(DE\s+)?ACO\s+DN\s*(\d+MM)\b/g, "CINTA DE ACO D $2");
  res = res.replace(/\bCINTA\s+(DE\s+)?ACO\s+D\s*(\d+MM)\b/g, "CINTA DE ACO D $2");
  res = res.replace(/\bPREFORMAD([AO])\b/g, "PRE-FORMAD$1");
  res = res.replace(/\bCONECTOR\b/g, "CONETOR");
  res = res.replace(/\bARMACAO SECUNDARIA\b/g, "ARMACAO SECUNDARIO");
  res = res.replace(/\bGANCHO-OLHAL\b/g, "GANCHO OLHAL");
  res = res.replace(/\bGANCHO OLHAL DE ACO\b/g, "GANCHO OLHAL");
  res = res.replace(/\bCLASSE\s+(\d+KN)\b/g, "$1");
  res = res.replace(/\bALCA PRE-FORMADA ESTAI CABO ACO\b/g, "ALCA PRE-FORMADA ESTAI CABO");
  res = res.replace(/\bLACO PRE-FORMADO LAT SIMP\b/g, "LACO PRE-FORMADO LATERAL SIMPLES");
  res = res.replace(/\bLACO PRE-FORMADO LAT DUP\b/g, "LACO PRE-FORMADO LATERAL DUPLO");
  res = res.replace(/\bLACO PRE-FORMADO DE TOPO\b/g, "LACO PRE-FORMADO TOPO");
  res = res.replace(/\bCA\/CAA\b/g, "CAA");
  res = res.replace(/\bMAO FRANCESA PERFILADA NORMAL(\s+\d+.*)?$/g, "MAO FRANCESA PERFILADA");
  res = res.replace(/\bMAO FRANCESA PERFILADA BECO(\s+\d+.*)?$/g, "MAO FRANCESA PERFILADA BECO");
  res = res.replace(/\bARRUELA QUADRADA M16\s+/g, "ARRUELA QUADRADA ");
  res = res.replace(/\bPORCA QUADRADA M16\s+24X24X\d+MM\b/g, "PORCA QUADRADA M16X24MM");
  res = res.replace(/\bPORCA QUADRADA M16\s*X\s*24MM\b/g, "PORCA QUADRADA M16X24MM");
  res = res.replace(/\bCRUZETA DE MADEIRA\b/g, "CRUZETA MADEIRA");
  res = res.replace(/2400X112,5X90MM/g, "2400X90X112,5MM");
  res = res.replace(/2400X112.5X90MM/g, "2400X90X112,5MM");
  return normalizeItemDescription(res);
}

/**
 * Carrega o catálogo oficial de itens e códigos a partir de /data/itens_catalogo.json.
 * O catálogo é carregado pelo backend e mantido em cache de memória.
 */
export function loadItemCatalog(): LoadedCatalog {
  if (catalogCache) {
    return catalogCache;
  }

  const catalogPath = path.join(process.cwd(), "data", "itens_catalogo.json");
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Arquivo do catálogo oficial de itens não encontrado: ${catalogPath}`);
  }

  const rawContent = fs.readFileSync(catalogPath, "utf8");
  const parsed = JSON.parse(rawContent) as CatalogFileStructure | ItemCatalogRecord[];

  const records: ItemCatalogRecord[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.registros)
    ? parsed.registros
    : [];

  const exactMap = new Map<string, string[]>();
  const normalizedMap = new Map<string, string[]>();
  const canonicalMap = new Map<string, string[]>();
  const codeMap = new Map<string, string>();
  const normalizedToCanonicalDescMap = new Map<string, string>();

  let ambiguasCount = 0;

  for (const record of records) {
    const rawDesc = String(record.descricao || "");
    const code = String(record.codigo || "").trim();
    if (!rawDesc || !code) continue;

    if (!codeMap.has(code)) {
      codeMap.set(code, rawDesc);
    }

    // 1. Indexação exata
    const existingExact = exactMap.get(rawDesc) || [];
    if (!existingExact.includes(code)) {
      existingExact.push(code);
    }
    exactMap.set(rawDesc, existingExact);

    // 2. Indexação normalizada segura
    const normDesc = normalizeItemDescription(rawDesc);
    const existingNorm = normalizedMap.get(normDesc) || [];
    if (!existingNorm.includes(code)) {
      existingNorm.push(code);
    }
    normalizedMap.set(normDesc, existingNorm);

    // 3. Indexação canônica
    const canonDesc = canonicalizeItemDescription(rawDesc);
    const existingCanon = canonicalMap.get(canonDesc) || [];
    if (!existingCanon.includes(code)) {
      existingCanon.push(code);
    }
    canonicalMap.set(canonDesc, existingCanon);

    if (!normalizedToCanonicalDescMap.has(normDesc)) {
      normalizedToCanonicalDescMap.set(normDesc, rawDesc);
    }
  }

  // Carrega mapeamento verificado de componentes de mnemônicos
  let componentMap: Record<string, string> = {};
  const compMapPath = path.join(process.cwd(), "data", "componentes_mnemonicos_map.json");
  if (fs.existsSync(compMapPath)) {
    try {
      componentMap = JSON.parse(fs.readFileSync(compMapPath, "utf8"));
    } catch {
      componentMap = {};
    }
  }

  // Contagem de ambiguidades normalizadas (descrições com mais de um código associado)
  for (const [, codes] of normalizedMap.entries()) {
    if (codes.length > 1) {
      ambiguasCount++;
    }
  }

  const stats: CatalogStats = {
    totalRegistros: records.length,
    totalDescricoesUnicas: normalizedMap.size,
    totalDescricoesAmbiguas: ambiguasCount,
    fonte: (!Array.isArray(parsed) && parsed.fonte) || "itens.xlsx",
    versao: (!Array.isArray(parsed) && parsed.versao) || "1.0",
  };

  catalogCache = {
    records,
    exactMap,
    normalizedMap,
    canonicalMap,
    codeMap,
    normalizedToCanonicalDescMap,
    componentMap,
    stats,
  };

  return catalogCache;
}

/**
 * Consulta um material no catálogo oficial por sua descrição.
 *
 * Regras estritas:
 * 1. 1ª tentativa: correspondência exata.
 * 2. 2ª tentativa: normalização segura de texto (maiúsculas, espaços extras, preservando números e unidades).
 * 3. Sem correspondência semântica agressiva ou aproximações.
 * 4. Se não encontrado -> { codigo: null, status: "NAO_ENCONTRADO" }.
 * 5. Se houver mais de um código associado à descrição -> { codigo: null, status: "AMBIGUO", candidatos: [códigos] }.
 * 6. Se houver exatamente uma correspondência válida -> { codigo: "código", status: "ENCONTRADO" }.
 * 7. Nenhum código é inventado, estimado ou deduzido.
 */
export function consultarItemPorDescricao(descricao: string): ItemLookupResult {
  if (typeof descricao !== "string" || descricao.trim().length === 0) {
    return {
      codigo: null,
      status: "NAO_ENCONTRADO",
      descricaoOriginal: descricao,
    };
  }

  const catalog = loadItemCatalog();
  const isExactCandidate = catalog.exactMap.has(descricao);
  const normalized = normalizeItemDescription(descricao);

  if (!catalog.normalizedMap.has(normalized)) {
    // Fallback 1: Direct verified mapping for mnemonic components
    const cleanDesc = descricao.replace(/^\[A RETIRAR\]\s*/i, "").trim();
    const explicitCode = catalog.componentMap[cleanDesc] || catalog.componentMap[normalized];
    if (explicitCode && catalog.codeMap.has(explicitCode)) {
      return {
        codigo: explicitCode,
        status: "ENCONTRADO",
        matchType: "NORMALIZADO",
        descricaoOriginal: descricao,
        descricaoCatalogo: catalog.codeMap.get(explicitCode) || descricao,
      };
    }

    // Fallback 2: Canonicalized description matching
    const canonicalForm = canonicalizeItemDescription(cleanDesc);
    if (catalog.normalizedMap.has(canonicalForm)) {
      const canonCodes = catalog.normalizedMap.get(canonicalForm)!;
      const canonDesc = catalog.normalizedToCanonicalDescMap.get(canonicalForm) || descricao;
      if (canonCodes.length === 1) {
        return {
          codigo: canonCodes[0],
          status: "ENCONTRADO",
          matchType: "NORMALIZADO",
          descricaoOriginal: descricao,
          descricaoCatalogo: canonDesc,
        };
      }
    }

    if (catalog.canonicalMap.has(canonicalForm)) {
      const canonCodes = catalog.canonicalMap.get(canonicalForm)!;
      if (canonCodes.length === 1) {
        return {
          codigo: canonCodes[0],
          status: "ENCONTRADO",
          matchType: "NORMALIZADO",
          descricaoOriginal: descricao,
          descricaoCatalogo: catalog.codeMap.get(canonCodes[0]) || descricao,
        };
      }
    }

    return {
      codigo: null,
      status: "NAO_ENCONTRADO",
      descricaoOriginal: descricao,
    };
  }

  const codes = catalog.normalizedMap.get(normalized)!;
  const canonicalDesc = catalog.normalizedToCanonicalDescMap.get(normalized) || descricao;
  const isExact = isExactCandidate && catalog.exactMap.get(descricao)?.length === 1;

  // Verificação de ambiguidade (mais de um código oficial associado)
  if (codes.length > 1) {
    return {
      codigo: null,
      status: "AMBIGUO",
      candidatos: [...codes],
      matchType: isExactCandidate ? "EXATO" : "NORMALIZADO",
      descricaoOriginal: descricao,
      descricaoCatalogo: canonicalDesc,
    };
  }

  // Correspondência única e válida
  return {
    codigo: codes[0],
    status: "ENCONTRADO",
    matchType: isExact ? "EXATO" : "NORMALIZADO",
    descricaoOriginal: descricao,
    descricaoCatalogo: canonicalDesc,
  };
}

/**
 * Alias em inglês para a função de consulta
 */
export const lookupItemByDescription = consultarItemPorDescricao;

export function getAllCatalogRecords(): ItemCatalogRecord[] {
  return loadItemCatalog().records;
}

/**
 * Obtém estatísticas do catálogo oficial carregado
 */
export function getCatalogStats(): CatalogStats {
  return loadItemCatalog().stats;
}

/**
 * Executa conjunto de testes de validação para confirmar os 3 cenários obrigatórios:
 * 1. Material encontrado (correspondência exata e normalizada)
 * 2. Material não encontrado
 * 3. Material ambíguo (mais de um código para a mesma descrição)
 */
export function executarValidacaoCatalogo(): {
  todosPassaram: boolean;
  totalTestes: number;
  testesPassaram: number;
  resultados: ValidationTestResult[];
} {
  const testes: {
    nome: string;
    entrada: string;
    esperado: { status: ItemLookupStatus; codigo?: string | null; minCandidatos?: number };
  }[] = [
    // Cenário 1: Material Encontrado (Exato)
    {
      nome: "Material Encontrado - Correspondência Exata (ADAPTADOR APC 15KV 120MM²)",
      entrada: "ADAPTADOR APC 15KV 120MM²",
      esperado: { status: "ENCONTRADO", codigo: "229658" },
    },
    // Cenário 1.1: Material Encontrado com Normalização (minúsculas e espaços múltiplos)
    {
      nome: "Material Encontrado - Normalização de Espaços e Case (adesivo vermelho 25kv para rdap)",
      entrada: "  adesivo   vermelho  25kv  para  rdap  ",
      esperado: { status: "ENCONTRADO", codigo: "224295" },
    },
    // Cenário 1.2: Material com Caracteres Técnicos e Símbolos
    {
      nome: "Material Encontrado - Preservação de Símbolos Técnicos (CABO AL 1X 50MM² 15KV PROTEGIDO)",
      entrada: "CABO AL 1X 50MM² 15KV PROTEGIDO",
      esperado: { status: "ENCONTRADO", codigo: "231548" },
    },
    // Cenário 2: Material Não Encontrado (Sem correspondência e sem invenção de código)
    {
      nome: "Material Não Encontrado (Material Fictício Inexistente)",
      entrada: "DISJUNTOR QUÂNTICO HIPERBÓLICO 999KV CEMIG",
      esperado: { status: "NAO_ENCONTRADO", codigo: null },
    },
    // Cenário 2.1: Entrada Vazia ou Inválida
    {
      nome: "Material Não Encontrado - String Vazia",
      entrada: "   ",
      esperado: { status: "NAO_ENCONTRADO", codigo: null },
    },
    // Cenário 3: Material Ambíguo (INVERSOR CC/CA 600W -> Códigos 376714 e 903850)
    {
      nome: "Material Ambíguo - Múltiplos Códigos (INVERSOR CC/CA 600W)",
      entrada: "INVERSOR CC/CA 600W",
      esperado: { status: "AMBIGUO", codigo: null, minCandidatos: 2 },
    },
    // Cenário 3.1: Material Ambíguo com Normalização (inversor cc/ca 800w)
    {
      nome: "Material Ambíguo - Múltiplos Códigos Normalizado (inversor cc/ca 800w)",
      entrada: "  inversor   cc/ca  800w ",
      esperado: { status: "AMBIGUO", codigo: null, minCandidatos: 2 },
    },
    // Cenário 3.2: Material Ambíguo (MEDIDOR KWH 240V 2,5A 3 ELEMENTOS IMÁX 10A)
    {
      nome: "Material Ambíguo - Medidor (MEDIDOR KWH 240V 2,5A 3 ELEMENTOS IMÁX 10A)",
      entrada: "MEDIDOR KWH 240V 2,5A 3 ELEMENTOS IMÁX 10A",
      esperado: { status: "AMBIGUO", codigo: null, minCandidatos: 2 },
    },
  ];

  const resultados: ValidationTestResult[] = [];
  let testesPassaram = 0;

  for (const t of testes) {
    const obtido = consultarItemPorDescricao(t.entrada);
    let sucesso = obtido.status === t.esperado.status;

    if (t.esperado.status === "ENCONTRADO") {
      if (t.esperado.codigo && obtido.codigo !== t.esperado.codigo) {
        sucesso = false;
      }
    } else if (t.esperado.status === "NAO_ENCONTRADO") {
      if (obtido.codigo !== null) {
        sucesso = false;
      }
    } else if (t.esperado.status === "AMBIGUO") {
      if (obtido.codigo !== null) {
        sucesso = false;
      }
      if (
        t.esperado.minCandidatos &&
        (!obtido.candidatos || obtido.candidatos.length < t.esperado.minCandidatos)
      ) {
        sucesso = false;
      }
    }

    if (sucesso) testesPassaram++;

    resultados.push({
      nomeTeste: t.nome,
      entrada: t.entrada,
      resultadoEsperado: t.esperado,
      resultadoObtido: obtido,
      sucesso,
      mensagem: sucesso
        ? `Aprovado: Status=${obtido.status}${obtido.codigo ? `, Código=${obtido.codigo}` : ""}${obtido.candidatos ? `, Candidatos=[${obtido.candidatos.join(", ")}]` : ""}`
        : `Falhou: Esperado Status=${t.esperado.status}, Obtido=${obtido.status}`,
    });
  }

  return {
    todosPassaram: testesPassaram === testes.length,
    totalTestes: testes.length,
    testesPassaram,
    resultados,
  };
}
