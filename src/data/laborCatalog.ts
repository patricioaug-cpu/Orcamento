export interface OfficialLaborCatalogItem {
  item: number;
  code: string;
  description: string;
  unit: "Poste" | "pç" | "km";
  usUnit: number;
  category: "POSTE" | "CABO" | "TRANSFORMADOR" | "ESTRUTURA" | "ILUMINAÇÃO" | "PADRÃO" | "OUTROS";
}

export const DEFAULT_US_UNIT_PRICE = 125.0; // Valor padrão unitário por US em R$

/**
 * Tabela Oficial de Mão de Obra do Projeto em US (Unidade de Serviço)
 * Conforme arquivo anexado pelo usuário (42 itens oficiais)
 */
export const OFFICIAL_LABOR_CATALOG: OfficialLaborCatalogItem[] = [
  {
    item: 1,
    code: "MO-01",
    description: "Concretagem de base",
    unit: "Poste",
    usUnit: 0.20,
    category: "POSTE",
  },
  {
    item: 2,
    code: "MO-02",
    description: "Poste (s) a aproveitar complexo",
    unit: "Poste",
    usUnit: 0.50,
    category: "POSTE",
  },
  {
    item: 3,
    code: "MO-03",
    description: "Poste (s) a aproveitar",
    unit: "Poste",
    usUnit: 0.35,
    category: "POSTE",
  },
  {
    item: 4,
    code: "MO-04",
    description: "Poste a aproveitar simples",
    unit: "Poste",
    usUnit: 0.10,
    category: "POSTE",
  },
  {
    item: 5,
    code: "MO-05",
    description: "Poste (s) a instalar",
    unit: "Poste",
    usUnit: 1.00,
    category: "POSTE",
  },
  {
    item: 6,
    code: "MO-06",
    description: "Instalação de transformador trifásico sem chave e com pára-raios",
    unit: "pç",
    usUnit: 0.46,
    category: "TRANSFORMADOR",
  },
  {
    item: 7,
    code: "MO-07",
    description: "Instalação de medidor",
    unit: "pç",
    usUnit: 0.05,
    category: "PADRÃO",
  },
  {
    item: 8,
    code: "MO-08",
    description: "Cava para poste em rocha",
    unit: "Poste",
    usUnit: 2.30,
    category: "POSTE",
  },
  {
    item: 9,
    code: "MO-09",
    description: "Conversão de RDR 10, CAA 4 AWG em RDR 30, CAA 2 AWG por KM",
    unit: "km",
    usUnit: 7.46,
    category: "CABO",
  },
  {
    item: 10,
    code: "MO-10",
    description: "Conversão de RDR 10, CAA 4 AWG em RDR 30, CAA 4 AWG por KM",
    unit: "km",
    usUnit: 3.37,
    category: "CABO",
  },
  {
    item: 11,
    code: "MO-11",
    description: "Construção de 1 km de RDR 30, cabo 4 a 1/0 AWG",
    unit: "km",
    usUnit: 10.94,
    category: "CABO",
  },
  {
    item: 12,
    code: "MO-12",
    description: "Instalação de braço de IP tipo leve completo",
    unit: "pç",
    usUnit: 0.10,
    category: "ILUMINAÇÃO",
  },
  {
    item: 13,
    code: "MO-13",
    description: "Instalação de braço de IP tipo médio completo",
    unit: "pç",
    usUnit: 0.13,
    category: "ILUMINAÇÃO",
  },
  {
    item: 14,
    code: "MO-14",
    description: "Instalação de derivação 10, sem troca de poste, cabo 4 a 1/0 AWG",
    unit: "Poste",
    usUnit: 0.22,
    category: "ESTRUTURA",
  },
  {
    item: 15,
    code: "MO-15",
    description: "Instalação de derivação 30, sem troca de poste, cabo 4 a 1/0 AWG",
    unit: "Poste",
    usUnit: 0.64,
    category: "ESTRUTURA",
  },
  {
    item: 16,
    code: "MO-16",
    description: "Instalação de estai de âncora, reesticamento de condutor RDR 10",
    unit: "pç",
    usUnit: 0.39,
    category: "ESTRUTURA",
  },
  {
    item: 17,
    code: "MO-17",
    description: "Instalação de estai de âncora, reesticamento de condutor RDR 30 - 4 a 1/0 AWG",
    unit: "pç",
    usUnit: 0.42,
    category: "ESTRUTURA",
  },
  {
    item: 18,
    code: "MO-18",
    description: "Construção de 1 km de RDR 10, cabo 4 a 1/0 AWG",
    unit: "km",
    usUnit: 7.59,
    category: "CABO",
  },
  {
    item: 19,
    code: "MO-19",
    description: "Instalação de transformador monofásico sem chave e com pára-raios",
    unit: "pç",
    usUnit: 0.42,
    category: "TRANSFORMADOR",
  },
  {
    item: 20,
    code: "MO-20",
    description: "Instalação de transformador monofásico com chave e com pára-raios",
    unit: "pç",
    usUnit: 0.47,
    category: "TRANSFORMADOR",
  },
  {
    item: 21,
    code: "MO-21",
    description: "Instalação de transformador monofásico com chave e sem pára-raios",
    unit: "pç",
    usUnit: 0.41,
    category: "TRANSFORMADOR",
  },
  {
    item: 22,
    code: "MO-22",
    description: "Instalação de transformador trifásico com chave e com pára-raios",
    unit: "pç",
    usUnit: 0.61,
    category: "TRANSFORMADOR",
  },
  {
    item: 23,
    code: "MO-23",
    description: "Instalação de transformador trifásico com chave e sem pára-raios",
    unit: "pç",
    usUnit: 0.58,
    category: "TRANSFORMADOR",
  },
  {
    item: 24,
    code: "MO-24",
    description: "Instalação de poste RDR 10",
    unit: "Poste",
    usUnit: 1.20,
    category: "POSTE",
  },
  {
    item: 25,
    code: "MO-25",
    description: "Instalação de poste RDR 30, cabo 4 a 1/0 AWG",
    unit: "Poste",
    usUnit: 1.20,
    category: "POSTE",
  },
  {
    item: 26,
    code: "MO-26",
    description: "Poste (s) a remover acima de 1,0m",
    unit: "Poste",
    usUnit: 1.40,
    category: "POSTE",
  },
  {
    item: 27,
    code: "MO-27",
    description: "Poste (s) a remover até 1,0m",
    unit: "Poste",
    usUnit: 0.50,
    category: "POSTE",
  },
  {
    item: 28,
    code: "MO-28",
    description: "Remover poste equipado, distância até 1,0m",
    unit: "Poste",
    usUnit: 2.04,
    category: "POSTE",
  },
  {
    item: 29,
    code: "MO-29",
    description: "Remover poste equipado, distância maior que 1,0m",
    unit: "Poste",
    usUnit: 2.04,
    category: "POSTE",
  },
  {
    item: 30,
    code: "MO-30",
    description: "Substituição de braço de IP tipo leve por médio completo",
    unit: "pç",
    usUnit: 0.19,
    category: "ILUMINAÇÃO",
  },
  {
    item: 31,
    code: "MO-31",
    description: "Substituição de braço de IP tipo médio por pesado completo",
    unit: "pç",
    usUnit: 0.25,
    category: "ILUMINAÇÃO",
  },
  {
    item: 32,
    code: "MO-32",
    description: "Poste modificado RDR monofásico e trifásico",
    unit: "Poste",
    usUnit: 0.42,
    category: "POSTE",
  },
  {
    item: 33,
    code: "MO-33",
    description: "Poste (s) a retirar",
    unit: "Poste",
    usUnit: 0.70,
    category: "POSTE",
  },
  {
    item: 34,
    code: "MO-34",
    description: "Retirada de transformador monofásico",
    unit: "pç",
    usUnit: 0.30,
    category: "TRANSFORMADOR",
  },
  {
    item: 35,
    code: "MO-35",
    description: "Retirada de transformador trifásico",
    unit: "pç",
    usUnit: 0.60,
    category: "TRANSFORMADOR",
  },
  {
    item: 36,
    code: "MO-36",
    description: "Retirar poste equipado, RDR 10",
    unit: "Poste",
    usUnit: 0.84,
    category: "POSTE",
  },
  {
    item: 37,
    code: "MO-37",
    description: "Retirar poste equipado, RDR 30, 4a 1/0 AWG",
    unit: "Poste",
    usUnit: 0.84,
    category: "POSTE",
  },
  {
    item: 38,
    code: "MO-38",
    description: "Retirada de 1 km RDR trifásica cabo 4 a 1/0 AWG",
    unit: "km",
    usUnit: 7.66,
    category: "CABO",
  },
  {
    item: 39,
    code: "MO-39",
    description: "Retirada de 1 km RDR monofásica cabo 4 a 1/0 AWG",
    unit: "km",
    usUnit: 5.31,
    category: "CABO",
  },
  {
    item: 40,
    code: "MO-40",
    description: "Instalação de padrão PES",
    unit: "pç",
    usUnit: 0.11,
    category: "PADRÃO",
  },
  {
    item: 41,
    code: "MO-41",
    description: "Instalação de padrão RDR monofásico, incorporado em poste",
    unit: "pç",
    usUnit: 0.15,
    category: "PADRÃO",
  },
  {
    item: 42,
    code: "MO-42",
    description: "Instalação de padrão trifásico",
    unit: "pç",
    usUnit: 0.24,
    category: "PADRÃO",
  },
];

/**
 * Adapta a descrição da atividade de mão de obra para o tipo de rede (RDR ou RDU).
 * Os itens que não contêm especificação RDR/RDU são preservados exatamente iguais
 * e aplicam-se a ambos os tipos de projeto.
 */
export function formatLaborDescriptionForType(
  description: string,
  networkType: "RDR" | "RDU" = "RDU"
): string {
  if (networkType === "RDU") {
    return description.replace(/\bRDR\b/g, "RDU");
  }
  return description.replace(/\bRDU\b/g, "RDR");
}

/**
 * Retorna o catálogo oficial de mão de obra ajustado para o tipo de rede selecionado (RDR ou RDU).
 * Em RDU, as atividades urbanas (Item 5 para instalação de poste, Item 33 para retirada, Item 7/40/42 para medição)
 * são claramente destacadas, enquanto os itens rurais são identificados.
 * Em RDR, as atividades rurais (Item 24/25 para instalação, Item 36/37 para retirada, Item 32 para modificado, Item 41 para padrão)
 * são selecionadas como padrão de cálculo.
 */
export function getLaborCatalogForType(
  networkType: "RDR" | "RDU" = "RDU"
): OfficialLaborCatalogItem[] {
  return OFFICIAL_LABOR_CATALOG.map((item) => {
    let desc = item.description;
    if (networkType === "RDU") {
      if (item.item === 5) {
        desc = "Poste (s) a instalar (RDU - Urbano)";
      } else if (item.item === 33) {
        desc = "Poste (s) a retirar (RDU - Urbano)";
      } else if (item.item === 2) {
        desc = "Poste (s) a aproveitar complexo (RDU - Urbano)";
      } else if (item.item === 7) {
        desc = "Instalação de medidor (RDU - Urbano)";
      } else if (item.item === 24) {
        desc = "Instalação de poste RDR 10 (Padrão Rural)";
      } else if (item.item === 25) {
        desc = "Instalação de poste RDR 30, cabo 4 a 1/0 AWG (Padrão Rural)";
      } else if (item.item === 36) {
        desc = "Retirar poste equipado, RDR 10 (Padrão Rural)";
      } else if (item.item === 37) {
        desc = "Retirar poste equipado, RDR 30, 4a 1/0 AWG (Padrão Rural)";
      } else if (item.item === 32) {
        desc = "Poste modificado RDR monofásico e trifásico (Padrão Rural)";
      } else if (item.item === 41) {
        desc = "Instalação de padrão RDR monofásico, incorporado em poste (Padrão Rural)";
      } else {
        desc = desc.replace(/\bRDR\b/g, "RDU");
      }
    } else {
      // RDR (Rural)
      if (item.item === 5) {
        desc = "Poste (s) a instalar (Padrão Urbano RDU)";
      } else if (item.item === 33) {
        desc = "Poste (s) a retirar (Padrão Urbano RDU)";
      }
    }
    return {
      ...item,
      description: desc,
    };
  });
}

