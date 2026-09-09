import React, { useState, useEffect, useMemo } from "react";
import { IdentifiedStructure, CemigMaterialItem, ItemCodeStatus } from "../types";
import { resolveOfficialMaterialCode, lookupOfficialItem } from "../itemCatalogLookup";
import {
  X,
  Layers,
  Edit3,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Search,
  RotateCcw,
  BookOpen,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  Boxes,
  HelpCircle,
} from "lucide-react";
import officialMnemonicsData from "../../data/mnemonicos_catalogo.json";
import officialItemsData from "../../data/itens_catalogo.json";

interface StructureDetailModalProps {
  isOpen: boolean;
  structure: IdentifiedStructure | null;
  allStructures?: IdentifiedStructure[];
  voltageLevel?: string;
  onClose: () => void;
  onSaveStructure: (
    updatedStructure: IdentifiedStructure,
    applyToAllInstances: boolean
  ) => void;
}

interface ComponentRow {
  id: string;
  code: string;
  codigo?: string | null;
  statusCodigo?: ItemCodeStatus;
  candidatosCodigo?: string[];
  description: string;
  unit: string;
  quantity: number;
  category: CemigMaterialItem["category"];
  status?: "INSTALAR" | "RETIRAR" | "EXISTENTE";
}

export const StructureDetailModal: React.FC<StructureDetailModalProps> = ({
  isOpen,
  structure,
  allStructures = [],
  voltageLevel = "13.8kV",
  onClose,
  onSaveStructure,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [items, setItems] = useState<ComponentRow[]>([]);
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
  const [hasSavedSuccess, setHasSavedSuccess] = useState<boolean>(false);

  // New item form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newCode, setNewCode] = useState<string>("");
  const [newUnit, setNewUnit] = useState<string>("PEÇ");
  const [newQty, setNewQty] = useState<number>(1);
  const [newCategory, setNewCategory] = useState<CemigMaterialItem["category"]>("ESTRUTURA");

  // Count how many times this structure code appears in the project
  const sameCodeStructures = useMemo(() => {
    if (!structure) return [];
    return allStructures.filter((s) => s.code === structure.code);
  }, [allStructures, structure?.code]);

  // Try to find the associated mnemonic in the official catalog
  const associatedMnemonicInfo = useMemo(() => {
    if (!structure) return null;
    const rawCode = (structure.code || "").trim().toUpperCase();
    const map = new Map<string, any>();
    for (const m of (officialMnemonicsData as any[])) {
      map.set(m.codigo.trim().toUpperCase(), m);
    }

    // 1. Direct match
    if (map.has(rawCode)) {
      return map.get(rawCode);
    }

    // 2. Voltage-based prefix match (e.g. CE2 -> CE215110 or CE2.315110 for 15kV)
    const is34 = voltageLevel.includes("34.5") || voltageLevel.includes("35");
    const vKey = is34 ? "36" : "15";
    const candidates = (officialMnemonicsData as any[]).filter((m) =>
      m.codigo.toUpperCase().startsWith(rawCode)
    );
    if (candidates.length > 0) {
      const vMatch = candidates.find((c) => c.codigo.includes(vKey));
      return vMatch || candidates[0];
    }

    // 3. Substring description search (e.g. AF500 -> SI1A)
    const descMatch = (officialMnemonicsData as any[]).find((m) =>
      m.descricao && m.descricao.toUpperCase().includes(rawCode)
    );
    if (descMatch) return descMatch;

    return null;
  }, [structure?.code, voltageLevel]);

  // Load initial materials from structure
  useEffect(() => {
    if (structure) {
      if (structure.computedMaterials && structure.computedMaterials.length > 0) {
        setItems(
          structure.computedMaterials.map((m, idx) => {
            const lookup = lookupOfficialItem(m.description, m.codigo || m.code);
            return {
              id: m.id || `${structure.id}_item_${idx}`,
              code: lookup.codigo || m.code || (m.codigo ? m.codigo : "—"),
              codigo: lookup.codigo || m.codigo,
              statusCodigo: lookup.status,
              candidatosCodigo: lookup.candidatos || m.candidatosCodigo,
              description: m.description,
              unit: m.unit || "PEÇ",
              quantity: m.quantity || 1,
              category: m.category || "ESTRUTURA",
              status: m.status || structure.status || "INSTALAR",
            };
          })
        );
      } else if (associatedMnemonicInfo && associatedMnemonicInfo.componentes) {
        // Auto-load default catalog components if structure has none yet
        setItems(
          associatedMnemonicInfo.componentes.map((c: any, idx: number) => {
            const lookup = lookupOfficialItem(c.material);
            return {
              id: `${structure.id}_cat_${idx}`,
              code: lookup.codigo || c.material,
              codigo: lookup.codigo || null,
              statusCodigo: lookup.status,
              candidatosCodigo: lookup.candidatos,
              description: c.material,
              unit: c.unidade || "PEÇ",
              quantity: Number(c.quantidade) || 1,
              category: "ESTRUTURA",
              status: structure.status || "INSTALAR",
            };
          })
        );
      } else {
        setItems([]);
      }
      setIsEditing(false);
      setShowAddForm(false);
      setHasSavedSuccess(false);
    }
  }, [structure, associatedMnemonicInfo]);

  // Catalog item suggestions for adding new items
  const catalogSuggestions = useMemo(() => {
    if (!searchCatalogQuery.trim() || searchCatalogQuery.length < 2) return [];
    const query = searchCatalogQuery.toUpperCase().trim();
    const records = Array.isArray(officialItemsData)
      ? officialItemsData
      : (officialItemsData as any).registros || [];

    const results: any[] = [];
    for (const r of records) {
      if (
        (r.descricao && r.descricao.toUpperCase().includes(query)) ||
        (r.codigo && r.codigo.includes(query))
      ) {
        results.push(r);
        if (results.length >= 10) break;
      }
    }
    return results;
  }, [searchCatalogQuery]);

  const handleUpdateQuantity = (index: number, newQty: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(0, newQty);
    setItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  const handleSelectSuggestion = (sug: { codigo: string; descricao: string }) => {
    setNewCode(sug.codigo);
    setNewDesc(sug.descricao);
    setSearchCatalogQuery("");
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const structId = structure ? structure.id : "struct";
    const structStatus = structure ? structure.status : "INSTALAR";
    const lookup = lookupOfficialItem(newDesc.trim(), newCode.trim());

    const newItem: ComponentRow = {
      id: `${structId}_custom_${Date.now()}`,
      code: lookup.codigo || newCode.trim() || newDesc.trim(),
      codigo: lookup.codigo || (newCode.trim() ? newCode.trim() : null),
      statusCodigo: lookup.status,
      candidatosCodigo: lookup.candidatos,
      description: newDesc.trim(),
      unit: newUnit.trim().toUpperCase() || "PEÇ",
      quantity: Math.max(1, Number(newQty) || 1),
      category: newCategory,
      status: structStatus || "INSTALAR",
    };

    setItems([...items, newItem]);
    setNewDesc("");
    setNewCode("");
    setNewQty(1);
    setShowAddForm(false);
  };

  const handleRestoreFromCatalog = () => {
    if (!structure || !associatedMnemonicInfo || !associatedMnemonicInfo.componentes) return;
    if (confirm("Deseja restaurar a composição padrão do Catálogo Oficial CEMIG para este mnemônico?")) {
      const structId = structure.id;
      const structStatus = structure.status;
      const restored = associatedMnemonicInfo.componentes.map((c: any, idx: number) => {
        const lookup = lookupOfficialItem(c.material);
        return {
          id: `${structId}_restored_${idx}`,
          code: lookup.codigo || c.material,
          codigo: lookup.codigo || null,
          statusCodigo: lookup.status,
          candidatosCodigo: lookup.candidatos,
          description: c.material,
          unit: c.unidade || "PEÇ",
          quantity: Number(c.quantidade) || 1,
          category: "ESTRUTURA",
          status: structStatus || "INSTALAR",
        };
      });
      setItems(restored);
    }
  };

  const handleSave = () => {
    if (!structure) return;
    const convertedMaterials: CemigMaterialItem[] = items.map((it) => ({
      id: it.id,
      code: it.code,
      codigo: it.codigo,
      statusCodigo: it.statusCodigo,
      candidatosCodigo: it.candidatosCodigo,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      category: it.category,
      status: it.status,
      sourceStructureId: structure.id,
      sourceStructureName: `Estrutura ${structure.code} (${structure.id})`,
    }));

    const updatedStructure: IdentifiedStructure = {
      ...structure,
      computedMaterials: convertedMaterials,
    };

    onSaveStructure(updatedStructure, applyToAll);
    setIsEditing(false);
    setHasSavedSuccess(true);
    setTimeout(() => setHasSavedSuccess(false), 3000);
  };

  if (!isOpen || !structure) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col p-0 sm:p-3 md:p-6 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl w-full max-w-6xl mx-auto flex-1 flex flex-col overflow-hidden max-h-[100dvh] sm:max-h-[94vh]">
        {/* 1. TOP HEADER */}
        <header className="p-3 sm:p-4 md:p-5 bg-slate-900 text-white flex flex-col gap-2.5 shrink-0 border-b border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shrink-0">
                    {structure.type || "ESTRUTURA"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                      structure.status === "INSTALAR"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : structure.status === "RETIRAR"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-700 text-slate-300 border border-slate-600"
                    }`}
                  >
                    {structure.status === "INSTALAR"
                      ? "A INSTALAR"
                      : structure.status === "RETIRAR"
                      ? "A RETIRAR"
                      : "EXISTENTE"}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-mono break-all">
                    Estrutura {structure.code}
                    <span className="text-slate-400 font-sans font-normal text-xs sm:text-sm ml-1.5">
                      ({structure.id})
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-1 break-words line-clamp-2 sm:line-clamp-none">
                  {structure.description || `Composição de materiais da estrutura ${structure.code}`}
                </p>
              </div>
            </div>

            {/* Action & Close buttons at top right */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isEditing ? (
                <button
                  id="btn-edit-structure"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
                  title="Editar materiais e quantidades desta estrutura"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Editar</span>
                </button>
              ) : (
                <button
                  id="btn-save-structure-top"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                  title="Salvar alterações na estrutura e atualizar a lista geral"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Salvar</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer w-8 h-8 flex items-center justify-center"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* 2. METADATA STRIP */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] font-bold block truncate">
                Poste / Local
              </span>
              <span className="font-bold text-slate-800 text-xs sm:text-sm block break-words leading-tight">
                {structure.associatedPost || structure.id}
                {structure.locationHint ? ` · ${structure.locationHint}` : ""}
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] font-bold block truncate">
                Mnemônico CEMIG
              </span>
              <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block text-xs mt-0.5">
                {associatedMnemonicInfo ? associatedMnemonicInfo.codigo : structure.code}
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] font-bold block truncate">
                Ocorrências Projeto
              </span>
              <span className="font-bold text-slate-700 text-xs sm:text-sm block mt-0.5">
                {sameCodeStructures.length} un. de {structure.code}
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] font-bold block truncate">
                Componentes
              </span>
              <span className="font-bold text-slate-800 text-xs sm:text-sm block mt-0.5">
                {items.length} itens ({items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} un.)
              </span>
            </div>
          </div>

          {hasSavedSuccess && (
            <div className="mt-2 flex items-center gap-1.5 p-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Estrutura salva e lista consolidada atualizada!</span>
            </div>
          )}
        </div>

        {/* 3. MAIN COMPOSITION CONTENT (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
          {/* Associated Mnemonic Banner */}
          {associatedMnemonicInfo && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-slate-900">
                    Mnemônico: {associatedMnemonicInfo.codigo}
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    Catálogo CEMIG
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] break-words">
                  {associatedMnemonicInfo.descricao}
                </p>
              </div>

              {isEditing && (
                <button
                  onClick={handleRestoreFromCatalog}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
                  title="Recarregar os itens padrão cadastrados para este mnemônico"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Restaurar Padrão</span>
                </button>
              )}
            </div>
          )}

          {/* Edit Mode Notice & Add Item Trigger */}
          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950">
              <div className="flex items-start sm:items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-relaxed">
                  <strong>Modo de Edição:</strong> Altere quantidades, exclua componentes ou adicione novos materiais.
                </span>
              </div>
              <button
                id="btn-add-item-to-structure"
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddForm ? "Fechar Formulário" : "Adicionar Material"}</span>
              </button>
            </div>
          )}

          {/* New Item Form */}
          {isEditing && showAddForm && (
            <form
              onSubmit={handleAddNewItem}
              className="p-3 sm:p-4 bg-white border-2 border-amber-400 rounded-xl shadow-md space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-600" />
                  Adicionar Componente à Estrutura {structure.code}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {/* Search catalog shortcut */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Buscar no Catálogo Oficial de Itens CEMIG (Opcional)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchCatalogQuery}
                    onChange={(e) => setSearchCatalogQuery(e.target.value)}
                    placeholder="Digite nome ou código..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {catalogSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {catalogSuggestions.map((sug, sIdx) => (
                      <button
                        key={`sug_${sug.codigo}_${sIdx}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className="w-full text-left p-2.5 hover:bg-amber-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="font-medium text-slate-800 truncate">{sug.descricao}</span>
                        <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                          {sug.codigo}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Código CEMIG
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex: 229658"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Descrição do Material *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Ex: PARAFUSO M16 X 200MM"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Unidade
                    </label>
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    >
                      <option value="PEÇ">PEÇ</option>
                      <option value="UN">UN</option>
                      <option value="M">M</option>
                      <option value="CJ">CJ</option>
                      <option value="G">G</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Qtd.
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={newQty}
                      onChange={(e) => setNewQty(Number(e.target.value) || 1)}
                      className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    >
                    </input>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incluir</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. MATERIALS PRESENTATION (Responsive Cards on Mobile + Table on Desktop) */}
          {items.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                Nenhum componente cadastrado individualmente para esta estrutura.
              </p>
              {associatedMnemonicInfo && (
                <button
                  onClick={handleRestoreFromCatalog}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Carregar Componentes do Mnemônico {associatedMnemonicInfo.codigo}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW (Screen < md) - Never gets cut off */}
              <div className="block md:hidden space-y-2.5">
                {items.map((it, idx) => {
                  const totalQty = (Number(it.quantity) || 0) * sameCodeStructures.length;
                  return (
                    <div
                      key={`m_comp_${it.id || idx}`}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                    >
                      {/* Card Header: Index, Code badge, Unit badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded truncate bg-slate-100 text-slate-900 border border-slate-200">
                            {resolveOfficialMaterialCode(it)}
                          </span>
                        </div>
                        <span className="font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {it.unit}
                        </span>
                      </div>

                      {/* Material Description */}
                      <p className="text-xs font-semibold text-slate-900 leading-snug break-words">
                        {it.description}
                      </p>

                      {/* Bottom Controls / Quantities */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Qtd:</span>
                              <div className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50/50 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(idx, Math.max(0, it.quantity - 1))}
                                  className="w-8 h-8 rounded-md bg-white hover:bg-slate-100 active:scale-90 text-slate-800 font-black flex items-center justify-center text-sm shadow-2xs border border-slate-200"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(idx, Number(e.target.value) || 0)
                                  }
                                  className="w-12 h-8 text-center font-mono font-bold text-xs bg-transparent focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(idx, it.quantity + 1)}
                                  className="w-8 h-8 rounded-md bg-white hover:bg-slate-100 active:scale-90 text-slate-800 font-black flex items-center justify-center text-sm shadow-2xs border border-slate-200"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {sameCodeStructures.length > 1 && (
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  Total: {totalQty}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(idx)}
                                className="w-8 h-8 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-90 flex items-center justify-center border border-rose-200"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-slate-500">
                              Qtd. Unitária: <strong className="text-slate-900 font-mono text-sm">{it.quantity} {it.unit}</strong>
                            </span>
                            {sameCodeStructures.length > 1 && (
                              <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                Total ({sameCodeStructures.length}x): <strong className="text-slate-900">{totalQty} {it.unit}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (Screen >= md) - With overflow scroll */}
              <div className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-800 text-white font-bold border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-32">Código Oficial</th>
                      <th className="py-2.5 px-3">Descrição do Material / Componente</th>
                      <th className="py-2.5 px-3 w-20 text-center">Unidade</th>
                      <th className="py-2.5 px-3 w-32 text-right">
                        {isEditing ? "Qtd. Estrutura" : "Qtd. Unitária"}
                      </th>
                      {sameCodeStructures.length > 1 && (
                        <th className="py-2.5 px-3 w-28 text-right bg-slate-900/50">
                          Qtd. Total ({sameCodeStructures.length}x)
                        </th>
                      )}
                      {isEditing && (
                        <th className="py-2.5 px-3 w-16 text-center">Excluir</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.map((it, idx) => {
                      const totalQty = (Number(it.quantity) || 0) * sameCodeStructures.length;
                      return (
                        <tr
                          key={`comp_${it.id || idx}`}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded inline-block bg-slate-100 text-slate-900 border border-slate-200">
                              {resolveOfficialMaterialCode(it)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium leading-normal break-words">
                            {it.description}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-bold text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {it.unit}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isEditing ? (
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(idx, Math.max(0, it.quantity - 1))}
                                  className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(idx, Number(e.target.value) || 0)
                                  }
                                  className="w-14 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-amber-50 border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(idx, it.quantity + 1)}
                                  className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {it.quantity}
                              </span>
                            )}
                          </td>
                          {sameCodeStructures.length > 1 && (
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 bg-slate-50/50">
                              {totalQty}
                            </td>
                          )}
                          {isEditing && (
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remover este componente da estrutura"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* 5. BOTTOM FOOTER BAR */}
        <footer className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center text-xs text-slate-600">
            {isEditing && sameCodeStructures.length > 1 && (
              <label className="w-full sm:w-auto flex items-center gap-2 cursor-pointer select-none font-medium text-slate-800 bg-white p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-300 shadow-2xs">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs leading-tight">
                  Aplicar a todas as <strong>{sameCodeStructures.length} ocorrências</strong> de {structure.code}
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar e Consolidar</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Estrutura</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Fechar Janela
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
