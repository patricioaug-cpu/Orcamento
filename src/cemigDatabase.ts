import { StructureComposition, DatabaseCatalogItem, CemigMaterialItem } from "./types";
import { EXTENDED_CEMIG_MNEMONICS, generateExtendedCompositions } from "./data/extendedMnemonics";

// Extended catalog items generated from the complete library
const extendedCatalogItems: Record<string, DatabaseCatalogItem> = {};
Object.entries(EXTENDED_CEMIG_MNEMONICS).forEach(([code, desc]) => {
  extendedCatalogItems[code] = {
    code,
    description: desc,
    unit: code.startsWith("CA") || code.startsWith("CAA") || code.startsWith("CAP") ? "M" : code.startsWith("MOC") || code.startsWith("US") ? "H" : "UN",
  };
});

// Official database items extracted directly from CEMIG sheets
export const CEMIG_CATALOG: Record<string, DatabaseCatalogItem> = {
  ...extendedCatalogItems,
  // Cables & Conductor Items
  "220418": { code: "220418", description: "CABO CAA 53MM² (1/0AWG)", unit: "M" },
  "220467": { code: "220467", description: "CABO CAA 34MM² (2AWG)", unit: "M" },
  "220483": { code: "220483", description: "CABO CAA 21MM² (4AWG)", unit: "M" },
  "220392": { code: "220392", description: "CABO CAA 107MM² (4/0AWG)", unit: "M" },
  "220368": { code: "220368", description: "CABO CAA 170MM² (336,4MCM)", unit: "M" },
  "225680": { code: "225680", description: "CABO AL 1X 50MM² 15KV (CAP 50)", unit: "M" },
  "224204": { code: "224204", description: "CABO AL 1X150MM² 25KV PROTEGIDO (CAP 150)", unit: "M" },
  "226084": { code: "226084", description: "CABO QUADRUPLEX CA 3X1X 35+70 1KV", unit: "M" },
  "226373": { code: "226373", description: "CABO QUADRUPLEX CA 3X1X 70+70 1KV", unit: "M" },
  "226092": { code: "226092", description: "CABO TRIPLEX CA 2X1X35+70 1KV", unit: "M" },
  "231589": { code: "231589", description: "CABO TRIPLEX CA 2X1X70+70 1KV", unit: "M" },
  "226183": { code: "226183", description: "CABO DUPLEX CA 1X1X10+10 1KV", unit: "M" },
  "226209": { code: "226209", description: "CABO DUPLEX CA 1X1X16+16 1KV", unit: "M" },
  "2964": { code: "2964", description: "CABO DE AÇO HS 3/8P (9,5MM) 7FIOS PARA ESTAI", unit: "M" },
  "2931": { code: "2931", description: "CABO DE AÇO MR 1/4P (6,4MM) 7 FIOS PARA ESTAI", unit: "M" },

  // Poles
  "207274": { code: "207274", description: "POSTE CONCRETO CIRCULAR 9M 300DAN", unit: "UN" },
  "207290": { code: "207290", description: "POSTE CONCRETO CIRCULAR 10M 150DAN", unit: "UN" },
  "207324": { code: "207324", description: "POSTE CONCRETO CIRCULAR 10M 300DAN", unit: "UN" },
  "207357": { code: "207357", description: "POSTE CONCRETO CIRCULAR 10M 600DAN", unit: "UN" },
  "207415": { code: "207415", description: "POSTE CONCRETO CIRCULAR 11M 300DAN", unit: "UN" },
  "207449": { code: "207449", description: "POSTE CONCRETO CIRCULAR 11M 600DAN", unit: "UN" },
  "207472": { code: "207472", description: "POSTE CONCRETO CIRCULAR 11M 1000DAN", unit: "UN" },
  "207506": { code: "207506", description: "POSTE CONCRETO CIRCULAR 12M 600DAN", unit: "UN" },
  "207530": { code: "207530", description: "POSTE CONCRETO CIRCULAR 13M 600DAN", unit: "UN" },
  "207308": { code: "207308", description: "POSTE CONCRETO DUPLO T 10M 150DAN", unit: "UN" },
  "207316": { code: "207316", description: "POSTE CONCRETO DUPLO T 10M 300DAN", unit: "UN" },
  "207365": { code: "207365", description: "POSTE CONCRETO DUPLO T 10M 600DAN", unit: "UN" },
  "207373": { code: "207373", description: "POSTE CONCRETO DUPLO T 11M 300DAN", unit: "UN" },
  "214569": { code: "214569", description: "POSTE CONCRETO DUPLO T 11M 600DAN", unit: "UN" },
  "207571": { code: "207571", description: "POSTE CONCRETO DUPLO T 12M 300DAN", unit: "UN" },
  "214577": { code: "214577", description: "POSTE CONCRETO DUPLO T 12M 600DAN", unit: "UN" },

  // Hardware & Crossarms
  "214239": { code: "214239", description: "CRUZETA MADEIRA 2800X135X110MM", unit: "UN" },
  "377705": { code: "377705", description: "CRUZETA DE FIBRA DE VIDRO 2400MM", unit: "UN" },
  "219451": { code: "219451", description: "ISOLADOR PINO 15KV PORCELANA", unit: "UN" },
  "219642": { code: "219642", description: "ISOLADOR PINO POLIMÉRICO 15KV", unit: "UN" },
  "219659": { code: "219659", description: "ISOLADOR ANCORAGEM POLIMÉRICO 15KV", unit: "UN" },
  "219667": { code: "219667", description: "ISOLADOR ANCORAGEM POLIMÉRICO 35KV", unit: "UN" },
  "219634": { code: "219634", description: "ISOLADOR ROLDANA PORCELANA", unit: "UN" },
  "375485": { code: "375485", description: "ISOLADOR ROLDANA PVC", unit: "UN" },
  "237511": { code: "237511", description: "PINO DE CRUZETA 324MM PARA ISOLADOR 25KV", unit: "UN" },
  "237495": { code: "237495", description: "PINO DE TOPO 389MM PARA ISOLADOR 15KV", unit: "UN" },
  "237784": { code: "237784", description: "MÃO FRANCESA PERFILADA", unit: "UN" },
  "74831": { code: "74831", description: "PARAFUSO CABEÇA QUADRADA M16X300MM", unit: "UN" },
  "74849": { code: "74849", description: "PARAFUSO CABEÇA QUADRADA M16X350MM", unit: "UN" },
  "74856": { code: "74856", description: "PARAFUSO CABEÇA QUADRADA M16X400MM", unit: "UN" },
  "236869": { code: "236869", description: "CINTA DE AÇO D 200MM", unit: "UN" },
  "236893": { code: "236893", description: "CINTA DE AÇO D 230MM", unit: "UN" },
  "237230": { code: "237230", description: "ARMAÇÃO SECUNDÁRIO 1 ESTRIBO", unit: "UN" },
  "237248": { code: "237248", description: "ARMAÇÃO SECUNDÁRIO 2 ESTRIBOS", unit: "UN" },

  // Guying & Anchoring
  "237727": { code: "237727", description: "CHAPA PARA ÂNCORA 320X320MM", unit: "UN" },
  "222547": { code: "222547", description: "HASTE ATERRAMENTO 16MMX3M", unit: "UN" },
  "237743": { code: "237743", description: "HASTE ÂNCORA-OLHAL 1600MM", unit: "UN" },
  "237677": { code: "237677", description: "ALÇA PRÉ-FORMADA ESTAI CABO 9,5MM", unit: "UN" },
  "228924": { code: "228924", description: "ALÇA PRÉ-FORMADA CA/CAA 34MM²", unit: "UN" },
  "228932": { code: "228932", description: "ALÇA PRÉ-FORMADA CA/CAA 21MM²", unit: "UN" },
  "228809": { code: "228809", description: "ALÇA PRÉ-FORMADA CA/CAA 170MM²", unit: "UN" },

  // Transformers & Protection
  "245811": { code: "245811", description: "TRANSFORMADOR TRIFÁSICO 15KV 15KVA", unit: "UN" },
  "245829": { code: "245829", description: "TRANSFORMADOR TRIFÁSICO 15KV 30KVA", unit: "UN" },
  "245837": { code: "245837", description: "TRANSFORMADOR TRIFÁSICO 15KV 45KVA", unit: "UN" },
  "245845": { code: "245845", description: "TRANSFORMADOR TRIFÁSICO 15KV 75KVA", unit: "UN" },
  "245852": { code: "245852", description: "TRANSFORMADOR TRIFÁSICO 15KV 112,5KVA", unit: "UN" },
  "245779": { code: "245779", description: "TRANSFORMADOR MONOFÁSICO 15KV 10KVA", unit: "UN" },
  "245787": { code: "245787", description: "TRANSFORMADOR MONOFÁSICO 15KV 15KVA", unit: "UN" },
  "245795": { code: "245795", description: "TRANSFORMADOR MONOFÁSICO 15KV 25KVA", unit: "UN" },
  "270439": { code: "270439", description: "CHAVE FUSÍVEL 15KV PF 100A 7,1KA", unit: "UN" },
  "270488": { code: "270488", description: "CHAVE FUSÍVEL 15KV PF 200A 10KA", unit: "UN" },
  "273417": { code: "273417", description: "CHAVE FACA UNIPOLAR 15KV 630A", unit: "UN" },
  "289058": { code: "289058", description: "PÁRA-RAIOS 12KV 10KA ZNO", unit: "UN" },
  "289157": { code: "289157", description: "PÁRA-RAIOS 21KV 10KA ZNO", unit: "UN" },
  "269928": { code: "269928", description: "RELIGADOR TRIFÁSICO 15KV 200A 2KA", unit: "UN" },
  "288779": { code: "288779", description: "RELIGADOR TRIFÁSICO 15KV 400A 6KA", unit: "UN" },

  // Connectors & Accessories
  "227777": { code: "227777", description: "CONETOR FORMATO H ITEM 2 CAA 27-54MM²", unit: "UN" },
  "227785": { code: "227785", description: "CONETOR FORMATO H ITEM 3 CAA 42-67MM²", unit: "UN" },
  "327726": { code: "327726", description: "CONETOR DE PERFURAÇÃO 16-70MM² / 6-35MM²", unit: "UN" },
  "327759": { code: "327759", description: "CONETOR DE PERFURAÇÃO 70-120MM² / 10-35MM²", unit: "UN" },
  "231753": { code: "231753", description: "CONETOR CUNHA AL 150-50MM²", unit: "UN" },
  "289074": { code: "289074", description: "GRAMPO LINHA VIVA DERIVAÇÃO 13-70MM²", unit: "UN" },
};

// CEMIG Detailed Assemblies / Standard Structures Breakdown
const DETAILED_STRUCTURE_COMPOSITIONS: Record<string, StructureComposition> = {
  // N1 - Tangente Média Tensão 15kV
  "N1": {
    structureCode: "N1",
    structureName: "Estrutura Tangente Simples N1 (MT 15kV)",
    type: "MT",
    items: [
      { code: "214239", description: "CRUZETA MADEIRA 2800X135X110MM", unit: "UN", qtyPerUnit: 1 },
      { code: "219451", description: "ISOLADOR PINO 15KV PORCELANA", unit: "UN", qtyPerUnit: 3 },
      { code: "237511", description: "PINO DE CRUZETA 324MM PARA ISOLADOR 25KV", unit: "UN", qtyPerUnit: 3 },
      { code: "237784", description: "MÃO FRANCESA PERFILADA", unit: "UN", qtyPerUnit: 2 },
      { code: "74831", description: "PARAFUSO CABEÇA QUADRADA M16X300MM", unit: "UN", qtyPerUnit: 2 },
      { code: "74856", description: "PARAFUSO CABEÇA QUADRADA M16X400MM", unit: "UN", qtyPerUnit: 1 },
      { code: "227777", description: "CONETOR FORMATO H ITEM 2 CAA 27-54MM²", unit: "UN", qtyPerUnit: 3 },
    ],
  },
  // N2 - Ângulo Média Tensão 15kV
  "N2": {
    structureCode: "N2",
    structureName: "Estrutura de Ângulo N2 (MT 15kV)",
    type: "MT",
    items: [
      { code: "214239", description: "CRUZETA MADEIRA 2800X135X110MM", unit: "UN", qtyPerUnit: 2 },
      { code: "219451", description: "ISOLADOR PINO 15KV PORCELANA", unit: "UN", qtyPerUnit: 6 },
      { code: "237511", description: "PINO DE CRUZETA 324MM PARA ISOLADOR 25KV", unit: "UN", qtyPerUnit: 6 },
      { code: "237784", description: "MÃO FRANCESA PERFILADA", unit: "UN", qtyPerUnit: 4 },
      { code: "74849", description: "PARAFUSO CABEÇA QUADRADA M16X350MM", unit: "UN", qtyPerUnit: 4 },
      { code: "227785", description: "CONETOR FORMATO H ITEM 3 CAA 42-67MM²", unit: "UN", qtyPerUnit: 6 },
    ],
  },
  // N3 - Ancoragem / Fim de Linha MT
  "N3": {
    structureCode: "N3",
    structureName: "Estrutura de Ancoragem / Fim de Linha N3 (MT 15kV)",
    type: "MT",
    items: [
      { code: "214239", description: "CRUZETA MADEIRA 2800X135X110MM", unit: "UN", qtyPerUnit: 2 },
      { code: "219659", description: "ISOLADOR ANCORAGEM POLIMÉRICO 15KV", unit: "UN", qtyPerUnit: 3 },
      { code: "237784", description: "MÃO FRANCESA PERFILADA", unit: "UN", qtyPerUnit: 4 },
      { code: "74849", description: "PARAFUSO CABEÇA QUADRADA M16X350MM", unit: "UN", qtyPerUnit: 4 },
      { code: "228924", description: "ALÇA PRÉ-FORMADA CA/CAA 34MM²", unit: "UN", qtyPerUnit: 3 },
      { code: "289074", description: "GRAMPO LINHA VIVA DERIVAÇÃO 13-70MM²", unit: "UN", qtyPerUnit: 3 },
    ],
  },
  // N4 - Ancoragem Dupla / Passagem MT
  "N4": {
    structureCode: "N4",
    structureName: "Estrutura de Ancoragem Dupla N4 (MT 15kV)",
    type: "MT",
    items: [
      { code: "214239", description: "CRUZETA MADEIRA 2800X135X110MM", unit: "UN", qtyPerUnit: 2 },
      { code: "219659", description: "ISOLADOR ANCORAGEM POLIMÉRICO 15KV", unit: "UN", qtyPerUnit: 6 },
      { code: "237784", description: "MÃO FRANCESA PERFILADA", unit: "UN", qtyPerUnit: 4 },
      { code: "74856", description: "PARAFUSO CABEÇA QUADRADA M16X400MM", unit: "UN", qtyPerUnit: 4 },
      { code: "228924", description: "ALÇA PRÉ-FORMADA CA/CAA 34MM²", unit: "UN", qtyPerUnit: 6 },
      { code: "227785", description: "CONETOR FORMATO H ITEM 3 CAA 42-67MM²", unit: "UN", qtyPerUnit: 6 },
    ],
  },
  // M1 / M2 / M3 / M4 - Meio Beco
  "M1": {
    structureCode: "M1",
    structureName: "Estrutura Meio Beco Tangente M1 (MT 15kV)",
    type: "MT",
    items: [
      { code: "214239", description: "CRUZETA MADEIRA 2800X135X110MM", unit: "UN", qtyPerUnit: 1 },
      { code: "219451", description: "ISOLADOR PINO 15KV PORCELANA", unit: "UN", qtyPerUnit: 3 },
      { code: "237511", description: "PINO DE CRUZETA 324MM PARA ISOLADOR 25KV", unit: "UN", qtyPerUnit: 3 },
      { code: "237784", description: "MÃO FRANCESA PERFILADA BECO", unit: "UN", qtyPerUnit: 2 },
      { code: "74831", description: "PARAFUSO CABEÇA QUADRADA M16X300MM", unit: "UN", qtyPerUnit: 2 },
    ],
  },
  "CE1": {
    structureCode: "CE1",
    structureName: "Estrutura Compacta Tangente CE1 (MT 15kV)",
    type: "MT",
    items: [
      { code: "377705", description: "CRUZETA DE FIBRA DE VIDRO 2400MM", unit: "UN", qtyPerUnit: 1 },
      { code: "219642", description: "ISOLADOR PINO POLIMÉRICO 15KV", unit: "UN", qtyPerUnit: 3 },
      { code: "74831", description: "PARAFUSO CABEÇA QUADRADA M16X300MM", unit: "UN", qtyPerUnit: 2 },
      { code: "236869", description: "CINTA DE AÇO D 200MM", unit: "UN", qtyPerUnit: 2 },
    ],
  },
  "CE3": {
    structureCode: "CE3",
    structureName: "Estrutura Compacta de Ancoragem CE3 (MT 15kV)",
    type: "MT",
    items: [
      { code: "377705", description: "CRUZETA DE FIBRA DE VIDRO 2400MM", unit: "UN", qtyPerUnit: 2 },
      { code: "219659", description: "ISOLADOR ANCORAGEM POLIMÉRICO 15KV", unit: "UN", qtyPerUnit: 3 },
      { code: "74849", description: "PARAFUSO CABEÇA QUADRADA M16X350MM", unit: "UN", qtyPerUnit: 4 },
      { code: "228924", description: "ALÇA PRÉ-FORMADA CA/CAA 34MM²", unit: "UN", qtyPerUnit: 3 },
    ],
  },

  // S12N / S13N - Baixa Tensão Conectada / Nua
  "S12N": {
    structureCode: "S12N",
    structureName: "Estrutura BT Tangente 2 Fases + Neutro S12N",
    type: "BT",
    items: [
      { code: "237248", description: "ARMAÇÃO SECUNDÁRIO 2 ESTRIBOS", unit: "UN", qtyPerUnit: 1 },
      { code: "219634", description: "ISOLADOR ROLDANA PORCELANA", unit: "UN", qtyPerUnit: 3 },
      { code: "74831", description: "PARAFUSO CABEÇA QUADRADA M16X300MM", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "S13N": {
    structureCode: "S13N",
    structureName: "Estrutura BT Tangente 3 Fases + Neutro S13N",
    type: "BT",
    items: [
      { code: "237248", description: "ARMAÇÃO SECUNDÁRIO 2 ESTRIBOS", unit: "UN", qtyPerUnit: 2 },
      { code: "219634", description: "ISOLADOR ROLDANA PORCELANA", unit: "UN", qtyPerUnit: 4 },
      { code: "74831", description: "PARAFUSO CABEÇA QUADRADA M16X300MM", unit: "UN", qtyPerUnit: 2 },
    ],
  },

  // SI1 / SI2 / SI3 / SI4 - Rede Secundária Isolada
  "SI1": {
    structureCode: "SI1",
    structureName: "Estrutura BT Isolada Tangente SI1",
    type: "BT",
    items: [
      { code: "327726", description: "CONETOR DE PERFURAÇÃO 16-70MM² / 6-35MM²", unit: "UN", qtyPerUnit: 4 },
      { code: "375485", description: "ISOLADOR ROLDANA PVC", unit: "UN", qtyPerUnit: 1 },
      { code: "236869", description: "CINTA DE AÇO D 200MM", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "SI3R": {
    structureCode: "SI3R",
    structureName: "Estrutura BT Isolada Ancoragem com Roldana SI3R",
    type: "BT",
    items: [
      { code: "327759", description: "CONETOR DE PERFURAÇÃO 70-120MM² / 10-35MM²", unit: "UN", qtyPerUnit: 4 },
      { code: "375485", description: "ISOLADOR ROLDANA PVC", unit: "UN", qtyPerUnit: 2 },
      { code: "236893", description: "CINTA DE AÇO D 230MM", unit: "UN", qtyPerUnit: 2 },
      { code: "228809", description: "ALÇA PRÉ-FORMADA CA/CAA 170MM²", unit: "UN", qtyPerUnit: 2 },
    ],
  },

  // Postes
  "11-300": {
    structureCode: "11-300",
    structureName: "Poste Concreto Circular 11 metros / 300 daN",
    type: "POSTE",
    items: [
      { code: "207415", description: "POSTE CONCRETO CIRCULAR 11M 300DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "11-600": {
    structureCode: "11-600",
    structureName: "Poste Concreto Circular 11 metros / 600 daN",
    type: "POSTE",
    items: [
      { code: "207449", description: "POSTE CONCRETO CIRCULAR 11M 600DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "10-300": {
    structureCode: "10-300",
    structureName: "Poste Concreto Circular 10 metros / 300 daN",
    type: "POSTE",
    items: [
      { code: "207324", description: "POSTE CONCRETO CIRCULAR 10M 300DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "12-600": {
    structureCode: "12-600",
    structureName: "Poste Concreto Circular 12 metros / 600 daN",
    type: "POSTE",
    items: [
      { code: "207506", description: "POSTE CONCRETO CIRCULAR 12M 600DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },

  // Additional standard poles
  "9-150": {
    structureCode: "9-150",
    structureName: "Poste Concreto Circular 9 metros / 150 daN",
    type: "POSTE",
    items: [
      { code: "207274", description: "POSTE CONCRETO CIRCULAR 9M 150DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "9-300": {
    structureCode: "9-300",
    structureName: "Poste Concreto Circular 9 metros / 300 daN",
    type: "POSTE",
    items: [
      { code: "207290", description: "POSTE CONCRETO CIRCULAR 9M 300DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "10-150": {
    structureCode: "10-150",
    structureName: "Poste Concreto Circular 10 metros / 150 daN",
    type: "POSTE",
    items: [
      { code: "207308", description: "POSTE CONCRETO CIRCULAR 10M 150DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },
  "13-600": {
    structureCode: "13-600",
    structureName: "Poste Concreto Circular 13 metros / 600 daN",
    type: "POSTE",
    items: [
      { code: "207571", description: "POSTE CONCRETO CIRCULAR 13M 600DAN", unit: "UN", qtyPerUnit: 1 },
    ],
  },

  // Estais
  "ESTAI_ANCORA": {
    structureCode: "ESTAI_ANCORA",
    structureName: "Estai de Âncora Completo com Cordoalha 9,5mm",
    type: "ESTAI",
    items: [
      { code: "2964", description: "CABO DE AÇO HS 3/8P (9,5MM) 7FIOS PARA ESTAI", unit: "M", qtyPerUnit: 12 },
      { code: "237727", description: "CHAPA PARA ÂNCORA 320X320MM", unit: "UN", qtyPerUnit: 1 },
      { code: "237743", description: "HASTE ÂNCORA-OLHAL 1600MM", unit: "UN", qtyPerUnit: 1 },
      { code: "237677", description: "ALÇA PRÉ-FORMADA ESTAI CABO 9,5MM", unit: "UN", qtyPerUnit: 2 },
    ],
  },
  "ESTAI_CRUZETA": {
    structureCode: "ESTAI_CRUZETA",
    structureName: "Estai Cruzeta-Cruzeta com Cordoalha 6,4mm",
    type: "ESTAI",
    items: [
      { code: "2931", description: "CABO DE AÇO MR 1/4P (6,4MM) 7 FIOS PARA ESTAI", unit: "M", qtyPerUnit: 10 },
      { code: "237677", description: "ALÇA PRÉ-FORMADA ESTAI CABO 9,5MM", unit: "UN", qtyPerUnit: 2 },
    ],
  },

  // Transformadores
  "TRAFO_45KVA": {
    structureCode: "TRAFO_45KVA",
    structureName: "Posto de Transformação Trifásico 45kVA 15kV",
    type: "EQUIPAMENTO",
    items: [
      { code: "245837", description: "TRANSFORMADOR TRIFÁSICO 15KV 45KVA", unit: "UN", qtyPerUnit: 1 },
      { code: "270439", description: "CHAVE FUSÍVEL 15KV PF 100A 7,1KA", unit: "UN", qtyPerUnit: 3 },
      { code: "289058", description: "PÁRA-RAIOS 12KV 10KA ZNO", unit: "UN", qtyPerUnit: 3 },
      { code: "222547", description: "HASTE ATERRAMENTO 16MMX3M", unit: "UN", qtyPerUnit: 3 },
      { code: "289074", description: "GRAMPO LINHA VIVA DERIVAÇÃO 13-70MM²", unit: "UN", qtyPerUnit: 3 },
    ],
  },
  "TRAFO_75KVA": {
    structureCode: "TRAFO_75KVA",
    structureName: "Posto de Transformação Trifásico 75kVA 15kV",
    type: "EQUIPAMENTO",
    items: [
      { code: "245845", description: "TRANSFORMADOR TRIFÁSICO 15KV 75KVA", unit: "UN", qtyPerUnit: 1 },
      { code: "270439", description: "CHAVE FUSÍVEL 15KV PF 100A 7,1KA", unit: "UN", qtyPerUnit: 3 },
      { code: "289058", description: "PÁRA-RAIOS 12KV 10KA ZNO", unit: "UN", qtyPerUnit: 3 },
      { code: "222547", description: "HASTE ATERRAMENTO 16MMX3M", unit: "UN", qtyPerUnit: 3 },
      { code: "289074", description: "GRAMPO LINHA VIVA DERIVAÇÃO 13-70MM²", unit: "UN", qtyPerUnit: 3 },
    ],
  },

  // Condutores e Cabos
  "CAA10": {
    structureCode: "CAA10",
    structureName: "Cabo de Alumínio CAA 1/0 AWG",
    type: "CONDUTOR",
    items: [
      { code: "220418", description: "CABO DE ALUMÍNIO CAA 1/0 AWG RAVEN", unit: "M", qtyPerUnit: 1 },
    ],
  },
  "CAA2": {
    structureCode: "CAA2",
    structureName: "Cabo de Alumínio CAA 2 AWG",
    type: "CONDUTOR",
    items: [
      { code: "220467", description: "CABO DE ALUMÍNIO CAA 2 AWG SPARROW", unit: "M", qtyPerUnit: 1 },
    ],
  },
  "CAA4": {
    structureCode: "CAA4",
    structureName: "Cabo de Alumínio CAA 4 AWG",
    type: "CONDUTOR",
    items: [
      { code: "220483", description: "CABO DE ALUMÍNIO CAA 4 AWG SWAN", unit: "M", qtyPerUnit: 1 },
    ],
  },
  "CAA40": {
    structureCode: "CAA40",
    structureName: "Cabo de Alumínio CAA 4/0 AWG",
    type: "CONDUTOR",
    items: [
      { code: "220392", description: "CABO DE ALUMÍNIO CAA 4/0 AWG PENGUIN", unit: "M", qtyPerUnit: 1 },
    ],
  },
  "CAA336": {
    structureCode: "CAA336",
    structureName: "Cabo de Alumínio CAA 336,4 MCM",
    type: "CONDUTOR",
    items: [
      { code: "220368", description: "CABO DE ALUMÍNIO CAA 336,4 MCM LINNET", unit: "M", qtyPerUnit: 1 },
    ],
  },
  "CATN70": {
    structureCode: "CATN70",
    structureName: "Cabo Multiplexado Alumínio 3x70+70mm² (ABCN-70)",
    type: "CONDUTOR",
    items: [
      { code: "226373", description: "CABO MULTIPLEXADO ALUMÍNIO 1KV 3X70+70MM² (ABCN-70)", unit: "M", qtyPerUnit: 1 },
    ],
  },
  "CQP35": {
    structureCode: "CQP35",
    structureName: "Cabo Multiplexado Alumínio 3x35+70mm² (ABCN-35)",
    type: "CONDUTOR",
    items: [
      { code: "226084", description: "CABO MULTIPLEXADO ALUMÍNIO 1KV 3X35+70MM² (ABCN-35)", unit: "M", qtyPerUnit: 1 },
    ],
  },
};

// Aliases for Mnemonic codes resolving to their detailed compositions
const MNEMONIC_COMPOSITION_ALIASES: Record<string, string> = {
  "N11C150": "N1",
  "N11C300": "N1",
  "N11C600": "N1",
  "N11CMIL": "N1",
  "N21C300": "N2",
  "N21C600": "N2",
  "N21CMIL": "N2",
  "N31C300": "N3",
  "N31C600": "N3",
  "N31CMIL": "N3",
  "N41C300": "N4",
  "N41C600": "N4",
  "N41CMIL": "N4",
  "M11C300": "M1",
  "M11C600": "M1",
  "M21C300": "M1",
  "M31C300": "M1",
  "M41C300": "M1",
  "CE11C150": "CE1",
  "CE11C300": "CE1",
  "CE11C600": "CE1",
  "CE31C300": "CE3",
  "CE31C600": "CE3",
  "S12N1C300": "S12N",
  "S13N1C300": "S13N",
  "S22N1C300": "S12N",
  "SI11C150": "SI1",
  "SI31C600": "SI3R",
  "PC11300": "11-300",
  "PC11600": "11-600",
  "PC10300": "10-300",
  "PC12600": "12-600",
  "PC09150": "9-150",
  "PC09300": "9-300",
  "PC10150": "10-150",
  "PC13600": "13-600",
  "EST9ACD300": "ESTAI_ANCORA",
  "EST6CZCZ": "ESTAI_CRUZETA",
  "TR345C300": "TRAFO_45KVA",
  "TR375C300": "TRAFO_75KVA",
};

// Populate alias entries into DETAILED_STRUCTURE_COMPOSITIONS
Object.entries(MNEMONIC_COMPOSITION_ALIASES).forEach(([alias, targetKey]) => {
  if (DETAILED_STRUCTURE_COMPOSITIONS[targetKey]) {
    DETAILED_STRUCTURE_COMPOSITIONS[alias] = {
      ...DETAILED_STRUCTURE_COMPOSITIONS[targetKey],
      structureCode: alias,
    };
  }
});

// Export combined compositions (Detailed Assemblies override default 1-item compositions)
export const CEMIG_STRUCTURE_COMPOSITIONS: Record<string, StructureComposition> = {
  ...generateExtendedCompositions(),
  ...DETAILED_STRUCTURE_COMPOSITIONS,
};

/**
 // Helper functions for Mnemonic Resolution, Grouping and Exploding
 */

export function getMnemonicForStructure(
  code: string,
  associatedPost: string = "11-300",
  type: string = "MT"
): string {
  const codeClean = code.toUpperCase().replace(/\(.*\)/, "").trim();

  // Direct hit in official library
  if (EXTENDED_CEMIG_MNEMONICS[codeClean] || CEMIG_CATALOG[codeClean]) {
    return codeClean;
  }

  // Suffix by pole capacity
  let postSuffix = "1C300";
  if (associatedPost.includes("600")) {
    postSuffix = "1C600";
  } else if (associatedPost.includes("150")) {
    postSuffix = "1C150";
  } else if (associatedPost.includes("1000") || associatedPost.includes("MIL")) {
    postSuffix = "1CMIL";
  }

  const candidate = `${codeClean}${postSuffix}`;
  if (EXTENDED_CEMIG_MNEMONICS[candidate] || CEMIG_CATALOG[candidate]) {
    return candidate;
  }

  const fallbackMap: Record<string, string> = {
    "N1": "N11C300",
    "N2": "N21C600",
    "N3": "N31C600",
    "N4": "N41C600",
    "CE1": "CE11C300",
    "CE3": "CE31C600",
    "M1": "M11C300",
    "M2": "M21C300",
    "M3": "M31C300",
    "M4": "M41C300",
    "S12N": "S12N1C300",
    "S13N": "S13N1C300",
    "S22N": "S22N1C300",
    "SI1": "SI11C150",
    "SI3R": "SI31C600",
    "ESTAI_ANCORA": "EST9ACD300",
    "ESTAI_CRUZETA": "EST6CZCZ",
    "CFS_100A": "CFS110010KA",
    "PR1_12KV": "PR123",
    "TRAFO_45KVA": "TR345C300",
    "TRAFO_75KVA": "TR375C300",
    "11-300": "PC11300",
    "11-600": "PC11600",
    "10-300": "PC10300",
    "12-600": "PC12600",
    "9-150": "PC09150",
  };

  return fallbackMap[codeClean] || codeClean;
}

export function getMnemonicForPole(typeSpec: string): string {
  const specClean = typeSpec.trim().toUpperCase();
  if (EXTENDED_CEMIG_MNEMONICS[specClean] || CEMIG_CATALOG[specClean]) {
    return specClean;
  }

  if (specClean.includes("11-300") || specClean.includes("11/300")) return "PC11300";
  if (specClean.includes("11-600") || specClean.includes("11/600")) return "PC11600";
  if (specClean.includes("10-300") || specClean.includes("10/300")) return "PC10300";
  if (specClean.includes("12-600") || specClean.includes("12/600")) return "PC12600";
  if (specClean.includes("9-150") || specClean.includes("9/150")) return "PC09150";
  if (specClean.includes("9-300") || specClean.includes("9/300")) return "PC09300";
  if (specClean.includes("10-150") || specClean.includes("10/150")) return "PC10150";
  if (specClean.includes("13-600") || specClean.includes("13/600")) return "PC13600";

  return "PC11300";
}

export function getMnemonicForCable(cableType: string, voltage?: "MT" | "BT", status?: string): string {
  const raw = String(cableType || "").toUpperCase();
  const cClean = raw.replace(/\s+/g, "");
  if (EXTENDED_CEMIG_MNEMONICS[cClean] || CEMIG_CATALOG[cClean]) {
    return cClean;
  }

  const isCAA = raw.includes("CAA");

  if (raw.includes("1/0") || cClean.includes("10AWG") || raw.includes("53MM") || cClean.includes("CAA10")) {
    return isCAA ? "CAA10" : "CA10";
  }
  if (raw.includes("4/0") || cClean.includes("40AWG") || raw.includes("107MM") || cClean.includes("CAA40")) {
    return isCAA ? "CAA40" : "CA40";
  }
  if (raw.match(/\b4\s*AWG\b/i) || raw.includes("CAA 4") || cClean.includes("CAA4") || cClean.includes("4AWG") || raw.includes("21MM")) {
    return isCAA ? "CAA4" : "CA4";
  }
  if (raw.match(/\b2\s*AWG\b/i) || raw.includes("CAA 2") || cClean.includes("CAA2") || cClean.includes("2AWG") || raw.includes("34MM")) {
    return isCAA ? "CAA2" : "CA2";
  }
  if (raw.includes("336") || cClean.includes("336MCM") || raw.includes("170MM") || cClean.includes("CAA336")) {
    return isCAA ? "CAA336" : "CA336";
  }
  if (raw.includes("70") && (raw.includes("ABCN") || raw.includes("MULTIPLEX") || raw.includes("BT") || raw.includes("CQP") || cClean.includes("CATN70"))) {
    return "CATN70";
  }
  if (raw.includes("35") && (raw.includes("ABCN") || raw.includes("MULTIPLEX") || raw.includes("BT") || raw.includes("CQP") || cClean.includes("CQP35"))) {
    return "CQP35";
  }
  if (raw.includes("9.5") || raw.includes("9,5") || raw.includes("3/8") || cClean.includes("CACO95")) {
    return "CACO95";
  }
  if (raw.includes("3N5") || cClean.includes("CACO3N5")) {
    return "CACO3N5";
  }
  if (raw.includes("CAP 50") || raw.includes("50MM")) return "CAP50";
  if (raw.includes("CAP 150") || raw.includes("150MM")) return "CAP150";

  return "CAA10";
}

/**
 * Groups equal mnemonics detected in the project together with their aggregated quantities.
 */
export function buildGroupedMnemonicsFromStructures(
  structures: { id: string; code: string; type?: string; status: "INSTALAR" | "RETIRAR" | "EXISTENTE"; associatedPost?: string; mnemonicCode?: string }[],
  cables: { cableType: string; voltage: "MT" | "BT"; spansCount: number; estimatedLengthMeters: number; status: "INSTALAR" | "RETIRAR" | "EXISTENTE"; mnemonicCode?: string }[]
): import("./types").GroupedMnemonic[] {
  const mneGroupMap: Record<string, import("./types").GroupedMnemonic> = {};

  // 1. Process Structures
  for (const str of structures) {
    if (str.status === "EXISTENTE") continue;

    const mneCode = str.mnemonicCode || getMnemonicForStructure(str.code, str.associatedPost, str.type);
    const key = `${mneCode}_${str.status}`;

    const desc = EXTENDED_CEMIG_MNEMONICS[mneCode] || 
                 CEMIG_CATALOG[mneCode]?.description || 
                 CEMIG_STRUCTURE_COMPOSITIONS[mneCode]?.structureName || 
                 `Estrutura ${str.code} (${mneCode})`;

    const locationLabel = `${str.id} (${str.associatedPost || "Poste"})`;

    const baseCode = str.code.toUpperCase().replace(/\(.*\)/, "").trim();
    const comp = CEMIG_STRUCTURE_COMPOSITIONS[mneCode] || 
                 CEMIG_STRUCTURE_COMPOSITIONS[baseCode] || 
                 CEMIG_STRUCTURE_COMPOSITIONS[str.code];

    const compItems = comp ? comp.items : [{
      code: mneCode,
      description: desc,
      unit: "UN",
      qtyPerUnit: 1,
    }];

    if (mneGroupMap[key]) {
      mneGroupMap[key].totalQuantity += 1;
      if (!mneGroupMap[key].sourceLocations.includes(locationLabel)) {
        mneGroupMap[key].sourceLocations.push(locationLabel);
      }
    } else {
      mneGroupMap[key] = {
        mnemonicCode: mneCode,
        description: str.status === "RETIRAR" ? `[A RETIRAR] ${desc}` : desc,
        category: (str.type === "POSTE" ? "POSTE" : str.type === "ESTAI" ? "ACESSORIO" : str.type === "EQUIPAMENTO" ? "EQUIPAMENTO" : "ESTRUTURA") as any,
        unit: "UN",
        totalQuantity: 1,
        status: str.status,
        sourceLocations: [locationLabel],
        compositionItems: compItems,
      };
    }

    // Process associated Pole as its own Mnemonic
    if (str.associatedPost) {
      const poleMne = getMnemonicForPole(str.associatedPost);
      const poleKey = `${poleMne}_${str.status}`;
      const poleDesc = EXTENDED_CEMIG_MNEMONICS[poleMne] || 
                       CEMIG_CATALOG[poleMne]?.description || 
                       `POSTE CONCRETO ${str.associatedPost}`;

      const poleComp = CEMIG_STRUCTURE_COMPOSITIONS[poleMne] || CEMIG_STRUCTURE_COMPOSITIONS[str.associatedPost];
      const poleCompItems = poleComp ? poleComp.items : [{
        code: poleMne,
        description: poleDesc,
        unit: "UN",
        qtyPerUnit: 1,
      }];

      if (mneGroupMap[poleKey]) {
        mneGroupMap[poleKey].totalQuantity += 1;
        if (!mneGroupMap[poleKey].sourceLocations.includes(locationLabel)) {
          mneGroupMap[poleKey].sourceLocations.push(locationLabel);
        }
      } else {
        mneGroupMap[poleKey] = {
          mnemonicCode: poleMne,
          description: str.status === "RETIRAR" ? `[A RETIRAR] ${poleDesc}` : poleDesc,
          category: "POSTE",
          unit: "UN",
          totalQuantity: 1,
          status: str.status,
          sourceLocations: [locationLabel],
          compositionItems: poleCompItems,
        };
      }
    }
  }

  // 2. Process Cable Segments
  for (const cab of cables) {
    if (cab.status === "EXISTENTE") continue;

    const cabMne = cab.mnemonicCode || getMnemonicForCable(cab.cableType);
    const key = `${cabMne}_${cab.status}`;
    const desc = EXTENDED_CEMIG_MNEMONICS[cabMne] || 
                 CEMIG_CATALOG[cabMne]?.description || 
                 CEMIG_STRUCTURE_COMPOSITIONS[cabMne]?.structureName ||
                 `CABO DE REDE ${cab.cableType}`;

    const length = cab.estimatedLengthMeters || (cab.spansCount * 35);
    const spansCount = cab.spansCount || 1;
    const detail = (cab as any).spansDetail || (cab as any).notes;
    const locationLabel = detail
      ? `${spansCount} Vão(s): ${detail} (${length}m)`
      : `${spansCount} Vão(s) (${length}m)`;

    const cabComp = CEMIG_STRUCTURE_COMPOSITIONS[cabMne];
    const cabCompItems = cabComp ? cabComp.items : [{
      code: cabMne,
      description: desc,
      unit: "M",
      qtyPerUnit: 1,
    }];

    if (mneGroupMap[key]) {
      mneGroupMap[key].totalQuantity += length;
      if (!mneGroupMap[key].sourceLocations.includes(locationLabel)) {
        mneGroupMap[key].sourceLocations.push(locationLabel);
      }
    } else {
      mneGroupMap[key] = {
        mnemonicCode: cabMne,
        description: cab.status === "RETIRAR" ? `[A RETIRAR] ${desc}` : desc,
        category: "CABO",
        unit: "M",
        totalQuantity: length,
        status: cab.status,
        sourceLocations: [locationLabel],
        compositionItems: cabCompItems,
      };
    }
  }

  return Object.values(mneGroupMap);
}

/**
 * Returns estimated market unit price in R$ for a given material code/description/category.
 * RULE: Mão de obra MUST NOT be pre-filled (returns 0).
 */
export function getEstimatedMarketPrice(
  code: string,
  category: string = "ESTRUTURA",
  description: string = ""
): number {
  const codeClean = code.toUpperCase().trim();
  const descClean = description.toUpperCase().trim();
  const catClean = category.toUpperCase().trim();

  // Rule: Do NOT pre-fill labor/mão-de-obra items
  if (
    catClean === "MÃO-DE-OBRA" ||
    catClean === "MÃO DE OBRA" ||
    catClean === "MAO DE OBRA" ||
    codeClean.startsWith("MOC") ||
    codeClean.startsWith("US") ||
    descClean.includes("MÃO-DE-OBRA") ||
    descClean.includes("MÃO DE OBRA") ||
    descClean.includes("MAO DE OBRA") ||
    descClean.includes("MONTAGEM") ||
    descClean.includes("INSTALAÇÃO")
  ) {
    return 0;
  }

  // Known CEMIG Catalog Item Prices
  const exactPrices: Record<string, number> = {
    // Poles
    "207274": 1450.0,
    "207290": 1580.0,
    "207324": 1850.0,
    "207357": 2400.0,
    "207415": 2850.0,
    "207449": 3450.0,
    "207472": 4200.0,
    "207506": 4800.0,
    "207530": 5600.0,
    "207308": 1420.0,
    "207316": 1680.0,
    "207365": 2150.0,
    "207373": 2550.0,
    "214569": 3100.0,
    "207571": 3800.0,
    "214577": 4350.0,

    // Cables (R$/m)
    "220483": 12.5,
    "220467": 18.0,
    "220418": 26.5,
    "220392": 48.0,
    "220368": 85.0,
    "225680": 38.0,
    "224204": 92.0,
    "226084": 34.0,
    "226373": 58.0,
    "226092": 26.0,
    "231589": 42.0,
    "226183": 12.0,
    "226209": 16.5,
    "2964": 15.5,
    "2931": 11.0,

    // Crossarms & Structures
    "214239": 380.0,
    "377705": 450.0,
    "219451": 85.0,
    "219642": 110.0,
    "219659": 165.0,
    "219667": 240.0,
    "219634": 28.0,
    "375485": 22.0,
    "237511": 68.0,
    "237495": 72.0,
    "237784": 48.0,
    "74831": 26.0,
    "74849": 29.0,
    "74856": 32.0,
    "236869": 54.0,
    "236893": 62.0,
    "237230": 38.0,
    "237248": 58.0,

    // Guying & Grounding
    "237727": 85.0,
    "222547": 115.0,
    "237743": 125.0,
    "237677": 32.0,
    "228924": 22.0,
    "228932": 18.0,
    "228809": 45.0,

    // Equipment & Transformers
    "245811": 8900.0,
    "245829": 11500.0,
    "245837": 14200.0,
    "245845": 19800.0,
    "245852": 26500.0,
    "245779": 4200.0,
    "245787": 5600.0,
    "245795": 7800.0,
    "270439": 680.0,
    "270488": 950.0,
    "273417": 1280.0,
    "289058": 320.0,
    "289157": 450.0,
    "269928": 48000.0,
    "288779": 62000.0,

    // Connectors
    "227777": 24.0,
    "227785": 28.0,
  };

  if (exactPrices[codeClean] !== undefined) {
    return exactPrices[codeClean];
  }

  // Fallback heuristics by description & category
  if (catClean === "POSTE" || descClean.includes("POSTE")) {
    if (descClean.includes("13M")) return 4800.0;
    if (descClean.includes("12M")) return 3800.0;
    if (descClean.includes("11M")) return 2800.0;
    if (descClean.includes("10M")) return 1800.0;
    if (descClean.includes("9M")) return 1450.0;
    return 2200.0;
  }

  if (catClean === "CABO" || descClean.includes("CABO") || descClean.includes("CONDUTOR")) {
    if (descClean.includes("170") || descClean.includes("336")) return 85.0;
    if (descClean.includes("107") || descClean.includes("4/0")) return 48.0;
    if (descClean.includes("53") || descClean.includes("1/0")) return 26.5;
    if (descClean.includes("34") || descClean.includes("2AWG")) return 18.0;
    if (descClean.includes("21") || descClean.includes("4AWG")) return 12.5;
    if (descClean.includes("QUADRUPLEX")) return 45.0;
    if (descClean.includes("TRIPLEX")) return 32.0;
    if (descClean.includes("DUPLEX")) return 15.0;
    return 22.0;
  }

  if (catClean === "EQUIPAMENTO" || descClean.includes("TRANSFORMADOR") || descClean.includes("RELIGADOR") || descClean.includes("CHAVE")) {
    if (descClean.includes("RELIGADOR")) return 48000.0;
    if (descClean.includes("TRANSFORMADOR") || descClean.includes("TRAFO")) {
      if (descClean.includes("75")) return 19800.0;
      if (descClean.includes("45")) return 14200.0;
      if (descClean.includes("30")) return 11500.0;
      if (descClean.includes("15")) return 8900.0;
      return 12000.0;
    }
    if (descClean.includes("CHAVE FUSIVEL") || descClean.includes("CHAVE FUSÍVEL")) return 680.0;
    if (descClean.includes("CHAVE FACA")) return 1280.0;
    if (descClean.includes("PARA-RAIOS") || descClean.includes("PÁRA-RAIOS")) return 350.0;
    return 1500.0;
  }

  if (descClean.includes("CRUZETA")) return 420.0;
  if (descClean.includes("ISOLADOR")) return 95.0;
  if (descClean.includes("PARAFUSO")) return 28.0;
  if (descClean.includes("CINTA")) return 58.0;
  if (descClean.includes("ALÇA") || descClean.includes("ALCA")) return 25.0;
  if (descClean.includes("CONETOR") || descClean.includes("CONECTOR")) return 22.0;

  return 45.0;
}

/**
 * Explodes grouped mnemonics into their pre-established items to form the final material list.
 */
export function explodeGroupedMnemonics(
  groupedMnemonics: import("./types").GroupedMnemonic[]
): CemigMaterialItem[] {
  const explodedMap: Record<string, CemigMaterialItem> = {};

  for (const mne of groupedMnemonics) {
    const items = mne.compositionItems && mne.compositionItems.length > 0
      ? mne.compositionItems
      : [{
          code: mne.mnemonicCode,
          description: mne.description,
          unit: mne.unit,
          qtyPerUnit: 1,
        }];

    for (const item of items) {
      const itemKey = `${item.code}_${mne.status}`;
      const totalQty = item.qtyPerUnit * mne.totalQuantity;

      const catItem = CEMIG_CATALOG[item.code];
      const desc = item.description || catItem?.description || mne.description;
      const unit = item.unit || catItem?.unit || mne.unit;
      const estimatedPrice = getEstimatedMarketPrice(item.code, mne.category, desc);

      if (explodedMap[itemKey]) {
        explodedMap[itemKey].quantity += totalQty;
      } else {
        explodedMap[itemKey] = {
          id: `exploded_${itemKey}`,
          code: item.code,
          codigo: /^\d+$/.test(item.code) ? item.code : null,
          statusCodigo: /^\d+$/.test(item.code) ? "ENCONTRADO" : "NAO_ENCONTRADO",
          description: mne.status === "RETIRAR" && !desc.startsWith("[A RETIRAR]") ? `[A RETIRAR] ${desc}` : desc,
          unit,
          quantity: totalQty,
          unitPrice: estimatedPrice,
          category: mne.category,
          status: mne.status,
        };
      }
    }
  }

  return Object.values(explodedMap);
}

/**
 * Calculates materials for a list of identified structures & cables
 */
export function buildMaterialListFromStructures(
  structures: { id: string; code: string; type?: string; status: "INSTALAR" | "RETIRAR" | "EXISTENTE"; associatedPost?: string; mnemonicCode?: string }[],
  cables: { cableType: string; voltage: "MT" | "BT"; spansCount: number; estimatedLengthMeters: number; status: "INSTALAR" | "RETIRAR" | "EXISTENTE"; mnemonicCode?: string }[]
): {
  materials: CemigMaterialItem[];
  groupedMnemonics: import("./types").GroupedMnemonic[];
  structureItemMap: Record<string, CemigMaterialItem[]>;
} {
  const groupedMnemonics = buildGroupedMnemonicsFromStructures(structures, cables);
  const materials = explodeGroupedMnemonics(groupedMnemonics);

  const structureItemMap: Record<string, CemigMaterialItem[]> = {};
  for (const str of structures) {
    const mneCode = str.mnemonicCode || getMnemonicForStructure(str.code, str.associatedPost, str.type);
    const baseCode = str.code.toUpperCase().replace(/\(.*\)/, "").trim();
    const comp = CEMIG_STRUCTURE_COMPOSITIONS[mneCode] || CEMIG_STRUCTURE_COMPOSITIONS[baseCode] || CEMIG_STRUCTURE_COMPOSITIONS[str.code];
    
    if (comp) {
      structureItemMap[str.id] = comp.items.map((i) => ({
        id: `${str.id}_${i.code}`,
        code: i.code,
        description: i.description,
        unit: i.unit,
        quantity: i.qtyPerUnit,
        sourceStructureId: str.id,
        sourceStructureName: `${str.code} (${str.id})`,
        category: (comp.type === "POSTE" ? "POSTE" : comp.type === "ESTAI" ? "ACESSORIO" : "ESTRUTURA") as any,
      }));
    }
  }

  return {
    materials,
    groupedMnemonics,
    structureItemMap,
  };
}
