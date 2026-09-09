import React, { useState, useMemo, useEffect } from "react";
import { CemigMaterialItem } from "../types";
import { getEstimatedMarketPrice } from "../cemigDatabase";
import officialItemsCatalog from "../../data/itens_catalogo.json";
import {
  DollarSign,
  Search,
  Printer,
  RefreshCw,
  Edit2,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
} from "lucide-react";

interface RegisteredPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: CemigMaterialItem[];
  onUpdateMaterial: (updated: CemigMaterialItem[]) => void;
  profitMargin?: number;
}

interface RegisteredItem {
  code: string;
  description: string;
  unit: string;
  category: string;
  unitPrice: number;
  inProject: boolean;
}

function inferUnit(description: string): string {
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

function inferCategory(description: string, code: string): string {
  const desc = description.toUpperCase();
  const codeClean = code.toUpperCase();

  if (desc.includes("POSTE")) return "POSTE";
  if (
    desc.includes("CABO") ||
    desc.includes("CONDUTOR") ||
    desc.includes("CORDOALHA") ||
    desc.includes("FIO ")
  ) {
    return "CABO";
  }
  if (
    desc.includes("TRANSFORMADOR") ||
    desc.includes("CHAVE") ||
    desc.includes("RELIGADOR") ||
    desc.includes("PÁRA-RAIOS") ||
    desc.includes("PARA-RAIO") ||
    desc.includes("DISJUNTOR") ||
    desc.includes("REGULADOR")
  ) {
    return "EQUIPAMENTO";
  }
  if (
    desc.includes("MÃO-DE-OBRA") ||
    desc.includes("MÃO DE OBRA") ||
    desc.includes("MAO DE OBRA") ||
    desc.includes("SERVIÇO") ||
    desc.includes("MONTAGEM") ||
    codeClean.startsWith("MOC") ||
    codeClean.startsWith("US")
  ) {
    return "MÃO-DE-OBRA";
  }
  if (
    desc.includes("CRUZETA") ||
    desc.includes("ESTRUTURA") ||
    desc.includes("PERFILADO") ||
    desc.includes("MÃO FRANCESA") ||
    desc.includes("MAO FRANCESA") ||
    desc.includes("SUPORTE")
  ) {
    return "ESTRUTURA";
  }
  return "ACESSORIO";
}

const ITEMS_PER_PAGE = 30;

export const RegisteredPricesModal: React.FC<RegisteredPricesModalProps> = ({
  isOpen,
  onClose,
  materials,
  onUpdateMaterial,
  profitMargin = 0,
}) => {
  const [priceSearchTerm, setPriceSearchTerm] = useState<string>("");
  const [editingPriceCode, setEditingPriceCode] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<number>(0);
  const [customPriceMap, setCustomPriceMap] = useState<Record<string, number>>({});
  const [apiRecords, setApiRecords] = useState<Array<{ codigo: string; descricao: string }> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  const formatCurrency = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Compile all items from the 1,558 official records and project materials
  const registeredItems: RegisteredItem[] = useMemo(() => {
    const rawList: Array<{ codigo: string; descricao: string }> =
      apiRecords && apiRecords.length > 0
        ? apiRecords
        : Array.isArray((officialItemsCatalog as any)?.registros)
        ? (officialItemsCatalog as any).registros
        : Array.isArray(officialItemsCatalog)
        ? (officialItemsCatalog as any)
        : [];

    const projectMaterialMap = new Map<string, CemigMaterialItem>();
    materials.forEach((mat) => {
      if (mat.code) projectMaterialMap.set(mat.code.trim().toUpperCase(), mat);
    });

    const itemMap = new Map<string, RegisteredItem>();

    // 1. Add all official records (1,558 items)
    rawList.forEach((rec) => {
      const code = String(rec.codigo || "").trim();
      const description = String(rec.descricao || "").trim();
      if (!code && !description) return;

      const codeKey = code.toUpperCase();
      const inProject = projectMaterialMap.has(codeKey);
      const projMat = projectMaterialMap.get(codeKey);

      const unit = projMat?.unit || inferUnit(description);
      const category = projMat?.category || inferCategory(description, code);

      let price = 0;
      if (customPriceMap[code] !== undefined) {
        price = customPriceMap[code];
      } else if (projMat && projMat.unitPrice !== undefined && projMat.unitPrice > 0) {
        price = projMat.unitPrice;
      } else {
        price = getEstimatedMarketPrice(code, category, description);
      }

      itemMap.set(code, {
        code,
        description,
        unit,
        category,
        unitPrice: price,
        inProject,
      });
    });

    // 2. Add any project materials that might not be in official list
    materials.forEach((mat) => {
      const code = mat.code?.trim() || "";
      if (code && !itemMap.has(code)) {
        const price =
          customPriceMap[code] !== undefined
            ? customPriceMap[code]
            : mat.unitPrice !== undefined && mat.unitPrice > 0
            ? mat.unitPrice
            : getEstimatedMarketPrice(code, mat.category, mat.description);

        itemMap.set(code, {
          code,
          description: mat.description,
          unit: mat.unit || "UN",
          category: mat.category || inferCategory(mat.description, code),
          unitPrice: price,
          inProject: true,
        });
      }
    });

    // Return strictly sorted in ALPHABETICAL order by description (A-Z)
    return Array.from(itemMap.values()).sort((a, b) =>
      a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" })
    );
  }, [apiRecords, materials, customPriceMap]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    const cleanSearch = priceSearchTerm.toLowerCase().trim();
    if (!cleanSearch) return registeredItems;
    return registeredItems.filter((item) => {
      return (
        item.code.toLowerCase().includes(cleanSearch) ||
        item.description.toLowerCase().includes(cleanSearch)
      );
    });
  }, [registeredItems, priceSearchTerm]);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [priceSearchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  if (!isOpen) return null;

  // Save updated unit price for a material code
  const handleSaveRegisteredPrice = (code: string, newPrice: number) => {
    const validPrice = Math.max(0, Number(newPrice) || 0);
    setCustomPriceMap((prev) => ({ ...prev, [code]: validPrice }));

    // Apply to project materials list
    const updated = materials.map((item) => {
      if (item.code === code) {
        return {
          ...item,
          unitPrice: validPrice,
        };
      }
      return item;
    });
    onUpdateMaterial(updated);
    setEditingPriceCode(null);
  };

  // Reset custom price to market average
  const handleResetRegisteredPrice = (code: string, category: string, description: string) => {
    const marketPrice = getEstimatedMarketPrice(code, category, description);
    setCustomPriceMap((prev) => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });

    const updated = materials.map((item) => {
      if (item.code === code) {
        return {
          ...item,
          unitPrice: marketPrice,
        };
      }
      return item;
    });
    onUpdateMaterial(updated);
    setEditingPriceCode(null);
  };

  // Restore market estimates for all items
  const handleRestoreAllMarketPrices = () => {
    setCustomPriceMap({});
    const updated = materials.map((item) => ({
      ...item,
      unitPrice: getEstimatedMarketPrice(item.code, item.category, item.description),
    }));
    onUpdateMaterial(updated);
  };

  // Print registered price list
  const handlePrintRegisteredPriceList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = filteredItems
      .map(
        (item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; background-color: #f8fafc;">${item.code}</td>
          <td>${item.description}</td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: center; font-size: 10px; font-weight: bold;">${item.category}</td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">
            ${item.unitPrice > 0 ? (Number(item.unitPrice) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
          </td>
        </tr>
      `
      )
      .join("");

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tabela de Preços Unitários Cadastrados - CEMIG (1.558 Itens Oficiais)</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 12mm 10mm;
            }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; font-size: 10px; width: 100%; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 16px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 10px; color: #475569; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; page-break-after: auto; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; font-size: 9.5px; }
            th { background-color: #f1f5f9; font-weight: bold; font-size: 9px; text-transform: uppercase; color: #334155; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            thead { display: table-header-group; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .summary-box { margin-top: 15px; border-top: 2px solid #0f172a; padding-top: 8px; text-align: right; font-weight: bold; font-size: 11px; color: #0f172a; }
            .footer { margin-top: 25px; font-size: 9px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">TABELA DE PREÇOS UNITÁRIOS CADASTRADOS</div>
            </div>
            <div style="text-align: right; font-size: 10px;">
              <div><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</div>
              <div><strong>Total de Itens:</strong> ${filteredItems.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 15%;">Código</th>
                <th style="width: 47%;">Descrição do Material / Serviço Cadastrado</th>
                <th style="width: 8%; text-align: center;">Unid.</th>
                <th style="width: 10%; text-align: center;">Categoria</th>
                <th style="width: 15%; text-align: right;">Preço Unit. (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            TOTAL DE ITENS CADASTRADOS LISTADOS: ${filteredItems.length}
          </div>

          <div class="footer">
            Relatório Gerado pelo Sistema de Análise e Projetos CEMIG - ${new Date().toLocaleString("pt-BR")}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printDocument);
    printWindow.document.close();
  };

  return (
    <div
      id="registered-prices-modal"
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-900 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. HEADER BAR */}
      <header className="bg-slate-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold shadow-xs shrink-0">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-xs sm:text-xs text-white tracking-tight">
                Tabela de Preços Unitários Cadastrados (R$)
              </h2>
              {isLoading && (
                <span className="flex items-center gap-1 text-[9px] text-amber-400">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Carregando catálogo...
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Fechar janela (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* 2. FILTER & CONTROLS TOOLBAR */}
      <div className="p-2 sm:p-3 bg-slate-800 border-b border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-prices-input"
            type="text"
            placeholder="Buscar por código ou descrição oficial..."
            value={priceSearchTerm}
            onChange={(e) => setPriceSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 text-white placeholder-slate-400 border border-slate-700 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-amber-500"
          />
          {priceSearchTerm && (
            <button
              onClick={() => setPriceSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Action Buttons: Restore & Print */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full md:w-auto justify-end">
          <button
            onClick={handleRestoreAllMarketPrices}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1 min-h-[30px] text-[11px] font-semibold bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-700 rounded-lg transition-all cursor-pointer text-center"
            title="Restaurar estimativas padrão de mercado para todos os materiais"
          >
            <RefreshCw className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Restaurar</span>
          </button>

          <button
            onClick={handlePrintRegisteredPriceList}
            className="inline-flex items-center justify-center gap-1 px-3 py-1 min-h-[30px] bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs text-center"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span>Imprimir Tabela</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Mobile Card List View */}
          <div className="block md:hidden space-y-2.5">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs">
                Nenhum item cadastrado encontrado para os filtros selecionados.
              </div>
            ) : (
              paginatedItems.map((item, idx) => {
                const isEditingThis = editingPriceCode === item.code;
                const isCustomized = customPriceMap[item.code] !== undefined;
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                return (
                  <div
                    key={`mobile_price_${item.code}_${globalIndex}`}
                    className={`bg-white rounded-xl p-3.5 border shadow-2xs space-y-2.5 ${
                      isEditingThis ? "border-amber-400 bg-amber-50/50" : "border-slate-200"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.inProject && (
                          <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-300 font-bold px-1.5 py-0.5 rounded">
                            No Projeto
                          </span>
                        )}
                        {isCustomized && (
                          <span className="text-[10px] text-emerald-900 bg-emerald-100 border border-emerald-300 font-bold px-1.5 py-0.5 rounded">
                            Valor Editado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description & Unit */}
                    <div className="text-xs font-medium text-slate-900">
                      {item.description}
                      <span className="text-slate-500 font-normal ml-1">({item.unit})</span>
                    </div>

                    {/* Price & Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 bg-slate-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                      <span className="text-xs font-semibold text-slate-500">Valor Unitário:</span>
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editingPriceVal}
                            onChange={(e) => setEditingPriceVal(Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveRegisteredPrice(item.code, editingPriceVal);
                              }
                            }}
                            className="w-24 px-2 py-1 text-xs border-2 border-amber-500 rounded text-right font-mono font-bold bg-white"
                          />
                          <button
                            onClick={() => handleSaveRegisteredPrice(item.code, editingPriceVal)}
                            className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPriceCode(null)}
                            className="p-1 bg-slate-300 text-slate-700 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPriceCode(item.code);
                              setEditingPriceVal(item.unitPrice);
                            }}
                            className="font-mono font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.unitPrice > 0 ? formatCurrency(item.unitPrice) : "R$ 0,00"}</span>
                            <Edit2 className="w-3 h-3 text-amber-800" />
                          </button>
                          {isCustomized && (
                            <button
                              onClick={() => handleResetRegisteredPrice(item.code, item.category, item.description)}
                              className="p-1 text-amber-700 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                              title="Restaurar Preço Padrão"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 uppercase text-[11px] font-bold tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4 w-14 text-center">#</th>
                    <th className="py-3 px-4 w-32">Código</th>
                    <th className="py-3 px-4">Descrição Oficial do Material / Serviço Cadastrado</th>
                    <th className="py-3 px-4 w-20 text-center">Unid.</th>
                    <th className="py-3 px-4 w-32 text-center">Categoria</th>
                    <th className="py-3 px-4 w-44 text-right">Valor Unitário (R$)</th>
                    <th className="py-3 px-4 w-28 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Nenhum item cadastrado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => {
                      const isEditingThis = editingPriceCode === item.code;
                      const isCustomized = customPriceMap[item.code] !== undefined;
                      const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                      return (
                        <tr
                          key={`${item.code}_${globalIndex}`}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isEditingThis ? "bg-amber-100/60" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                            {globalIndex}
                          </td>

                          <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                            <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                              {item.code}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-900 font-medium">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{item.description}</span>
                              {item.inProject && (
                                <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-300 font-bold px-1.5 py-0.5 rounded">
                                  No Projeto
                                </span>
                              )}
                              {isCustomized && (
                                <span className="text-[10px] text-emerald-900 bg-emerald-100 border border-emerald-300 font-bold px-1.5 py-0.5 rounded">
                                  Valor Editado
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center text-slate-600 font-semibold text-xs">
                            {item.unit}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-[10px] uppercase font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                          </td>

                          {/* Editable Price Field */}
                          <td className="py-3 px-4 text-right font-mono">
                            {isEditingThis ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  autoFocus
                                  value={editingPriceVal}
                                  onChange={(e) => setEditingPriceVal(Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveRegisteredPrice(item.code, editingPriceVal);
                                    }
                                  }}
                                  className="w-28 px-2 py-1 text-xs border-2 border-amber-500 rounded text-right focus:outline-none bg-white font-mono font-bold text-slate-900"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPriceCode(item.code);
                                  setEditingPriceVal(item.unitPrice);
                                }}
                                className={`cursor-pointer font-bold px-2.5 py-1 rounded-md transition-colors text-right w-full flex items-center justify-end gap-1.5 ${
                                  item.unitPrice > 0
                                    ? "text-slate-900 hover:bg-amber-200/80 text-sm"
                                    : "text-slate-400 italic hover:bg-slate-200 text-xs"
                                }`}
                                title="Clique para editar o valor unitário"
                              >
                                <span>
                                  {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : "R$ 0,00"}
                                </span>
                                <Edit2 className="w-3 h-3 text-slate-400 hover:text-amber-700" />
                              </button>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-center">
                            {isEditingThis ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSaveRegisteredPrice(item.code, editingPriceVal)}
                                  className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                                  title="Salvar valor unitário"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingPriceCode(null)}
                                  className="p-1.5 text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingPriceCode(item.code);
                                    setEditingPriceVal(item.unitPrice);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Editar Preço Unitário"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {isCustomized && (
                                  <button
                                    onClick={() => handleResetRegisteredPrice(item.code, item.category, item.description)}
                                    className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                                    title="Restaurar Preço Padrão"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
              <div>
                Página <strong className="text-slate-900 font-bold">{currentPage}</strong> de{" "}
                <strong className="text-slate-900 font-bold">{totalPages}</strong> (
                {filteredItems.length.toLocaleString("pt-BR")} itens listados)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. FOOTER BAR */}
      <footer className="p-2.5 sm:p-3 bg-slate-900 text-white border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px] text-center sm:text-left">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Os valores unitários editados nesta tela são sincronizados em tempo real com o orçamento do projeto.
          </span>
        </div>

        {/* PROMINENT BOTTOM CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Concluir</span>
        </button>
      </footer>
    </div>
  );
};
