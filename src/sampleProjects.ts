import { ProjectAnalysisResult } from "./types";
import { buildMaterialListFromStructures, getEstimatedMarketPrice } from "./cemigDatabase";
import { calculateProjectLabor } from "./services/laborService";
import { DEFAULT_US_UNIT_PRICE } from "./data/laborCatalog";

export const SAMPLE_PROJECT_URBANO: ProjectAnalysisResult = (() => {
  const structures = [
    {
      id: "P1",
      code: "N1",
      type: "MT" as const,
      level: "(1)",
      status: "INSTALAR" as const,
      description: "Estrutura Tangente MT 15kV em cruzeta de madeira N1",
      associatedPost: "11-300",
      locationHint: "Rua das Flores / Vão 1",
      computedMaterials: [],
    },
    {
      id: "P2",
      code: "N2",
      type: "MT" as const,
      level: "(1)",
      status: "INSTALAR" as const,
      description: "Estrutura de Ângulo N2 com cruzeta de madeira dupla",
      associatedPost: "11-600",
      locationHint: "Esquina com Av. Brasil",
      computedMaterials: [],
    },
    {
      id: "P3",
      code: "CE3",
      type: "MT" as const,
      level: "(1)",
      status: "INSTALAR" as const,
      description: "Estrutura Compacta Protegida de Ancoragem CE3",
      associatedPost: "12-600",
      locationHint: "Poste Final RDP - Vão 3",
      computedMaterials: [],
    },
    {
      id: "P4",
      code: "S12N",
      type: "BT" as const,
      level: "(BT)",
      status: "INSTALAR" as const,
      description: "Estrutura BT Tangente 2 Fases + Neutro",
      associatedPost: "11-300",
      locationHint: "Rede Secundária Passeio",
      computedMaterials: [],
    },
    {
      id: "P5",
      code: "SI3R",
      type: "BT" as const,
      level: "(BT)",
      status: "INSTALAR" as const,
      description: "Estrutura BT Isolada Ancoragem com Roldana",
      associatedPost: "11-600",
      locationHint: "Derivação para Consumidor B",
      computedMaterials: [],
    },
    {
      id: "P6",
      code: "M1",
      type: "MT" as const,
      level: "(1)",
      status: "RETIRAR" as const,
      description: "Estrutura Meio Beco M1 Existente a Retirar",
      associatedPost: "10-300",
      locationHint: "Poste de Madeira Antigo",
      computedMaterials: [],
    },
    {
      id: "P7",
      code: "TRAFO_45KVA",
      type: "TRANSFORMADOR" as const,
      status: "INSTALAR" as const,
      description: "Posto de Transformação Trifásico 45kVA 15kV / 220-127V",
      associatedPost: "12-600",
      locationHint: "Subestação de Carga Urbana P3",
      computedMaterials: [],
    },
    {
      id: "E1",
      code: "ESTAI_ANCORA",
      type: "ESTAI" as const,
      status: "INSTALAR" as const,
      description: "Estai de Âncora com Cordoalha de Aço 9,5mm",
      associatedPost: "12-600",
      locationHint: "Ancoragem do Poste P3",
      computedMaterials: [],
    },
  ];

  const cables = [
    {
      id: "C1",
      cableType: "CAA 1/0AWG",
      voltage: "MT" as const,
      spansCount: 4,
      estimatedLengthMeters: 140,
      spansDetail: "P1-P2 (35m), P2-P3 (35m), P3-P4 (35m), P4-P5 (35m)",
      status: "INSTALAR" as const,
      notes: "Condutor primário MT trifásico",
      computedMaterials: [],
    },
    {
      id: "C2",
      cableType: "ABCN-70",
      voltage: "BT" as const,
      spansCount: 3,
      estimatedLengthMeters: 105,
      spansDetail: "P2-P3 (35m), P3-P4 (35m), P4-P5 (35m)",
      status: "INSTALAR" as const,
      notes: "Cabo multiplexado quadruplex 3x1x70+70mm² 1kV",
      computedMaterials: [],
    },
    {
      id: "C3",
      cableType: "CAA 2AWG",
      voltage: "MT" as const,
      spansCount: 2,
      estimatedLengthMeters: 70,
      spansDetail: "P5-P6 (35m), P6-P7 (35m)",
      status: "RETIRAR" as const,
      notes: "Condutor antigo a ser substituído pelo recondutoramento",
      computedMaterials: [],
    },
  ];

  const { materials, structureItemMap, groupedMnemonics } = buildMaterialListFromStructures(
    structures,
    cables
  );

  // Attach computed materials to structure objects
  const structuresWithMats = structures.map((s) => ({
    ...s,
    computedMaterials: structureItemMap[s.id] || [],
  }));

  const totalMaterialsValue = materials.reduce((acc, m) => {
    const basePrice = m.unitPrice !== undefined && m.unitPrice > 0 ? m.unitPrice : getEstimatedMarketPrice(m.code, m.category, m.description);
    return acc + m.quantity * basePrice;
  }, 0);

  const laborResult = calculateProjectLabor(
    {
      structures: structuresWithMats,
      cables,
      voltageLevel: "13.8kV",
      networkType: "RDU",
    },
    DEFAULT_US_UNIT_PRICE,
    "RDU"
  );

  return {
    projectName: "Exemplo: Ampliação de Rede Urbana RDP - Bairro Centro",
    date: new Date().toLocaleDateString("pt-BR"),
    voltageLevel: "13.8kV",
    networkType: "RDU",
    structures: structuresWithMats,
    cables,
    unrecognized: [
      {
        id: "UN1",
        rawText: "SÍMBOLO PARCIAL 'S?3-X' PRÓXIMO AO POSTE P2",
        reason: "Simbologia rasurada ou incompleta na estampa do arquivo JPEG",
        locationHint: "Quadrante Superior Direito - Vão P2-P3",
      },
    ],
    materials,
    groupedMnemonics,
    laborItems: laborResult.items,
    totalUS: laborResult.totalUS,
    usUnitPrice: laborResult.usUnitPrice,
    totalLaborValue: laborResult.totalLaborValue,
    totalMaterialsValue,
    totalProjectValue: Number((totalMaterialsValue + laborResult.totalLaborValue).toFixed(2)),
    generalSummary:
      "Projeto de ampliação de rede de distribuição urbana CEMIG com substituição de circuito convencional por rede protegida (RDP) 15kV, instalação de transformador de 45kVA e extensão secundária multiplexada.",
  };
})();

export const SAMPLE_PROJECT_RURAL: ProjectAnalysisResult = (() => {
  const structures = [
    {
      id: "PR1",
      code: "N3",
      type: "MT" as const,
      level: "(1)",
      status: "INSTALAR" as const,
      description: "Estrutura de Ancoragem Rural N3 34,5kV",
      associatedPost: "11-300",
      locationHint: "Estrada do Garimpo - KM 4",
      computedMaterials: [],
    },
    {
      id: "PR2",
      code: "N1",
      type: "MT" as const,
      level: "(1)",
      status: "INSTALAR" as const,
      description: "Estrutura Tangente Rural N1 34,5kV",
      associatedPost: "10-300",
      locationHint: "Sítio Boa Vista",
      computedMaterials: [],
    },
    {
      id: "PR3",
      code: "TRAFO_75KVA",
      type: "TRANSFORMADOR" as const,
      status: "INSTALAR" as const,
      description: "Posto de Transformação Trifásico 75kVA 34,5kV",
      associatedPost: "11-600",
      locationHint: "Atendimento Irrigação Agrícola",
      computedMaterials: [],
    },
  ];

  const cables = [
    {
      id: "CR1",
      cableType: "CAA 4AWG",
      voltage: "MT" as const,
      spansCount: 6,
      estimatedLengthMeters: 280,
      spansDetail: "P1-P2 (45m), P2-P3 (50m), P3-P4 (45m), P4-P5 (45m), P5-P6 (45m), P6-P7 (50m)",
      status: "INSTALAR" as const,
      notes: "Condutor CAA 4 AWG monofásico rural 34,5kV",
      computedMaterials: [],
    },
  ];

  const { materials, structureItemMap, groupedMnemonics } = buildMaterialListFromStructures(
    structures,
    cables
  );

  const structuresWithMats = structures.map((s) => ({
    ...s,
    computedMaterials: structureItemMap[s.id] || [],
  }));

  const totalMaterialsValue = materials.reduce((acc, m) => {
    const basePrice = m.unitPrice !== undefined && m.unitPrice > 0 ? m.unitPrice : getEstimatedMarketPrice(m.code, m.category, m.description);
    return acc + m.quantity * basePrice;
  }, 0);

  const laborResult = calculateProjectLabor(
    {
      structures: structuresWithMats,
      cables,
      voltageLevel: "34.5kV",
      networkType: "RDR",
    },
    DEFAULT_US_UNIT_PRICE,
    "RDR"
  );

  return {
    projectName: "Exemplo: Eletrificação Rural CEMIG - Fazenda Esperança (34,5 kV)",
    date: new Date().toLocaleDateString("pt-BR"),
    voltageLevel: "34.5kV",
    networkType: "RDR",
    structures: structuresWithMats,
    cables,
    unrecognized: [],
    materials,
    groupedMnemonics,
    laborItems: laborResult.items,
    totalUS: laborResult.totalUS,
    usUnitPrice: laborResult.usUnitPrice,
    totalLaborValue: laborResult.totalLaborValue,
    totalMaterialsValue,
    totalProjectValue: Number((totalMaterialsValue + laborResult.totalLaborValue).toFixed(2)),
    generalSummary:
      "Extensão de rede primária rural 34,5kV para atendimento a bomba de irrigação e transformador de 75kVA.",
  };
})();
