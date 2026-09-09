import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  Package,
  Copy,
  Check,
  Hash,
  FileText,
  Info,
  Loader2,
} from "lucide-react";
import officialItemsCatalog from "../../data/itens_catalogo.json";

interface StandaloneMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface StandaloneMaterial {
  code: string;
  description: string;
  unit: string;
}

function inferUnitFromDescription(description: string, code: string): string {
  const desc = description.toUpperCase();
  if (
    desc.startsWith("CABO") ||
    desc.startsWith("CONDUTOR") ||
    desc.startsWith("CORDOALHA") ||
    desc.startsWith("FITA") ||
    desc.includes(" METRO") ||
    desc.includes(" M ")
  ) {
    return "M";
  }
  if (
    desc.startsWith("MÃO DE OBRA") ||
    desc.startsWith("MAO DE OBRA") ||
    desc.startsWith("SERVIÇO") ||
    desc.startsWith("HORA")
  ) {
    return "H";
  }
  if (desc.startsWith("CONCRETO") || desc.includes("M³")) {
    return "M³";
  }
  if (desc.startsWith("TINTA") || desc.includes("LITRO")) {
    return "L";
  }
  return "UN";
}

export const StandaloneMaterialsModal: React.FC<StandaloneMaterialsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [descFilter, setDescFilter] = useState<string>("");
  const [codeFilter, setCodeFilter] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [apiRecords, setApiRecords] = useState<Array<{ codigo: string; descricao: string }> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch official catalog from backend API when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/catalog/items/all");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.records) && data.records.length > 0) {
            if (isMounted) {
              setApiRecords(data.records);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch /api/catalog/items/all, using static official data fallback", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Compile all 1,558 official records loaded directly from official dataset
  const allStandaloneMaterials: StandaloneMaterial[] = useMemo(() => {
    const rawList: Array<{ codigo: string; descricao: string }> =
      apiRecords && apiRecords.length > 0
        ? apiRecords
        : Array.isArray((officialItemsCatalog as any)?.registros)
        ? (officialItemsCatalog as any).registros
        : Array.isArray(officialItemsCatalog)
        ? (officialItemsCatalog as any)
        : [];

    const list: StandaloneMaterial[] = rawList.map((item) => {
      const code = String(item.codigo || "").trim();
      const description = String(item.descricao || "").trim();
      const unit = inferUnitFromDescription(description, code);

      return {
        code,
        description,
        unit,
      };
    });

    // Return sorted in strict ALPHABETICAL order by description (A-Z)
    return list.sort((a, b) =>
      a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" })
    );
  }, [apiRecords]);

  // Filter with strictly only Description filter and Code filter
  const filteredMaterials = useMemo(() => {
    const cleanDesc = descFilter.toLowerCase().trim();
    const cleanCode = codeFilter.toLowerCase().trim();

    return allStandaloneMaterials.filter((item) => {
      const matchesDesc =
        !cleanDesc || item.description.toLowerCase().includes(cleanDesc);
      const matchesCode =
        !cleanCode || item.code.toLowerCase().includes(cleanCode);

      return matchesDesc && matchesCode;
    });
  }, [allStandaloneMaterials, descFilter, codeFilter]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleClearFilters = () => {
    setDescFilter("");
    setCodeFilter("");
  };

  if (!isOpen) return null;

  return (
    <div
      id="standalone-materials-modal"
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-950/85 backdrop-blur-xs flex flex-col justify-between overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. HEADER */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-xs shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Lista Oficial de Materiais Avulsos
              </h2>
              <span className="bg-slate-800 text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                Ordem Alfabética (A-Z)
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Catálogo oficial CEMIG contendo <strong className="text-amber-400">{allStandaloneMaterials.length}</strong> registros oficiais cadastrados
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Fechar janela (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* 2. EXCLUSIVE FILTER BAR (SOMENTE FILTRO DE DESCRIÇÃO E FILTRO DE CÓDIGO) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-7xl mx-auto">
          {/* Filtro de Descrição */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Filtro de Descrição:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="filter-description-input"
                type="text"
                placeholder="Filtrar por descrição (ex: adaptador, alça, isolador, cabo, parafuso)..."
                value={descFilter}
                onChange={(e) => setDescFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-950 text-white placeholder-slate-500 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              {descFilter && (
                <button
                  onClick={() => setDescFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  title="Limpar filtro de descrição"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro de Código */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              Filtro de Código:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="filter-code-input"
                type="text"
                placeholder="Filtrar por código (ex: 229641, 220418, 74831)..."
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-950 text-white placeholder-slate-500 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono transition-all"
              />
              {codeFilter && (
                <button
                  onClick={() => setCodeFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  title="Limpar filtro de código"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SCROLLABLE MATERIALS LIST IN ALPHABETICAL ORDER */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 text-slate-100">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Result Count Status */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Exibindo <strong className="text-amber-400 font-bold">{filteredMaterials.length}</strong> de{" "}
              {allStandaloneMaterials.length} materiais cadastrados
            </span>

            {(descFilter || codeFilter) && (
              <button
                onClick={handleClearFilters}
                className="text-amber-400 hover:text-amber-300 underline text-xs font-semibold cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-300">
                Nenhum material encontrado
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há materiais que correspondam aos filtros de descrição e código informados.
              </p>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700 inline-block mt-2"
              >
                Redefinir Filtros
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-800/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-700/80 sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-4 w-16 text-center">#</th>
                      <th className="py-3 px-4 w-44">Código do Material</th>
                      <th className="py-3 px-4">Descrição do Material (Ordem Alfabética A-Z)</th>
                      <th className="py-3 px-4 w-24 text-center">Unidade</th>
                      <th className="py-3 px-4 w-20 text-center">Copiar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {filteredMaterials.map((item, index) => (
                      <tr
                        key={`${item.code}_${index}`}
                        className="hover:bg-slate-800/60 transition-colors group"
                      >
                        {/* Index Number */}
                        <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">
                          {index + 1}
                        </td>

                        {/* Código */}
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 inline-block">
                            {item.code}
                          </span>
                        </td>

                        {/* Descrição */}
                        <td className="py-3 px-4 font-medium text-slate-100 text-xs sm:text-sm">
                          {item.description}
                        </td>

                        {/* Unidade */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                            {item.unit}
                          </span>
                        </td>

                        {/* Copiar Código */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleCopyCode(item.code)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Copiar código do material"
                          >
                            {copiedCode === item.code ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block sm:hidden divide-y divide-slate-800">
                {filteredMaterials.map((item, index) => (
                  <div key={`${item.code}_${index}`} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">
                          #{index + 1}
                        </span>
                        <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-xs">
                          {item.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                          {item.unit}
                        </span>
                        <button
                          onClick={() => handleCopyCode(item.code)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 cursor-pointer"
                          title="Copiar código"
                        >
                          {copiedCode === item.code ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-slate-100">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. FOOTER */}
      <footer className="bg-slate-900 px-4 sm:px-6 py-3 border-t border-slate-800 flex items-center justify-between shrink-0 gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">
            Lista em ordem alfabética para consulta rápida dos 1.558 materiais avulsos oficiais e seus respectivos códigos.
          </span>
          <span className="sm:hidden">
            {filteredMaterials.length} materiais listados
          </span>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          Fechar
        </button>
      </footer>
    </div>
  );
};
