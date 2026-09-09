export type ItemCodeStatus = "ENCONTRADO" | "NAO_ENCONTRADO" | "AMBIGUO";

export interface CemigMaterialItem {
  id: string;
  code: string;
  codigo?: string | null;
  statusCodigo?: ItemCodeStatus;
  candidatosCodigo?: string[];
  description: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  sourceStructureId?: string; // Links item back to specific structure/pole for auditing
  sourceStructureName?: string;
  category: "ESTRUTURA" | "POSTE" | "CABO" | "EQUIPAMENTO" | "ACESSORIO" | "MÃO-DE-OBRA";
  status?: "INSTALAR" | "RETIRAR" | "EXISTENTE";
}

export interface UnrecognizedStructure {
  id?: string;
  rawText: string;
  reason?: string;
  locationHint?: string;
  contextHint?: string;
  suggestedCode?: string;
}

export interface IdentifiedStructure {
  id: string; // E.g., "P1", "EST-01"
  code: string; // E.g., "N1", "CE3", "S12N", "11-300"
  mnemonicCode?: string; // Mnemonic code if resolved
  type: "MT" | "BT" | "POSTE" | "CABO" | "TRANSFORMADOR" | "ESTAI" | "EQUIPAMENTO";
  level?: string; // E.g., "(1)", "(2)", "(BT)"
  status: "INSTALAR" | "RETIRAR" | "EXISTENTE";
  description: string;
  associatedPost?: string; // E.g., "11-300"
  locationHint?: string;
  computedMaterials: CemigMaterialItem[];
}

export interface CableSegment {
  id: string;
  cableType: string; // E.g., "CAA 1/0 AWG", "CAA 4 AWG", "CAA 2 AWG", "ABCN-70", "3x1x70+70"
  mnemonicCode?: string;
  voltage: "MT" | "BT";
  spansCount: number;
  estimatedLengthMeters: number;
  status: "INSTALAR" | "RETIRAR" | "EXISTENTE";
  spansDetail?: string; // E.g., "P1-P2 (35m), P2-P3 (40m)"
  fromPole?: string;
  toPole?: string;
  notes?: string;
  computedMaterials: CemigMaterialItem[];
}

export interface GroupedMnemonic {
  mnemonicCode: string;
  description: string;
  category: "ESTRUTURA" | "POSTE" | "CABO" | "EQUIPAMENTO" | "ACESSORIO" | "MÃO-DE-OBRA";
  unit: string;
  totalQuantity: number;
  status: "INSTALAR" | "RETIRAR" | "EXISTENTE";
  sourceLocations: string[];
  compositionItems?: {
    code: string;
    description: string;
    unit: string;
    qtyPerUnit: number;
  }[];
}

export interface LaborItem {
  item: number;
  code: string;
  description: string;
  unit: string;
  usUnit: number;
  quantity: number;
  totalUS: number;
  usUnitPrice: number;
  totalValue: number;
  category?: string;
}

export type ProjectVoltageLevel = "13.8kV" | "34.5kV" | "7.97kV" | "19.9kV" | "BT" | "AUTO";

export type NetworkEnvironment = "RDR" | "RDU";

export interface ProjectAnalysisResult {
  projectName: string;
  date: string;
  voltageLevel?: ProjectVoltageLevel;
  networkType?: NetworkEnvironment;
  structures: IdentifiedStructure[];
  cables: CableSegment[];
  unrecognized: UnrecognizedStructure[];
  materials: CemigMaterialItem[];
  groupedMnemonics?: GroupedMnemonic[];
  mnemonicosNaoEncontrados?: string[];
  catalogStats?: { mnemonicCount: number; sourceRows: number };
  generalSummary?: string;
  profitMargin?: number;
  laborItems?: LaborItem[];
  totalUS?: number;
  usUnitPrice?: number;
  totalLaborValue?: number;
  totalMaterialsValue?: number;
  totalProjectValue?: number;
}

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string;
  analysis: ProjectAnalysisResult;
}


// Database catalog entry
export interface DatabaseCatalogItem {
  code: string;
  description: string;
  unit: string;
}

export interface StructureComposition {
  structureCode: string;
  structureName: string;
  type: "MT" | "BT" | "POSTE" | "CABO" | "ESTAI" | "EQUIPAMENTO" | "MÃO DE OBRA" | "TRAFO" | "ESTRUTURA" | string;
  items: {
    code: string;
    description: string;
    unit: string;
    qtyPerUnit: number;
  }[];
}
