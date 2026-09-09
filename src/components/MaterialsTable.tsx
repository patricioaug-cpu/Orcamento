import React, { useState, useMemo, useEffect } from "react";
import { CemigMaterialItem, IdentifiedStructure, GroupedMnemonic, CableSegment, LaborItem, NetworkEnvironment } from "../types";
import { getEstimatedMarketPrice, CEMIG_CATALOG, getMnemonicForCable } from "../cemigDatabase";
import { resolveOfficialMaterialCode } from "../itemCatalogLookup";
import { calculateProjectLabor } from "../services/laborService";
import { DEFAULT_US_UNIT_PRICE } from "../data/laborCatalog";
import { LaborSheet } from "./LaborSheet";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  FileText,
  Boxes,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Zap,
  Info,
  DollarSign,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Percent,
  TrendingUp,
  Filter,
  SlidersHorizontal,
  Briefcase,
  Ruler,
  CheckCircle2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FullScreenExplodedView } from "./FullScreenExplodedView";

interface MaterialsTableProps {
  materials: CemigMaterialItem[];
  groupedMnemonics?: GroupedMnemonic[];
  structures: IdentifiedStructure[];
  onUpdateMaterial: (updated: CemigMaterialItem[]) => void;
  onSelectStructureAudit: (structure: IdentifiedStructure) => void;
  onClearData?: () => void;
  onOpenRegisteredPrices?: () => void;
  profitMargin?: number;
  onProfitMarginChange?: (margin: number) => void;
  cables?: CableSegment[];
  onUpdateCables?: (cables: CableSegment[]) => void;
  voltageLevel?: string;
  networkType?: NetworkEnvironment;
  onUpdateNetworkType?: (newType: NetworkEnvironment) => void;
  laborItems?: LaborItem[];
  onUpdateLaborItems?: (items: LaborItem[]) => void;
  usUnitPrice?: number;
  onUpdateUsUnitPrice?: (newPrice: number) => void;
  onRecalculateLabor?: () => void;
  isFullScreenExploded?: boolean;
  onToggleFullScreenExploded?: (open: boolean) => void;
  projectName?: string;
}

export const MaterialsTable: React.FC<MaterialsTableProps> = ({
  materials,
  groupedMnemonics = [],
  structures,
  onUpdateMaterial,
  onSelectStructureAudit,
  onClearData,
  onOpenRegisteredPrices,
  profitMargin,
  onProfitMarginChange,
  cables = [],
  onUpdateCables,
  voltageLevel = "13.8kV",
  networkType = "RDU" as NetworkEnvironment,
  onUpdateNetworkType,
  laborItems,
  onUpdateLaborItems,
  usUnitPrice,
  onUpdateUsUnitPrice,
  onRecalculateLabor,
  isFullScreenExploded: isFullScreenExplodedProp,
  onToggleFullScreenExploded,
  projectName,
}) => {
  const [activeTab, setActiveTab] = useState<"MNEMONICS" | "EXPLODED" | "CABLES" | "RETIRAR" | "LABOR">("EXPLODED");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("TODOS");
  const [expandedMnemonic, setExpandedMnemonic] = useState<string | null>(null);

  const effectiveNetType: NetworkEnvironment = networkType === "RDR" ? "RDR" : "RDU";

  // Fallback calculation of Labor from project structures/cables
  const fallbackLabor = useMemo(() => {
    return calculateProjectLabor(
      {
        structures,
        cables,
        voltageLevel: voltageLevel as any,
        networkType: effectiveNetType,
      },
      usUnitPrice !== undefined ? usUnitPrice : DEFAULT_US_UNIT_PRICE,
      effectiveNetType
    );
  }, [structures, cables, voltageLevel, usUnitPrice, effectiveNetType]);

  const effectiveLaborItems = laborItems && laborItems.length > 0 ? laborItems : fallbackLabor.items;
  const effectiveUsUnitPrice = usUnitPrice !== undefined ? usUnitPrice : DEFAULT_US_UNIT_PRICE;
  const effectiveTotalUS = Number(
    effectiveLaborItems.reduce((acc, i) => acc + i.totalUS, 0).toFixed(2)
  );
  const effectiveTotalLaborValue = Number((effectiveTotalUS * effectiveUsUnitPrice).toFixed(2));

  // Profit Margin state (internal fallback or external controlled)
  const [localProfitMargin, setLocalProfitMargin] = useState<number>(profitMargin ?? 0);
  const activeMargin = profitMargin !== undefined ? profitMargin : localProfitMargin;

  const handleProfitMarginChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(1000, Number(val) || 0));
    setLocalProfitMargin(safeVal);
    if (onProfitMarginChange) {
      onProfitMarginChange(safeVal);
    }
  };

  // Price visibility toggle
  const [showPrices, setShowPrices] = useState<boolean>(true);

  // Cable metrics and calculations
  const totalCableMeters = useMemo(() => {
    return cables.reduce((acc, c) => acc + (Number(c.estimatedLengthMeters) || 0), 0);
  }, [cables]);

  const totalCableSpans = useMemo(() => {
    return cables.reduce((acc, c) => acc + (Number(c.spansCount) || 1), 0);
  }, [cables]);

  const totalCableMetersInstall = useMemo(() => {
    return cables
      .filter((c) => c.status !== "RETIRAR")
      .reduce((acc, c) => acc + (Number(c.estimatedLengthMeters) || 0), 0);
  }, [cables]);

  const totalCableMetersRetirar = useMemo(() => {
    return cables
      .filter((c) => c.status === "RETIRAR")
      .reduce((acc, c) => acc + (Number(c.estimatedLengthMeters) || 0), 0);
  }, [cables]);

  // Cable modal states
  const [showCableModal, setShowCableModal] = useState(false);
  const [editingCable, setEditingCable] = useState<CableSegment | null>(null);
  const [cableFormType, setCableFormType] = useState<string>("CAA 1/0 AWG");
  const [cableFormVoltage, setCableFormVoltage] = useState<"MT" | "BT">("MT");
  const [cableFormStatus, setCableFormStatus] = useState<"INSTALAR" | "RETIRAR">("INSTALAR");
  const [cableFormSpans, setCableFormSpans] = useState<number>(3);
  const [cableFormMeters, setCableFormMeters] = useState<number>(105);
  const [cableFormDetail, setCableFormDetail] = useState<string>("");
  const [cableFormNotes, setCableFormNotes] = useState<string>("");

  const handleOpenAddCable = () => {
    setEditingCable(null);
    setCableFormType("CAA 1/0 AWG");
    setCableFormVoltage("MT");
    setCableFormStatus("INSTALAR");
    setCableFormSpans(3);
    setCableFormMeters(105);
    setCableFormDetail("P1-P2 (35m), P2-P3 (35m), P3-P4 (35m)");
    setCableFormNotes("");
    setShowCableModal(true);
  };

  const handleOpenEditCable = (cable: CableSegment) => {
    setEditingCable(cable);
    setCableFormType(cable.cableType || "CAA 1/0 AWG");
    setCableFormVoltage(cable.voltage || "MT");
    setCableFormStatus(cable.status === "RETIRAR" ? "RETIRAR" : "INSTALAR");
    setCableFormSpans(Number(cable.spansCount) || 1);
    setCableFormMeters(Number(cable.estimatedLengthMeters) || 35);
    setCableFormDetail(cable.spansDetail || "");
    setCableFormNotes(cable.notes || "");
    setShowCableModal(true);
  };

  const handleSaveCableModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCables) return;

    if (editingCable) {
      const updated = cables.map((c) =>
        c.id === editingCable.id
          ? {
              ...c,
              cableType: cableFormType,
              voltage: cableFormVoltage,
              status: cableFormStatus,
              spansCount: Number(cableFormSpans) || 1,
              estimatedLengthMeters: Number(cableFormMeters) || 35,
              spansDetail: cableFormDetail,
              notes: cableFormNotes,
            }
          : c
      );
      onUpdateCables(updated);
    } else {
      const newCable: CableSegment = {
        id: `C${cables.length + 1}_${Date.now()}`,
        cableType: cableFormType,
        voltage: cableFormVoltage,
        status: cableFormStatus,
        spansCount: Number(cableFormSpans) || 1,
        estimatedLengthMeters: Number(cableFormMeters) || 35,
        spansDetail: cableFormDetail,
        notes: cableFormNotes,
        computedMaterials: [],
      };
      onUpdateCables([...cables, newCable]);
    }
    setShowCableModal(false);
  };

  const handleDeleteCable = (id: string) => {
    if (!onUpdateCables) return;
    onUpdateCables(cables.filter((c) => c.id !== id));
  };

  const handleQuickSpanChange = (cableId: string, deltaSpans: number) => {
    if (!onUpdateCables) return;
    const updated = cables.map((c) => {
      if (c.id !== cableId) return c;
      const currentSpans = Number(c.spansCount) || 1;
      const currentMeters = Number(c.estimatedLengthMeters) || 35;
      const avgSpanLen = currentSpans > 0 ? Math.round(currentMeters / currentSpans) : 35;
      const newSpans = Math.max(1, currentSpans + deltaSpans);
      const newMeters = Math.max(10, currentMeters + deltaSpans * avgSpanLen);
      return {
        ...c,
        spansCount: newSpans,
        estimatedLengthMeters: newMeters,
      };
    });
    onUpdateCables(updated);
  };

  // Separate list calculation with rigorous consolidation for materials and mnemonics to remove
  const removalMaterials = useMemo(() => {
    const map = new Map<string, CemigMaterialItem>();
    for (const item of materials) {
      const isRetirar = item.status === "RETIRAR" || item.description.startsWith("[A RETIRAR]");
      if (!isRetirar) continue;

      const cleanDesc = (item.description || "")
        .replace(/^\[A RETIRAR\]\s*/i, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
      const unitNorm = (item.unit || "UN").trim().toUpperCase();
      const numCode =
        item.codigo && /^\d+$/.test(item.codigo.trim())
          ? item.codigo.trim()
          : item.code && /^\d+$/.test(item.code.trim())
          ? item.code.trim()
          : null;

      const key = numCode ? `COD_${numCode}__${unitNorm}` : `DESC_${cleanDesc}__${unitNorm}`;
      const existing = map.get(key);

      if (existing) {
        existing.quantity += Number(item.quantity) || 0;
        if (
          item.sourceStructureName &&
          existing.sourceStructureName &&
          !existing.sourceStructureName.includes(item.sourceStructureName)
        ) {
          existing.sourceStructureName = `${existing.sourceStructureName}, ${item.sourceStructureName}`;
        }
        if (!existing.codigo && item.codigo) {
          existing.codigo = item.codigo;
          existing.statusCodigo = item.statusCodigo;
        }
      } else {
        map.set(key, {
          ...item,
          status: "RETIRAR",
          description: item.description.startsWith("[A RETIRAR]")
            ? item.description
            : `[A RETIRAR] ${item.description}`,
          quantity: Number(item.quantity) || 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.description.localeCompare(b.description));
  }, [materials]);

  const removalMnemonics = useMemo(() => {
    const map = new Map<string, GroupedMnemonic>();
    for (const mne of groupedMnemonics) {
      const isRetirar = mne.status === "RETIRAR" || mne.description.startsWith("[A RETIRAR]");
      if (!isRetirar) continue;

      const mCode = mne.mnemonicCode.trim().toUpperCase();
      const existing = map.get(mCode);

      if (existing) {
        existing.totalQuantity += Number(mne.totalQuantity) || 0;
        for (const loc of mne.sourceLocations || []) {
          if (!existing.sourceLocations.includes(loc)) {
            existing.sourceLocations.push(loc);
          }
        }
      } else {
        map.set(mCode, {
          ...mne,
          status: "RETIRAR",
          description: mne.description.startsWith("[A RETIRAR]")
            ? mne.description
            : `[A RETIRAR] ${mne.description}`,
          totalQuantity: Number(mne.totalQuantity) || 0,
          sourceLocations: [...(mne.sourceLocations || [])],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.mnemonicCode.localeCompare(b.mnemonicCode));
  }, [groupedMnemonics]);

  // Modal for Registered Unit Prices List (Tabela de Preços Unitários Cadastrados)
  const [showRegisteredPricesModal, setShowRegisteredPricesModal] = useState<boolean>(false);
  const [priceSearchTerm, setPriceSearchTerm] = useState<string>("");
  const [priceFilterCat, setPriceFilterCat] = useState<string>("TODOS");

  // Local state for editing unit prices inside the Registered Prices Modal
  const [editingPriceCode, setEditingPriceCode] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<number>(0);
  const [customPriceMap, setCustomPriceMap] = useState<Record<string, number>>({});

  // Edit State for Exploded Materials in Main Table
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editDesc, setEditDesc] = useState<string>("");
  const [editCode, setEditCode] = useState<string>("");
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);

  // New Item State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newUnit, setNewUnit] = useState("UN");
  const [newQty, setNewQty] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState<number>(0);
  const [newCategory, setNewCategory] = useState<any>("ESTRUTURA");

  // Filtering Grouped Mnemonics
  const filteredMnemonics = groupedMnemonics.filter((mne) => {
    const matchesSearch =
      mne.mnemonicCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mne.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mne.sourceLocations.some((loc) => loc.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory === "TODOS" || mne.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  // Filtering Exploded Materials
  const filteredMaterials = materials.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === "TODOS" || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  // Helper to get base price before profit margin
  const getBaseItemPrice = (item: CemigMaterialItem): number => {
    if (customPriceMap[item.code] !== undefined) return customPriceMap[item.code];
    if (item.unitPrice !== undefined) return item.unitPrice;
    return getEstimatedMarketPrice(item.code, item.category, item.description);
  };

  // Helper to get effective price with profit margin applied
  const getItemPrice = (item: CemigMaterialItem): number => {
    const base = getBaseItemPrice(item);
    if (activeMargin > 0) {
      return base * (1 + activeMargin / 100);
    }
    return base;
  };

  // Grand Total Calculations for Exploded List
  const totalBaseExplodedValue = filteredMaterials.reduce((acc, item) => {
    return acc + item.quantity * getBaseItemPrice(item);
  }, 0);

  const totalProfitValue = totalBaseExplodedValue * (activeMargin / 100);

  const totalExplodedValue = filteredMaterials.reduce((acc, item) => {
    return acc + item.quantity * getItemPrice(item);
  }, 0);

  // Fullscreen Exploded Materials View state
  const [isFullScreenExplodedInternal, setIsFullScreenExplodedInternal] = useState<boolean>(false);
  const isFullScreenExploded =
    isFullScreenExplodedProp !== undefined ? isFullScreenExplodedProp : isFullScreenExplodedInternal;

  const handleToggleFullScreenExploded = (open: boolean) => {
    setIsFullScreenExplodedInternal(open);
    if (onToggleFullScreenExploded) {
      onToggleFullScreenExploded(open);
    }
  };

  // Item editing state
  const handleStartEdit = (item: CemigMaterialItem) => {
    setEditingId(item.id);
    setEditCode(item.code);
    setEditDesc(item.description);
    setEditQty(item.quantity);
    setEditUnitPrice(getBaseItemPrice(item));
  };

  const handleSaveEdit = (id: string) => {
    const updated = materials.map((m) =>
      m.id === id
        ? {
            ...m,
            code: editCode,
            description: editDesc,
            quantity: Math.max(0, Number(editQty) || 0),
            unitPrice: Math.max(0, Number(editUnitPrice) || 0),
          }
        : m
    );
    onUpdateMaterial(updated);
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Tem certeza que deseja remover este item da lista de materiais?")) {
      const updated = materials.filter((m) => m.id !== id);
      onUpdateMaterial(updated);
    }
  };

  const handleUpdateMarketPrices = () => {
    setCustomPriceMap({});
    const updated = materials.map((item) => ({
      ...item,
      unitPrice: getEstimatedMarketPrice(item.code, item.category, item.description),
    }));
    onUpdateMaterial(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newItem: CemigMaterialItem = {
      id: `manual_${Date.now()}`,
      code: newCode.trim() || "MANUAL",
      description: newDesc.trim(),
      unit: newUnit,
      quantity: Number(newQty) || 1,
      unitPrice: Number(newUnitPrice) || 0,
      category: newCategory,
    };

    onUpdateMaterial([...materials, newItem]);
    setShowAddModal(false);
    setNewCode("");
    setNewDesc("");
    setNewQty(1);
    setNewUnitPrice(0);
  };

  const toggleExpandMnemonic = (code: string) => {
    setExpandedMnemonic((prev) => (prev === code ? null : code));
  };

  const formatCurrency = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Aggregated list of registered items for the Price Management View
  const getRegisteredItemsList = () => {
    const itemMap = new Map<
      string,
      {
        code: string;
        description: string;
        unit: string;
        category: string;
        unitPrice: number;
        inProject: boolean;
      }
    >();

    // Add items present in project materials
    materials.forEach((mat) => {
      const price =
        customPriceMap[mat.code] !== undefined
          ? customPriceMap[mat.code]
          : mat.unitPrice !== undefined
          ? mat.unitPrice
          : getEstimatedMarketPrice(mat.code, mat.category, mat.description);

      if (!itemMap.has(mat.code)) {
        itemMap.set(mat.code, {
          code: mat.code,
          description: mat.description,
          unit: mat.unit,
          category: mat.category,
          unitPrice: price,
          inProject: true,
        });
      } else {
        const existing = itemMap.get(mat.code)!;
        if (customPriceMap[mat.code] !== undefined) {
          existing.unitPrice = customPriceMap[mat.code];
        } else if (mat.unitPrice !== undefined) {
          existing.unitPrice = mat.unitPrice;
        }
        existing.inProject = true;
      }
    });

    // Also include CEMIG catalog items
    Object.entries(CEMIG_CATALOG).forEach(([code, catItem]) => {
      if (!itemMap.has(code)) {
        let category = "ESTRUTURA";
        if (catItem.description.includes("POSTE")) category = "POSTE";
        else if (catItem.description.includes("CABO") || catItem.description.includes("CONDUTOR")) category = "CABO";
        else if (catItem.description.includes("TRANSFORMADOR") || catItem.description.includes("CHAVE")) category = "EQUIPAMENTO";
        else if (catItem.description.includes("MÃO-DE-OBRA") || code.startsWith("MOC") || code.startsWith("US")) category = "MÃO-DE-OBRA";

        const price =
          customPriceMap[code] !== undefined
            ? customPriceMap[code]
            : getEstimatedMarketPrice(code, category, catItem.description);

        itemMap.set(code, {
          code,
          description: catItem.description,
          unit: catItem.unit,
          category,
          unitPrice: price,
          inProject: false,
        });
      }
    });

    return Array.from(itemMap.values());
  };

  const registeredItems = getRegisteredItemsList();

  // Save updated unit price for a material code from the modal
  const handleSaveRegisteredPrice = (code: string, newPrice: number) => {
    const validPrice = Math.max(0, Number(newPrice) || 0);
    setCustomPriceMap((prev) => ({ ...prev, [code]: validPrice }));

    // Apply to all project materials matching this code
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

  // Reset price for a material code back to market estimate
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

  // Print registered price list
  const handlePrintRegisteredPriceList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const itemsToPrint = registeredItems.filter((item) => {
      const matchesSearch =
        item.code.toLowerCase().includes(priceSearchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(priceSearchTerm.toLowerCase());
      const matchesCat = priceFilterCat === "TODOS" || item.category === priceFilterCat;
      return matchesSearch && matchesCat;
    });

    const rowsHtml = itemsToPrint
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
          <title>Tabela de Preços Unitários Cadastrados - CEMIG</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 25px; color: #0f172a; font-size: 11px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 18px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 11px; color: #475569; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; font-size: 10px; text-transform: uppercase; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .summary-box { margin-top: 20px; border-top: 2px solid #0f172a; padding-top: 10px; text-align: right; font-weight: bold; font-size: 12px; color: #0f172a; }
            .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">TABELA DE PREÇOS UNITÁRIOS CADASTRADOS</div>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <div><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</div>
              <div><strong>Total de Itens:</strong> ${itemsToPrint.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th style="width: 90px;">Código</th>
                <th>Descrição do Material / Serviço Cadastrado</th>
                <th style="width: 50px; text-align: center;">Unid.</th>
                <th style="width: 100px; text-align: center;">Categoria</th>
                <th style="width: 130px; text-align: right;">Preço Unitário (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            TOTAL DE ITENS CADASTRADOS LISTADOS: ${itemsToPrint.length}
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
    <div id="materials-table-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm mb-8 relative">
      {/* 1. MAIN VIEW SELECTOR TABS - Responsive, High-Contrast, Anti-Clipping */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 rounded-t-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs Selector Grid / Flex */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 w-full md:w-auto">
            {/* Tab 1: Grouped Mnemonics */}
            <button
              onClick={() => setActiveTab("MNEMONICS")}
              className={`flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                activeTab === "MNEMONICS"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.01]"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className={`w-4 h-4 shrink-0 ${activeTab === "MNEMONICS" ? "text-slate-950" : "text-amber-400"}`} />
                <span className="truncate">Mnemônicos Agrupados</span>
              </div>
              <span
                className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  activeTab === "MNEMONICS"
                    ? "bg-slate-950 text-amber-400"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {groupedMnemonics.length}
              </span>
            </button>

            {/* Tab 2: Final Exploded List */}
            <button
              onClick={() => setActiveTab("EXPLODED")}
              className={`flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                activeTab === "EXPLODED"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.01]"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={`w-4 h-4 shrink-0 ${activeTab === "EXPLODED" ? "text-slate-950" : "text-amber-400"}`} />
                <span className="truncate">Lista Final Explodida</span>
              </div>
              <span
                className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  activeTab === "EXPLODED"
                    ? "bg-slate-950 text-amber-400"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {materials.length}
              </span>
            </button>

            {/* Tab 3: Cables & Spans Accounting */}
            <button
              onClick={() => setActiveTab("CABLES")}
              className={`flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                activeTab === "CABLES"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.01]"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Zap className={`w-4 h-4 shrink-0 ${activeTab === "CABLES" ? "text-slate-950" : "text-amber-400"}`} />
                <span className="truncate">Cabos & Vãos</span>
              </div>
              <span
                className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  activeTab === "CABLES"
                    ? "bg-slate-950 text-amber-400"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {totalCableMeters}m ({totalCableSpans} vãos)
              </span>
            </button>

            {/* Tab 4: Materials to Remove */}
            <button
              onClick={() => setActiveTab("RETIRAR")}
              className={`flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                activeTab === "RETIRAR"
                  ? "bg-rose-600 text-white border-rose-500 shadow-md scale-[1.01]"
                  : "bg-slate-800/80 hover:bg-slate-800 text-rose-200 border-slate-700/80 hover:border-rose-900/50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Trash2 className={`w-4 h-4 shrink-0 ${activeTab === "RETIRAR" ? "text-white" : "text-rose-400"}`} />
                <span className="truncate">Materiais a Retirar</span>
              </div>
              <span
                className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  activeTab === "RETIRAR"
                    ? "bg-rose-950 text-rose-200"
                    : "bg-rose-950/60 text-rose-300"
                }`}
              >
                {removalMaterials.length + removalMnemonics.length}
              </span>
            </button>

            {/* Tab 5: Separate Sheet for Labor (US) */}
            <button
              onClick={() => setActiveTab("LABOR")}
              className={`flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                activeTab === "LABOR"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.01]"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className={`w-4 h-4 shrink-0 ${activeTab === "LABOR" ? "text-slate-950" : "text-amber-400"}`} />
                <span className="truncate">Mão de Obra (US)</span>
              </div>
              <span
                className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  activeTab === "LABOR"
                    ? "bg-slate-950 text-amber-400"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} US
              </span>
            </button>
          </div>

          {/* Quick Action Button on Right */}
          {activeTab === "EXPLODED" && (
            <div className="flex items-center justify-end shrink-0">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Adicionar Item Manual</span>
              </button>
            </div>
          )}

          {activeTab === "CABLES" && (
            <div className="flex items-center justify-end shrink-0">
              <button
                onClick={handleOpenAddCable}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Adicionar Cabo / Vão</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. SEARCH AND CATEGORY FILTER BAR (for Mnemonics, Exploded, and Removal tabs) */}
      <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input Box */}
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === "MNEMONICS"
                ? "Buscar por mnemônico, descrição ou poste..."
                : "Buscar por código ou descrição do material..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills Filter - Fluid and never clipped */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> Categoria:
          </span>
          {["TODOS", "ESTRUTURA", "POSTE", "CABO", "EQUIPAMENTO", "ACESSORIO"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === cat
                  ? "bg-slate-900 text-white shadow-2xs scale-[1.02]"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. EXPLODED LIST ACTION BAR WITH PROFIT MARGIN CONTROLS (Sticky & Responsive) */}
      {activeTab === "EXPLODED" && (
        <div className="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-md px-3 sm:px-4 py-2.5 border-b border-slate-200 shadow-xs space-y-2">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
            {/* 4 Essential Action Buttons: 2x2 symmetrical grid on mobile, flex row on sm+ */}
            <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-2 sm:flex-wrap gap-2">
              {/* Button 1: Toggle Valores R$ */}
              <button
                type="button"
                onClick={() => setShowPrices(!showPrices)}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-98 ${
                  showPrices
                    ? "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200/80"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
                title={showPrices ? "Ocultar colunas de valores em R$" : "Exibir colunas de valores em R$"}
              >
                {showPrices ? (
                  <Eye className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="truncate">
                  Valores R$: <strong className={showPrices ? "text-amber-900" : "text-slate-500"}>{showPrices ? "Exibidos" : "Ocultos"}</strong>
                </span>
              </button>

              {/* Button 2: Tabela de Preços Unitários Cadastrados */}
              <button
                type="button"
                onClick={() => {
                  if (!showPrices) setShowPrices(true);
                  if (onOpenRegisteredPrices) {
                    onOpenRegisteredPrices();
                  } else {
                    setShowRegisteredPricesModal(true);
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-98"
                title="Abrir Tabela Oficial de Preços Unitários Cadastrados - CEMIG"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Tabela de Preços</span>
              </button>

              {/* Button 3: Mão de Obra (US) */}
              <button
                type="button"
                onClick={() => setActiveTab("LABOR")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 active:bg-amber-200/70 text-amber-950 border border-amber-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-98"
                title="Acessar a planilha detalhada de Mão de Obra (US)"
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">
                  Mão de Obra: <strong>{effectiveTotalUS.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} US</strong>
                </span>
              </button>

              {/* Button 4: Ver em Tela Cheia */}
              <button
                id="btn-open-fullscreen-exploded-bar"
                type="button"
                onClick={() => handleToggleFullScreenExploded(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs font-extrabold bg-slate-900 hover:bg-slate-800 active:scale-98 text-amber-400 border border-amber-500/50 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Mostrar Lista de Materiais Explodida Consolidada em Tela Cheia"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Ver em Tela Cheia</span>
              </button>
            </div>

            {/* Right side / Profit Margin Controls */}
            {showPrices && (
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0">
                  <div className="p-1 bg-amber-500/10 text-amber-700 rounded-md">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <label htmlFor="profit-margin-input" className="whitespace-nowrap text-[11px] sm:text-xs">
                    Margem:
                  </label>
                  {/* Number input for Profit Margin */}
                  <div className="relative flex items-center">
                    <input
                      id="profit-margin-input"
                      type="number"
                      min="0"
                      max="500"
                      step="0.5"
                      value={activeMargin === 0 ? "" : activeMargin}
                      placeholder="0"
                      onChange={(e) => handleProfitMarginChange(Number(e.target.value))}
                      className="w-14 sm:w-16 px-1.5 py-0.5 text-right text-xs font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50 text-slate-900 pr-4.5"
                    />
                    <span className="absolute right-1 text-[11px] font-bold text-slate-500 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                {/* Quick Preset Buttons - horizontally scrollable on mobile */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 pl-1 border-l border-slate-200 sm:border-0 sm:pl-0">
                  {[
                    { label: "0%", val: 0, title: "Sem margem (Custo Base)" },
                    { label: "+10%", val: 10, title: "10% de margem" },
                    { label: "+15%", val: 15, title: "15% de margem" },
                    { label: "+20%", val: 20, title: "20% de margem" },
                    { label: "+25%", val: 25, title: "25% de margem" },
                    { label: "+30%", val: 30, title: "30% de margem" },
                    { label: "+50%", val: 50, title: "50% de margem" },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleProfitMarginChange(preset.val)}
                      title={preset.title}
                      className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        activeMargin === preset.val
                          ? "bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-extrabold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Profit Margin Callout Bar */}
          {showPrices && activeMargin > 0 && (
            <div className="p-2 bg-amber-50/95 border border-amber-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[10px] sm:text-[11px] rounded-md shadow-2xs">
                  MARGEM APLICADA: +{activeMargin}%
                </span>
                <span className="text-slate-700 text-[11px] hidden sm:inline">
                  Ajuste de +{activeMargin}% sobre o custo unitário base.
                </span>
              </div>
              <div className="flex items-center gap-2.5 font-mono text-[11px] flex-wrap">
                <span className="text-slate-600">
                  Base: <strong>{formatCurrency(totalBaseExplodedValue)}</strong>
                </span>
                <span className="text-emerald-700 font-bold">
                  + Lucro: <strong>{formatCurrency(totalProfitValue)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleProfitMarginChange(0)}
                  className="text-rose-600 hover:text-rose-800 font-bold underline font-sans text-[11px] cursor-pointer ml-0.5"
                >
                  Remover
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: GROUPED MNEMONICS VIEW (Mnemônicos Agrupados)     */}
      {/* ========================================================= */}
      {activeTab === "MNEMONICS" && (
        <div>
          {/* Subheader Banner */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-slate-800">
                Mnemônicos Agrupados do Projeto (Kits Estruturais Consolidados)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">
                Mostrando {filteredMnemonics.length} de {groupedMnemonics.length} mnemônicos
              </span>
              <span className="font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md text-[11px]">
                {filteredMnemonics.length} Kits
              </span>
            </div>
          </div>

          {/* Mobile & Tablet Card List View for Mnemonics */}
          <div className="block lg:hidden p-3 sm:p-4 space-y-3 bg-slate-50/50">
            {filteredMnemonics.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs">
                Nenhum mnemônico encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredMnemonics.map((mne, index) => {
                const isExpanded = expandedMnemonic === mne.mnemonicCode;
                return (
                  <div
                    key={`mne_mob_${mne.mnemonicCode}_${index}`}
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-lg">
                          {mne.mnemonicCode}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {mne.category}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">#{index + 1}</span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {mne.description}
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs font-mono">
                      <span className="text-slate-600 font-sans font-medium">Quantidade Agrupada:</span>
                      <span className="font-black text-amber-900 text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {(Number(mne.totalQuantity) || 0).toLocaleString("pt-BR")} {mne.unit}
                      </span>
                    </div>

                    {mne.sourceLocations.length > 0 && (
                      <div className="text-[11px] text-slate-600 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-1">Locais / Postes de Origem:</span>
                        <div className="flex flex-wrap gap-1">
                          {mne.sourceLocations.map((loc, lIdx) => (
                            <span
                              key={lIdx}
                              className="bg-white text-slate-800 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200 font-semibold"
                            >
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => toggleExpandMnemonic(mne.mnemonicCode)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-100/90 hover:bg-amber-200 active:scale-95 px-3.5 py-2 rounded-xl transition-all cursor-pointer w-full sm:w-auto"
                      >
                        {isExpanded ? (
                          <>
                            <span>Ocultar Composição do Kit</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>Ver Composição do Kit ({mne.compositionItems?.length || 1} itens)</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {isExpanded && mne.compositionItems && (
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-amber-300 space-y-2 mt-2">
                        <div className="text-[11px] font-extrabold text-slate-800 uppercase flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-amber-600" />
                            Itens Constituintes (Explosão Oficial)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Multiplicado x{mne.totalQuantity}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {mne.compositionItems.map((cItem, cIdx) => (
                            <div key={cIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2">
                              <div className="min-w-0 pr-2">
                                <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 mr-1.5 text-[11px]">
                                  {cItem.code}
                                </span>
                                <span className="text-slate-800 font-medium text-[11px]">{cItem.description}</span>
                              </div>
                              <span className="font-mono font-black text-amber-900 whitespace-nowrap bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] shrink-0">
                                {cItem.qtyPerUnit * mne.totalQuantity} {cItem.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View for Mnemonics */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 w-44">Mnemônico CEMIG</th>
                  <th className="py-3.5 px-4">Descrição Oficial CEMIG</th>
                  <th className="py-3.5 px-4 w-24 text-center">Unid.</th>
                  <th className="py-3.5 px-4 w-32 text-right">Qtd. Agrupada</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Origem no Projeto (Postes/Locais)</th>
                  <th className="py-3.5 px-4 w-36 text-center">Composição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredMnemonics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum mnemônico encontrado para a busca informada.
                    </td>
                  </tr>
                ) : (
                  filteredMnemonics.map((mne, index) => {
                    const isExpanded = expandedMnemonic === mne.mnemonicCode;
                    return (
                      <React.Fragment key={`${mne.mnemonicCode}_${mne.status}_${index}`}>
                        <tr
                          className={`hover:bg-slate-50 transition-colors ${
                            isExpanded ? "bg-amber-50/70" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-mono">
                            {index + 1}
                          </td>

                          {/* Mnemonic Code */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-lg inline-block shadow-2xs">
                              {mne.mnemonicCode}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 text-slate-900 font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{mne.description}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {mne.category}
                              </span>
                            </div>
                          </td>

                          {/* Unit */}
                          <td className="py-3.5 px-4 text-center text-slate-600 font-bold text-xs">
                            {mne.unit}
                          </td>

                          {/* Total Quantity */}
                          <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono text-base">
                            {(Number(mne.totalQuantity) || 0).toLocaleString("pt-BR")}
                          </td>

                          {/* Source Locations */}
                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {mne.sourceLocations.map((loc, lIdx) => (
                                <span
                                  key={lIdx}
                                  className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200 font-semibold"
                                >
                                  {loc}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Composition Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => toggleExpandMnemonic(mne.mnemonicCode)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-100/90 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Ocultar</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>Ver Kit ({mne.compositionItems?.length || 1})</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Kit Items Row */}
                        {isExpanded && mne.compositionItems && (
                          <tr className="bg-slate-50/90 border-b-2 border-amber-300">
                            <td colSpan={7} className="p-4 pl-12">
                              <div className="bg-white rounded-xl border border-amber-300 p-4 shadow-sm">
                                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Boxes className="w-4 h-4 text-amber-600" />
                                    Itens Constituintes do Mnemônico [{mne.mnemonicCode}] (Multiplicado por {mne.totalQuantity} {mne.unit})
                                  </h4>
                                  <span className="text-xs text-slate-500 font-medium font-mono">
                                    {mne.compositionItems.length} componentes oficiais CEMIG
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {mne.compositionItems.map((cItem, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-bold shrink-0">
                                          {cItem.code}
                                        </span>
                                        <span className="text-slate-700 font-medium truncate">
                                          {cItem.description}
                                        </span>
                                      </div>
                                      <div className="font-mono font-bold text-amber-900 whitespace-nowrap shrink-0 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {cItem.qtyPerUnit * mne.totalQuantity} {cItem.unit}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: EXPLODED FINAL MATERIALS VIEW                     */}
      {/* ========================================================= */}
      {activeTab === "EXPLODED" && (
        <>
          {/* Mobile & Tablet Card List View for Exploded Materials */}
          <div className="block lg:hidden p-3 sm:p-4 space-y-3 bg-slate-50/50 rounded-b-2xl">
            {filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs">
                Nenhum material encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredMaterials.map((item, index) => {
                const isEditing = editingId === item.id;
                const basePrice = getBaseItemPrice(item);
                const price = getItemPrice(item);
                const itemTotal = item.quantity * price;
                const itemIndex = index + 1;

                return (
                  <div
                    key={`exp_mob_${item.id}_${index}`}
                    className={`bg-white rounded-xl p-4 border shadow-xs space-y-3 ${
                      isEditing ? "border-amber-400 bg-amber-50/40" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          Cód: {resolveOfficialMaterialCode(item)}
                        </span>

                        {activeMargin > 0 && (
                          <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                            +{activeMargin}% LUCRO
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Edit / Delete) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 cursor-pointer"
                              title="Salvar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-rose-100 text-rose-800 rounded-lg hover:bg-rose-200 cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                              title="Editar Item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                              title="Excluir Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Descrição:</label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade:</label>
                            <input
                              type="number"
                              step="any"
                              value={editQty}
                              onChange={(e) => setEditQty(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Preço Unit. Base (R$):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editUnitPrice}
                              onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {item.description}
                        {item.sourceStructureName && (
                          <span className="ml-1.5 text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono font-semibold">
                            Origem: {item.sourceStructureName}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-slate-50 p-2.5 rounded-xl text-xs font-mono border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans font-medium">Quantidade Total:</span>
                        <span className="font-black text-slate-900 text-sm">
                          {(Number(item.quantity) || 0).toLocaleString("pt-BR")} {item.unit}
                        </span>
                      </div>

                      {showPrices && (
                        <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl text-xs font-mono text-right">
                          <span className="text-[10px] text-slate-500 block font-sans font-medium">
                            {activeMargin > 0 ? `Unit. (+${activeMargin}%):` : "Preço Unitário:"}
                          </span>
                          <span className="font-bold text-slate-800 block text-[11px]">
                            {price > 0 ? formatCurrency(price) : "R$ 0,00"}
                          </span>
                          {activeMargin > 0 && basePrice > 0 && (
                            <span className="text-[9px] text-slate-500 block font-sans">
                              Base: {formatCurrency(basePrice)}
                            </span>
                          )}
                          <span className="font-black text-amber-950 text-xs block mt-0.5">
                            Total: {itemTotal > 0 ? formatCurrency(itemTotal) : "R$ 0,00"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View for Exploded Materials */}
          <div className="hidden lg:block overflow-x-auto rounded-b-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 w-36">Código</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Descrição do Material Explodido</th>
                  <th className="py-3.5 px-4 w-20 text-center">Unid.</th>
                  <th className="py-3.5 px-4 w-28 text-right">Qtd. Total</th>
                  {showPrices && (
                    <>
                      <th className="py-3.5 px-4 w-36 text-right">
                        Val. Unit. (R$)
                        {activeMargin > 0 && (
                          <span className="block text-[9px] text-amber-700 font-bold normal-case">
                            (+{activeMargin}% Lucro)
                          </span>
                        )}
                      </th>
                      <th className="py-3.5 px-4 w-36 text-right">
                        Val. Total (R$)
                        {activeMargin > 0 && (
                          <span className="block text-[9px] text-amber-700 font-bold normal-case">
                            (c/ Margem)
                          </span>
                        )}
                      </th>
                    </>
                  )}
                  <th className="py-3.5 px-4 w-28 text-center print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={showPrices ? 8 : 6} className="py-8 text-center text-slate-500">
                      Nenhum material encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((item, index) => {
                    const isEditing = editingId === item.id;
                    const basePrice = getBaseItemPrice(item);
                    const price = getItemPrice(item);
                    const itemTotal = item.quantity * price;
                    const itemIndex = index + 1;

                    return (
                      <tr
                        key={`exp_desk_${item.id}_${item.status || ""}_${index}`}
                        className={`hover:bg-slate-50 transition-colors ${
                          isEditing ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-mono">
                          {itemIndex}
                        </td>

                        {/* Code Column */}
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white font-mono"
                            />
                          ) : (
                            <span className="bg-slate-100 text-slate-900 font-bold px-2.5 py-1 rounded-lg border border-slate-200 inline-block shadow-2xs">
                              {resolveOfficialMaterialCode(item)}
                            </span>
                          )}
                        </td>

                        {/* Description Column */}
                        <td className="py-3.5 px-4 text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="w-full px-2.5 py-1 text-sm border border-amber-400 rounded-lg focus:outline-none bg-white"
                            />
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-900">{item.description}</span>
                              {item.sourceStructureName && (
                                <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono">
                                  Origem: {item.sourceStructureName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Unit Column */}
                        <td className="py-3.5 px-4 text-center text-slate-600 text-xs font-bold">
                          {item.unit}
                        </td>

                        {/* Quantity Column */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
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

                        {/* Unit Price Column (if enabled) */}
                        {showPrices && (
                          <td className="py-3.5 px-4 text-right font-mono text-xs">
                            {isEditing ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-slate-400 text-[11px]">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editUnitPrice}
                                    onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                                    className="w-24 px-2 py-1 text-xs border border-amber-400 rounded-lg text-right focus:outline-none bg-white font-mono font-bold"
                                    placeholder="Custo Base"
                                  />
                                </div>
                                {activeMargin > 0 && (
                                  <span className="text-[10px] text-amber-800 font-medium">
                                    c/ +{activeMargin}%: {formatCurrency(editUnitPrice * (1 + activeMargin / 100))}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className={price > 0 ? "text-slate-900 font-bold block" : "text-slate-400 italic block"}>
                                  {price > 0 ? formatCurrency(price) : "R$ 0,00"}
                                </span>
                                {activeMargin > 0 && basePrice > 0 && (
                                  <span className="text-[10px] text-slate-500 font-normal block font-sans">
                                    Base: {formatCurrency(basePrice)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Total Price Column (if enabled) */}
                        {showPrices && (
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                            {itemTotal > 0 ? formatCurrency(itemTotal) : "R$ 0,00"}
                          </td>
                        )}

                        {/* Actions Column */}
                        <td className="py-3.5 px-4 text-center print:hidden">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-all cursor-pointer"
                                title="Salvar alterações"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Editar item e valor"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                                title="Excluir item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </>
      )}

      {/* ========================================================= */}
      {/* TAB: CABLES & SPANS VIEW (Cabos & Vãos da Rede)          */}
      {/* ========================================================= */}
      {activeTab === "CABLES" && (
        <div className="p-3 sm:p-6 bg-slate-50/50 space-y-6">
          {/* 1. Header Banner */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-900 rounded-xl shrink-0 border border-amber-300">
                <Zap className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Contabilização dos Cabos & Vãos da Rede</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md">
                    ✓ Integrado aos Materiais
                  </span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Vãos agrupados e somados por especificação técnica (tensão, bitola e status), compondo a lista de materiais consolidados.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenAddCable}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Cabo / Vão</span>
              </button>
            </div>
          </div>

          {/* 2. KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Extensão a Instalar
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {totalCableMetersInstall.toLocaleString("pt-BR")} m
                </span>
                <span className="text-xs text-slate-500">condutores novos</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Extensão a Retirar
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700 font-mono">
                  {totalCableMetersRetirar.toLocaleString("pt-BR")} m
                </span>
                <span className="text-xs text-slate-500">desmontagem</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total de Vãos Contabilizados
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700 font-mono">
                  {totalCableSpans} vãos
                </span>
                <span className="text-xs text-slate-500">em {cables.length} especificações</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Consolidação no Projeto
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-black text-emerald-950">
                  Totalmente Inseridos na Lista Explodida
                </span>
              </div>
            </div>
          </div>

          {/* 3. Explanation Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">
                Regra de Contabilização e Agrupamento dos Cabos da Rede
              </p>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Os condutores são agrupados por bitola e tensão. A quantidade de vãos de cada trecho é somada para gerar a extensão total em metros. Cada especificação é mapeada para o seu respectivo <strong>Mnemônico Oficial CEMIG</strong> (ex: CAA10 para CAA 1/0 AWG, CAA4 para CAA 4 AWG, CAA2 para CAA 2 AWG) e incluída na <strong>Lista Final Explodida</strong> e nos <strong>Mnemônicos Agrupados</strong>.
              </p>
            </div>
          </div>

          {/* 4. Table / Cards of Cables */}
          {cables.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
              <Zap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-sm text-slate-700">Nenhum cabo cadastrado no projeto</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cabos detectados pelo diagrama unifilar ou inseridos manualmente aparecerão aqui com a soma de seus vãos e metragens.
              </p>
              <button
                onClick={handleOpenAddCable}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Primeiro Cabo / Vão</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Especificações de Cabos e Vãos Contabilizados ({cables.length})</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono font-medium">
                  {totalCableMeters} metros totais de condutor
                </span>
              </div>

              {/* Mobile Cards */}
              <div className="block lg:hidden p-3 space-y-3">
                {cables.map((c, idx) => {
                  const mneCode = c.mnemonicCode || getMnemonicForCable(c.cableType, c.voltage, c.status);
                  const isRetirar = c.status === "RETIRAR";
                  const unitPrice = getEstimatedMarketPrice(mneCode, "CABO", c.cableType);
                  const totalPrice = (Number(c.estimatedLengthMeters) || 0) * unitPrice;

                  return (
                    <div
                      key={`mob_c_${c.id}_${idx}`}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isRetirar ? "bg-rose-50/40 border-rose-200" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                            {c.id}
                          </span>
                          <span className="font-bold text-xs text-slate-900">{c.cableType}</span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            isRetirar
                              ? "bg-rose-100 text-rose-900 border border-rose-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          }`}
                        >
                          {c.status || "INSTALAR"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">Vãos:</span>
                          <span className="font-bold text-slate-900">{c.spansCount || 1} vãos</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">Extensão Total:</span>
                          <span className="font-black text-amber-900">{c.estimatedLengthMeters || 35} m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">Tensão:</span>
                          <span className="font-bold text-slate-700">{c.voltage || "MT"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-sans block">Mnemônico CEMIG:</span>
                          <span className="font-bold text-amber-700">{mneCode}</span>
                        </div>
                      </div>

                      {c.spansDetail && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 font-mono">
                          <span className="font-sans font-bold text-slate-700">Detalhamento dos Vãos: </span>
                          {c.spansDetail}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickSpanChange(c.id, 1)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-mono font-bold text-[11px] cursor-pointer"
                            title="Adicionar +1 Vão (+35m)"
                          >
                            +1 Vão
                          </button>
                          <button
                            onClick={() => handleQuickSpanChange(c.id, -1)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-mono font-bold text-[11px] cursor-pointer"
                            title="Subtrair -1 Vão (-35m)"
                          >
                            -1 Vão
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditCable(c)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                            title="Editar Cabo / Vãos"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCable(c.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4 w-16">ID</th>
                      <th className="py-3 px-4 min-w-[200px]">Especificação do Cabo / Bitola</th>
                      <th className="py-3 px-4 w-24 text-center">Tensão</th>
                      <th className="py-3 px-4 w-28 text-center">Status</th>
                      <th className="py-3 px-4 w-32 text-center">Vãos Somados</th>
                      <th className="py-3 px-4 w-32 text-right">Extensão Total</th>
                      <th className="py-3 px-4 min-w-[180px]">Detalhamento dos Vãos</th>
                      <th className="py-3 px-4 w-28 text-center">Mnemônico</th>
                      <th className="py-3 px-4 w-32 text-center">Inserido na Lista</th>
                      <th className="py-3 px-4 w-24 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {cables.map((c, idx) => {
                      const mneCode = c.mnemonicCode || getMnemonicForCable(c.cableType, c.voltage, c.status);
                      const isRetirar = c.status === "RETIRAR";

                      return (
                        <tr key={`desk_c_${c.id}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                            {c.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{c.cableType}</span>
                            {c.notes && <span className="text-[11px] text-slate-500 block">{c.notes}</span>}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-xs rounded border border-slate-200">
                              {c.voltage || "MT"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 text-xs font-black rounded-lg uppercase inline-block ${
                                isRetirar
                                  ? "bg-rose-100 text-rose-900 border border-rose-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}
                            >
                              {c.status || "INSTALAR"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-black text-slate-900 text-sm">
                                {c.spansCount || 1}
                              </span>
                              <span className="text-xs text-slate-500">vãos</span>
                              <div className="flex items-center gap-0.5 ml-1">
                                <button
                                  onClick={() => handleQuickSpanChange(c.id, 1)}
                                  className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs cursor-pointer"
                                  title="+1 Vão"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => handleQuickSpanChange(c.id, -1)}
                                  className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs cursor-pointer"
                                  title="-1 Vão"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-amber-950 text-base">
                            {(Number(c.estimatedLengthMeters) || 0).toLocaleString("pt-BR")} m
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {c.spansDetail || (
                              <span className="text-slate-400 italic">
                                {c.spansCount || 1} vãos estimados ({Math.round((Number(c.estimatedLengthMeters) || 35) / (c.spansCount || 1))}m/vão)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-mono font-extrabold text-xs rounded-lg border border-amber-300 inline-block">
                              {mneCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Consolidado</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditCable(c)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Editar Cabo / Vãos"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCable(c.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Excluir Trecho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DEDICATED SEPARATE LIST OF MATERIALS TO REMOVE     */}
      {/* ========================================================= */}
      {activeTab === "RETIRAR" && (
        <div className="p-3 sm:p-6 bg-rose-50/40 space-y-6">
          {/* Header Card */}
          <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950 uppercase tracking-tight">
                  Relação de Materiais e Equipamentos a Retirar
                </h3>
                <p className="text-xs text-rose-800 font-medium">
                  Lista detalhada e segregada de itens marcados para desmontagem/retirada no projeto CEMIG.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-rose-100 text-rose-900 font-bold text-xs rounded-xl border border-rose-300 font-mono">
                {removalMaterials.length} Materiais Explodidos
              </span>
              <span className="px-3 py-1.5 bg-rose-100 text-rose-900 font-bold text-xs rounded-xl border border-rose-300 font-mono">
                {removalMnemonics.length} Mnemônicos Agrupados
              </span>
            </div>
          </div>

          {removalMaterials.length === 0 && removalMnemonics.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-rose-300">
              <Trash2 className="w-10 h-10 text-rose-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum Material a Retirar Identificado</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Este projeto não possui estruturas, cabos ou mnemônicos cadastrados com status "RETIRAR".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Table of Mnemonics to Remove */}
              {removalMnemonics.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-rose-100/80 border-b border-rose-200 font-black text-xs text-rose-950 flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-rose-700" />
                      1. Mnemônicos Agrupados A RETIRAR ({removalMnemonics.length})
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-rose-200 text-rose-950 px-2 py-0.5 rounded">
                      Kits de Desmontagem
                    </span>
                  </div>

                  {/* Mobile View */}
                  <div className="block lg:hidden p-3 space-y-2.5">
                    {removalMnemonics.map((mne, idx) => (
                      <div key={`rem_mob_mne_${idx}`} className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-xs bg-rose-100 text-rose-950 px-2.5 py-0.5 rounded-md border border-rose-300">
                            {mne.mnemonicCode}
                          </span>
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                            {mne.category}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{mne.description}</div>
                        <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-rose-100">
                          <span className="text-slate-600 font-sans">Qtd. a Retirar:</span>
                          <span className="font-black text-rose-900">{mne.totalQuantity} {mne.unit}</span>
                        </div>
                        {mne.sourceLocations.length > 0 && (
                          <div className="text-[10px] text-slate-600">
                            <strong>Locais:</strong> {mne.sourceLocations.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-50 text-rose-900 font-black border-b border-rose-200 text-[11px] uppercase">
                        <tr>
                          <th className="py-3 px-4 w-40">Mnemônico</th>
                          <th className="py-3 px-4">Descrição do Kit a Retirar</th>
                          <th className="py-3 px-4 w-32">Categoria</th>
                          <th className="py-3 px-4 w-32 text-right">Qtd. Total</th>
                          <th className="py-3 px-4">Locais de Origem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 text-sm">
                        {removalMnemonics.map((mne, idx) => (
                          <tr key={`rem_mne_${idx}`} className="hover:bg-rose-50/50">
                            <td className="py-3 px-4 font-mono font-black text-rose-900">{mne.mnemonicCode}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{mne.description}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                {mne.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-rose-900 text-base">
                              {mne.totalQuantity} {mne.unit}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-600 font-mono font-medium">
                              {mne.sourceLocations.join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Table of Exploded Materials to Remove */}
              {removalMaterials.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-rose-100/80 border-b border-rose-200 font-black text-xs text-rose-950 flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-700" />
                      2. Materiais Explodidos A RETIRAR ({removalMaterials.length})
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-rose-200 text-rose-950 px-2 py-0.5 rounded">
                      Itens Unitários
                    </span>
                  </div>

                  {/* Mobile View */}
                  <div className="block lg:hidden p-3 space-y-2.5">
                    {removalMaterials.map((item, idx) => (
                      <div key={`rem_mob_mat_${idx}`} className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-xs bg-white text-rose-900 px-2.5 py-0.5 rounded border border-rose-300">
                            Cód: {resolveOfficialMaterialCode(item)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                            {item.category || "Geral"}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{item.description}</div>
                        <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-rose-100">
                          <span className="text-slate-600 font-sans">Qtd. a Retirar:</span>
                          <span className="font-black text-rose-900">{(Number(item.quantity) || 0).toLocaleString("pt-BR")} {item.unit}</span>
                        </div>
                        {item.sourceStructureName && (
                          <div className="text-[10px] text-slate-600">
                            <strong>Estrutura:</strong> {item.sourceStructureName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-50 text-rose-900 font-black border-b border-rose-200 text-[11px] uppercase">
                        <tr>
                          <th className="py-3 px-4 w-36">Código</th>
                          <th className="py-3 px-4 min-w-[250px]">Descrição do Item a Retirar</th>
                          <th className="py-3 px-4 w-20 text-center">Unid.</th>
                          <th className="py-3 px-4 w-28 text-right">Quantidade</th>
                          <th className="py-3 px-4">Estrutura / Origem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 text-sm">
                        {removalMaterials.map((item, idx) => (
                          <tr key={`rem_desk_mat_${idx}`} className="hover:bg-rose-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-rose-900">
                              <span className="bg-white px-2.5 py-1 rounded-lg border border-rose-200 font-mono inline-block">
                                {resolveOfficialMaterialCode(item)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{item.description}</td>
                            <td className="py-3 px-4 text-center text-slate-600 font-bold text-xs">{item.unit}</td>
                            <td className="py-3 px-4 text-right font-mono font-black text-rose-900 text-base">
                              {(Number(item.quantity) || 0).toLocaleString("pt-BR")}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-600 font-mono font-medium">
                              {item.sourceStructureName || "Geral"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. SEPARATE SHEET: LABOR / US (FOLHA SEPARADA DE MÃO DE OBRA) */}
      {activeTab === "LABOR" && (
        <div className="p-4 sm:p-6 bg-slate-50/50">
          <LaborSheet
            laborItems={effectiveLaborItems}
            usUnitPrice={effectiveUsUnitPrice}
            totalUS={effectiveTotalUS}
            totalLaborValue={effectiveTotalLaborValue}
            totalMaterialsValue={totalExplodedValue}
            totalProjectValue={totalExplodedValue + effectiveTotalLaborValue}
            networkType={networkType}
            onUpdateNetworkType={onUpdateNetworkType}
            onUpdateLaborItems={(newItems) => {
              if (onUpdateLaborItems) onUpdateLaborItems(newItems);
            }}
            onUpdateUsUnitPrice={(newPrice) => {
              if (onUpdateUsUnitPrice) onUpdateUsUnitPrice(newPrice);
            }}
            onRecalculateFromProject={onRecalculateLabor}
          />
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">
                Incluir Novo Item Manual
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Código / Catálogo
                </label>
                <input
                  type="text"
                  placeholder="Ex: 214239"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Descrição do Material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CRUZETA MADEIRA 2800X135X110MM"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Unidade de Medida
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="M">M (Metros)</option>
                    <option value="KG">KG (Quilogramas)</option>
                    <option value="CJ">CJ (Conjunto)</option>
                    <option value="PAR">PAR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setNewCategory(cat);
                      if (cat === "MÃO-DE-OBRA") {
                        setNewUnitPrice(0);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="ESTRUTURA">Estrutura</option>
                    <option value="POSTE">Poste</option>
                    <option value="CABO">Cabo / Condutor</option>
                    <option value="EQUIPAMENTO">Equipamento</option>
                    <option value="ACESSORIO">Acessório</option>
                    <option value="MÃO-DE-OBRA">Mão de Obra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Valor Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                  {newCategory === "MÃO-DE-OBRA" && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Itens de mão de obra não são pré-preenchidos.
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg cursor-pointer font-bold"
                >
                  Confirmar Inclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR CABO E VÃOS DA REDE */}
      {showCableModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {editingCable ? "Editar Especificação de Cabo & Vãos" : "Adicionar Cabo & Vãos da Rede"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Os vãos e extensões serão somados e inseridos na lista de materiais consolidados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCableModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCableModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Especificação Técnica / Bitola do Condutor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CAA 1/0 AWG ou Cabo Multiplexado 70mm²"
                  value={cableFormType}
                  onChange={(e) => setCableFormType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[
                    "CAA 1/0 AWG",
                    "CAA 4 AWG",
                    "CAA 2 AWG",
                    "CAA 4/0 AWG",
                    "CAA 336 MCM",
                    "Multiplexado 70mm²",
                    "Multiplexado 35mm²",
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setCableFormType(preset)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 hover:bg-amber-100 text-slate-800 rounded border border-slate-200 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Nível de Tensão
                  </label>
                  <select
                    value={cableFormVoltage}
                    onChange={(e) => setCableFormVoltage(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="MT">Média Tensão (MT - 13.8kV)</option>
                    <option value="BT">Baixa Tensão (BT - 127/220V)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Status do Item
                  </label>
                  <select
                    value={cableFormStatus}
                    onChange={(e) => setCableFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="INSTALAR">INSTALAR (Novo)</option>
                    <option value="RETIRAR">RETIRAR (Desmontagem)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Quantidade de Vãos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cableFormSpans}
                    onChange={(e) => {
                      const spans = Math.max(1, Number(e.target.value) || 1);
                      setCableFormSpans(spans);
                      setCableFormMeters(spans * 35);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    (Padrão: ~35m por vão)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                    Extensão Total (Metros) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cableFormMeters}
                    onChange={(e) => setCableFormMeters(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-black text-amber-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Metragem somada do condutor
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Detalhamento dos Vãos (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: P1-P2 (35m), P2-P3 (35m), P3-P4 (35m)"
                  value={cableFormDetail}
                  onChange={(e) => setCableFormDetail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Observações do Trecho
                </label>
                <input
                  type="text"
                  placeholder="Ex: Trecho principal trifásico com condutor CAA"
                  value={cableFormNotes}
                  onChange={(e) => setCableFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCableModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg cursor-pointer font-bold"
                >
                  {editingCable ? "Salvar Alterações" : "Adicionar à Rede & Consolidar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL / SCREEN: TABELA DE PREÇOS UNITÁRIOS CADASTRADOS */}
      {showRegisteredPricesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-xs">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white tracking-tight">
                    Tabela de Preços Unitários Cadastrados (R$)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Visualização, edição direta de valores unitários e impressão da tabela oficial de cadastros
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRegisteredPricesModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código ou descrição cadastrada..."
                  value={priceSearchTerm}
                  onChange={(e) => setPriceSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Categories Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                {["TODOS", "ESTRUTURA", "POSTE", "CABO", "EQUIPAMENTO", "ACESSORIO", "MÃO-DE-OBRA"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPriceFilterCat(cat)}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                      priceFilterCat === cat
                        ? "bg-slate-900 text-white font-bold"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Actions: Print Price List & Update Market Default */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleUpdateMarketPrices}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Restaurar estimativas padrão de mercado para todos os itens"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Restaurar Médias
                </button>

                <button
                  onClick={handlePrintRegisteredPriceList}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  Imprimir Tabela de Preços
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-y-auto flex-1 p-4 bg-slate-100/50">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 w-28">Código</th>
                      <th className="py-3 px-4">Descrição do Material / Serviço Cadastrado</th>
                      <th className="py-3 px-4 w-20 text-center">Unid.</th>
                      <th className="py-3 px-4 w-28 text-center">Categoria</th>
                      <th className="py-3 px-4 w-44 text-right">Valor Unitário (R$)</th>
                      <th className="py-3 px-4 w-28 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {registeredItems.filter((item) => {
                      const matchesSearch =
                        item.code.toLowerCase().includes(priceSearchTerm.toLowerCase()) ||
                        item.description.toLowerCase().includes(priceSearchTerm.toLowerCase());
                      const matchesCat = priceFilterCat === "TODOS" || item.category === priceFilterCat;
                      return matchesSearch && matchesCat;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Nenhum item cadastrado encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      registeredItems
                        .filter((item) => {
                          const matchesSearch =
                            item.code.toLowerCase().includes(priceSearchTerm.toLowerCase()) ||
                            item.description.toLowerCase().includes(priceSearchTerm.toLowerCase());
                          const matchesCat = priceFilterCat === "TODOS" || item.category === priceFilterCat;
                          return matchesSearch && matchesCat;
                        })
                        .map((item, idx) => {
                          const isEditingThis = editingPriceCode === item.code;
                          const isCustomized = customPriceMap[item.code] !== undefined;

                          return (
                            <tr
                              key={`${item.code}_${idx}`}
                              className={`hover:bg-slate-50 transition-colors ${
                                isEditingThis ? "bg-amber-50/70" : ""
                              }`}
                            >
                              <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                                {idx + 1}
                              </td>

                              <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {item.code}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-slate-900 font-medium text-xs">
                                <div>
                                  <span>{item.description}</span>
                                  {item.inProject && (
                                    <span className="ml-2 text-[10px] text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded">
                                      No Projeto Activo
                                    </span>
                                  )}
                                  {isCustomized && (
                                    <span className="ml-1 text-[10px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.5 rounded">
                                      Valor Editado
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-center text-slate-600 font-semibold text-xs">
                                {item.unit}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                  {item.category}
                                </span>
                              </td>

                              {/* Editable Unit Price Field */}
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
                                  <span
                                    onClick={() => {
                                      setEditingPriceCode(item.code);
                                      setEditingPriceVal(item.unitPrice);
                                    }}
                                    className={`cursor-pointer font-bold px-2 py-1 rounded transition-colors ${
                                      item.unitPrice > 0
                                        ? "text-slate-900 hover:bg-amber-100 text-sm"
                                        : "text-slate-400 italic hover:bg-slate-200 text-xs"
                                    }`}
                                    title="Clique para editar o valor unitário"
                                  >
                                    {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : "R$ 0,00"}
                                  </span>
                                )}
                              </td>

                              {/* Actions Column */}
                              <td className="py-3 px-4 text-center">
                                {isEditingThis ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleSaveRegisteredPrice(item.code, editingPriceVal)}
                                      className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                                      title="Salvar novo preço unitário"
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
                                        title="Restaurar Preço de Mercado Padrão"
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

            {/* Modal Footer Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">
                Edições nos preços unitários são aplicadas automaticamente aos materiais do projeto.
              </span>
              <button
                onClick={() => setShowRegisteredPricesModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Consolidated Exploded Materials View */}
      <FullScreenExplodedView
        isOpen={isFullScreenExploded}
        onClose={() => handleToggleFullScreenExploded(false)}
        materials={materials}
        effectiveTotalUS={effectiveTotalUS}
        effectiveTotalLaborValue={effectiveTotalLaborValue}
        profitMargin={activeMargin}
        voltageLevel={voltageLevel}
        projectName={projectName}
        onUpdateMaterial={onUpdateMaterial}
        onOpenRegisteredPrices={onOpenRegisteredPrices ? onOpenRegisteredPrices : () => setShowRegisteredPricesModal(true)}
      />
    </div>
  );
};
