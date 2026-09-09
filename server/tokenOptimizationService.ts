import crypto from "crypto";

export interface CacheEntry {
  hash: string;
  voltageLevel: string;
  timestamp: number;
  data: any;
  recognitionAudit?: any;
  orchestration?: any;
  source: string;
  catalog?: any;
  tokenStats?: {
    estimatedInputTokensSaved: number;
    estimatedOutputTokensSaved: number;
  };
}

// In-memory LRU-like cache for analyzed projects by content hash
class ProjectAnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries = 50;

  public computeHash(content: string, voltageLevel: string = "AUTO"): string {
    return crypto
      .createHash("sha256")
      .update(`${voltageLevel}::${content}`)
      .digest("hex");
  }

  public get(hash: string): CacheEntry | undefined {
    const entry = this.cache.get(hash);
    if (entry) {
      // Refresh LRU order
      this.cache.delete(hash);
      this.cache.set(hash, entry);
    }
    return entry;
  }

  public set(hash: string, entry: CacheEntry): void {
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(hash, entry);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const analysisCache = new ProjectAnalysisCache();

/**
 * Gera o prompt de sistema dinâmico compacto e otimizado (redução de ~75% de tokens de texto).
 * Não envia catálogos de mnemônicos ou listas completas de materiais, pois o backend
 * realiza o mapeamento e a explosão de forma 100% determinística.
 */
export function buildOptimizedSystemPrompt(voltageLabel: string, voltageLevel?: string): string {
  return `Você é um engenheiro sênior especialista em leitura de projetos elétricos CEMIG (ND-3.1, ND-2.4, IT-EO-008).
Tensão nominal do projeto: ${voltageLabel}.

OBJETIVO:
Extraia com máxima precisão todos os elementos visíveis na planta/diagrama (postes, estruturas MT/BT, transformadores, estais, chaves e cabos).

REGRAS RÍGIDAS DE SEGURANÇA E NÃO-ALUCINAÇÃO:
1. Extraia APENAS o que estiver visível no desenho. NUNCA invente postes, cabos ou estruturas.
2. Identifique o código textual de cada estrutura exatamente como anotado (ex: N1, N2, N3, CE1, CE3, M1, S12N, SI3R, etc.).
3. Identifique o tipo do poste (ex: 11-300, 10-150, etc.) e seu formato (CIRCULAR, DUPLO T).
4. Certifique-se com rigor se existem elementos a retirar:
   - Identifique e registre com status "RETIRAR" qualquer poste, estrutura, transformador, estai, chave ou cabo com traçado tachado, marcado com "X", hachura/símbolo de desmontagem ou notas como "A RETIRAR", "RETIRADA", "DESMONTAR", "REMOVER".
   - Itens projetados novos: "INSTALAR".
   - Itens existentes/mantidos (entre parênteses ou nota existente): "EXISTENTE".
5. CONTABILIZAÇÃO DE CABOS E VÃOS DA REDE:
   - Identifique todos os trechos/vãos de condutores visíveis no projeto (ex: CAA 1/0 AWG, CAA 4 AWG, CAA 2 AWG, 3x1x70+70 ABCN, etc.).
   - Para cada vão, observe os postes interligados (de P(n) a P(m)) e a metragem do vão indicada na cota/linha do projeto.
   - Agrupe e some os vãos separados rigorosamente de acordo com as especificações do projeto e seu status (INSTALAR ou RETIRAR).
   - Forneça a quantidade de vãos (spansCount), a metragem total somada dos vãos (estimatedLengthMeters) e o detalhamento dos vãos (spansDetail, ex: 'P1-P2 (35m), P2-P3 (40m)').
6. Não gere lista de materiais ou composições manuais (o backend resolverá isso deterministicamente).

FORMATO DE SAÍDA (Retorne EXCLUSIVAMENTE um JSON estrito):
{
  "detectedStructures": [
    { "id": "P1", "code": "N1", "level": "1", "voltage": "MT", "status": "INSTALAR", "associatedPost": "11-300" }
  ],
  "detectedPoles": [
    { "id": "P1", "typeSpec": "11-300", "shape": "CIRCULAR", "material": "CONCRETO", "status": "INSTALAR" }
  ],
  "detectedTransformers": [
    { "associatedPole": "P3", "powerKva": "45", "voltage": "15kV", "status": "INSTALAR" }
  ],
  "detectedGuys": [
    { "type": "ANCORA", "quantity": 1, "status": "INSTALAR" }
  ],
  "detectedCables": [
    {
      "cableType": "CAA 1/0 AWG",
      "voltage": "MT",
      "status": "INSTALAR",
      "spansCount": 3,
      "estimatedLengthMeters": 110,
      "spansDetail": "P1-P2 (35m), P2-P3 (40m), P3-P4 (35m)",
      "notes": "Rede MT com 3 vãos totalizando 110m"
    }
  ],
  "unrecognizedItems": [],
  "generalSummary": "Resumo objetivo da varredura visual."
}`;
}
