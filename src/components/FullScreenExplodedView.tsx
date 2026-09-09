import React, { useState, useMemo, useEffect } from "react";
import { CemigMaterialItem } from "../types";
import { resolveOfficialMaterialCode } from "../itemCatalogLookup";
import { getEstimatedMarketPrice } from "../cemigDatabase";
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  Eye,
  EyeOff,
  Search,
  Filter,
  Printer,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  X,
  Edit2,
  Trash2,
  TrendingUp,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";

interface FullScreenExplodedViewProps {
  isOpen: boolean;
  onClose: () => void;
  materials: CemigMaterialItem[];
  effectiveTotalUS: number;
  effectiveTotalLaborValue?: number;
  profitMargin?: number;
  voltageLevel?: string;
  projectName?: string;
  onUpdateMaterial?: (updated: CemigMaterialItem[]) => void;
  onOpenRegisteredPrices?: () => void;
}

export const FullScreenExplodedView: React.FC<FullScreenExplodedViewProps> = ({
  isOpen,
  onClose,
  materials,
  effectiveTotalUS,
  effectiveTotalLaborValue,
  profitMargin = 0,
  voltageLevel = "13.8kV",
  projectName,
  onUpdateMaterial,
  onOpenRegisteredPrices,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("TODOS");
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"PAGINATED" | "CONTINUOUS">("PAGINATED");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editQty, setEditQty] = useState<number>(1);
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while in full screen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Filter materials (excluding removal items for consolidated install list)
  const installMaterials = useMemo(() => {
    return materials.filter(
      (item) => item.status !== "RETIRAR" && !item.description.startsWith("[A RETIRAR]")
    );
  }, [materials]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    installMaterials.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["TODOS", ...Array.from(set).sort()];
  }, [installMaterials]);

  // Filtered by search & category
  const filteredMaterials = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return installMaterials.filter((item) => {
      const codeStr = (item.code || item.codigo || "").toLowerCase();
      const descStr = (item.description || "").toLowerCase();
      const matchesSearch = !search || codeStr.includes(search) || descStr.includes(search);
      const matchesCat = filterCategory === "TODOS" || item.category === filterCategory;
      return matchesSearch && matchesCat;
    });
  }, [installMaterials, searchTerm, filterCategory]);

  // Margin calculation helpers
  const activeMargin = Math.max(0, Number(profitMargin) || 0);

  const getBaseItemPrice = (item: CemigMaterialItem): number => {
    if (item.unitPrice !== undefined && item.unitPrice > 0) return item.unitPrice;
    return getEstimatedMarketPrice(item.code, item.category, item.description);
  };

  const getItemPrice = (item: CemigMaterialItem): number => {
    const base = getBaseItemPrice(item);
    if (activeMargin > 0) {
      return base * (1 + activeMargin / 100);
    }
    return base;
  };

  // Grand totals across all filtered materials
  const totalBaseValue = useMemo(() => {
    return filteredMaterials.reduce((acc, item) => acc + item.quantity * getBaseItemPrice(item), 0);
  }, [filteredMaterials]);

  const totalEffectiveValue = useMemo(() => {
    return filteredMaterials.reduce((acc, item) => acc + item.quantity * getItemPrice(item), 0);
  }, [filteredMaterials, activeMargin]);

  const totalProfitValue = totalEffectiveValue - totalBaseValue;

  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / itemsPerPage));

  // Reset page if filtered items change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Items for current page in Paginated mode
  const currentSheetMaterials = useMemo(() => {
    if (viewMode === "CONTINUOUS") return filteredMaterials;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(start, start + itemsPerPage);
  }, [filteredMaterials, currentPage, itemsPerPage, viewMode]);

  // Group into sheets for Continuous mode
  const sheets = useMemo(() => {
    const list: CemigMaterialItem[][] = [];
    for (let i = 0; i < filteredMaterials.length; i += itemsPerPage) {
      list.push(filteredMaterials.slice(i, i + itemsPerPage));
    }
    if (list.length === 0) list.push([]);
    return list;
  }, [filteredMaterials, itemsPerPage]);

  // Item edit actions
  const handleStartEdit = (item: CemigMaterialItem) => {
    setEditingId(item.id);
    setEditCode(item.code);
    setEditDesc(item.description);
    setEditQty(item.quantity);
    setEditUnitPrice(getBaseItemPrice(item));
  };

  const handleSaveEdit = (id: string) => {
    if (!onUpdateMaterial) return;
    const updated = materials.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          code: editCode.trim().toUpperCase(),
          description: editDesc.trim().toUpperCase(),
          quantity: Math.max(0.01, editQty),
          unitPrice: Math.max(0, editUnitPrice),
        };
      }
      return item;
    });
    onUpdateMaterial(updated);
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    if (!onUpdateMaterial) return;
    if (window.confirm("Deseja realmente remover este material da lista consolidada?")) {
      const updated = materials.filter((item) => item.id !== id);
      onUpdateMaterial(updated);
      if (editingId === id) setEditingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="fullscreen-exploded-materials"
      className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. TOP COMMAND BAR (Sticky Header) */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg z-20 print:hidden">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-main-screen"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm transition-all border border-slate-700 shadow-sm cursor-pointer shrink-0"
            title="Voltar para a Tela Principal do Aplicativo (ou pressione Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Voltar pra Tela Principal</span>
          </button>

          <div className="border-l border-slate-800 pl-3">
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Lista de Materiais Explodida Consolidada</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md uppercase">
                Tela Cheia
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              {projectName || "Projeto de Rede de Distribuição"} • Tensão: {voltageLevel}
            </p>
          </div>
        </div>

        {/* Center & Right: KPI Badges (including prominent US display) & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* PROMINENT US BADGE (Mão de Obra em US) */}
          <div
            id="kpi-fullscreen-total-us"
            className="flex items-center gap-2.5 bg-amber-500/15 border border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-xs"
            title="Total de Mão de Obra do Projeto em Unidades de Serviço (US)"
          >
            <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block leading-none">
                Mão de Obra (US)
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300 font-mono leading-tight">
                {effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US
              </span>
            </div>
          </div>

          {/* Total Materials Count Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">Materiais:</span>
            <span className="font-mono font-bold text-white bg-slate-700 px-2 py-0.5 rounded-md">
              {filteredMaterials.length}
            </span>
          </div>

          {/* Toggle Prices Button */}
          <button
            onClick={() => setShowPrices(!showPrices)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              showPrices
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
            title="Exibir ou ocultar colunas de valores em R$"
          >
            {showPrices ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showPrices ? "Valores R$: Exibidos" : "Valores R$: Ocultos"}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Imprimir Relatório de Materiais ou Salvar como PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Imprimir</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-700/60"
            title="Fechar Tela Cheia (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SUB-TOOLBAR: Search, Categories, Sheet Navigation & View Mode */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs z-10 print:hidden">
        {/* Left: Search & Categories */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 max-w-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-amber-500" />
              Filtro:
            </span>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                  filterCategory === cat
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Folha / Page Navigator & Mode Switcher */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("PAGINATED")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                viewMode === "PAGINATED"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Exibir uma folha por vez com paginação formal"
            >
              Folha a Folha
            </button>
            <button
              onClick={() => setViewMode("CONTINUOUS")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                viewMode === "CONTINUOUS"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Exibir todas as folhas sequencialmente (ideal para visualização contínua ou impressão)"
            >
              Todas as Folhas
            </button>
          </div>

          {/* Folha / Page Navigation (Visible in PAGINATED mode) */}
          {viewMode === "PAGINATED" && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Folha Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-slate-200 px-1.5">
                Folha <span className="text-amber-400">{currentPage}</span> de {totalPages}
                {currentPage === totalPages && (
                  <span className="ml-1 text-[10px] text-amber-300 font-extrabold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">
                    Última
                  </span>
                )}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Próxima Folha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Items per sheet selector */}
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>Itens/Folha:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-amber-500"
            >
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT CANVAS: Sheets of Consolidated Materials */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-900/60 space-y-8 print:p-0 print:bg-white print:overflow-visible">
        {filteredMaterials.length === 0 ? (
          <div className="max-w-xl mx-auto my-16 bg-slate-800/80 border border-slate-700 rounded-2xl p-8 text-center space-y-3 shadow-xl">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum material consolidado encontrado</h3>
            <p className="text-xs text-slate-400">
              Verifique os filtros aplicados ou retorne à tela principal para conferir o projeto processado.
            </p>
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar pra Tela Principal</span>
            </button>
          </div>
        ) : viewMode === "PAGINATED" ? (
          /* ====================================================================== */
          /* SINGLE SHEET VIEW (PAGINATED)                                           */
          /* RULE: Total in R$ appears ONLY on the last folha (currentPage === totalPages) */
          /* ====================================================================== */
          <div className="max-w-6xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col print:border-none print:shadow-none print:rounded-none">
            {/* Formal Sheet Header */}
            <div className="bg-slate-950 text-white p-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                      Folha {currentPage} de {totalPages}
                    </span>
                    {currentPage === totalPages && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-md">
                        ÚLTIMA FOLHA
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white">
                    Lista de Materiais de Distribuição Consolidada
                  </h2>
                </div>
              </div>

              {/* Sheet Metadata Box */}
              <div className="flex items-center gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Mão de Obra do Projeto</span>
                  <span className="font-mono font-black text-amber-300">
                    {effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-right hidden sm:block">
                  <span className="text-[10px] text-slate-400 block uppercase">Itens nesta folha</span>
                  <span className="font-mono font-bold text-white">
                    {currentSheetMaterials.length} itens
                  </span>
                </div>
              </div>
            </div>

            {/* Table of Materials for Current Sheet */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5 w-12 text-center">#</th>
                    <th className="py-3 px-3.5 w-32">Código</th>
                    <th className="py-3 px-3.5">Descrição do Material</th>
                    <th className="py-3 px-3.5 w-16 text-center">Unid.</th>
                    <th className="py-3 px-3.5 w-24 text-right">Qtd.</th>
                    {showPrices && (
                      <>
                        <th className="py-3 px-3.5 w-32 text-right">Val. Unit. (R$)</th>
                        <th className="py-3 px-3.5 w-36 text-right">Val. Total (R$)</th>
                      </>
                    )}
                    <th className="py-3 px-3.5 w-24 text-center print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentSheetMaterials.map((item, idx) => {
                    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isEditing = editingId === item.id;
                    const basePrice = getBaseItemPrice(item);
                    const price = getItemPrice(item);
                    const itemTotal = item.quantity * price;

                    return (
                      <tr
                        key={`full_pag_${item.id}_${idx}`}
                        className={`hover:bg-slate-50 transition-colors ${
                          isEditing ? "bg-amber-50/60" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                      >
                        <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                          {globalIdx}
                        </td>

                        {/* Code */}
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white font-mono"
                            />
                          ) : (
                            <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200 inline-block">
                              {resolveOfficialMaterialCode(item)}
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3.5 text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white"
                            />
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-900">{item.description}</span>
                              {item.sourceStructureName && (
                                <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                                  {item.sourceStructureName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-3.5 text-center text-slate-700 font-bold">
                          {item.unit}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3.5 text-right font-black text-slate-900 font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={editQty}
                              onChange={(e) => setEditQty(Number(e.target.value))}
                              className="w-20 px-2 py-1 text-xs border border-amber-400 rounded-lg text-right focus:outline-none bg-white font-mono font-bold"
                            />
                          ) : (
                            (Number(item.quantity) || 0).toLocaleString("pt-BR")
                          )}
                        </td>

                        {/* Price Columns */}
                        {showPrices && (
                          <>
                            <td className="py-2.5 px-3.5 text-right font-mono text-slate-800">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editUnitPrice}
                                  onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                                  className="w-24 px-2 py-1 text-xs border border-amber-400 rounded-lg text-right focus:outline-none bg-white font-mono font-bold"
                                />
                              ) : price > 0 ? (
                                formatCurrency(price)
                              ) : (
                                "R$ 0,00"
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-950">
                              {itemTotal > 0 ? formatCurrency(itemTotal) : "R$ 0,00"}
                            </td>
                          </>
                        )}

                        {/* Actions */}
                        <td className="py-2.5 px-3.5 text-center print:hidden">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded cursor-pointer"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-rose-700 bg-rose-100 hover:bg-rose-200 rounded cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                                title="Remover"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ====================================================================== */}
            {/* SHEET FOOTER / TOTALIZER LOGIC                                         */}
            {/* "O total em reais na lista de materiais consolidados, deve aparecer    */}
            {/* somente na última folha da lista de materiais consolidados."          */}
            {/* ====================================================================== */}
            {currentPage < totalPages ? (
              /* FOLHAS INTERMEDIÁRIAS (Folha 1, 2... N-1): NÃO MOSTRA TOTAL EM REAIS */
              <div className="p-4 bg-slate-100 border-t border-slate-200 text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    Folha {currentPage} de {totalPages}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 italic">
                    Continua na Folha {currentPage + 1}...
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-3 py-1 rounded-lg">
                  (O total geral em reais aparece exclusivamente na última folha — Folha {totalPages})
                </div>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-all cursor-pointer shadow-xs text-xs"
                >
                  <span>Avançar para Folha {currentPage + 1}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* ÚLTIMA FOLHA: AQUI E SOMENTE AQUI O TOTAL EM REAIS É EXIBIDO! */
              <div className="p-5 bg-slate-950 text-white border-t-2 border-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl shrink-0 shadow-lg">
                    <DollarSign className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        VALOR TOTAL DOS MATERIAIS CONSOLIDADOS (ÚLTIMA FOLHA — {totalPages}/{totalPages})
                      </span>
                      {activeMargin > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-md">
                          +{activeMargin}% MARGEM APLICADA
                        </span>
                      )}
                    </div>
                    {showPrices ? (
                      <div className="mt-1">
                        <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                          {formatCurrency(totalEffectiveValue)}
                        </span>
                        {activeMargin > 0 && (
                          <div className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono">
                            <span>Custo Base: {formatCurrency(totalBaseValue)}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">Lucro: +{formatCurrency(totalProfitValue)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm italic text-slate-400 mt-1 block">
                        Valores ocultos (habilite em "Valores R$: Exibidos")
                      </span>
                    )}
                  </div>
                </div>

                {/* Resumo da Mão de Obra e Ações de Fechamento */}
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 justify-between md:justify-end flex-wrap">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Total Mão de Obra do Projeto
                    </span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US
                    </span>
                    {effectiveTotalLaborValue !== undefined && effectiveTotalLaborValue > 0 && showPrices && (
                      <span className="text-xs text-slate-400 block font-mono">
                        ({formatCurrency(effectiveTotalLaborValue)})
                      </span>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow-md text-xs sm:text-sm flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar pra Tela Principal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ====================================================================== */
          /* CONTINUOUS MULTI-SHEET VIEW (TODAS AS FOLHAS)                           */
          /* RULE: Total in R$ appears ONLY at the bottom of the LAST sheet         */
          /* ====================================================================== */
          <div className="max-w-6xl mx-auto space-y-8">
            {sheets.map((sheetItems, sheetIdx) => {
              const sheetNum = sheetIdx + 1;
              const isLastSheet = sheetNum === sheets.length;

              return (
                <div
                  key={`sheet_${sheetNum}`}
                  className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-300 overflow-hidden flex flex-col print:border-none print:shadow-none print:rounded-none break-inside-avoid print:break-inside-avoid print:break-after-page"
                >
                  {/* Sheet Formal Header */}
                  <div className="bg-slate-950 text-white p-3.5 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg font-black shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                          Folha {sheetNum} de {sheets.length}
                        </span>
                        {isLastSheet && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-md">
                            ÚLTIMA FOLHA
                          </span>
                        )}
                        <h3 className="text-xs sm:text-sm font-extrabold text-white">
                          Lista de Materiais de Distribuição Consolidada
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Mão de Obra (US)</span>
                        <span className="font-mono font-bold text-amber-300">
                          {effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sheet Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                          <th className="py-2.5 px-3.5 w-32">Código</th>
                          <th className="py-2.5 px-3.5">Descrição do Material</th>
                          <th className="py-2.5 px-3.5 w-16 text-center">Unid.</th>
                          <th className="py-2.5 px-3.5 w-24 text-right">Qtd.</th>
                          {showPrices && (
                            <>
                              <th className="py-2.5 px-3.5 w-32 text-right">Val. Unit. (R$)</th>
                              <th className="py-2.5 px-3.5 w-36 text-right">Val. Total (R$)</th>
                            </>
                          )}
                          <th className="py-2.5 px-3.5 w-20 text-center print:hidden">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sheetItems.map((item, idx) => {
                          const globalIdx = sheetIdx * itemsPerPage + idx + 1;
                          const isEditing = editingId === item.id;
                          const basePrice = getBaseItemPrice(item);
                          const price = getItemPrice(item);
                          const itemTotal = item.quantity * price;

                          return (
                            <tr
                              key={`cont_${sheetNum}_${item.id}_${idx}`}
                              className={`hover:bg-slate-50 transition-colors ${
                                isEditing ? "bg-amber-50/60" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                              }`}
                            >
                              <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                                {globalIdx}
                              </td>

                              <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white font-mono"
                                  />
                                ) : (
                                  <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                    {resolveOfficialMaterialCode(item)}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3.5 text-slate-900">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white"
                                  />
                                ) : (
                                  <div>
                                    <span className="font-semibold text-slate-900">{item.description}</span>
                                    {item.sourceStructureName && (
                                      <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                                        {item.sourceStructureName}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3.5 text-center text-slate-700 font-bold">
                                {item.unit}
                              </td>

                              <td className="py-2.5 px-3.5 text-right font-black text-slate-900 font-mono">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={editQty}
                                    onChange={(e) => setEditQty(Number(e.target.value))}
                                    className="w-20 px-2 py-1 text-xs border border-amber-400 rounded-lg text-right focus:outline-none bg-white font-mono font-bold"
                                  />
                                ) : (
                                  (Number(item.quantity) || 0).toLocaleString("pt-BR")
                                )}
                              </td>

                              {showPrices && (
                                <>
                                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-800">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editUnitPrice}
                                        onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                                        className="w-24 px-2 py-1 text-xs border border-amber-400 rounded-lg text-right focus:outline-none bg-white font-mono font-bold"
                                      />
                                    ) : price > 0 ? (
                                      formatCurrency(price)
                                    ) : (
                                      "R$ 0,00"
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-950">
                                    {itemTotal > 0 ? formatCurrency(itemTotal) : "R$ 0,00"}
                                  </td>
                                </>
                              )}

                              <td className="py-2.5 px-3.5 text-center print:hidden">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleSaveEdit(item.id)}
                                      className="p-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded cursor-pointer"
                                      title="Salvar"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="p-1 text-rose-700 bg-rose-100 hover:bg-rose-200 rounded cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleStartEdit(item)}
                                      className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                                      title="Remover"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* SHEET FOOTER */}
                  {!isLastSheet ? (
                    <div className="p-3 bg-slate-100 border-t border-slate-200 text-slate-600 flex items-center justify-between text-xs">
                      <span>
                        Fim da Folha {sheetNum} de {sheets.length} • Continua na Folha {sheetNum + 1}...
                      </span>
                      <span className="text-[11px] text-slate-500 italic">
                        (Total em R$ consta apenas na última folha)
                      </span>
                    </div>
                  ) : (
                    /* ÚLTIMA FOLHA: AQUI E SOMENTE AQUI O TOTAL EM REAIS É EXIBIDO! */
                    <div className="p-5 bg-slate-950 text-white border-t-2 border-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl shrink-0 shadow-lg">
                          <DollarSign className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                              VALOR TOTAL DOS MATERIAIS CONSOLIDADOS (ÚLTIMA FOLHA — {sheets.length}/{sheets.length})
                            </span>
                            {activeMargin > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-md">
                                +{activeMargin}% MARGEM INCLUSA
                              </span>
                            )}
                          </div>
                          {showPrices ? (
                            <div className="mt-1">
                              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                                {formatCurrency(totalEffectiveValue)}
                              </span>
                              {activeMargin > 0 && (
                                <div className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono">
                                  <span>Custo Base: {formatCurrency(totalBaseValue)}</span>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-bold">Lucro: +{formatCurrency(totalProfitValue)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm italic text-slate-400 mt-1 block">
                              Valores ocultos (habilite em "Valores R$: Exibidos")
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 justify-between md:justify-end flex-wrap">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Total Mão de Obra do Projeto
                          </span>
                          <span className="text-xl font-black text-amber-400 font-mono">
                            {effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US
                          </span>
                          {effectiveTotalLaborValue !== undefined && effectiveTotalLaborValue > 0 && showPrices && (
                            <span className="text-xs text-slate-400 block font-mono">
                              ({formatCurrency(effectiveTotalLaborValue)})
                            </span>
                          )}
                        </div>

                        <button
                          onClick={onClose}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow-md text-xs sm:text-sm flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Voltar pra Tela Principal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
