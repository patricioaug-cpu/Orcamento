import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { consultarItemPorDescricao } from "./itemCatalogService";
import { resolveDataPath } from "./dataPath";

export type OfficialStatus = "INSTALAR" | "RETIRAR" | "EXISTENTE";

export interface OfficialComponent {
  material: string;
  quantidade: number;
  unidade: string;
}

export interface OfficialMnemonic {
  codigo: string;
  descricao: string;
  componentes: OfficialComponent[];
}

export interface OfficialGrouped {
  mnemonicCode: string;
  description: string;
  totalQuantity: number;
  status: OfficialStatus;
  sourceLocations: string[];
  compositionItems: { code: string; description: string; unit: string; qtyPerUnit: number }[];
  category: "ESTRUTURA" | "POSTE" | "CABO" | "EQUIPAMENTO" | "ACESSORIO" | "MÃO-DE-OBRA";
  unit: string;
}

let catalogCache: Record<string, OfficialMnemonic> | null = null;
let catalogListCache: OfficialMnemonic[] | null = null;

function loadCatalog(): Record<string, OfficialMnemonic> {
  if (catalogCache) return catalogCache;
  const file = resolveDataPath("mnemonicos_catalogo.json");
  if (!fs.existsSync(file)) {
    throw new Error(`Catálogo oficial não encontrado: ${file}`);
  }
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as OfficialMnemonic[];
  catalogListCache = rows;
  catalogCache = {};
  for (const row of rows) catalogCache[row.codigo.trim().toUpperCase()] = row;
  return catalogCache;
}

export function getAllOfficialMnemonics(): OfficialMnemonic[] {
  if (catalogListCache) return catalogListCache;
  loadCatalog();
  return catalogListCache || [];
}

export function getMnemonicCatalogStats() {
  const mnemonics = getAllOfficialMnemonics();
  let totalComponents = 0;
  for (const m of mnemonics) {
    totalComponents += Array.isArray(m.componentes) ? m.componentes.length : 0;
  }
  return {
    totalMnemonicos: mnemonics.length,
    totalComponentes: totalComponents,
  };
}

function normalizeStatus(value: unknown): OfficialStatus {
  const s = String(value || "").trim().toUpperCase();
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
  if (s === "EXISTENTE" || s.startsWith("(") || s.includes("EXIST")) return "EXISTENTE";
  return "INSTALAR";
}

function categoryFor(kind: string): OfficialGrouped["category"] {
  const k = String(kind || "").toUpperCase();
  if (k === "POSTE") return "POSTE";
  if (k === "CABO") return "CABO";
  if (k === "ESTAI" || k === "ACESSORIO" || k === "GUY") return "ACESSORIO";
  if (k === "EQUIPAMENTO" || k === "TRANSFORMADOR") return "EQUIPAMENTO";
  return "ESTRUTURA";
}

export function resolveMnemonicRecords(codeRaw: unknown, voltageLevel?: string): OfficialMnemonic[] {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return [];
  const catalog = loadCatalog();
  const is34 = voltageLevel?.includes("34.5") || voltageLevel?.includes("35") || voltageLevel?.includes("36");

  // 1. Correspondência direta exata
  if (catalog[code]) return [catalog[code]];

  // 2. Correspondência sem espaços, hífens ou barras
  const cleanCode = code.replace(/[\s\-_/]/g, "");
  if (catalog[cleanCode]) return [catalog[cleanCode]];

  // 3. Mapeamento direto de Estruturas Padronizadas CEMIG (MT / BT)
  const structureDirectMap15: Record<string, string> = {
    N1: "N115170CZ24CIL",
    N2: "N215170CZ24CIL",
    N3: "N3-N315170CZ24POL",
    N4: "N415170CZ24CIL",
    CE1: "CE115110",
    CE2: "CE215110",
    CE3: "CE3-CE315110",
    CE4: "CE4-CE415110",
    "2CE1": "2CE115110",
    "2CE2": "2CE215110",
    "2CE3": "2CE3-2CE315110",
    "2CE4": "2CE4-2CE415110",
    M1: "M115170CZ24CIL",
    M2: "M215170CZ24CIL",
    M3: "M315170CZ24CIL",
    M4: "M415170CZ24CIL",
    B1: "B115170CZ24CIL",
    B2: "B215170CZ24CIL",
    B3: "B315170CZ24CIL",
    B4: "B415170CZ24CIL",
    U1: "U115170ISOPILAR",
    U2: "U215170ISOPILAR",
    U3: "U3-U315170",
    U4: "U4-U415170",
    SI1: "SI1",
    SI2: "SI2",
    SI3: "SI3",
    SI3R: "SI3R",
    SI4: "SI4",
    S12N: "S12N",
    S13N: "S13N",
    S22N: "S22N",
    S23N: "S23N",
    S11N: "S11N",
    S14N: "S14N",
  };

  const structureDirectMap34: Record<string, string> = {
    N1: "N136300CZ24CIL",
    N2: "N236300CZ24CIL",
    N3: "N3-N336170CZ24POL",
    N4: "N436170CZ24CIL",
    CE1: "CE136110",
    CE2: "CE236110",
    CE3: "CE3-CE336110",
    CE4: "CE4-CE436110",
    "2CE1": "2CE136110",
    "2CE2": "2CE236110",
    "2CE3": "2CE3-2CE336110",
    "2CE4": "2CE4-2CE436110",
    M1: "M136300CZ24CIL",
    M2: "M236300CZ24CIL",
    M3: "M336300CZ24CIL",
    M4: "M436170CZ24CIL",
    B1: "B115170CZ24CIL",
    B2: "B215170CZ24CIL",
    B3: "B315170CZ24CIL",
    B4: "B415170CZ24CIL",
    U1: "U136170ISOPILAR",
    U2: "U236170ISOPILAR",
    U3: "U3-U336170",
    U4: "U4-U436170",
    SI1: "SI1",
    SI2: "SI2",
    SI3: "SI3",
    SI3R: "SI3R",
    SI4: "SI4",
    S12N: "S12N",
    S13N: "S13N",
    S22N: "S22N",
    S23N: "S23N",
    S11N: "S11N",
    S14N: "S14N",
  };

  const directMap = is34 ? structureDirectMap34 : structureDirectMap15;
  if (directMap[code] && catalog[directMap[code]]) {
    return [catalog[directMap[code]]];
  }
  if (directMap[cleanCode] && catalog[directMap[cleanCode]]) {
    return [catalog[directMap[cleanCode]]];
  }

  // 4. Mapeamento de Cabos e Condutores CEMIG
  const normCable = code.replace(/\s+/g, " ");
  if (
    normCable.includes("1/0") ||
    cleanCode.includes("CAA10") ||
    cleanCode.includes("CA10") ||
    cleanCode.includes("10AWG") ||
    normCable.includes("53MM")
  ) {
    if (catalog["CAA10"]) return [catalog["CAA10"]];
  }
  if (
    normCable.includes("4/0") ||
    cleanCode.includes("CAA40") ||
    cleanCode.includes("CA40") ||
    cleanCode.includes("40AWG") ||
    normCable.includes("107MM")
  ) {
    if (catalog["CAA40"]) return [catalog["CAA40"]];
  }
  if (
    normCable.match(/\b4\s*AWG\b/i) ||
    normCable.includes("CAA 4") ||
    normCable.includes("CAA4") ||
    normCable.includes("CA 4") ||
    cleanCode.startsWith("CAA4") ||
    cleanCode.startsWith("CA4") ||
    normCable.includes("21MM") ||
    normCable === "4AWG"
  ) {
    if (catalog["CAA4"]) return [catalog["CAA4"]];
  }
  if (
    normCable.match(/\b2\s*AWG\b/i) ||
    normCable.includes("CAA 2") ||
    normCable.includes("CAA2") ||
    normCable.includes("CA 2") ||
    cleanCode.startsWith("CAA2") ||
    cleanCode.startsWith("CA2") ||
    normCable.includes("34MM") ||
    normCable === "2AWG"
  ) {
    if (catalog["CAA2"]) return [catalog["CAA2"]];
  }
  if (
    normCable.includes("336") ||
    cleanCode.includes("CAA336") ||
    cleanCode.includes("336MCM") ||
    normCable.includes("170MM")
  ) {
    if (catalog["CAA336"]) return [catalog["CAA336"]];
  }
  if (
    normCable.includes("70") &&
    (normCable.includes("ABCN") || normCable.includes("MULTIPLEX") || normCable.includes("BT") || normCable.includes("CQP") || cleanCode.includes("CATN70"))
  ) {
    if (catalog["CQP701"]) return [catalog["CQP701"]];
    if (catalog["CATN70"]) return [catalog["CATN70"]];
  }
  if (
    normCable.includes("35") &&
    (normCable.includes("ABCN") || normCable.includes("MULTIPLEX") || normCable.includes("BT") || normCable.includes("CQP") || cleanCode.includes("CQP35"))
  ) {
    if (catalog["CQP351"]) return [catalog["CQP351"]];
    if (catalog["CQP35"]) return [catalog["CQP35"]];
  }
  if (
    normCable.includes("9.5") ||
    normCable.includes("9,5") ||
    normCable.includes("3/8") ||
    cleanCode.includes("CACO95")
  ) {
    if (catalog["CACO95"]) return [catalog["CACO95"]];
  }
  if (normCable.includes("3N5") || cleanCode.includes("CACO3N5")) {
    if (catalog["CACO3N5"]) return [catalog["CACO3N5"]];
  }

  // 5. Mapeamento de Estais CEMIG
  if (code.includes("ANCORA") || code === "ESTAI_ANCORA" || code === "EST95ANCCH" || code === "ESTAI") {
    if (catalog["EST95ANCCH"]) return [catalog["EST95ANCCH"]];
    if (catalog["EST95ANCTO"]) return [catalog["EST95ANCTO"]];
  }
  if (code.includes("CRUZETA A CRUZETA") || code === "ESTAI_CRUZETA" || code === "EST64CZCZ") {
    if (catalog["EST64CZCZ"]) return [catalog["EST64CZCZ"]];
  }
  if (code.includes("CRUZETA A POSTE") || code === "ESTAI_POSTE" || code === "EST64CZP") {
    if (catalog["EST64CZP"]) return [catalog["EST64CZP"]];
  }

  // 6. Shorthand de Postes CEMIG (ex: "11-300", "11/300", "PC 11-300", "PD 12-600", "10-150", "9-150")
  const poleMatch = code.match(/^P?([CDM])?[\s\-_/]*(\d{1,2})[\s\-_/]+(\d{3,4})$/);
  if (poleMatch) {
    const type = poleMatch[1] === "D" ? "PD" : poleMatch[1] === "M" ? "PM" : "PC";
    const key = `${type}${poleMatch[2].padStart(2, "0")}${poleMatch[3]}`;
    if (catalog[key]) return [catalog[key]];
  }

  // 7. Shorthand de Transformadores CEMIG (ex: "TR 45kVA", "TR 45 13.8", "45KVA 13.8KV", "TRAFO_45KVA", "75KVA")
  const trafoMatch = code.match(/(?:TR|TRAFO|TRANSFORMADOR)?.*?(\d{1,3}(?:[.,]\d)?)\s*(?:KVA|K)?/);
  if (trafoMatch && trafoMatch[1] && (code.includes("TR") || code.includes("KVA") || code.includes("TRAFO") || code.includes("TRANSFORMADOR"))) {
    const kvaNum = trafoMatch[1].replace(".", "").replace(",", "");
    const tag = is34 ? "24" : "15";
    const target3 = `TR3${kvaNum}${tag}`;
    const target1 = `TR1${kvaNum}${tag}`;
    const target3Alt = `TR3${kvaNum}15`;
    const target3Alt36 = `TR3${kvaNum}36`;
    if (catalog[target3]) return [catalog[target3]];
    if (catalog[target3Alt36]) return [catalog[target3Alt36]];
    if (catalog[target3Alt]) return [catalog[target3Alt]];
    if (catalog[target1]) return [catalog[target1]];
  }

  // 8. Shorthand de Chaves Fusíveis CEMIG
  if (code.startsWith("CFS") || code.includes("FUSÍVEL") || code.includes("FUSIVEL") || code === "100A" || code === "200A") {
    if (code.includes("200")) {
      if (catalog["CFS1RP20071KA15KV"]) return [catalog["CFS1RP20071KA15KV"]];
    }
    const target = is34 ? "CFS130010KA36KV" : "CFS1RP10071KA15KV";
    if (catalog[target]) return [catalog[target]];
  }

  // 9. Composição mista ou múltipla (ex: B4-CE3, B1B4, N1-SI3)
  if (code.includes("-") || code.includes("/") || code.includes("+")) {
    const parts = code.split(/[-/+]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && !parts.some((p) => !isNaN(Number(p)))) {
      const resolved: OfficialMnemonic[] = [];
      for (const p of parts) {
        resolved.push(...resolveMnemonicRecords(p, voltageLevel));
      }
      if (resolved.length > 0) return resolved;
    }
  }

  // If combined like B1B4
  const multiMatch = code.match(/([A-Z]{1,3}\d{1,2})/g);
  if (multiMatch && multiMatch.length > 1 && multiMatch.join("") === code) {
    const resolved: OfficialMnemonic[] = [];
    for (const part of multiMatch) {
      resolved.push(...resolveMnemonicRecords(part, voltageLevel));
    }
    if (resolved.length > 0) return resolved;
  }

  // 10. Busca por prefixo no catálogo oficial de 7.203 mnemônicos
  const vTag = is34 ? "36" : "15";
  const list = getAllOfficialMnemonics();
  const startsWith = list.filter((m) => m.codigo.startsWith(code) || m.codigo.startsWith(cleanCode));
  if (startsWith.length > 0) {
    const vMatch = startsWith.find((m) => m.codigo.includes(vTag));
    return [vMatch || startsWith[0]];
  }

  // 11. Busca textual por descrição exata no catálogo
  const descMatch = list.find((m) => m.descricao && m.descricao.toUpperCase().includes(code));
  if (descMatch) return [descMatch];

  return [];
}

function add(
  map: Map<string, OfficialGrouped>,
  notFound: Set<string>,
  codeRaw: unknown,
  quantityRaw: unknown,
  statusRaw: unknown,
  kind: string,
  location: string,
  voltageLevel?: string
) {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return;
  const quantity = Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) return;
  const status = normalizeStatus(statusRaw);

  const matchedMnemonics = resolveMnemonicRecords(code, voltageLevel);

  if (matchedMnemonics.length === 0) {
    notFound.add(code);
    return;
  }

  for (const catalog of matchedMnemonics) {
    const mCode = catalog.codigo.trim().toUpperCase();
    const key = `${mCode}__${status}`;
    const existing = map.get(key);
    const category = categoryFor(kind);

    if (existing) {
      existing.totalQuantity += quantity;
      if (location && !existing.sourceLocations.includes(location)) existing.sourceLocations.push(location);
      continue;
    }

    map.set(key, {
      mnemonicCode: mCode,
      description: status === "RETIRAR" ? `[A RETIRAR] ${catalog.descricao}` : catalog.descricao,
      totalQuantity: quantity,
      status,
      sourceLocations: location ? [location] : [],
      category,
      unit: catalog.componentes[0]?.unidade || "UN",
      compositionItems: catalog.componentes.map((c) => ({
        // The source spreadsheet provides material description, not a numeric material code.
        // Never invent a code: use the exact material description as the stable component key.
        code: c.material,
        description: c.material,
        unit: c.unidade,
        qtyPerUnit: Number(c.quantidade) || 0,
      })),
    });
  }
}

export function processOfficialMnemonics(rawData: any) {
  const map = new Map<string, OfficialGrouped>();
  const notFound = new Set<string>();
  const vLevel = rawData?.voltageLevel || "13.8kV";

  // Se o input for diretamente um array de mnemônicos / estruturas
  const directList = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.mnemonicos)
    ? rawData.mnemonicos
    : Array.isArray(rawData?.mnemonics)
    ? rawData.mnemonics
    : Array.isArray(rawData?.elementos)
    ? rawData.elementos
    : Array.isArray(rawData?.items)
    ? rawData.items
    : [];

  for (const item of directList) {
    const code = item.mnemonicCode || item.codigo || item.code || item.mnemonico || item.tipo;
    const qty = Number(item.quantity ?? item.quantidade ?? item.totalQuantity ?? 1);
    add(
      map,
      notFound,
      code,
      qty > 0 ? qty : 1,
      item.status || item.estado || "INSTALAR",
      item.type || item.kind || item.categoria || "ESTRUTURA",
      item.id || item.localizacao || "",
      vLevel
    );
  }

  for (const s of Array.isArray(rawData?.detectedStructures) ? rawData.detectedStructures : []) {
    const code = s.mnemonicCode || s.code || s.codigo;
    const qty = Number(s.quantity ?? s.quantidade ?? 1);
    add(map, notFound, code, qty > 0 ? qty : 1, s.status, s.type || s.voltage || "ESTRUTURA", s.id || "", vLevel);
  }

  // Explicit poles are processed independently. We intentionally do NOT infer a pole
  // from associatedPost, avoiding double counting when Gemini returns both arrays.
  for (const p of Array.isArray(rawData?.detectedPoles) ? rawData.detectedPoles : []) {
    const code = p.mnemonicCode || p.typeSpec || p.codigo;
    const qty = Number(p.quantity ?? p.quantidade ?? 1);
    add(map, notFound, code, qty > 0 ? qty : 1, p.status, "POSTE", p.id || "", vLevel);
  }

  for (const c of Array.isArray(rawData?.detectedCables) ? rawData.detectedCables : []) {
    const qty = Number(c.estimatedLengthMeters ?? c.quantity ?? c.quantidade ?? 0);
    const code = c.mnemonicCode || c.cableType || c.codigo;
    add(map, notFound, code, qty, c.status, "CABO", c.id || "", vLevel);
  }

  for (const t of Array.isArray(rawData?.detectedTransformers) ? rawData.detectedTransformers : []) {
    const code = t.mnemonicCode || t.powerKva || t.codigo;
    add(map, notFound, code, Number(t.quantity ?? t.quantidade ?? 1), t.status, "TRANSFORMADOR", t.associatedPole || "", vLevel);
  }

  for (const g of Array.isArray(rawData?.detectedGuys) ? rawData.detectedGuys : []) {
    const code = g.mnemonicCode || g.type || g.codigo;
    add(map, notFound, code, Number(g.quantity ?? g.quantidade ?? 1), g.status, "ESTAI", "", vLevel);
  }

  for (const eq of Array.isArray(rawData?.detectedEquipment)
    ? rawData.detectedEquipment
    : Array.isArray(rawData?.detectedEquipments)
    ? rawData.detectedEquipments
    : []) {
    const code = eq.mnemonicCode || eq.code || eq.codigo || eq.specification;
    const qty = Number(eq.quantity ?? eq.quantidade ?? 1);
    add(map, notFound, code, qty > 0 ? qty : 1, eq.status, "EQUIPAMENTO", eq.associatedPole || eq.id || "", vLevel);
  }

  for (const item of Array.isArray(rawData?.detectedItems) ? rawData.detectedItems : []) {
    const code = item.mnemonicCode || item.code || item.codigo;
    const qty = Number(item.quantity ?? item.quantidade ?? 1);
    add(map, notFound, code, qty > 0 ? qty : 1, item.status, item.type || item.kind || "ESTRUTURA", item.id || "", vLevel);
  }

  const groupedMnemonics = Array.from(map.values());

  // EXISTENTE is tracked for audit but is not a procurement/material quantity.
  const materialMap = new Map<string, any>();
  for (const m of groupedMnemonics) {
    if (m.status === "EXISTENTE") continue;
    for (const item of m.compositionItems) {
      const key = `${item.code}__${item.unit}__${m.status}`;
      const total = item.qtyPerUnit * m.totalQuantity;
      const old = materialMap.get(key);
      if (old) old.quantity += total;
      else {
        const hash = crypto.createHash("sha256").update(key).digest("hex");
        materialMap.set(key, {
          id: `official_${hash}`,
          code: item.code,
          description: m.status === "RETIRAR" ? `[A RETIRAR] ${item.description}` : item.description,
          unit: item.unit,
          quantity: total,
          category: m.category,
          status: m.status,
        });
      }
    }
  }

  // Consolidação normal dos materiais
  const consolidatedMaterials = Array.from(materialMap.values()).map((mat) => {
    // 6. SOMENTE DEPOIS da consolidação normal, consultar no catálogo oficial de códigos
    const rawDesc = mat.description.startsWith("[A RETIRAR] ")
      ? mat.description.slice("[A RETIRAR] ".length).trim()
      : mat.description.trim();

    const lookup = consultarItemPorDescricao(rawDesc);

    // 7. Acrescentar ao material: codigo, statusCodigo, candidatosCodigo
    return {
      ...mat,
      code: lookup.codigo || (lookup.status === "AMBIGUO" ? "AMBÍGUO" : "NÃO ENCONTRADO"),
      codigo: lookup.codigo, // string | null (estritamente null se não encontrado ou ambíguo)
      statusCodigo: lookup.status, // "ENCONTRADO" | "NAO_ENCONTRADO" | "AMBIGUO"
      candidatosCodigo: lookup.status === "AMBIGUO" && lookup.candidatos ? lookup.candidatos : undefined,
    };
  });

  const structureItemMap: Record<string, any[]> = {};
  const attachOne = (id: string, codeRaw: unknown, statusRaw: unknown, fallbackCode?: unknown) => {
    const status = normalizeStatus(statusRaw);
    if (!id && !codeRaw && !fallbackCode) return;
    if (status === "EXISTENTE") {
      if (id && !structureItemMap[id]) structureItemMap[id] = [];
      return;
    }
    const resolved = resolveMnemonicRecords(codeRaw || fallbackCode, vLevel);
    if (resolved.length === 0) return;

    const allCompRows: any[] = [];
    for (const catalog of resolved) {
      for (const c of catalog.componentes) {
        const lookup = consultarItemPorDescricao(c.material);
        allCompRows.push({
          id: `${id || "ITEM"}_${c.material}`,
          code: lookup.codigo || (lookup.status === "AMBIGUO" ? "AMBÍGUO" : "NÃO ENCONTRADO"),
          codigo: lookup.codigo,
          statusCodigo: lookup.status,
          candidatosCodigo: lookup.status === "AMBIGUO" && lookup.candidatos ? lookup.candidatos : undefined,
          description: c.material,
          unit: c.unidade,
          quantity: Number(c.quantidade) || 0,
          status,
          category: "ESTRUTURA",
        });
      }
    }

    if (id) {
      if (!structureItemMap[id]) structureItemMap[id] = [];
      structureItemMap[id].push(...allCompRows);
    }
    if (codeRaw) {
      const cKey = String(codeRaw).toUpperCase().trim();
      if (!structureItemMap[cKey]) structureItemMap[cKey] = [];
      structureItemMap[cKey].push(...allCompRows);
    }
    if (fallbackCode) {
      const fKey = String(fallbackCode).toUpperCase().trim();
      if (!structureItemMap[fKey]) structureItemMap[fKey] = [];
      structureItemMap[fKey].push(...allCompRows);
    }
  };

  for (const s of Array.isArray(rawData?.detectedStructures) ? rawData.detectedStructures : []) {
    attachOne(String(s.id || ""), s.mnemonicCode, s.status, s.code);
    if (s.associatedPost) {
      attachOne(String(s.associatedPost), s.mnemonicCode, s.status, s.code);
    }
  }
  for (const p of Array.isArray(rawData?.detectedPoles) ? rawData.detectedPoles : []) {
    attachOne(String(p.id || ""), p.mnemonicCode, p.status, p.typeSpec);
  }
  for (const eq of Array.isArray(rawData?.detectedEquipment) ? rawData.detectedEquipment : []) {
    attachOne(String(eq.id || ""), eq.mnemonicCode, eq.status, eq.code || eq.specification);
    if (eq.associatedPole) {
      attachOne(String(eq.associatedPole), eq.mnemonicCode, eq.status, eq.code || eq.specification);
    }
  }
  for (const tr of Array.isArray(rawData?.detectedTransformers) ? rawData.detectedTransformers : []) {
    attachOne(String(tr.id || ""), tr.mnemonicCode, tr.status, tr.powerKva || tr.code);
    if (tr.associatedPole) {
      attachOne(String(tr.associatedPole), tr.mnemonicCode, tr.status, tr.powerKva || tr.code);
    }
  }
  for (const g of Array.isArray(rawData?.detectedGuys) ? rawData.detectedGuys : []) {
    attachOne(String(g.id || ""), g.mnemonicCode, g.status, g.type);
    if (g.associatedPole) {
      attachOne(String(g.associatedPole), g.mnemonicCode, g.status, g.type);
    }
  }

  return {
    groupedMnemonics,
    materials: consolidatedMaterials,
    structureItemMap,
    mnemonicosNaoEncontrados: Array.from(notFound).sort(),
    catalogStats: {
      mnemonicCount: Object.keys(loadCatalog()).length,
      sourceRows: 30949,
    },
  };
}
