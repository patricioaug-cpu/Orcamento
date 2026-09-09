import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { StructureComposition, CemigMaterialItem } from "../types";
import { CEMIG_STRUCTURE_COMPOSITIONS, CEMIG_CATALOG } from "../cemigDatabase";
import {
  X,
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  FileSpreadsheet,
  Upload,
  Boxes,
  Check,
  ChevronRight,
  ArrowDown,
  Layers,
  FileText,
  Sparkles,
  Download,
  PackagePlus,
  ArrowRight,
} from "lucide-react";

interface KitExploderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMaterialsToProject: (materialsToAdd: CemigMaterialItem[]) => void;
}

interface CartItem {
  mnemonic: string;
  name: string;
  quantity: number;
}

interface ExplodedDetailRow {
  mnemonic: string;
  mnemonicName: string;
  code: string;
  description: string;
  unit: string;
  qtyPerUnit: number;
  requestedQty: number;
  totalQty: number;
  sheetSource?: string;
}

interface ExplodedSummaryRow {
  code: string;
  description: string;
  unit: string;
  totalQty: number;
}

export const KitExploderModal: React.FC<KitExploderModalProps> = ({
  isOpen,
  onClose,
  onAddMaterialsToProject,
}) => {
  // Merge built-in compositions with any uploaded custom Excel compositions
  const [customCompositions, setCustomCompositions] = useState<
    Record<string, StructureComposition>
  >({});

  const allCompositions = useMemo(() => {
    return { ...CEMIG_STRUCTURE_COMPOSITIONS, ...customCompositions };
  }, [customCompositions]);

  // UI state & Ref
  const detailsRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMne, setSelectedMne] = useState<string>("N1");
  const [selectedQtyInput, setSelectedQtyInput] = useState<number>(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"SEARCH" | "CART" | "EXPLODED">(
    "SEARCH"
  );
  const [explodedSubTab, setExplodedSubTab] = useState<"SUMMARY" | "DETAILS">(
    "SUMMARY"
  );
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSelectMne = (mne: string) => {
    setSelectedMne(mne);
    setImportStatus(`Kit [${mne}] selecionado. Detalhes exibidos abaixo.`);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  // Filtered list of mnemonics
  const filteredMnemonics = Object.keys(allCompositions).filter((mne) => {
    const comp = allCompositions[mne];
    const term = searchTerm.toLowerCase();
    return (
      mne.toLowerCase().includes(term) ||
      comp.structureName.toLowerCase().includes(term) ||
      comp.items.some(
        (i) =>
          i.description.toLowerCase().includes(term) ||
          i.code.toLowerCase().includes(term)
      )
    );
  });

  // Current selected composition
  const currentComp = allCompositions[selectedMne] || null;

  // Cart operations
  const handleAddToCart = (mne: string, qtyToAdd: number) => {
    if (qtyToAdd <= 0) return;
    setCart((prev) => ({
      ...prev,
      [mne]: (prev[mne] || 0) + qtyToAdd,
    }));
    setImportStatus(`✅ Kit [${mne}] (+${qtyToAdd}) adicionado ao carrinho de kits!`);
  };

  const handleUpdateCartQty = (mne: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(mne);
      return;
    }
    setCart((prev) => ({ ...prev, [mne]: newQty }));
  };

  const handleRemoveFromCart = (mne: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[mne];
      return next;
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  // Compute exploded list
  const { explodedDetails, explodedSummary, totalCartKits } = useMemo(() => {
    const details: ExplodedDetailRow[] = [];
    const summaryMap: Record<string, ExplodedSummaryRow> = {};
    let totalKits = 0;

    Object.entries(cart).forEach(([mne, rawQty]) => {
      const requestedQty = Number(rawQty) || 0;
      if (requestedQty <= 0) return;
      totalKits += requestedQty;
      const comp = allCompositions[mne];
      if (!comp) return;

      comp.items.forEach((item) => {
        const totalQty = item.qtyPerUnit * requestedQty;

        // Detail row
        details.push({
          mnemonic: mne,
          mnemonicName: comp.structureName,
          code: item.code,
          description: item.description,
          unit: item.unit,
          qtyPerUnit: item.qtyPerUnit,
          requestedQty,
          totalQty,
        });

        // Summary row aggregation
        const key = `${item.code}_${item.description}_${item.unit}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            code: item.code,
            description: item.description,
            unit: item.unit,
            totalQty: 0,
          };
        }
        summaryMap[key].totalQty += totalQty;
      });
    });

    const summaryList = Object.values(summaryMap).sort((a, b) =>
      a.description.localeCompare(b.description)
    );

    return {
      explodedDetails: details,
      explodedSummary: summaryList,
      totalCartKits: totalKits,
    };
  }, [cart, allCompositions]);

  if (!isOpen) return null;

  // Handle uploading a custom Excel file with Kits/Mnemonics (.xlsx, .xls)
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("Processando planilha...");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const importedKits: Record<string, StructureComposition> = {};
        let totalItemsImported = 0;

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
            defval: "",
          });

          if (jsonData.length === 0) return;

          // Find relevant column keys dynamically
          const sampleRow = jsonData[0];
          const colKeys = Object.keys(sampleRow);

          const findCol = (keywords: string[]) =>
            colKeys.find((key) =>
              keywords.some((kw) => key.toLowerCase().includes(kw))
            );

          const mneCol = findCol(["mne", "mnemonico", "poste", "kit", "estrutura", "codigo"]);
          const descCol = findCol(["desc", "material", "item", "discriminacao"]);
          const unitCol = findCol(["uni", "unid", "medida"]);
          const qtyCol = findCol(["qtde", "qtd", "por poste", "quantidade"]);

          let currentMne = "";

          jsonData.forEach((row) => {
            let rawMne = mneCol ? String(row[mneCol]).trim() : "";
            let rawDesc = descCol ? String(row[descCol]).trim() : "";
            let rawUnit = unitCol ? String(row[unitCol]).trim() : "UN";
            let rawQty = qtyCol ? parseFloat(String(row[qtyCol]).replace(",", ".")) : 1;

            if (isNaN(rawQty) || rawQty <= 0) rawQty = 1;

            // Forward-fill mnemonic if empty (handles merged cells)
            if (rawMne) {
              currentMne = rawMne;
            } else {
              rawMne = currentMne;
            }

            if (!rawMne || !rawDesc) return;

            if (!importedKits[rawMne]) {
              importedKits[rawMne] = {
                structureCode: rawMne,
                structureName: `Kit ${rawMne} (Importado da aba ${sheetName})`,
                type: "MT",
                items: [],
              };
            }

            importedKits[rawMne].items.push({
              code: `IMP-${Math.floor(Math.random() * 899999 + 100000)}`,
              description: rawDesc.toUpperCase(),
              unit: rawUnit.toUpperCase(),
              qtyPerUnit: rawQty,
            });

            totalItemsImported++;
          });
        });

        if (Object.keys(importedKits).length > 0) {
          setCustomCompositions((prev) => ({ ...prev, ...importedKits }));
          setImportStatus(
            `Sucesso! ${Object.keys(importedKits).length} kits importados (${totalItemsImported} itens).`
          );
        } else {
          setImportStatus(
            "Nenhum kit identificado com colunas válidas (Mnemônico, Descrição, Qtd)."
          );
        }
      } catch (err) {
        console.error(err);
        setImportStatus("Erro ao ler arquivo Excel. Verifique a estrutura.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Push exploded materials into current project
  const handleIntegrateToProject = () => {
    if (explodedSummary.length === 0) return;

    const materialsToAdd: CemigMaterialItem[] = explodedSummary.map((item, idx) => ({
      id: `kit-exp-${Date.now()}-${idx}`,
      code: item.code || "KIT",
      description: item.description,
      unit: item.unit,
      quantity: item.totalQty,
      category: "ESTRUTURA",
    }));

    onAddMaterialsToProject(materialsToAdd);
    onClose();
  };

  // Export Exploded Kits to Excel file (.xlsx)
  const handleExportExplodedExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Resumo
    const resumoData = explodedSummary.map((item, idx) => ({
      "Item N°": idx + 1,
      "Código": item.code,
      "Descrição do Material": item.description,
      "Unidade": item.unit,
      "Quantidade Total Explodida": item.totalQty,
    }));
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo Consolidado");

    // Sheet 2: Detalhes Explodidos por Mnemônico
    const detalhesData = explodedDetails.map((item, idx) => ({
      "N°": idx + 1,
      "Mnemônico / Kit": item.mnemonic,
      "Nome do Kit": item.mnemonicName,
      "Código Item": item.code,
      "Descrição do Material": item.description,
      "Unidade": item.unit,
      "Qtde por Kit": item.qtyPerUnit,
      "Qtde Kits Solicitados": item.requestedQty,
      "Qtde Total": item.totalQty,
    }));
    const wsDetalhes = XLSX.utils.json_to_sheet(detalhesData);
    XLSX.utils.book_append_sheet(workbook, wsDetalhes, "Detalhes Explodidos");

    XLSX.writeFile(
      workbook,
      `Explosao_Kits_Materiais_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-md">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Explosão & Calculadora de Kits
              </h2>
              <p className="text-xs text-slate-400">
                Seleção de mnemônicos, multiplicação por quantidade e desmembramento total de materiais
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="bg-slate-100 border-b border-slate-200 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("SEARCH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "SEARCH"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>1. Catálogo & Mnemônicos</span>
            </button>

            <button
              onClick={() => setActiveTab("CART")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                activeTab === "CART"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>2. Carrinho de Kits</span>
              {totalCartKits > 0 && (
                <span className="bg-orange-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                  {totalCartKits}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("EXPLODED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "EXPLODED"
                  ? "bg-white text-orange-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Explosão de Materiais ({explodedSummary.length})</span>
            </button>
          </div>

          {/* Import Custom Excel Kits File */}
          <div className="flex items-center gap-2">
            <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all">
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Kits Excel (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status Notification */}
        {importStatus && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900 font-medium flex items-center justify-between">
            <span>{importStatus}</span>
            <button
              onClick={() => setImportStatus(null)}
              className="text-amber-700 font-bold hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Modal Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: SEARCH & INSPECT MNEMONICS */}
          {activeTab === "SEARCH" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
              {/* Left Column: Mnemonic List with Filter */}
              <div className="md:col-span-5 flex flex-col gap-3 border-r border-slate-200 pr-0 md:pr-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Pesquisar kit (ex: N1, CE3, Trafo, Cabo)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between px-1">
                  <span>Mnemônico / Código</span>
                  <span>{filteredMnemonics.length} encontrados</span>
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[400px] pr-1">
                  {filteredMnemonics.map((mne) => {
                    const comp = allCompositions[mne];
                    const isSelected = selectedMne === mne;
                    const inCartQty = cart[mne] || 0;

                    return (
                      <div
                        key={mne}
                        onClick={() => handleSelectMne(mne)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer gap-2 ${
                          isSelected
                            ? "bg-orange-50 border-orange-300 ring-2 ring-orange-400/50 text-slate-900 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{mne}</span>
                            {inCartQty > 0 && (
                              <span className="bg-orange-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full">
                                {inCartQty} no carrinho
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {comp.structureName}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(mne, 1);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            title="Adicionar 1 unidade ao carrinho"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Carrinho</span>
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Kit Components Table */}
              <div ref={detailsRef} className="md:col-span-7 flex flex-col justify-between pt-4 md:pt-0 border-t md:border-t-0 border-slate-200 space-y-3">
                {currentComp ? (
                  <div className="space-y-4">
                    {/* Mobile Banner Helper */}
                    <div className="md:hidden bg-orange-100 border border-orange-200 text-orange-950 text-xs font-bold p-2.5 rounded-xl flex items-center justify-between shadow-2xs">
                      <span>Componentes e Ações do Kit [{selectedMne}]</span>
                      <ArrowDown className="w-4 h-4 text-orange-600 animate-bounce" />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                          {currentComp.type || "KIT"}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {currentComp.items.length} componentes no kit
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        [{currentComp.structureCode}] {currentComp.structureName}
                      </h3>
                    </div>

                    {/* Quantity Selector & Add Button */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Quantidade de Kits:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedQtyInput}
                          onChange={(e) =>
                            setSelectedQtyInput(Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>

                      <button
                        onClick={() => {
                          handleAddToCart(selectedMne, selectedQtyInput);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar ao Carrinho</span>
                      </button>
                    </div>

                    {/* Components Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Descrição do Material</th>
                            <th className="py-2.5 px-3 text-center">Unid.</th>
                            <th className="py-2.5 px-3 text-right">Qtd / Kit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {currentComp.items.map((item, idx) => (
                            <tr
                              key={`kit_item_${item.code}_${idx}`}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-2 px-3 font-mono text-slate-600 font-semibold">
                                {item.code}
                              </td>
                              <td className="py-2 px-3 text-slate-800 font-medium">
                                {item.description}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600 font-bold">
                                {item.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {item.qtyPerUnit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    Selecione um mnemônico na lista ao lado.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CART VIEW */}
          {activeTab === "CART" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Carrinho de Kits Selecionados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Abaixo estão listados todos os kits adicionados para explosão.
                  </p>
                </div>

                {Object.keys(cart).length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Esvaziar Carrinho</span>
                  </button>
                )}
              </div>

              {Object.keys(cart).length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Seu carrinho de kits está vazio
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vá até a aba "Catálogo & Mnemônicos" para pesquisar e adicionar kits.
                  </p>
                  <button
                    onClick={() => setActiveTab("SEARCH")}
                    className="mt-4 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span>Explorar Mnemônicos</span>
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Mnemônico</th>
                        <th className="py-3 px-4">Nome do Kit / Estrutura</th>
                        <th className="py-3 px-4 text-center">Componentes</th>
                        <th className="py-3 px-4 text-center w-36">Qtde Solicitada</th>
                        <th className="py-3 px-4 text-right w-24">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.entries(cart).map(([mne, qty]) => {
                        const comp = allCompositions[mne];
                        return (
                          <tr key={mne} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {mne}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {comp?.structureName || "Kit Personalizado"}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">
                              {comp?.items.length || 0} itens
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) =>
                                  handleUpdateCartQty(
                                    mne,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleRemoveFromCart(mne)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {Object.keys(cart).length > 0 && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveTab("EXPLODED")}
                    className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                  >
                    <span>Ver Explosão de Materiais ({explodedSummary.length} itens)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPLODED VIEW (RESUMO & DETALHES) */}
          {activeTab === "EXPLODED" && (
            <div className="space-y-4">
              {/* Explosão Sub-Tabs & Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExplodedSubTab("SUMMARY")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      explodedSubTab === "SUMMARY"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
                    }`}
                  >
                    Resumo Consolidado ({explodedSummary.length} materiais)
                  </button>

                  <button
                    onClick={() => setExplodedSubTab("DETAILS")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      explodedSubTab === "DETAILS"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
                    }`}
                  >
                    Detalhes Explodidos por Kit ({explodedDetails.length} linhas)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportExplodedExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Exportar Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={handleIntegrateToProject}
                    className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>Adicionar à Lista do Projeto</span>
                  </button>
                </div>
              </div>

              {/* SubTab 1: RESUMO CONSOLIDADO */}
              {explodedSubTab === "SUMMARY" && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 w-28">Código</th>
                        <th className="py-2.5 px-3">Descrição do Material</th>
                        <th className="py-2.5 px-3 text-center w-24">Unidade</th>
                        <th className="py-2.5 px-3 text-right w-32">
                          Quantidade Total Explodida
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {explodedSummary.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-slate-400 italic"
                          >
                            Nenhum kit no carrinho para explodir.
                          </td>
                        </tr>
                      ) : (
                        explodedSummary.map((item, idx) => (
                          <tr
                            key={`expl_sum_${item.code}_${idx}`}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                              {item.code}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.description}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                              {item.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-orange-600 text-sm">
                              {item.totalQty % 1 === 0
                                ? item.totalQty
                                : item.totalQty.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SubTab 2: DETALHES EXPLODIDOS POR KIT */}
              {explodedSubTab === "DETAILS" && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-24">Kit / Mne</th>
                        <th className="py-2.5 px-3 w-28">Código Item</th>
                        <th className="py-2.5 px-3">Descrição do Material</th>
                        <th className="py-2.5 px-3 text-center w-20">Unid.</th>
                        <th className="py-2.5 px-3 text-right w-24">Qtd/Kit</th>
                        <th className="py-2.5 px-3 text-right w-24">Qtd Solicitada</th>
                        <th className="py-2.5 px-3 text-right w-28">Qtd Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {explodedDetails.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-slate-400 italic"
                          >
                            Nenhum item explodido.
                          </td>
                        </tr>
                      ) : (
                        explodedDetails.map((item, idx) => (
                          <tr
                            key={`expl_det_${item.mnemonic}_${item.code}_${idx}`}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2 px-3 font-mono font-bold text-orange-600">
                              {item.mnemonic}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600 font-semibold">
                              {item.code}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {item.description}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-600">
                              {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {item.qtyPerUnit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {item.requestedQty}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {item.totalQty % 1 === 0
                                ? item.totalQty
                                : item.totalQty.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 sm:px-6 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              Multiplicação automática (QTDE_POR_POSTE * QTDE_SOLICITADA) integrada com exportação Excel.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
