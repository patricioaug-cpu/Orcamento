import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  BookOpen,
  Copy,
  Check,
  Hash,
  FileText,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Loader2,
  PackageCheck,
} from "lucide-react";
import officialMnemonicsData from "../../data/mnemonicos_catalogo.json";

export interface MnemonicComponent {
  material: string;
  quantidade: number;
  unidade: string;
}

export interface MnemonicRecord {
  codigo: string;
  descricao: string;
  componentes: MnemonicComponent[];
}

interface MnemonicsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 30;

export const MnemonicsCatalogModal: React.FC<MnemonicsCatalogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [descFilter, setDescFilter] = useState<string>("");
  const [codeFilter, setCodeFilter] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState<boolean>(false);
  const [apiRecords, setApiRecords] = useState<MnemonicRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch official mnemonics from backend API when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/catalog/mnemonics/all");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.mnemonicos) && data.mnemonicos.length > 0) {
            if (isMounted) {
              setApiRecords(data.mnemonicos);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch /api/catalog/mnemonics/all, using static official data fallback", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load and sort all 7,203 official mnemonics in strict ALPHABETICAL order (A-Z) by description
  const allMnemonics: MnemonicRecord[] = useMemo(() => {
    const rawList: MnemonicRecord[] =
      apiRecords && apiRecords.length > 0
        ? apiRecords
        : Array.isArray(officialMnemonicsData)
        ? (officialMnemonicsData as unknown as MnemonicRecord[])
        : [];

    return [...rawList].sort((a, b) =>
      a.descricao.localeCompare(b.descricao, "pt-BR", { sensitivity: "base" })
    );
  }, [apiRecords]);

  // Calculate total components across the entire catalog
  const totalCatalogComponents = useMemo(() => {
    return allMnemonics.reduce((acc, curr) => acc + (curr.componentes?.length || 0), 0);
  }, [allMnemonics]);

  // Filter with STRICTLY ONLY Description filter and Code filter
  const filteredMnemonics = useMemo(() => {
    const cleanDesc = descFilter.toLowerCase().trim();
    const cleanCode = codeFilter.toLowerCase().trim();

    return allMnemonics.filter((item) => {
      const matchesDesc =
        !cleanDesc ||
        item.descricao.toLowerCase().includes(cleanDesc) ||
        item.componentes?.some((c) => c.material.toLowerCase().includes(cleanDesc));

      const matchesCode =
        !cleanCode || item.codigo.toLowerCase().includes(cleanCode);

      return matchesDesc && matchesCode;
    });
  }, [allMnemonics, descFilter, codeFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [descFilter, codeFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMnemonics.length / ITEMS_PER_PAGE));
  const paginatedMnemonics = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMnemonics.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMnemonics, currentPage]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleClearFilters = () => {
    setDescFilter("");
    setCodeFilter("");
  };

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedCodes(new Set());
      setAllExpanded(false);
    } else {
      const currentCodes = new Set(paginatedMnemonics.map((m) => m.codigo));
      setExpandedCodes(currentCodes);
      setAllExpanded(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="mnemonics-catalog-modal"
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-950/85 backdrop-blur-xs flex flex-col justify-between overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. HEADER */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-xs shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Catálogo de Mnemônicos e Composições
              </h2>
              <span className="bg-slate-800 text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                Ordem Alfabética (A-Z)
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando base...
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Catálogo contendo{" "}
              <strong className="text-amber-400 font-bold">
                {allMnemonics.length.toLocaleString("pt-BR")}
              </strong>{" "}
              mnemônicos cadastrados e{" "}
              <strong className="text-amber-400 font-bold">
                {totalCatalogComponents.toLocaleString("pt-BR")}
              </strong>{" "}
              componentes com suas respectivas quantidades
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
                id="filter-mnemonic-desc"
                type="text"
                placeholder="Filtrar por descrição do mnemônico ou material (ex: EST 2 CE1, POSTE CONCRETO, ALÇA, CHAVE)..."
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
                id="filter-mnemonic-code"
                type="text"
                placeholder="Filtrar por código do mnemônico (ex: 2CE11C150, N11C300, PC11300, AMALCA10)..."
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-950 text-white placeholder-slate-500 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono transition-all uppercase"
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

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Results Bar and Expand Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span>
                Exibindo{" "}
                <strong className="text-amber-400 font-bold">
                  {filteredMnemonics.length.toLocaleString("pt-BR")}
                </strong>{" "}
                de {allMnemonics.length.toLocaleString("pt-BR")} mnemônicos
              </span>
              {filteredMnemonics.length > 0 && (
                <span className="text-slate-500">
                  (Página {currentPage} de {totalPages})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleExpandAll}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Expandir ou recolher todos os componentes da página atual"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{allExpanded ? "Recolher Componentes" : "Expandir Componentes"}</span>
              </button>

              {(descFilter || codeFilter) && (
                <button
                  onClick={handleClearFilters}
                  className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* List of Mnemonics */}
          {filteredMnemonics.length === 0 ? (
            <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Nenhum mnemônico encontrado
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Não foram encontrados mnemônicos correspondentes aos filtros aplicados.
              </p>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedMnemonics.map((mne, idx) => {
                const isExpanded = expandedCodes.has(mne.codigo) || allExpanded;
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const compCount = mne.componentes?.length || 0;

                return (
                  <div
                    key={`${mne.codigo}-${globalIndex}`}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden transition-all shadow-xs"
                  >
                    {/* Mnemonic Header Card */}
                    <div
                      onClick={() => toggleExpand(mne.codigo)}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-slate-900 hover:bg-slate-850 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="text-slate-500 font-mono text-xs font-bold w-10 shrink-0 pt-0.5 sm:pt-0 text-center">
                          #{globalIndex}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md">
                              {mne.codigo}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                              {compCount} {compCount === 1 ? "componente" : "componentes"}
                            </span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                            {mne.descricao}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(mne.codigo);
                          }}
                          className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                          title="Copiar código do mnemônico"
                        >
                          {copiedCode === mne.codigo ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copiar Código</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(mne.codigo);
                          }}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title={isExpanded ? "Recolher componentes" : "Ver lista de componentes"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-amber-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Components List */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 bg-slate-950/60 p-3 sm:p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                            <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Componentes e Quantidades do Mnemônico {mne.codigo}:</span>
                          </div>

                          {compCount === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">
                              Nenhum componente especificado no catálogo para este mnemônico.
                            </p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-800/80">
                              <table className="w-full text-left text-xs text-slate-200">
                                <thead className="bg-slate-800/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-700/80">
                                  <tr>
                                    <th className="py-2 px-3 w-12 text-center">Item</th>
                                    <th className="py-2 px-3">Descrição do Material / Componente</th>
                                    <th className="py-2 px-3 w-28 text-right">Quantidade</th>
                                    <th className="py-2 px-3 w-24 text-center">Unidade</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                                  {mne.componentes.map((comp, cIdx) => (
                                    <tr
                                      key={`${comp.material}-${cIdx}`}
                                      className="hover:bg-slate-800/40 transition-colors"
                                    >
                                      <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                                        {cIdx + 1}
                                      </td>
                                      <td className="py-2 px-3 font-medium text-slate-200">
                                        {comp.material}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                                        {Number(comp.quantidade).toLocaleString("pt-BR", {
                                          maximumFractionDigits: 3,
                                        })}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className="font-mono text-[11px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/50">
                                          {comp.unidade || "UN"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Página <strong className="text-white font-bold">{currentPage}</strong> de{" "}
                <strong className="text-white font-bold">{totalPages}</strong> (
                {filteredMnemonics.length.toLocaleString("pt-BR")} mnemônicos encontrados)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono font-bold text-xs">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
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
            Catálogo com 7.203 mnemônicos oficiais e 30.949 componentes em ordem alfabética pela descrição.
          </span>
          <span className="sm:hidden">
            {filteredMnemonics.length.toLocaleString("pt-BR")} mnemônicos listados
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
