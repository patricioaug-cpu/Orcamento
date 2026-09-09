import React, { useState } from "react";
import { LaborItem, NetworkEnvironment } from "../types";
import {
  OfficialLaborCatalogItem,
  getLaborCatalogForType,
  formatLaborDescriptionForType,
} from "../data/laborCatalog";
import {
  Briefcase,
  DollarSign,
  Edit2,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Building2,
  Trees,
} from "lucide-react";

interface LaborSheetProps {
  laborItems: LaborItem[];
  usUnitPrice: number;
  totalUS: number;
  totalLaborValue: number;
  totalMaterialsValue?: number;
  totalProjectValue?: number;
  networkType?: NetworkEnvironment;
  onUpdateNetworkType?: (newType: NetworkEnvironment) => void;
  onUpdateLaborItems: (items: LaborItem[]) => void;
  onUpdateUsUnitPrice: (newPrice: number) => void;
  onRecalculateFromProject?: () => void;
}

export const LaborSheet: React.FC<LaborSheetProps> = ({
  laborItems,
  usUnitPrice,
  totalUS,
  totalLaborValue,
  totalMaterialsValue = 0,
  totalProjectValue = 0,
  networkType = "RDU" as NetworkEnvironment,
  onUpdateNetworkType,
  onUpdateLaborItems,
  onUpdateUsUnitPrice,
  onRecalculateFromProject,
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(usUnitPrice.toString());
  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  const effectiveNetType: NetworkEnvironment = networkType === "RDR" ? "RDR" : "RDU";
  const currentCatalog = getLaborCatalogForType(effectiveNetType);

  // Handle saving new US unit price
  const handleSavePrice = () => {
    const val = parseFloat(tempPrice.replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      onUpdateUsUnitPrice(Number(val.toFixed(2)));
      setIsEditingPrice(false);
    }
  };

  // Inline quantity update for an item
  const handleUpdateItemQuantity = (itemNum: number, newQty: number) => {
    const qty = Math.max(0, Number(newQty) || 0);
    if (qty === 0) {
      // Remove item
      const updated = laborItems.filter((i) => i.item !== itemNum);
      onUpdateLaborItems(updated);
    } else {
      const updated = laborItems.map((i) => {
        if (i.item === itemNum) {
          const itemTotalUS = Number((qty * i.usUnit).toFixed(3));
          const totalValue = Number((itemTotalUS * usUnitPrice).toFixed(2));
          return {
            ...i,
            quantity: qty,
            totalUS: itemTotalUS,
            totalValue,
          };
        }
        return i;
      });
      onUpdateLaborItems(updated);
    }
  };

  // Add an item from the official catalog items (adjusted for RDR/RDU)
  const handleAddCatalogItem = (catItem: OfficialLaborCatalogItem) => {
    const formattedDesc = formatLaborDescriptionForType(catItem.description, effectiveNetType);
    const existing = laborItems.find((i) => i.item === catItem.item);
    if (existing) {
      handleUpdateItemQuantity(catItem.item, existing.quantity + 1);
    } else {
      const qty = 1;
      const itemTotalUS = Number((qty * catItem.usUnit).toFixed(3));
      const totalValue = Number((itemTotalUS * usUnitPrice).toFixed(2));
      const newItem: LaborItem = {
        item: catItem.item,
        code: catItem.code,
        description: formattedDesc,
        unit: catItem.unit,
        usUnit: catItem.usUnit,
        quantity: qty,
        totalUS: itemTotalUS,
        usUnitPrice,
        totalValue,
        category: catItem.category,
      };
      const updated = [...laborItems, newItem].sort((a, b) => a.item - b.item);
      onUpdateLaborItems(updated);
    }
    setShowCatalogModal(false);
  };

  // Remove an item
  const handleRemoveItem = (itemNum: number) => {
    const updated = laborItems.filter((i) => i.item !== itemNum);
    onUpdateLaborItems(updated);
  };

  // Filter items in table
  const filteredItems = laborItems.filter((i) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      i.code.toLowerCase().includes(s) ||
      i.description.toLowerCase().includes(s) ||
      i.unit.toLowerCase().includes(s)
    );
  });

  const filteredCatalog = currentCatalog.filter((cat) => {
    if (!catalogSearch.trim()) return true;
    const s = catalogSearch.toLowerCase();
    return (
      cat.item.toString().includes(s) ||
      cat.description.toLowerCase().includes(s) ||
      cat.unit.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* 0. NETWORK ENVIRONMENT SELECTOR (RDU vs RDR) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 font-black rounded-xl shadow-xs shrink-0">
            {networkType === "RDR" ? (
              <Trees className="w-5 h-5 text-slate-950" />
            ) : (
              <Building2 className="w-5 h-5 text-slate-950" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Padrão de Rede da Mão de Obra
              </span>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
                {networkType === "RDR" ? "RDR - Rede de Distribuição Rural" : "RDU - Rede de Distribuição Urbana"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Alterne entre <strong>RDU</strong> e <strong>RDR</strong> para carregar as descrições e cruzamentos correspondentes. Atividades sem especificação de rede aplicam-se igualmente a ambos.
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => onUpdateNetworkType?.("RDU")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              networkType === "RDU"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Rede de Distribuição Urbana: utiliza as descrições de RDU"
          >
            <Building2 className="w-4 h-4" />
            <span>RDU (Urbano)</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateNetworkType?.("RDR")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              networkType === "RDR"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Rede de Distribuição Rural: utiliza as descrições de RDR"
          >
            <Trees className="w-4 h-4" />
            <span>RDR (Rural)</span>
          </button>
        </div>
      </div>

      {/* 1. TOP STATS CARDS: TOTAL US & EDITABLE US UNIT PRICE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL US CARD */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-sm border border-amber-600/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
              Total de US do Projeto
            </span>
            <span className="p-2 bg-white/20 rounded-xl">
              <Briefcase className="w-5 h-5 text-white" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              {totalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              <span className="text-lg font-bold ml-1.5 opacity-90">US</span>
            </div>
            <p className="text-xs text-amber-100 mt-1">
              Consolidação das {laborItems.length} atividades de mão de obra
            </p>
          </div>
        </div>

        {/* EDITABLE US UNIT PRICE CARD */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Preço Unitário da US
            </span>
            <span className="p-2 bg-slate-100 rounded-xl text-slate-700">
              <DollarSign className="w-5 h-5 text-slate-600" />
            </span>
          </div>
          <div className="mt-3">
            {isEditingPrice ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePrice();
                      if (e.key === "Escape") setIsEditingPrice(false);
                    }}
                    autoFocus
                    className="w-full pl-8 pr-2 py-1.5 text-base font-bold text-slate-900 border-2 border-amber-500 rounded-lg focus:outline-none"
                    placeholder="125,00"
                  />
                </div>
                <button
                  onClick={handleSavePrice}
                  title="Salvar novo preço da US"
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingPrice(false)}
                  title="Cancelar"
                  className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {usUnitPrice.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                  <span className="text-xs font-normal text-slate-500 ml-1">/ US</span>
                </div>
                <button
                  onClick={() => {
                    setTempPrice(usUnitPrice.toString());
                    setIsEditingPrice(true);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  title="Editar valor unitário da US"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              {isEditingPrice
                ? "Pressione Enter para salvar"
                : "Clique em Editar para personalizar o valor da US"}
            </p>
          </div>
        </div>

        {/* TOTAL LABOR VALUE (R$) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Valor Total de Mão de Obra
            </span>
            <span className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Briefcase className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalLaborValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US × {usUnitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>

        {/* COMBINED PROJECT VALUE (MATERIALS + LABOR) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Geral do Projeto
            </span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {(totalMaterialsValue + totalLaborValue).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Materiais: {totalMaterialsValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} + M.O.
            </p>
          </div>
        </div>
      </div>

      {/* 2. ACTION BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar atividade por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCatalogModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar da Lista Oficial (42 Itens)</span>
          </button>

          {onRecalculateFromProject && (
            <button
              onClick={onRecalculateFromProject}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              title="Recalcular o cruzamento com as estruturas e cabos do projeto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recalcular do Projeto</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. TABLE OF CONSOLIDATED LABOR ITEMS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-600" />
              Folha de Mão de Obra do Projeto (Atividades em US)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabela oficial cruzada com as estruturas, postes, cabos e equipamentos identificados
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500">Total Acumulado:</span>
            <span className="ml-1.5 text-sm font-black text-amber-600">
              {totalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} US
            </span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhuma atividade de mão de obra listada</p>
            <p className="text-xs text-slate-400 mt-1">
              Clique em &quot;Adicionar da Lista Oficial&quot; ou &quot;Recalcular do Projeto&quot; para carregar as atividades.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">Item</th>
                  <th className="py-3 px-3 w-20">Código</th>
                  <th className="py-3 px-4">Descrição da Atividade / Serviço</th>
                  <th className="py-3 px-3 text-center w-16">Unid.</th>
                  <th className="py-3 px-3 text-right w-24">Qtd. Projeto</th>
                  <th className="py-3 px-3 text-right w-24">US Unit.</th>
                  <th className="py-3 px-3 text-right w-28 bg-amber-50/50">Total US</th>
                  <th className="py-3 px-3 text-right w-28">Preço US</th>
                  <th className="py-3 px-4 text-right w-32 bg-slate-50 font-extrabold">Valor Total (R$)</th>
                  <th className="py-3 px-3 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => (
                  <tr key={item.item} className="hover:bg-slate-50/80 transition-colors">
                    {/* Item Number */}
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {item.item}
                    </td>

                    {/* Code */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {item.code}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.description}
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-3 text-center text-slate-500 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {item.unit}
                      </span>
                    </td>

                    {/* Quantity with inline adjustment */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step={item.unit === "km" ? "0.001" : "1"}
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItemQuantity(item.item, parseFloat(e.target.value))
                        }
                        className="w-20 px-2 py-1 text-right text-xs sm:text-sm font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* US Unit */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {item.usUnit.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Total US */}
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-700 bg-amber-50/40">
                      {item.totalUS.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 3,
                      })}{" "}
                      US
                    </td>

                    {/* Preço Unitário US */}
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-xs">
                      {usUnitPrice.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>

                    {/* Valor Total R$ */}
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 bg-slate-50/50">
                      {item.totalValue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(item.item)}
                        title="Remover atividade"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={6} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider text-slate-600">
                    Totalização Oficial de Mão de Obra do Projeto:
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-base font-black text-amber-800 bg-amber-100/60">
                    {totalUS.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}{" "}
                    US
                  </td>
                  <td className="py-3.5 px-3 text-right text-xs font-mono text-slate-500">
                    {usUnitPrice.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base font-black text-slate-900 bg-slate-200/60">
                    {totalLaborValue.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: ADICIONAR ATIVIDADE DA LISTA OFICIAL (42 ITENS) */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                  Tabela Oficial de Atividades (42 Itens do Arquivo Anexado)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione uma atividade para adicionar ou ajustar na folha de mão de obra
                </p>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por número do item ou descrição..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Catalog List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
              {filteredCatalog.map((cat) => {
                const inList = laborItems.find((i) => i.item === cat.item);
                return (
                  <div
                    key={cat.item}
                    className="pt-2.5 pb-2 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                        #{cat.item}
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900">
                          {cat.description}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Unidade: <strong>{cat.unit}</strong></span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">
                            {cat.usUnit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} US
                          </span>
                          {inList && (
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold text-[10px]">
                              Já incluído ({inList.quantity} {cat.unit})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddCatalogItem(cat)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      {inList ? "+ 1 Qtd" : "Adicionar"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
