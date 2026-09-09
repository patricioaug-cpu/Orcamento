import { IdentifiedStructure, CableSegment, LaborItem, ProjectVoltageLevel, NetworkEnvironment } from "../types";
import {
  OFFICIAL_LABOR_CATALOG,
  DEFAULT_US_UNIT_PRICE,
  OfficialLaborCatalogItem,
  getLaborCatalogForType,
  formatLaborDescriptionForType,
} from "../data/laborCatalog";

export interface ProjectLaborInput {
  structures: IdentifiedStructure[];
  cables: CableSegment[];
  voltageLevel?: ProjectVoltageLevel;
  networkType?: NetworkEnvironment;
}

export interface ProjectLaborSummary {
  items: LaborItem[];
  allCatalogItems: OfficialLaborCatalogItem[];
  totalUS: number;
  usUnitPrice: number;
  totalLaborValue: number;
  networkType: NetworkEnvironment;
}

/**
 * Cross-references project structures and cables with the 42 official labor activities
 * from the user's attached document and consolidates the total US of the project.
 * Supports selecting RDR (Rural) or RDU (Urbano).
 */
export function calculateProjectLabor(
  input: ProjectLaborInput,
  customUsUnitPrice?: number,
  customNetworkType?: NetworkEnvironment
): ProjectLaborSummary {
  const usPrice =
    customUsUnitPrice !== undefined && customUsUnitPrice >= 0
      ? customUsUnitPrice
      : DEFAULT_US_UNIT_PRICE;

  const effectiveNetworkType: NetworkEnvironment =
    customNetworkType ||
    input.networkType ||
    (input.voltageLevel === "34.5kV" ? "RDR" : "RDU");

  const catalog = getLaborCatalogForType(effectiveNetworkType);

  const quantitiesByItem = new Map<number, number>();
  // Initialize all 42 items with 0
  catalog.forEach((cat) => {
    quantitiesByItem.set(cat.item, 0);
  });

  const isThreePhaseProject =
    input.voltageLevel === "13.8kV" ||
    input.voltageLevel === "34.5kV" ||
    !input.voltageLevel ||
    input.voltageLevel === "AUTO";

  // 1. ANALYZE IDENTIFIED STRUCTURES & POLES
  const uniquePolesInstalled = new Set<string>();
  const uniquePolesRemoved = new Set<string>();
  const uniquePolesExisting = new Set<string>();

  (input.structures || []).forEach((st) => {
    const text = `${st.id} ${st.code} ${st.description} ${st.associatedPost || ""}`.toUpperCase();
    const isRemove = st.status === "RETIRAR" || text.includes("RETIRAR") || text.includes("RETIRADA");
    const isExisting = st.status === "EXISTENTE" || text.includes("EXISTENTE") || text.includes("APROVEITAR");
    const isInstall = !isRemove && !isExisting;

    // A. Track Poles
    const poleId = st.associatedPost || (st.type === "POSTE" ? st.id : null);
    if (poleId) {
      if (isRemove) uniquePolesRemoved.add(poleId);
      else if (isExisting) uniquePolesExisting.add(poleId);
      else if (isInstall) uniquePolesInstalled.add(poleId);
    } else if (st.type === "POSTE") {
      if (isRemove) uniquePolesRemoved.add(st.id);
      else if (isExisting) uniquePolesExisting.add(st.id);
      else if (isInstall) uniquePolesInstalled.add(st.id);
    }

    // B. Concretagem de Base (Item 1)
    if (text.includes("ENG") || text.includes("CONCRETO") || text.includes("BASE CONCRETADA") || text.includes("CONCRETAGEM")) {
      quantitiesByItem.set(1, (quantitiesByItem.get(1) || 0) + 1);
    }

    // C. Cava em Rocha (Item 8)
    if (text.includes("ROCHA") || text.includes("SOLO ROCHOSO") || text.includes("CAVA ROCHA")) {
      quantitiesByItem.set(8, (quantitiesByItem.get(8) || 0) + 1);
    }

    // D. Transformers
    const isTrafo =
      st.type === "TRANSFORMADOR" ||
      text.includes("TRANSFORMADOR") ||
      text.includes("TRAFO") ||
      text.includes("KVA");

    if (isTrafo) {
      const isTrafoThreePhase = text.includes("TRIF") || text.includes("3F") || text.includes("30") || (!text.includes("MONOF") && isThreePhaseProject);
      if (isRemove) {
        if (isTrafoThreePhase) {
          // Item 35: Retirada de transformador trifásico
          quantitiesByItem.set(35, (quantitiesByItem.get(35) || 0) + 1);
        } else {
          // Item 34: Retirada de transformador monofásico
          quantitiesByItem.set(34, (quantitiesByItem.get(34) || 0) + 1);
        }
      } else if (isInstall) {
        if (isTrafoThreePhase) {
          // Item 22: Instalação de transformador trifásico com chave e com pára-raios
          quantitiesByItem.set(22, (quantitiesByItem.get(22) || 0) + 1);
        } else {
          // Item 20: Instalação de transformador monofásico com chave e com pára-raios
          quantitiesByItem.set(20, (quantitiesByItem.get(20) || 0) + 1);
        }
      }
    }

    // E. Estais (Guy Wires)
    const isEstai = st.type === "ESTAI" || text.includes("ESTAI") || text.includes("CONTRAVENTO");
    if (isEstai && isInstall) {
      if (isThreePhaseProject) {
        // Item 17: Instalação de estai de âncora, reesticamento de condutor RDR 30 - 4 a 1/0 AWG
        quantitiesByItem.set(17, (quantitiesByItem.get(17) || 0) + 1);
      } else {
        // Item 16: Instalação de estai de âncora, reesticamento de condutor RDR 10
        quantitiesByItem.set(16, (quantitiesByItem.get(16) || 0) + 1);
      }
    }

    // F. Iluminação Pública (Braço de IP)
    const isIP = text.includes("IP") || text.includes("BRACO") || text.includes("BRAÇO") || text.includes("LUMINARIA") || text.includes("LUMINÁRIA");
    if (isIP) {
      if (text.includes("SUBST") || text.includes("TROCA")) {
        // Item 30: Substituição de braço de IP tipo leve por médio completo
        quantitiesByItem.set(30, (quantitiesByItem.get(30) || 0) + 1);
      } else if (text.includes("MEDIO") || text.includes("MÉDIO") || text.includes("PESADO")) {
        // Item 13: Instalação de braço de IP tipo médio completo
        quantitiesByItem.set(13, (quantitiesByItem.get(13) || 0) + 1);
      } else {
        // Item 12: Instalação de braço de IP tipo leve completo
        quantitiesByItem.set(12, (quantitiesByItem.get(12) || 0) + 1);
      }
    }

    // G. Medidores / Padrões
    const isMedicao = text.includes("MEDIDOR") || text.includes("PADRAO") || text.includes("PADRÃO") || text.includes("PES");
    if (isMedicao && isInstall) {
      if (text.includes("PES")) {
        // Item 40: Instalação de padrão PES
        quantitiesByItem.set(40, (quantitiesByItem.get(40) || 0) + 1);
      } else if (text.includes("TRIF")) {
        // Item 42: Instalação de padrão trifásico
        quantitiesByItem.set(42, (quantitiesByItem.get(42) || 0) + 1);
      } else if (effectiveNetworkType === "RDR" && (text.includes("POSTE") || text.includes("RDR"))) {
        // Item 41: Instalação de padrão RDR monofásico, incorporado em poste (0.15 US)
        quantitiesByItem.set(41, (quantitiesByItem.get(41) || 0) + 1);
      } else {
        // Item 7: Instalação de medidor em RDU (0.05 US)
        quantitiesByItem.set(7, (quantitiesByItem.get(7) || 0) + 1);
      }
    }

    // H. Derivações (Item 14 & 15)
    if (text.includes("DERIV") || text.includes("DERIVAÇÃO")) {
      if (isThreePhaseProject) {
        // Item 15: Instalação de derivação 30, sem troca de poste
        quantitiesByItem.set(15, (quantitiesByItem.get(15) || 0) + 1);
      } else {
        // Item 14: Instalação de derivação 10, sem troca de poste
        quantitiesByItem.set(14, (quantitiesByItem.get(14) || 0) + 1);
      }
    }

    // I. Poste Modificado RDR (Item 32)
    if (effectiveNetworkType === "RDR" && isExisting && (text.includes("MODIF") || text.includes("ADIC") || st.type === "MT" || st.type === "BT")) {
      quantitiesByItem.set(32, (quantitiesByItem.get(32) || 0) + 1);
    }
  });

  // 2. CONSOLIDATE POLES INSTALL / REMOVE / APROVEITAR
  const countPolesInstall = Math.max(
    uniquePolesInstalled.size,
    (input.structures || []).filter((s) => s.type === "POSTE" && s.status !== "RETIRAR" && s.status !== "EXISTENTE").length
  );
  if (countPolesInstall > 0) {
    if (effectiveNetworkType === "RDU") {
      // Em RDU (Urbano): Utiliza o Item 5 oficial: "Poste (s) a instalar" (1.00 US)
      quantitiesByItem.set(5, (quantitiesByItem.get(5) || 0) + countPolesInstall);
    } else {
      // Em RDR (Rural): Utiliza os itens de rede rural oficial CEMIG (1.20 US)
      if (isThreePhaseProject) {
        // Item 25: Instalação de poste RDR 30, cabo 4 a 1/0 AWG (1.20 US)
        quantitiesByItem.set(25, (quantitiesByItem.get(25) || 0) + countPolesInstall);
      } else {
        // Item 24: Instalação de poste RDR 10 (1.20 US)
        quantitiesByItem.set(24, (quantitiesByItem.get(24) || 0) + countPolesInstall);
      }
    }
  }

  const countPolesRemove = Math.max(
    uniquePolesRemoved.size,
    (input.structures || []).filter((s) => s.type === "POSTE" && s.status === "RETIRAR").length
  );
  if (countPolesRemove > 0) {
    if (effectiveNetworkType === "RDU") {
      // Em RDU (Urbano): Utiliza o Item 33 oficial: "Poste (s) a retirar" (0.70 US)
      quantitiesByItem.set(33, (quantitiesByItem.get(33) || 0) + countPolesRemove);
    } else {
      // Em RDR (Rural): Utiliza os itens de rede rural oficial CEMIG (0.84 US)
      if (isThreePhaseProject) {
        // Item 37: Retirar poste equipado, RDR 30, 4a 1/0 AWG (0.84 US)
        quantitiesByItem.set(37, (quantitiesByItem.get(37) || 0) + countPolesRemove);
      } else {
        // Item 36: Retirar poste equipado, RDR 10 (0.84 US)
        quantitiesByItem.set(36, (quantitiesByItem.get(36) || 0) + countPolesRemove);
      }
    }
  }

  const countPolesExisting = Math.max(
    uniquePolesExisting.size,
    (input.structures || []).filter((s) => s.type === "POSTE" && s.status === "EXISTENTE").length
  );
  if (countPolesExisting > 0) {
    if (effectiveNetworkType === "RDU") {
      // Em RDU: se houver postes existentes complexos com circuitos secundários ou MT
      const hasComplexUrban = (input.structures || []).some((s) => {
        const text = `${s.id} ${s.code} ${s.description}`.toUpperCase();
        return s.status === "EXISTENTE" && (text.includes("3") || text.includes("N") || text.includes("CE") || text.includes("COMPLEX") || s.type === "MT");
      });
      if (hasComplexUrban) {
        // Item 2: Poste (s) a aproveitar complexo (0.50 US)
        quantitiesByItem.set(2, (quantitiesByItem.get(2) || 0) + countPolesExisting);
      } else {
        // Item 3: Poste (s) a aproveitar simples/normal (0.35 US)
        quantitiesByItem.set(3, (quantitiesByItem.get(3) || 0) + countPolesExisting);
      }
    } else {
      // Em RDR: se não foi computado como poste modificado RDR (Item 32)
      if ((quantitiesByItem.get(32) || 0) === 0) {
        // Item 3: Poste (s) a aproveitar (0.35 US)
        quantitiesByItem.set(3, (quantitiesByItem.get(3) || 0) + countPolesExisting);
      }
    }
  }

  // 3. ANALYZE CABLES (LENGTH IN KM)
  (input.cables || []).forEach((cb) => {
    const text = `${cb.cableType} ${cb.notes || ""}`.toUpperCase();
    // Em rede RDU os vãos urbanos médios são de ~40m; em rede rural RDR os vãos médios são de ~100m
    const spanDefaultMeters = effectiveNetworkType === "RDR" ? 100 : 40;
    const lengthMeters = cb.estimatedLengthMeters || (cb.spansCount ? cb.spansCount * spanDefaultMeters : 0);
    const lengthKm = Number((lengthMeters / 1000).toFixed(3));
    if (lengthKm <= 0) return;

    const isRemove = cb.status === "RETIRAR" || text.includes("RETIRAR") || text.includes("RETIRADA");
    const isConversion = text.includes("CONVERS") || text.includes("CONVERSÃO");
    const is3Phase = isThreePhaseProject || text.includes("3X") || text.includes("TRIF") || cb.voltage === "MT";

    if (isConversion) {
      if (text.includes("CAA 2") || text.includes("2 AWG")) {
        // Item 9: Conversão de RDR 10 em RDR 30, CAA 2 AWG (7.46 US/km)
        quantitiesByItem.set(9, Number(((quantitiesByItem.get(9) || 0) + lengthKm).toFixed(3)));
      } else {
        // Item 10: Conversão de RDR 10 em RDR 30, CAA 4 AWG (3.37 US/km)
        quantitiesByItem.set(10, Number(((quantitiesByItem.get(10) || 0) + lengthKm).toFixed(3)));
      }
    } else if (isRemove) {
      if (is3Phase) {
        // Item 38: Retirada de 1 km RDR trifásica cabo 4 a 1/0 AWG (7.66 US/km)
        quantitiesByItem.set(38, Number(((quantitiesByItem.get(38) || 0) + lengthKm).toFixed(3)));
      } else {
        // Item 39: Retirada de 1 km RDR monofásica cabo 4 a 1/0 AWG (5.31 US/km)
        quantitiesByItem.set(39, Number(((quantitiesByItem.get(39) || 0) + lengthKm).toFixed(3)));
      }
    } else {
      // Construction / Installation
      if (is3Phase) {
        // Item 11: Construção de 1 km de RDR 30, cabo 4 a 1/0 AWG (10.94 US/km)
        quantitiesByItem.set(11, Number(((quantitiesByItem.get(11) || 0) + lengthKm).toFixed(3)));
      } else {
        // Item 18: Construção de 1 km de RDR 10, cabo 4 a 1/0 AWG (7.59 US/km)
        quantitiesByItem.set(18, Number(((quantitiesByItem.get(18) || 0) + lengthKm).toFixed(3)));
      }
    }
  });

  // 4. BUILD THE CONSOLIDATED LABOR LIST
  const activeItems: LaborItem[] = [];
  let totalUS = 0;

  catalog.forEach((cat) => {
    const qty = quantitiesByItem.get(cat.item) || 0;
    if (qty > 0) {
      const itemTotalUS = Number((qty * cat.usUnit).toFixed(3));
      const itemTotalValue = Number((itemTotalUS * usPrice).toFixed(2));
      totalUS += itemTotalUS;

      activeItems.push({
        item: cat.item,
        code: cat.code,
        description: cat.description,
        unit: cat.unit,
        usUnit: cat.usUnit,
        quantity: qty,
        totalUS: itemTotalUS,
        usUnitPrice: usPrice,
        totalValue: itemTotalValue,
        category: cat.category,
      });
    }
  });

  // Sort by item number
  activeItems.sort((a, b) => a.item - b.item);

  const roundedTotalUS = Number(totalUS.toFixed(2));
  const totalLaborValue = Number((roundedTotalUS * usPrice).toFixed(2));

  return {
    items: activeItems,
    allCatalogItems: catalog,
    totalUS: roundedTotalUS,
    usUnitPrice: usPrice,
    totalLaborValue,
    networkType: effectiveNetworkType,
  };
}
