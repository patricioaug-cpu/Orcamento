import itensCatalogoJson from "../data/itens_catalogo.json";
import componentesMnemonicosJson from "../data/componentes_mnemonicos_map.json";
import { CEMIG_CATALOG } from "./cemigDatabase";

export interface ItemCatalogRecord {
  codigo: string;
  descricao: string;
}

export interface ItemLookupResult {
  codigo: string | null;
  status: "ENCONTRADO" | "NAO_ENCONTRADO" | "AMBIGUO";
  candidatos?: string[];
  matchType?: "EXATO" | "NORMALIZADO" | "CATALOG_DIRECT";
  descricaoOriginal?: string;
  descricaoCatalogo?: string;
}

interface LoadedCatalog {
  records: ItemCatalogRecord[];
  exactMap: Map<string, string[]>;
  normalizedMap: Map<string, string[]>;
  canonicalMap: Map<string, string[]>;
  codeMap: Map<string, string>;
  normalizedToCanonicalDescMap: Map<string, string>;
}

let catalogCache: LoadedCatalog | null = null;

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

const explicitComponentMap: Record<string, string> =
  (componentesMnemonicosJson as Record<string, string>) || {};

function getLoadedCatalog(): LoadedCatalog {
  if (catalogCache) return catalogCache;

  const raw = itensCatalogoJson as any;
  const records: ItemCatalogRecord[] = Array.isArray(raw)
    ? [...raw]
    : Array.isArray(raw.registros)
    ? [...raw.registros]
    : [];

  const exactMap = new Map<string, string[]>();
  const normalizedMap = new Map<string, string[]>();
  const canonicalMap = new Map<string, string[]>();
  const codeMap = new Map<string, string>();
  const normalizedToCanonicalDescMap = new Map<string, string>();

  // Helper to index item
  const indexItem = (rawDesc: string, code: string) => {
    if (!rawDesc || !code) return;
    if (!codeMap.has(code)) {
      codeMap.set(code, rawDesc);
    }

    const existingExact = exactMap.get(rawDesc) || [];
    if (!existingExact.includes(code)) {
      existingExact.push(code);
    }
    exactMap.set(rawDesc, existingExact);

    const normDesc = normalizeItemDescription(rawDesc);
    const existingNorm = normalizedMap.get(normDesc) || [];
    if (!existingNorm.includes(code)) {
      existingNorm.push(code);
    }
    normalizedMap.set(normDesc, existingNorm);

    const canonDesc = canonicalizeItemDescription(rawDesc);
    const existingCanon = canonicalMap.get(canonDesc) || [];
    if (!existingCanon.includes(code)) {
      existingCanon.push(code);
    }
    canonicalMap.set(canonDesc, existingCanon);

    if (!normalizedToCanonicalDescMap.has(normDesc)) {
      normalizedToCanonicalDescMap.set(normDesc, rawDesc);
    }
  };

  // 1. Index official itens_catalogo.json (1,558 items)
  for (const record of records) {
    indexItem(String(record.descricao || "").trim(), String(record.codigo || "").trim());
  }

  // 2. Also index CEMIG_CATALOG database items
  if (typeof CEMIG_CATALOG === "object" && CEMIG_CATALOG !== null) {
    for (const [code, item] of Object.entries(CEMIG_CATALOG)) {
      indexItem((item.description || "").trim(), code.trim());
    }
  }

  catalogCache = {
    records,
    exactMap,
    normalizedMap,
    canonicalMap,
    codeMap,
    normalizedToCanonicalDescMap,
  };

  return catalogCache;
}

/**
 * Consulta item pelo código numérico ou descrição no catálogo oficial do aplicativo
 */
export function lookupOfficialItem(codeOrDesc: string, fallbackCode?: string): ItemLookupResult {
  if ((!codeOrDesc || typeof codeOrDesc !== "string") && !fallbackCode) {
    return { codigo: null, status: "NAO_ENCONTRADO" };
  }

  const trimmed = (codeOrDesc || "").trim();
  const catalog = getLoadedCatalog();

  // If already a valid numeric code in the catalog or codeMap
  if (/^\d+$/.test(trimmed) && catalog.codeMap.has(trimmed)) {
    return {
      codigo: trimmed,
      status: "ENCONTRADO",
      matchType: "CATALOG_DIRECT",
      descricaoCatalogo: catalog.codeMap.get(trimmed),
    };
  }

  // If fallbackCode is numeric and exists
  if (fallbackCode && /^\d+$/.test(fallbackCode.trim()) && catalog.codeMap.has(fallbackCode.trim())) {
    return {
      codigo: fallbackCode.trim(),
      status: "ENCONTRADO",
      matchType: "CATALOG_DIRECT",
      descricaoCatalogo: catalog.codeMap.get(fallbackCode.trim()),
    };
  }

  // If trimmed is already numeric, return it
  if (/^\d+$/.test(trimmed)) {
    return {
      codigo: trimmed,
      status: "ENCONTRADO",
      matchType: "CATALOG_DIRECT",
    };
  }

  // Strip [A RETIRAR] prefix for description lookup
  const cleanDesc = trimmed.replace(/^\[A RETIRAR\]\s*/i, "").trim();

  // Check exact description
  if (catalog.exactMap.has(cleanDesc)) {
    const codes = catalog.exactMap.get(cleanDesc)!;
    if (codes.length === 1) {
      return {
        codigo: codes[0],
        status: "ENCONTRADO",
        matchType: "EXATO",
        descricaoOriginal: trimmed,
        descricaoCatalogo: cleanDesc,
      };
    }
    return {
      codigo: codes[0],
      status: "AMBIGUO",
      candidatos: [...codes],
      descricaoOriginal: trimmed,
      descricaoCatalogo: cleanDesc,
    };
  }

  // Check normalized description
  const normalized = normalizeItemDescription(cleanDesc);
  if (catalog.normalizedMap.has(normalized)) {
    const codes = catalog.normalizedMap.get(normalized)!;
    const canonical = catalog.normalizedToCanonicalDescMap.get(normalized) || cleanDesc;
    if (codes.length === 1) {
      return {
        codigo: codes[0],
        status: "ENCONTRADO",
        matchType: "NORMALIZADO",
        descricaoOriginal: trimmed,
        descricaoCatalogo: canonical,
      };
    }
    return {
      codigo: codes[0],
      status: "AMBIGUO",
      candidatos: [...codes],
      descricaoOriginal: trimmed,
      descricaoCatalogo: canonical,
    };
  }

  // Fallback 1: Direct verified mapping for mnemonic components
  const explicitCode = explicitComponentMap[cleanDesc] || explicitComponentMap[normalized];
  if (explicitCode && catalog.codeMap.has(explicitCode)) {
    return {
      codigo: explicitCode,
      status: "ENCONTRADO",
      matchType: "NORMALIZADO",
      descricaoOriginal: trimmed,
      descricaoCatalogo: catalog.codeMap.get(explicitCode) || cleanDesc,
    };
  }

  // Fallback 2: Canonicalized description matching
  const canonicalForm = canonicalizeItemDescription(cleanDesc);
  if (catalog.normalizedMap.has(canonicalForm)) {
    const codes = catalog.normalizedMap.get(canonicalForm)!;
    const canonDesc = catalog.normalizedToCanonicalDescMap.get(canonicalForm) || cleanDesc;
    if (codes.length === 1) {
      return {
        codigo: codes[0],
        status: "ENCONTRADO",
        matchType: "NORMALIZADO",
        descricaoOriginal: trimmed,
        descricaoCatalogo: canonDesc,
      };
    }
  }

  if (catalog.canonicalMap.has(canonicalForm)) {
    const codes = catalog.canonicalMap.get(canonicalForm)!;
    if (codes.length === 1) {
      return {
        codigo: codes[0],
        status: "ENCONTRADO",
        matchType: "NORMALIZADO",
        descricaoOriginal: trimmed,
        descricaoCatalogo: catalog.codeMap.get(codes[0]) || cleanDesc,
      };
    }
  }

  // If fallbackCode is available, use it
  if (fallbackCode && fallbackCode.trim()) {
    return {
      codigo: fallbackCode.trim(),
      status: "ENCONTRADO",
      matchType: "CATALOG_DIRECT",
    };
  }

  return {
    codigo: null,
    status: "NAO_ENCONTRADO",
    descricaoOriginal: trimmed,
  };
}

/**
 * Resolve o código oficial garantido para qualquer item de material
 */
export function resolveOfficialMaterialCode(item: {
  code?: string;
  codigo?: string | null;
  description?: string;
}): string {
  // 1. If item has a valid numeric code
  if (item.codigo && /^\d+$/.test(item.codigo.trim())) {
    return item.codigo.trim();
  }
  if (item.code && /^\d+$/.test(item.code.trim())) {
    return item.code.trim();
  }

  // 2. Query application's catalog by description
  if (item.description) {
    const res = lookupOfficialItem(item.description, item.code);
    if (res.codigo) {
      return res.codigo;
    }
  }

  // 3. Fallback to existing item.code or "—"
  return item.code || item.codigo || "—";
}

