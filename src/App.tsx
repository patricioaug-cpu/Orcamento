import React, { useState, useEffect, useMemo } from "react";
import {
  ProjectAnalysisResult,
  IdentifiedStructure,
  CemigMaterialItem,
  SavedProject,
  CableSegment,
  ProjectVoltageLevel,
  LaborItem,
  NetworkEnvironment,
} from "./types";
import { SAMPLE_PROJECT_URBANO, SAMPLE_PROJECT_RURAL } from "./sampleProjects";
import {
  CEMIG_STRUCTURE_COMPOSITIONS,
  getMnemonicForStructure,
  getEstimatedMarketPrice,
  buildMaterialListFromStructures,
} from "./cemigDatabase";
import { calculateProjectLabor } from "./services/laborService";
import { DEFAULT_US_UNIT_PRICE } from "./data/laborCatalog";
import { MaterialsTable } from "./components/MaterialsTable";
import { StructureAuditList, StructureAuditModal } from "./components/StructureAudit";
import { ExportBar } from "./components/ExportBar";
import { KitExploderModal } from "./components/KitExploderModal";
import { RegisteredPricesModal } from "./components/RegisteredPricesModal";
import { StandaloneMaterialsModal } from "./components/StandaloneMaterialsModal";
import { MnemonicsCatalogModal } from "./components/MnemonicsCatalogModal";
import { StructureDetailModal } from "./components/StructureDetailModal";
import { UnrecognizedStructuresModal } from "./components/UnrecognizedStructuresModal";
import { HelpModal } from "./components/HelpModal";
import { CalcProLogo } from "./components/CalcProLogo";
import { SidebarDrawer } from "./components/SidebarDrawer";
import { AuthModal } from "./components/AuthModal";
import { SplashIntro } from "./components/SplashIntro";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { TrialBanner } from "./components/TrialBanner";
import { TrialExpiredModal } from "./components/TrialExpiredModal";
import {
  SafeUser,
  UserTrialInfo,
  getStoredUser,
  clearStoredUser,
  authApi,
  ADMIN_EMAIL,
  getOrCreateDeviceSerial,
} from "./services/authService";
import {
  Upload,
  FileUp,
  FileText,
  Zap,
  CheckCircle2,
  Check,
  AlertTriangle,
  FolderOpen,
  Printer,
  FileSpreadsheet,
  Save,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  X,
  Plus,
  Boxes,
  Trash2,
  RotateCcw,
  DollarSign,
  Package,
  BookOpen,
  ChevronDown,
  Sliders,
  Settings2,
  Compass,
  HelpCircle,
  Menu,
  LogOut,
  XCircle,
  Maximize2,
  Shield,
  Lock,
  User as UserIcon,
} from "lucide-react";

export const VOLTAGE_LEVEL_OPTIONS: {
  value: ProjectVoltageLevel;
  label: string;
  shortLabel: string;
  badge: string;
  category: "MT" | "RURAL" | "BT" | "AUTO";
  description: string;
}[] = [
  {
    value: "13.8kV",
    label: "13,8 kV (Padrão MT CEMIG Urbano/Rural)",
    shortLabel: "13,8 kV",
    badge: "Classe 15 kV",
    category: "MT",
    description: "Tensão primária trifásica convencional 13,8 kV / Classe 15 kV (Isoladores 15kV, Chaves 15kV, Trafo 13.8kV)",
  },
  {
    value: "34.5kV",
    label: "34,5 kV (MT Rural / Subtransmissão)",
    shortLabel: "34,5 kV",
    badge: "Classe 35 kV",
    category: "RURAL",
    description: "Tensão primária 34,5 kV / Classe 35 kV (Cruzetas reforçadas, Isoladores 35kV, Chaves 35kV, Trafo 34.5kV)",
  },
  {
    value: "7.97kV",
    label: "7,97 kV (Monofásico MT / MRT)",
    shortLabel: "7,97 kV",
    badge: "MRT 15 kV",
    category: "RURAL",
    description: "Rede primária monofásica rural com retorno por terra (MRT) ou fase-neutro 7,97 kV",
  },
  {
    value: "19.9kV",
    label: "19,9 kV (Monofásico MRT 34,5 kV)",
    shortLabel: "19,9 kV",
    badge: "MRT 35 kV",
    category: "RURAL",
    description: "Rede primária monofásica rural MRT derivada de 34,5 kV (tensão de fase 19,9 kV)",
  },
  {
    value: "BT",
    label: "Baixa Tensão (BT 380/220V ou 220/127V)",
    shortLabel: "Baixa Tensão",
    badge: "Rede BT",
    category: "BT",
    description: "Projetos exclusivos de extensão e reforma de rede secundária BT multiplexada ou convencional",
  },
  {
    value: "AUTO",
    label: "Automático / Misto (Detectar do Projeto)",
    shortLabel: "Automático",
    badge: "Auto / Misto",
    category: "AUTO",
    description: "Identifica e classifica automaticamente as classes de tensão a partir da legenda e símbolos do desenho",
  },
];

export interface ProcessingStageInfo {
  number: number;
  label: string;
  shortName: string;
  description: string;
}

export const PROCESSING_STAGES: ProcessingStageInfo[] = [
  {
    number: 1,
    label: "Leitura do Arquivo",
    shortName: "1. Leitura",
    description: "Lendo arquivo e preparando prancha técnica do projeto...",
  },
  {
    number: 2,
    label: "Mapeamento da Rede",
    shortName: "2. Mapeamento",
    description: "Mapeando postes, estruturas MT/BT, cabos e equipamentos na prancha...",
  },
  {
    number: 3,
    label: "Explosão de Mnemônicos",
    shortName: "3. Explosão",
    description: "Consultando banco oficial CEMIG e explodindo composições...",
  },
  {
    number: 4,
    label: "Consolidação de Materiais",
    shortName: "4. Totais",
    description: "Agrupando materiais repetidos e consolidando quantitativos...",
  },
];

const EMPTY_PROJECT: ProjectAnalysisResult = {
  projectName: "Nenhum projeto carregado",
  date: "",
  voltageLevel: "13.8kV",
  structures: [],
  cables: [],
  unrecognized: [],
  materials: [],
  groupedMnemonics: [],
  totalMaterialsValue: 0,
  totalProjectValue: 0,
  generalSummary: "",
};

export function normalizeItemStatus(statusRaw: unknown): "INSTALAR" | "RETIRAR" | "EXISTENTE" {
  const s = String(statusRaw || "").trim().toUpperCase();
  if (
    s === "RETIRAR" ||
    s === "A RETIRAR" ||
    s === "A_RETIRAR" ||
    s === "RETIRADA" ||
    s === "RETIRADO" ||
    s === "DESMONTAR" ||
    s === "DESMONTAGEM" ||
    s === "REMOVER" ||
    s === "REMOCAO" ||
    s === "REMOÇÃO" ||
    s === "X" ||
    s === "[X]" ||
    s === "(X)" ||
    s.includes("RETIR") ||
    s.includes("DESMONT")
  ) {
    return "RETIRAR";
  }
  if (s === "EXISTENTE" || s.startsWith("(") || s.includes("EXIST")) return "EXISTENTE";
  return "INSTALAR";
}

export default function App() {
  // User Authentication & 7-Day Trial State
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(() => getStoredUser());
  const [trialInfo, setTrialInfo] = useState<UserTrialInfo | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isTrialExpiredModalOpen, setIsTrialExpiredModalOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("rdr_rdu_splash_completed") !== "true";
    } catch {
      return true;
    }
  });

  // Sync trial info from backend on mount or user change
  useEffect(() => {
    if (currentUser?.email && currentUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setTrialInfo({
        status: "liberado",
        isAdmin: true,
        isExpired: false,
        daysRemaining: -1,
        trialInicio: "",
        trialFim: "",
        deviceBound: false,
        message: "Acesso permanente de Administrador: sempre liberado, sem tempo de trial.",
      });
      setIsTrialExpiredModalOpen(false);
      return;
    }

    if (currentUser?.id) {
      authApi
        .checkTrial(currentUser.id, currentUser.email)
        .then((info) => setTrialInfo(info))
        .catch((err) => console.warn("Erro ao consultar status de trial no servidor:", err));
    }
  }, [currentUser?.id, currentUser?.email]);

  const handleAuthSuccess = (user: SafeUser, info: UserTrialInfo) => {
    setCurrentUser(user);
    if (user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setTrialInfo({
        status: "liberado",
        isAdmin: true,
        isExpired: false,
        daysRemaining: -1,
        trialInicio: "",
        trialFim: "",
        deviceBound: false,
        message: "Acesso permanente de Administrador: sempre liberado, sem tempo de trial.",
      });
      setIsTrialExpiredModalOpen(false);
    } else {
      setTrialInfo(info);
    }
  };

  const handleLogout = () => {
    clearStoredUser();
    setCurrentUser(null);
    setTrialInfo(null);
  };

  // Current active project analysis (starts clean and empty)
  const [projectData, setProjectData] = useState<ProjectAnalysisResult>(EMPTY_PROJECT);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [currentFileType, setCurrentFileNameType] = useState<"PDF" | "JPEG">("PDF");
  const [profitMargin, setProfitMargin] = useState<number>(0);

  // US Unit Price state with localStorage persistence
  const [usUnitPrice, setUsUnitPrice] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("cemig_calcpro_us_price");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_US_UNIT_PRICE;
  });

  // Project Network Environment (RDU vs RDR) with localStorage persistence
  const [networkType, setNetworkType] = useState<NetworkEnvironment>(() => {
    try {
      const saved = localStorage.getItem("cemig_calcpro_network_type");
      if (saved === "RDR" || saved === "RDU") return saved;
    } catch (e) {}
    return "RDU";
  });

  // Selected project voltage level for assertive mnemonic search
  const [selectedVoltageLevel, setSelectedVoltageLevel] = useState<ProjectVoltageLevel>("13.8kV");
  const [isVoltageDropdownOpen, setIsVoltageDropdownOpen] = useState<boolean>(false);

  // Selection state for structure audit modal & full-screen structure detail modal
  const [selectedAuditStructure, setSelectedAuditStructure] = useState<IdentifiedStructure | null>(null);
  const [selectedStructureForDetail, setSelectedStructureForDetail] = useState<IdentifiedStructure | null>(null);
  const [isStructureDetailModalOpen, setIsStructureDetailModalOpen] = useState<boolean>(false);
  const [isFullScreenExplodedOpen, setIsFullScreenExplodedOpen] = useState<boolean>(false);

  // Open full-screen structure detail modal
  const handleOpenStructureDetail = (structure: IdentifiedStructure) => {
    setSelectedStructureForDetail(structure);
    setIsStructureDetailModalOpen(true);
  };

  // Open structure detail modal by structure code
  const handleOpenStructureDetailByCode = (code: string) => {
    const found = projectData.structures.find((s) => s.code === code) || {
      id: `ESTR_${code}`,
      code: code,
      type: (code.startsWith("M") ? "MT" : code.startsWith("B") ? "BT" : "MT") as any,
      level: "(1)",
      status: "INSTALAR" as any,
      description: `Estrutura ${code}`,
      associatedPost: "11-300",
      locationHint: `Estrutura ${code}`,
      computedMaterials: [],
    };
    setSelectedStructureForDetail(found);
    setIsStructureDetailModalOpen(true);
  };

  // Save edited structure components & recalculate consolidated materials
  const handleSaveStructureDetail = (
    updatedStructure: IdentifiedStructure,
    applyToAll: boolean
  ) => {
    let updatedStructures = [...projectData.structures];
    if (applyToAll) {
      updatedStructures = updatedStructures.map((s) =>
        s.code === updatedStructure.code
          ? {
              ...s,
              computedMaterials: (updatedStructure.computedMaterials || []).map((m, idx) => ({
                ...m,
                id: `${s.id}_mat_${idx}_${Date.now()}`,
                sourceStructureId: s.id,
                sourceStructureName: `Estrutura ${s.code} (${s.id})`,
              })),
            }
          : s
      );
    } else {
      updatedStructures = updatedStructures.map((s) =>
        s.id === updatedStructure.id ? updatedStructure : s
      );
    }

    // Helper: normalize unit (standard discrete unit PEÇ/UN)
    const normalizeUnit = (u?: string) => {
      const norm = (u || "PEÇ").trim().toUpperCase();
      if (norm === "UN" || norm === "PC" || norm === "PÇ" || norm === "UNIDADE") return "PEÇ";
      return norm;
    };

    // Helper: build unique consolidation key for matching identical materials
    const getConsolidationKey = (item: {
      code?: string;
      codigo?: string | null;
      description: string;
      unit?: string;
      status?: string;
    }) => {
      const status = normalizeItemStatus(item.status);
      const unit = normalizeUnit(item.unit);
      const cleanDesc = (item.description || "")
        .replace(/^\[A RETIRAR\]\s*/i, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

      const numCode =
        item.codigo && /^\d+$/.test(item.codigo.trim())
          ? item.codigo.trim()
          : item.code && /^\d+$/.test(item.code.trim())
          ? item.code.trim()
          : null;

      if (numCode) {
        return `COD_${numCode}__${unit}__${status}`;
      }
      return `DESC_${cleanDesc}__${unit}__${status}`;
    };

    // Helper: retrieve or compute materials for a structure
    const getStructureMaterials = (s: IdentifiedStructure): CemigMaterialItem[] => {
      if (s.computedMaterials && s.computedMaterials.length > 0) {
        return s.computedMaterials;
      }
      const mneCode = s.mnemonicCode || getMnemonicForStructure(s.code, s.associatedPost, s.type);
      const baseCode = s.code.toUpperCase().replace(/\(.*\)/, "").trim();
      const comp =
        CEMIG_STRUCTURE_COMPOSITIONS[mneCode] ||
        CEMIG_STRUCTURE_COMPOSITIONS[baseCode] ||
        CEMIG_STRUCTURE_COMPOSITIONS[s.code];
      if (comp && comp.items && comp.items.length > 0) {
        return comp.items.map((i, idx) => ({
          id: `${s.id}_auto_${idx}`,
          code: i.code,
          codigo: /^\d+$/.test(i.code) ? i.code : null,
          statusCodigo: /^\d+$/.test(i.code) ? "ENCONTRADO" : "NAO_ENCONTRADO",
          description:
            s.status === "RETIRAR" && !i.description.startsWith("[A RETIRAR]")
              ? `[A RETIRAR] ${i.description}`
              : i.description,
          unit: normalizeUnit(i.unit),
          quantity: i.qtyPerUnit,
          sourceStructureId: s.id,
          sourceStructureName: `Estrutura ${s.code} (${s.id})`,
          category: (comp.type === "POSTE" ? "POSTE" : comp.type === "ESTAI" ? "ACESSORIO" : "ESTRUTURA") as any,
          status: s.status,
        }));
      }
      return [];
    };

    // Consolida componentes idênticos de todas as estruturas na lista final de materiais explodida
    const materialMap = new Map<string, CemigMaterialItem>();

    // 1. Process all structures in the project
    for (const s of updatedStructures) {
      if (s.status === "EXISTENTE") continue;
      const structMaterials = getStructureMaterials(s);

      for (const item of structMaterials) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        const itemStatus = normalizeItemStatus(item.status || s.status || "INSTALAR");
        const key = getConsolidationKey({ ...item, status: itemStatus });
        const existing = materialMap.get(key);

        if (existing) {
          existing.quantity += qty;
          if (!existing.codigo && item.codigo) {
            existing.codigo = item.codigo;
            existing.statusCodigo = item.statusCodigo || "ENCONTRADO";
            if (existing.code === "NÃO ENCONTRADO" || !existing.code) {
              existing.code = item.codigo;
            }
          }
        } else {
          const itemDesc = item.description || item.code || "Material";
          const formattedDesc =
            itemStatus === "RETIRAR" && !itemDesc.startsWith("[A RETIRAR]")
              ? `[A RETIRAR] ${itemDesc}`
              : itemDesc;

          materialMap.set(key, {
            ...item,
            id: `consolidated_${key.replace(/[^a-zA-Z0-9_]/g, "_")}`,
            description: formattedDesc,
            unit: normalizeUnit(item.unit),
            status: itemStatus,
            quantity: qty,
            unitPrice:
              item.unitPrice ||
              getEstimatedMarketPrice(item.code || item.codigo || "", item.category, item.description),
          });
        }
      }
    }

    // 2. Retain non-structure materials (cables, manual additions, standalone items)
    for (const m of projectData.materials) {
      if (m.id.startsWith("manual_") || m.category === "CABO" || !m.sourceStructureId) {
        const key = getConsolidationKey(m);
        if (!materialMap.has(key)) {
          materialMap.set(key, {
            ...m,
            id: m.id || `mat_${key.replace(/[^a-zA-Z0-9_]/g, "_")}`,
            unit: normalizeUnit(m.unit),
            quantity: Number(m.quantity) || 0,
            unitPrice:
              m.unitPrice ||
              getEstimatedMarketPrice(m.code || m.codigo || "", m.category, m.description),
          });
        }
      }
    }

    // 3. Synchronize grouped mnemonics composition items if present
    let updatedGroupedMnemonics = projectData.groupedMnemonics;
    if (updatedGroupedMnemonics && updatedGroupedMnemonics.length > 0) {
      updatedGroupedMnemonics = updatedGroupedMnemonics.map((gm) => {
        if (
          gm.mnemonicCode === updatedStructure.code ||
          gm.mnemonicCode === updatedStructure.mnemonicCode
        ) {
          return {
            ...gm,
            compositionItems: (updatedStructure.computedMaterials || []).map((m) => ({
              code: m.code || m.codigo || "NÃO ENCONTRADO",
              description: m.description,
              unit: normalizeUnit(m.unit),
              qtyPerUnit: m.quantity,
            })),
          };
        }
        return gm;
      });
    }

    const consolidated = Array.from(materialMap.values()).sort((a, b) =>
      a.description.localeCompare(b.description)
    );

    setProjectData((prev) => ({
      ...prev,
      structures: updatedStructures,
      materials: consolidated,
      groupedMnemonics: updatedGroupedMnemonics,
    }));
    setHasSaved(false);
  };

  // Modals & Drawer state
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState<boolean>(false);
  const [isKitExploderOpen, setIsKitExploderOpen] = useState<boolean>(false);
  const [isRegisteredPricesOpen, setIsRegisteredPricesOpen] = useState<boolean>(false);
  const [isStandaloneMaterialsOpen, setIsStandaloneMaterialsOpen] = useState<boolean>(false);
  const [isMnemonicsCatalogOpen, setIsMnemonicsCatalogOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isUnrecognizedModalOpen, setIsUnrecognizedModalOpen] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Processing / Progress state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [processingStatusText, setProcessingStatusText] = useState<string>("");
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isCancelledRef = React.useRef<boolean>(false);

  // Cancel ongoing project loading/processing
  const handleCancelProcessing = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProcessingStep(1);
    setProgressPercent(0);
    setProcessingStatusText("");
    setAnalysisErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (!projectData.structures.length && !projectData.materials.length) {
      setCurrentFileName("");
    }
    setSaveToast({
      show: true,
      type: "error",
      message: "Carregamento do projeto cancelado com sucesso.",
    });
    setTimeout(() => {
      setSaveToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Saved projects history (localStorage)
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<SavedProject | null>(null);
  const [showClearAllSavedConfirm, setShowClearAllSavedConfirm] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<{
    show: boolean;
    type: "saving" | "success" | "error";
    message: string;
  }>({
    show: false,
    type: "saving",
    message: "",
  });

  // Clear modal confirmation state
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState<string | null>(null);

  // Clear all loaded project data
  const handleClearData = () => {
    setProjectData(EMPTY_PROJECT);
    setProfitMargin(0);
    setCurrentFileName("");
    setCurrentFileNameType("PDF");
    setHasSaved(false);
    setShowClearConfirmModal(false);
  };

  // Exit application session
  const handleExitApp = () => {
    setProjectData(EMPTY_PROJECT);
    setProfitMargin(0);
    setCurrentFileName("");
    setCurrentFileNameType("PDF");
    setHasSaved(false);
    setShowExitConfirmModal(false);
    setIsSidebarDrawerOpen(false);
    setSaveToast({
      show: true,
      type: "success",
      message: "Sessão encerrada. O aplicativo está pronto para um novo projeto.",
    });
    setTimeout(() => {
      setSaveToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Load saved projects on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cemig_saved_projects");
      if (stored) {
        setSavedProjects(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
  }, []);

  // Delete a specific saved project from history
  const handleDeleteSavedProject = (id: string) => {
    const targetProj = savedProjects.find((p) => p.id === id);
    const updated = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(updated);
    try {
      localStorage.setItem("cemig_saved_projects", JSON.stringify(updated));
      setSaveToast({
        show: true,
        type: "success",
        message: `Lista "${targetProj?.name || "selecionada"}" excluída com sucesso!`,
      });
      setTimeout(() => {
        setSaveToast((prev) => ({ ...prev, show: false }));
      }, 3500);
    } catch (e) {
      console.error("Erro ao excluir lista salva:", e);
    }
    setProjectToDelete(null);
  };

  // Clear all saved projects from history
  const handleClearAllSavedProjects = () => {
    setSavedProjects([]);
    try {
      localStorage.removeItem("cemig_saved_projects");
      setSaveToast({
        show: true,
        type: "success",
        message: "Todas as listas salvas foram excluídas do histórico.",
      });
      setTimeout(() => {
        setSaveToast((prev) => ({ ...prev, show: false }));
      }, 3500);
    } catch (e) {
      console.error("Erro ao limpar histórico de listas:", e);
    }
    setShowClearAllSavedConfirm(false);
  };

  // Update materials when project structures or cables change
  const handleUpdateMaterials = (updatedMaterials: CemigMaterialItem[]) => {
    setProjectData((prev) => {
      const totalMaterialsValue = updatedMaterials.reduce((acc, m) => {
        const basePrice = m.unitPrice !== undefined && m.unitPrice > 0 ? m.unitPrice : getEstimatedMarketPrice(m.code, m.category, m.description);
        return acc + m.quantity * basePrice;
      }, 0);
      const laborVal = prev.totalLaborValue || 0;
      return {
        ...prev,
        materials: updatedMaterials,
        totalMaterialsValue,
        totalProjectValue: Number((totalMaterialsValue + laborVal).toFixed(2)),
      };
    });
    setHasSaved(false);
  };

  // Update cable segments, recalculating grouped mnemonics, consolidated materials and labor
  const handleUpdateCables = (newCables: CableSegment[]) => {
    setProjectData((prev) => {
      const { materials, groupedMnemonics } = buildMaterialListFromStructures(
        prev.structures,
        newCables
      );

      const totalMaterialsValue = materials.reduce((acc, m) => {
        const basePrice = m.unitPrice !== undefined && m.unitPrice > 0 ? m.unitPrice : getEstimatedMarketPrice(m.code, m.category, m.description);
        return acc + m.quantity * basePrice;
      }, 0);

      const currentPrice = prev.usUnitPrice !== undefined ? prev.usUnitPrice : usUnitPrice;
      const currentNetType = prev.networkType || networkType;
      const laborRes = calculateProjectLabor(
        {
          structures: prev.structures,
          cables: newCables,
          voltageLevel: prev.voltageLevel,
          networkType: currentNetType,
        },
        currentPrice,
        currentNetType
      );

      return {
        ...prev,
        cables: newCables,
        groupedMnemonics,
        materials,
        totalMaterialsValue,
        laborItems: laborRes.items,
        totalUS: laborRes.totalUS,
        totalLaborValue: laborRes.totalLaborValue,
        totalProjectValue: Number((totalMaterialsValue + laborRes.totalLaborValue).toFixed(2)),
      };
    });
    setHasSaved(false);
  };

  // Update US unit price and recalculate totals
  const handleUpdateUsUnitPrice = (newPrice: number) => {
    const safePrice = Math.max(0, Number(newPrice) || 0);
    setUsUnitPrice(safePrice);
    try {
      localStorage.setItem("cemig_calcpro_us_price", safePrice.toString());
    } catch (e) {}

    setProjectData((prev) => {
      const currentLaborItems = prev.laborItems || [];
      const updatedLaborItems = currentLaborItems.map((item) => {
        const itemTotalValue = Number((item.totalUS * safePrice).toFixed(2));
        return {
          ...item,
          usUnitPrice: safePrice,
          totalValue: itemTotalValue,
        };
      });
      const totalLaborValue = Number(((prev.totalUS || 0) * safePrice).toFixed(2));
      const totalMaterialsValue = prev.totalMaterialsValue || 0;
      return {
        ...prev,
        usUnitPrice: safePrice,
        laborItems: updatedLaborItems,
        totalLaborValue,
        totalProjectValue: Number((totalMaterialsValue + totalLaborValue).toFixed(2)),
      };
    });
  };

  // Update labor items from table edits and recalculate totals
  const handleUpdateLaborItems = (newItems: LaborItem[]) => {
    setProjectData((prev) => {
      const currentPrice = prev.usUnitPrice !== undefined ? prev.usUnitPrice : usUnitPrice;
      const totalUS = Number(newItems.reduce((acc, i) => acc + i.totalUS, 0).toFixed(2));
      const totalLaborValue = Number((totalUS * currentPrice).toFixed(2));
      const totalMaterialsValue = prev.totalMaterialsValue || 0;
      return {
        ...prev,
        laborItems: newItems,
        totalUS,
        totalLaborValue,
        totalProjectValue: Number((totalMaterialsValue + totalLaborValue).toFixed(2)),
      };
    });
    setHasSaved(false);
  };

  // Update Network Environment (RDU vs RDR) and recalculate labor
  const handleUpdateNetworkType = (newType: NetworkEnvironment) => {
    setNetworkType(newType);
    try {
      localStorage.setItem("cemig_calcpro_network_type", newType);
    } catch (e) {}

    setProjectData((prev) => {
      const currentPrice = prev.usUnitPrice !== undefined ? prev.usUnitPrice : usUnitPrice;
      const laborRes = calculateProjectLabor(
        {
          structures: prev.structures,
          cables: prev.cables,
          voltageLevel: prev.voltageLevel,
          networkType: newType,
        },
        currentPrice,
        newType
      );
      const totalMaterialsValue = prev.totalMaterialsValue || 0;
      return {
        ...prev,
        networkType: newType,
        laborItems: laborRes.items,
        totalUS: laborRes.totalUS,
        usUnitPrice: laborRes.usUnitPrice,
        totalLaborValue: laborRes.totalLaborValue,
        totalProjectValue: Number((totalMaterialsValue + laborRes.totalLaborValue).toFixed(2)),
      };
    });
    setHasSaved(false);
  };

  // Recalculate labor directly from project structures and cables
  const handleRecalculateLabor = () => {
    setProjectData((prev) => {
      const currentPrice = prev.usUnitPrice !== undefined ? prev.usUnitPrice : usUnitPrice;
      const currentNetType = prev.networkType || networkType;
      const laborRes = calculateProjectLabor(
        {
          structures: prev.structures,
          cables: prev.cables,
          voltageLevel: prev.voltageLevel,
          networkType: currentNetType,
        },
        currentPrice,
        currentNetType
      );
      const totalMaterialsValue = prev.totalMaterialsValue || 0;
      return {
        ...prev,
        networkType: currentNetType,
        laborItems: laborRes.items,
        totalUS: laborRes.totalUS,
        usUnitPrice: laborRes.usUnitPrice,
        totalLaborValue: laborRes.totalLaborValue,
        totalProjectValue: Number((totalMaterialsValue + laborRes.totalLaborValue).toFixed(2)),
      };
    });
  };

  // Merge materials exploded from Kit Exploder Tool into current project
  const handleAddMaterialsFromKitExploder = (materialsToAdd: CemigMaterialItem[]) => {
    setProjectData((prev) => {
      const currentMap = new Map<string, CemigMaterialItem>();

      // Index existing materials
      prev.materials.forEach((item) => {
        const key = item.code || item.description;
        currentMap.set(key, { ...item });
      });

      // Merge new exploded materials
      materialsToAdd.forEach((newItem) => {
        const key = newItem.code || newItem.description;
        if (currentMap.has(key)) {
          const existing = currentMap.get(key)!;
          existing.quantity += newItem.quantity;
        } else {
          currentMap.set(key, { ...newItem });
        }
      });

      return {
        ...prev,
        projectName:
          prev.projectName === "Nenhum projeto carregado"
            ? "Projeto com Kits Explodidos"
            : prev.projectName,
        materials: Array.from(currentMap.values()),
      };
    });
    setHasSaved(false);
  };

  // Save current project to local history with visual feedback and status messages
  const handleSaveLocalProject = async () => {
    if (
      projectData.materials.length === 0 &&
      projectData.structures.length === 0 &&
      !currentFileName &&
      projectData.projectName === "Nenhum projeto carregado"
    ) {
      setSaveToast({
        show: true,
        type: "error",
        message: "Nenhuma lista de materiais ou projeto carregado para salvar.",
      });
      setTimeout(() => {
        setSaveToast((prev) => ({ ...prev, show: false }));
      }, 3500);
      return;
    }

    setIsSaving(true);
    setSaveToast({
      show: true,
      type: "saving",
      message: "Salvando lista de materiais e composições no histórico local...",
    });

    // Short graceful delay to provide clear visual feedback to the user
    await new Promise((resolve) => setTimeout(resolve, 600));

    const projectNameClean =
      projectData.projectName && projectData.projectName !== "Nenhum projeto carregado"
        ? projectData.projectName
        : currentFileName || "Lista de Materiais";

    const newSaved: SavedProject = {
      id: `proj_${Date.now()}`,
      name: projectNameClean,
      savedAt: new Date().toLocaleString("pt-BR"),
      analysis: {
        ...projectData,
        voltageLevel: selectedVoltageLevel,
        profitMargin,
      },
    };

    const updatedList = [newSaved, ...savedProjects.filter((p) => p.name !== newSaved.name)];
    setSavedProjects(updatedList);
    try {
      localStorage.setItem("cemig_saved_projects", JSON.stringify(updatedList));
      setHasSaved(true);
      setIsSaving(false);
      setSaveToast({
        show: true,
        type: "success",
        message: `Lista "${newSaved.name}" salva com sucesso no histórico local!`,
      });
      setTimeout(() => {
        setSaveToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    } catch (e) {
      console.error("Erro ao salvar projeto:", e);
      setIsSaving(false);
      setSaveToast({
        show: true,
        type: "error",
        message: "Erro ao gravar a lista no armazenamento local.",
      });
      setTimeout(() => {
        setSaveToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  // Load a previously saved project from history
  const handleLoadSavedProject = (proj: SavedProject) => {
    const analysis = proj.analysis || ({} as any);
    const voltageLevel = analysis.voltageLevel || "13.8kV";

    const totalMaterialsValue =
      analysis.totalMaterialsValue !== undefined
        ? analysis.totalMaterialsValue
        : (analysis.materials || []).reduce((acc: number, m: any) => {
            const basePrice =
              m.unitPrice !== undefined && m.unitPrice > 0
                ? m.unitPrice
                : getEstimatedMarketPrice(m.code, m.category, m.description);
            return acc + (Number(m.quantity) || 0) * basePrice;
          }, 0);

    const safeAnalysis: ProjectAnalysisResult = {
      ...EMPTY_PROJECT,
      ...analysis,
      voltageLevel,
      totalMaterialsValue: Number(totalMaterialsValue) || 0,
      totalProjectValue: Number(totalMaterialsValue || 0),
    };

    setProjectData(safeAnalysis);
    if (analysis.voltageLevel) {
      setSelectedVoltageLevel(analysis.voltageLevel);
    }
    if (analysis.networkType) {
      setNetworkType(analysis.networkType);
    }
    setProfitMargin(analysis.profitMargin || 0);
    setCurrentFileName(proj.name);
    setHasSaved(true);
  };

  // Handle Preset Examples
  const handleLoadPreset = (presetType: "URBANO" | "RURAL") => {
    if (presetType === "URBANO") {
      setProjectData(SAMPLE_PROJECT_URBANO);
      setSelectedVoltageLevel("13.8kV");
      setNetworkType("RDU");
      setProfitMargin(0);
      setCurrentFileName("PROJ_EXP_URB_03.jpg");
      setCurrentFileNameType("JPEG");
    } else {
      setProjectData(SAMPLE_PROJECT_RURAL);
      setSelectedVoltageLevel("34.5kV");
      setNetworkType("RDR");
      setProfitMargin(0);
      setCurrentFileName("PROJ_RURAL_FAZENDA.pdf");
      setCurrentFileNameType("PDF");
    }
    setHasSaved(false);
  };

  // Helper to prepare and optimize file for upload without loss of symbol clarity
  const prepareFileForUpload = async (file: File): Promise<{ base64Data: string; mimeType: string }> => {
    const fileNameLower = file.name.toLowerCase();
    const isPdf = file.type.includes("pdf") || fileNameLower.endsWith(".pdf");

    if (isPdf) {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        const timer = setTimeout(() => {
          reject(new Error("Tempo limite excedido ao ler o arquivo PDF. Tente novamente com um arquivo menor."));
        }, 30000);

        reader.onload = () => {
          clearTimeout(timer);
          const result = reader.result as string;
          const base64Clean = result.split(",")[1] || result;
          resolve(base64Clean);
        };
        reader.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };
        reader.readAsDataURL(file);
      });
      return { base64Data, mimeType: "application/pdf" };
    }

    // High-resolution image canvas optimization (avoids oversized HTTP payloads while preserving crisp text/symbols)
    return new Promise<{ base64Data: string; mimeType: string }>((resolve, reject) => {
      const reader = new FileReader();
      const fallbackTimer = setTimeout(() => {
        // Safe fallback if canvas takes too long: read raw dataURL
        try {
          const raw = (reader.result as string) || "";
          if (raw) {
            resolve({ base64Data: raw.split(",")[1] || raw, mimeType: file.type || "image/jpeg" });
          } else {
            reject(new Error("Tempo limite ao processar a imagem do projeto."));
          }
        } catch {
          reject(new Error("Falha ao ler o arquivo de imagem."));
        }
      }, 15000);

      reader.onload = (e) => {
        const rawResult = (e.target?.result as string) || "";
        if (!rawResult) {
          clearTimeout(fallbackTimer);
          reject(new Error("Não foi possível ler os dados do arquivo selecionado."));
          return;
        }

        const img = new Image();
        img.onload = () => {
          clearTimeout(fallbackTimer);
          try {
            const maxDim = 2560;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.90);
              const base64 = dataUrl.split(",")[1] || dataUrl;
              resolve({ base64Data: base64, mimeType: "image/jpeg" });
              return;
            }
            resolve({ base64Data: rawResult.split(",")[1] || rawResult, mimeType: file.type || "image/jpeg" });
          } catch {
            resolve({ base64Data: rawResult.split(",")[1] || rawResult, mimeType: file.type || "image/jpeg" });
          }
        };
        img.onerror = () => {
          clearTimeout(fallbackTimer);
          // Fallback to raw base64 if Image constructor fails on certain raster formats
          resolve({ base64Data: rawResult.split(",")[1] || rawResult, mimeType: file.type || "image/jpeg" });
        };
        img.src = rawResult;
      };
      reader.onerror = (err) => {
        clearTimeout(fallbackTimer);
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  };

  // Core File Upload and Processing Function
  const processSelectedFile = async (file: File) => {
    // 7-Day Trial Validation Guard (O administrador nunca é barrado e não possui trial)
    const isUserAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (!isUserAdmin && trialInfo?.isExpired && currentUser?.status !== "liberado") {
      setIsTrialExpiredModalOpen(true);
      return;
    }

    isCancelledRef.current = false;
    setLastUploadedFile(file);
    setAnalysisErrorMessage(null);

    const fileNameLower = file.name.toLowerCase();
    const isPdf = file.type.includes("pdf") || fileNameLower.endsWith(".pdf");
    setCurrentFileName(file.name);
    setCurrentFileNameType(isPdf ? "PDF" : "JPEG");
    setIsProcessing(true);
    setProcessingStep(1);
    setProgressPercent(20);
    setProcessingStatusText("Lendo arquivo e preparando prancha técnica do projeto...");

    try {
      // Step 1: Convert & optimize file payload
      const { base64Data, mimeType } = await prepareFileForUpload(file);

      if (isCancelledRef.current) return;

      setProcessingStep(2);
      setProgressPercent(45);
      setProcessingStatusText("Mapeando postes, estruturas MT/BT, cabos e equipamentos na prancha...");

      // Step 2: Call Server API endpoint with selected voltageLevel, AbortController and connection retry
      let response: Response | null = null;
      let lastFetchErr: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (isCancelledRef.current) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

        try {
          if (attempt > 0) {
            setProcessingStatusText(`Reconectando com o serviço de análise (tentativa ${attempt + 1}/3)...`);
          }
          response = await fetch("/api/analyze-project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
              fileName: file.name,
              voltageLevel: selectedVoltageLevel,
              userId: currentUser?.id,
              userEmail: currentUser?.email,
              deviceSerial: getOrCreateDeviceSerial(),
            }),
          });
          clearTimeout(timeoutId);
          if (response) {
            if ((response.status === 503 || response.status === 429) && attempt < 2) {
              setProcessingStatusText(`Serviço temporariamente ocupado (${response.status}). Reconectando em instantes...`);
              await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
              continue;
            }
            break;
          }
        } catch (networkErr: any) {
          clearTimeout(timeoutId);
          if (isCancelledRef.current || networkErr?.name === "AbortError") {
            return;
          }
          lastFetchErr = networkErr;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }

      if (isCancelledRef.current) return;

      if (!response) {
        throw new Error(
          `Falha de comunicação com o servidor (${lastFetchErr?.message || "conexão recusada"}). Por favor, tente novamente ou verifique se o arquivo não excede o limite de upload.`
        );
      }

      setProcessingStep(3);
      setProgressPercent(75);
      setProcessingStatusText("Consultando base de mnemônicos CEMIG e explodindo componentes...");

      let resJson: any;
      try {
        resJson = await response.json();
      } catch (jsonErr) {
        if (isCancelledRef.current) return;
        if (response.status === 413) {
          throw new Error("Arquivo muito grande para o servidor (HTTP 413). Reduza o tamanho ou resolução do arquivo.");
        }
        if (response.status === 504 || response.status === 502) {
          throw new Error(`Servidor temporariamente ocupado (HTTP ${response.status}). Tente novamente em instantes.`);
        }
        if (response.status === 404) {
          throw new Error(
            "Servidor da API não encontrado (HTTP 404). O endpoint /api/analyze-project não respondeu. Certifique-se de que o backend da aplicação foi implantado corretamente com a rota de API."
          );
        }
        throw new Error(`Erro na resposta do servidor (HTTP ${response.status}).`);
      }

      if (isCancelledRef.current) return;

      if (!response.ok) {
        if (response.status === 403 || resJson?.trialExpired) {
          setIsTrialExpiredModalOpen(true);
        }
        if (response.status === 404) {
          throw new Error(
            "Servidor da API não encontrado (HTTP 404). O endpoint /api/analyze-project não respondeu. Certifique-se de que o backend da aplicação foi implantado corretamente com a rota de API."
          );
        }
        throw new Error(
          resJson?.error || `Erro na análise do projeto (Código HTTP ${response.status}).`
        );
      }

      if (resJson.success && resJson.data) {
        const rawData = resJson.data;

        // Process AI output structures
        const aiStructures: IdentifiedStructure[] = (rawData.detectedStructures || []).map(
          (s: any, idx: number) => ({
            id: s.id || `P${idx + 1}`,
            code: s.code || "N1",
            type: (s.voltage === "BT" ? "BT" : s.type === "TRANSFORMADOR" ? "TRANSFORMADOR" : s.type === "ESTAI" ? "ESTAI" : s.type === "EQUIPAMENTO" ? "EQUIPAMENTO" : "MT") as any,
            level: s.level || "(1)",
            status: normalizeItemStatus(s.status),
            description: s.description || `Estrutura ${s.code || s.id}`,
            associatedPost: s.associatedPost || s.typeSpec || "11-300",
            locationHint: s.locationHint || `Poste ${s.id}`,
            computedMaterials: [],
          })
        );

        // Ensure every pole listed in detectedPoles is represented in aiStructures
        const existingPoleIds = new Set(aiStructures.map((s) => s.id));
        if (Array.isArray(rawData.detectedPoles)) {
          rawData.detectedPoles.forEach((p: any, idx: number) => {
            const poleId = p.id || `P${idx + 1}`;
            if (!existingPoleIds.has(poleId)) {
              existingPoleIds.add(poleId);
              aiStructures.push({
                id: poleId,
                code: p.mnemonicCode || p.typeSpec || "POSTE",
                type: "POSTE",
                level: "(1)",
                status: normalizeItemStatus(p.status),
                description: `Poste e Estrutura ${poleId} (${p.typeSpec || "11-300"})`,
                associatedPost: p.typeSpec || "11-300",
                locationHint: `Poste ${poleId} identificado na planta`,
                computedMaterials: [],
              });
            }
          });
        }

        // Sort structures by Pole ID numerical order (P1, P2, P3... P10, P11...)
        aiStructures.sort((a, b) => {
          const numA = parseInt(a.id.replace(/\D/g, "")) || 0;
          const numB = parseInt(b.id.replace(/\D/g, "")) || 0;
          return numA - numB;
        });

        // Process AI output cables with exact spans count and summed lengths by specification
        const aiCables: CableSegment[] = (rawData.detectedCables || []).map(
          (c: any, idx: number) => ({
            id: c.id || `C${idx + 1}`,
            cableType: c.cableType || "CAA 1/0 AWG",
            mnemonicCode: c.mnemonicCode,
            voltage: c.voltage === "BT" ? "BT" : "MT",
            spansCount: Number(c.spansCount) || 1,
            estimatedLengthMeters: Number(c.estimatedLengthMeters) || 35,
            spansDetail: c.spansDetail,
            fromPole: c.fromPole,
            toPole: c.toPole,
            status: normalizeItemStatus(c.status),
            notes: c.notes,
            computedMaterials: [],
          })
        );

        const official = rawData.officialProcessing;
        if (!official) {
          throw new Error("O backend não retornou o processamento do catálogo oficial.");
        }

        const materials = official.materials || [];
        const groupedMnemonics = official.groupedMnemonics || [];
        const structureItemMap = official.structureItemMap || {};

        setProcessingStep(4);
        setProgressPercent(92);
        setProcessingStatusText("Consolidando quantitativos de materiais, cabos e mão de obra...");

        const updatedStructures = aiStructures.map((s) => ({
          ...s,
          computedMaterials: structureItemMap[s.id] || [],
        }));

        const totalMaterialsValue = materials.reduce((acc: number, m: any) => {
          const basePrice = m.unitPrice !== undefined && m.unitPrice > 0 ? m.unitPrice : getEstimatedMarketPrice(m.code, m.category, m.description);
          return acc + m.quantity * basePrice;
        }, 0);

        const laborResult = calculateProjectLabor(
          {
            structures: updatedStructures,
            cables: aiCables,
            voltageLevel: selectedVoltageLevel,
            networkType,
          },
          usUnitPrice,
          networkType
        );

        const newProject: ProjectAnalysisResult = {
          projectName: `Projeto: ${file.name.replace(/\.[^/.]+$/, "")}`,
          date: new Date().toLocaleDateString("pt-BR"),
          voltageLevel: selectedVoltageLevel,
          networkType,
          structures: updatedStructures,
          cables: aiCables,
          unrecognized: rawData.unrecognizedItems || [],
          materials,
          groupedMnemonics,
          mnemonicosNaoEncontrados: official.mnemonicosNaoEncontrados || [],
          catalogStats: official.catalogStats,
          laborItems: laborResult.items,
          totalUS: laborResult.totalUS,
          usUnitPrice: laborResult.usUnitPrice,
          totalLaborValue: laborResult.totalLaborValue,
          totalMaterialsValue,
          totalProjectValue: Number((totalMaterialsValue + laborResult.totalLaborValue).toFixed(2)),
          generalSummary:
            rawData.generalSummary ||
            `Análise realizada automaticamente para o arquivo ${file.name} (Tensão: ${selectedVoltageLevel}).`,
        };

        if (isCancelledRef.current) return;

        setProjectData(newProject);
        setAnalysisErrorMessage(null);
      } else {
        throw new Error(resJson.error || "O servidor não retornou uma análise válida.");
      }

      setProgressPercent(100);
      setProcessingStatusText("Lista final de materiais consolidada com sucesso!");
    } catch (err: any) {
      if (isCancelledRef.current || err?.name === "AbortError" || String(err?.message || "").includes("aborted")) {
        console.log("Processamento do arquivo cancelado pelo usuário.");
        return;
      }
      console.error("Erro na leitura do projeto:", err);
      const errMsg = err?.message || "Erro desconhecido ao processar o arquivo.";
      setAnalysisErrorMessage(errMsg);
      setProjectData({
        ...EMPTY_PROJECT,
        projectName: `Falha na análise: ${file.name}`,
        date: new Date().toLocaleDateString("pt-BR"),
        voltageLevel: selectedVoltageLevel,
        generalSummary: `Não foi possível concluir a análise. Nenhuma estrutura, mnemônico ou material foi inventado. Detalhes: ${errMsg}`,
      });
      setProcessingStep(1);
      setProgressPercent(0);
      setProcessingStatusText("Falha na análise. Nenhum dado fictício foi gerado.");
    } finally {
      abortControllerRef.current = null;
      if (!isCancelledRef.current) {
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStep(1);
          setHasSaved(false);
        }, 600);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Always reset input value immediately so re-uploading the same file works reliably
    event.target.value = "";
    if (!file) return;
    await processSelectedFile(file);
  };

  // Drag & drop support
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const currentVoltageInfo = useMemo(() => {
    return VOLTAGE_LEVEL_OPTIONS.find((v) => v.value === selectedVoltageLevel) || VOLTAGE_LEVEL_OPTIONS[0];
  }, [selectedVoltageLevel]);

  const structuresSummary = useMemo(() => {
    const map: Record<string, number> = {};
    projectData.structures.forEach((s) => {
      map[s.code] = (map[s.code] || 0) + 1;
    });
    return Object.entries(map).map(([code, count]) => ({ code, count }));
  }, [projectData.structures]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      {/* 1. HEADER BAR - CalcPro Professional Top Command Header with Top-Left Drawer Menu */}
      <header className="bg-[#1e293b] text-white shadow-md z-30 border-b border-slate-700/80 px-3 sm:px-6 py-2.5 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Top-Left Hamburger Menu Trigger Button + Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              id="btn-open-sidebar-menu"
              onClick={() => setIsSidebarDrawerOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 border border-amber-500/40 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer select-none shrink-0"
              title="Abrir Menu Lateral de Ferramentas, Catálogos e Configurações"
            >
              <Menu className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Menu</span>
            </button>

            <CalcProLogo />
          </div>

          {/* Right: User Status, Trial, Exclusive Admin Button & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* If actively processing, show indicator in header for larger screens */}
            {isProcessing && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-amber-300 font-medium mr-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="truncate max-w-[150px]">{currentFileName || "Carregando..."}</span>
                <span className="font-bold">({progressPercent}%)</span>
              </div>
            )}

            {/* Trial Status Badge */}
            {currentUser && trialInfo && (
              <div className="hidden md:flex items-center">
                {currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || trialInfo.isAdmin ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Acesso Ilimitado (Admin)
                  </span>
                ) : trialInfo.status === "liberado" ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Liberado
                  </span>
                ) : trialInfo.status === "bloqueado" ? (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Bloqueado
                  </span>
                ) : (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      trialInfo.isExpired
                        ? "bg-red-500/20 border border-red-400/40 text-red-300"
                        : "bg-amber-500/20 border border-amber-400/40 text-amber-300"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {trialInfo.isExpired ? "Trial Expirado" : `Trial: ${trialInfo.daysRemaining}d`}
                  </span>
                )}
              </div>
            )}

            {/* User Profile Pill */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <div className="hidden lg:flex flex-col text-right leading-tight">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[130px]">
                    {currentUser.nome}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[130px] font-mono">
                    {currentUser.email}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Input (accessible via Sidebar Drawer) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </header>

      {/* 2. TRIAL BANNER (Exibe dias restantes ou aviso de expiração) */}
      <TrialBanner
        trialInfo={trialInfo}
        onOpenContactModal={() => setIsTrialExpiredModalOpen(true)}
      />

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative transition-colors ${
          isDragOver ? "ring-4 ring-amber-500/50 bg-amber-50/20" : ""
        }`}
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-6 text-center pointer-events-none animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-8 max-w-md shadow-2xl border-2 border-dashed border-amber-500 text-slate-900">
              <Upload className="w-12 h-12 text-amber-600 mx-auto mb-3 animate-bounce" />
              <h3 className="text-lg font-bold">Solte a prancha ou arquivo aqui</h3>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: PDF ou Imagem (JPEG, PNG). O CalcPro fará a leitura da simbologia e cálculo dos materiais.
              </p>
            </div>
          </div>
        )}
        {/* SIDEBAR - Structured Status & Analysis Information */}
        <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          {/* Active File Card */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Arquivo em Análise
              </h2>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 bg-orange-100 flex items-center justify-center rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate" title={currentFileName || "Nenhum arquivo"}>
                    {currentFileName || "Aguardando arquivo..."}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${currentFileName ? "bg-emerald-500" : "bg-slate-300"}`}></span>
                    {currentFileName ? `Formato ${currentFileType}` : "Aguardando Envio"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Indicator Box */}
          {isProcessing && (
            <div className="p-4 bg-gradient-to-b from-amber-50 to-amber-100/50 border-b border-amber-300 space-y-3 shadow-2xs">
              {/* Header with Active Stage and Percentage */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-amber-200 text-amber-950 border border-amber-300 shrink-0">
                    Etapa {processingStep} de 4
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {PROCESSING_STAGES[processingStep - 1]?.label || "Processando Projeto"}
                  </span>
                </div>
                <span className="font-mono font-black text-xs text-amber-950 bg-white px-2.5 py-0.5 rounded-md border border-amber-300 shadow-2xs shrink-0">
                  {progressPercent}%
                </span>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="w-full bg-amber-200/90 h-2.5 rounded-full overflow-hidden p-0.5 border border-amber-300/60 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 transition-all duration-500 shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Current Precise Process Activity */}
              <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-slate-800 leading-snug">
                  {processingStatusText || PROCESSING_STAGES[processingStep - 1]?.description}
                </p>
              </div>

              {/* Stage Progress Track Steps */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {PROCESSING_STAGES.map((st) => {
                  const isDone = processingStep > st.number;
                  const isCurrent = processingStep === st.number;

                  return (
                    <div
                      key={st.number}
                      className={`flex flex-col items-center text-center p-1 rounded-md transition-all ${
                        isCurrent
                          ? "bg-amber-200/80 border border-amber-400 font-bold shadow-2xs"
                          : isDone
                          ? "bg-emerald-50 border border-emerald-200 font-medium"
                          : "opacity-45 font-normal border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-center mb-0.5">
                        {isDone ? (
                          <Check className="w-3 h-3 text-emerald-700" />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping inline-block" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] leading-tight truncate w-full ${
                          isCurrent
                            ? "text-amber-950 font-black"
                            : isDone
                            ? "text-emerald-800"
                            : "text-slate-500"
                        }`}
                        title={st.label}
                      >
                        {st.shortName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Structure Breakdown Panel */}
          <div className="p-4 space-y-4 flex-1">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                <span>Estruturas Identificadas</span>
                <span className="text-slate-900 font-bold bg-slate-200 px-2 py-0.5 rounded text-[10px]">
                  {projectData.structures.length} total
                </span>
              </h2>

              {structuresSummary.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Nenhuma estrutura carregada.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {structuresSummary.map(({ code, count }) => (
                    <button
                      key={code}
                      onClick={() => handleOpenStructureDetailByCode(code)}
                      className="w-full flex justify-between items-center p-2.5 bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-400 text-xs transition-all cursor-pointer group text-left shadow-2xs"
                      title={`Clique para abrir composição e editar materiais da Estrutura ${code} em tela cheia`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                        <span className="font-mono font-bold text-slate-800 group-hover:text-amber-950 truncate">
                          ESTRUTURA {code}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold bg-slate-200 group-hover:bg-amber-200 text-slate-700 group-hover:text-amber-950 px-2 py-0.5 rounded shrink-0 font-mono">
                        {count} un.
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Poles / Structures Quick List if any */}
            {projectData.structures.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Postes / Estruturas Individuais ({projectData.structures.length})
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {projectData.structures.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleOpenStructureDetail(s)}
                      className="w-full text-left p-1.5 bg-white hover:bg-amber-50 rounded border border-slate-200 text-[11px] flex items-center justify-between transition-colors cursor-pointer group"
                      title="Clique para ver os materiais desta estrutura em tela cheia"
                    >
                      <span className="font-mono font-bold text-slate-700 group-hover:text-amber-900 truncate">
                        {s.id} - {s.code}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-amber-700 shrink-0">
                        {s.computedMaterials?.length || 0} mat.
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unrecognized Warnings Button in Sidebar */}
            {projectData.unrecognized.length > 0 && (
              <button
                id="btn-alert-unrecognized-structures"
                type="button"
                onClick={() => setIsUnrecognizedModalOpen(true)}
                className="w-full p-3.5 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] border-2 border-rose-300 hover:border-rose-400 rounded-xl text-left transition-all cursor-pointer group shadow-xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                title="Clique para abrir em tela cheia e conferir quais estruturas não foram identificadas"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-black text-rose-900 uppercase flex items-center gap-1.5 tracking-tight">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 group-hover:scale-110 transition-transform animate-pulse" />
                    <span>Ver Estruturas Não Identificadas</span>
                  </span>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs shrink-0">
                    {projectData.unrecognized.length}
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                  {projectData.unrecognized.length} item(ns) com simbologia não reconhecida.
                </p>
                <div className="mt-2 pt-2 border-t border-rose-200/80 flex items-center justify-between text-[11px] font-bold text-rose-900">
                  <span className="underline group-hover:text-rose-950">Abrir em Tela Cheia</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            )}

            {projectData.mnemonicosNaoEncontrados && projectData.mnemonicosNaoEncontrados.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <h3 className="text-xs font-bold text-amber-900 uppercase mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Mnemônicos não encontrados
                </h3>
                <p className="text-[11px] text-amber-800 leading-relaxed mb-2">
                  {projectData.mnemonicosNaoEncontrados.length} código(s) não existem no catálogo oficial. Nenhum componente foi inventado para eles.
                </p>
                <div className="max-h-28 overflow-auto text-[10px] font-mono text-amber-900 space-y-0.5">
                  {projectData.mnemonicosNaoEncontrados.map((code) => <div key={code}>{code}</div>)}
                </div>
              </div>
            )}

            {/* Saved Projects History List */}
            {savedProjects.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Histórico de Listas Salvas</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      {savedProjects.length}
                    </span>
                  </h2>
                  <button
                    onClick={() => setShowClearAllSavedConfirm(true)}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                    title="Excluir todas as listas salvas do histórico"
                  >
                    Limpar Tudo
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {savedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="w-full p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs transition-all flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <button
                        onClick={() => handleLoadSavedProject(p)}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                        title={`Carregar lista "${p.name}"`}
                      >
                        <div className="font-semibold text-slate-800 truncate group-hover:text-amber-700">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{p.savedAt.split(" ")[0]}</span>
                          {p.analysis?.materials && (
                            <span>• {p.analysis.materials.length} mat.</span>
                          )}
                        </div>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(p);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                        title={`Excluir "${p.name}" do histórico`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 space-y-6">
          {/* Analysis Error Alert Banner with Direct Retry Action */}
          {analysisErrorMessage && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5 border border-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-950 text-sm">
                    Aviso na Análise Automática da Planta
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed max-w-2xl">
                    {analysisErrorMessage}
                  </p>
                </div>
              </div>

              {lastUploadedFile && (
                <button
                  onClick={() => processSelectedFile(lastUploadedFile)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  title="Tentar processar este arquivo novamente"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                  <span>Tentar Novamente</span>
                </button>
              )}
            </div>
          )}

          {/* Cancel Loading Action */}
          {isProcessing && (
            <div className="flex justify-center p-2 animate-in fade-in duration-200">
              <button
                id="btn-cancel-main-processing"
                onClick={handleCancelProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 active:scale-95 text-rose-700 hover:text-rose-800 border-2 border-rose-300 hover:border-rose-400 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
                title="Cancelar carregamento e interromper análise do arquivo"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Cancelar Carregamento do Projeto</span>
              </button>
            </div>
          )}

          {/* MEMORIAL DESCRITIVO DO PROJETO - Fully responsive, wrap text on any screen without cut-off */}
          {projectData.generalSummary && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Memorial Descritivo do Projeto
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {projectData.projectName || "Projeto de Distribuição"} • Data: {projectData.date || "Atual"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-[11px]">
                    Tensão: {selectedVoltageLevel}
                  </span>
                  <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-lg border border-amber-200 text-[11px]">
                    {projectData.structures.length} Estruturas
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                    {projectData.materials.length} Materiais Consolidados
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFullScreenExplodedOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 font-bold px-2.5 py-1 rounded-lg border border-amber-500/40 text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    title="Mostrar a lista de materiais explodida consolidada em tela cheia"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Materiais em Tela Cheia</span>
                  </button>
                  {projectData.unrecognized.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsUnrecognizedModalOpen(true)}
                      className="bg-rose-100 hover:bg-rose-200 active:scale-95 text-rose-900 font-bold px-2.5 py-1 rounded-lg border border-rose-300 text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                      title="Clique para abrir as estruturas não identificadas em tela cheia"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      <span>{projectData.unrecognized.length} Não Identificada(s)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Summary text - fully responsive with text wrapping and no clipping */}
              <div className="mt-3 text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                {projectData.generalSummary}
              </div>
            </div>
          )}

          {/* Unrecognized structures alert banner in main workspace */}
          {projectData.unrecognized.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl border border-rose-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-rose-950 text-sm flex items-center gap-2">
                    Atenção: {projectData.unrecognized.length} estrutura(s) / anotação(ões) não identificadas no padrão CEMIG
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed max-w-2xl">
                    Elementos com simbologia não reconhecida foram mantidos sem geração de materiais fictícios para auditoria manual.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnrecognizedModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Ver Estruturas Não Identificadas em Tela Cheia</span>
              </button>
            </div>
          )}



          {/* 1. Consolidated Materials Table */}
          <MaterialsTable
            materials={projectData.materials}
            groupedMnemonics={projectData.groupedMnemonics}
            structures={projectData.structures}
            cables={projectData.cables}
            onUpdateCables={handleUpdateCables}
            voltageLevel={projectData.voltageLevel}
            networkType={projectData.networkType || networkType}
            onUpdateNetworkType={handleUpdateNetworkType}
            laborItems={projectData.laborItems}
            onUpdateLaborItems={handleUpdateLaborItems}
            usUnitPrice={projectData.usUnitPrice !== undefined ? projectData.usUnitPrice : usUnitPrice}
            onUpdateUsUnitPrice={handleUpdateUsUnitPrice}
            onRecalculateLabor={handleRecalculateLabor}
            onUpdateMaterial={handleUpdateMaterials}
            onSelectStructureAudit={(s) => handleOpenStructureDetail(s)}
            onOpenRegisteredPrices={() => setIsRegisteredPricesOpen(true)}
            profitMargin={profitMargin}
            onProfitMarginChange={setProfitMargin}
            isFullScreenExploded={isFullScreenExplodedOpen}
            onToggleFullScreenExploded={setIsFullScreenExplodedOpen}
            projectName={projectData.projectName}
          />

          {/* 2. Export Bar (PDF / Excel / Print / Save) */}
          <ExportBar
            materials={projectData.materials}
            projectInfo={projectData}
            onSaveLocal={handleSaveLocalProject}
            hasSaved={hasSaved}
            isSaving={isSaving}
            profitMargin={profitMargin}
            laborItems={projectData.laborItems}
            usUnitPrice={projectData.usUnitPrice !== undefined ? projectData.usUnitPrice : usUnitPrice}
          />
        </main>
      </div>

      {/* Save Notification Toast Banner */}
      {saveToast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-md pointer-events-auto">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md transition-all ${
              saveToast.type === "saving"
                ? "bg-slate-900/95 border-amber-500/60 text-white ring-1 ring-amber-500/30"
                : saveToast.type === "success"
                ? "bg-slate-900/95 border-emerald-500/60 text-white ring-1 ring-emerald-500/30"
                : "bg-slate-900/95 border-rose-500/60 text-white ring-1 ring-rose-500/30"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                saveToast.type === "saving"
                  ? "bg-amber-500/20 text-amber-400"
                  : saveToast.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {saveToast.type === "saving" && <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />}
              {saveToast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {saveToast.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400" />}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-bold text-white leading-tight">
                {saveToast.type === "saving"
                  ? "Salvando lista de materiais..."
                  : saveToast.type === "success"
                  ? "Lista salva com sucesso!"
                  : "Atenção"}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {saveToast.message}
              </p>
            </div>
            <button
              onClick={() => setSaveToast((prev) => ({ ...prev, show: false }))}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. AUDIT MODAL */}
      <StructureAuditModal
        structure={selectedAuditStructure}
        onClose={() => setSelectedAuditStructure(null)}
      />

      {/* 4.1 FULL-SCREEN STRUCTURE DETAIL & MATERIAL EDITOR MODAL */}
      <StructureDetailModal
        isOpen={isStructureDetailModalOpen}
        structure={selectedStructureForDetail}
        allStructures={projectData.structures}
        voltageLevel={selectedVoltageLevel}
        onClose={() => {
          setIsStructureDetailModalOpen(false);
          setSelectedStructureForDetail(null);
        }}
        onSaveStructure={handleSaveStructureDetail}
      />

      {/* 4.2 FULL-SCREEN UNRECOGNIZED STRUCTURES MODAL */}
      <UnrecognizedStructuresModal
        isOpen={isUnrecognizedModalOpen}
        onClose={() => setIsUnrecognizedModalOpen(false)}
        unrecognized={projectData.unrecognized}
        mnemonicosNaoEncontrados={projectData.mnemonicosNaoEncontrados}
        projectName={projectData.projectName}
        onOpenCatalog={() => setIsMnemonicsCatalogOpen(true)}
      />

      {/* 5. KIT EXPLODER MODAL */}
      <KitExploderModal
        isOpen={isKitExploderOpen}
        onClose={() => setIsKitExploderOpen(false)}
        onAddMaterialsToProject={handleAddMaterialsFromKitExploder}
      />

      {/* 6. CLEAR DATA CONFIRMATION MODAL */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Limpar Dados Carregados?</h3>
              </div>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-700 text-sm">
              <p>
                Tem certeza de que deseja <strong>limpar todos os dados do projeto atual</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Atenção:
                </p>
                <p>
                  Esta ação irá remover as {projectData.structures.length} estruturas identificadas, cabos e os {projectData.materials.length} materiais da lista consolidada atual.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Limpar Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.1 DELETE SINGLE SAVED LIST CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Excluir Lista Salva?</h3>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-700 text-sm">
              <p>
                Tem certeza de que deseja excluir a lista salva{" "}
                <strong className="text-slate-900 font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  "{projectToDelete.name}"
                </strong>{" "}
                do seu histórico local?
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-600">
                <div>
                  <strong>Data de Gravação:</strong> {projectToDelete.savedAt}
                </div>
                <div>
                  <strong>Materiais Salvos:</strong>{" "}
                  {projectToDelete.analysis?.materials?.length || 0} item(ns) consolidados
                </div>
                {projectToDelete.analysis?.voltageLevel && (
                  <div>
                    <strong>Nível de Tensão:</strong> {projectToDelete.analysis.voltageLevel}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteSavedProject(projectToDelete.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Lista</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.2 CLEAR ALL SAVED LISTS CONFIRMATION MODAL */}
      {showClearAllSavedConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Limpar Todo o Histórico?</h3>
              </div>
              <button
                onClick={() => setShowClearAllSavedConfirm(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-700 text-sm">
              <p>
                Tem certeza de que deseja <strong>excluir todas as {savedProjects.length} listas salvas</strong> do histórico local?
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Ação Irreversível:
                </p>
                <p>
                  Todas as listas de projetos salvas anteriormente no armazenamento do seu navegador serão apagadas permanentemente.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowClearAllSavedConfirm(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAllSavedProjects}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Todas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. FULL SCREEN REGISTERED PRICES MODAL */}
      <RegisteredPricesModal
        isOpen={isRegisteredPricesOpen}
        onClose={() => setIsRegisteredPricesOpen(false)}
        materials={projectData.materials}
        onUpdateMaterial={handleUpdateMaterials}
        profitMargin={profitMargin}
      />

      {/* 8. STANDALONE MATERIALS LIST MODAL */}
      <StandaloneMaterialsModal
        isOpen={isStandaloneMaterialsOpen}
        onClose={() => setIsStandaloneMaterialsOpen(false)}
      />

      {/* 9. OFFICIAL MNEMONICS CATALOG MODAL */}
      <MnemonicsCatalogModal
        isOpen={isMnemonicsCatalogOpen}
        onClose={() => setIsMnemonicsCatalogOpen(false)}
      />

      {/* 10. STEP-BY-STEP HELP GUIDE MODAL */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onOpenMnemonicsCatalog={() => setIsMnemonicsCatalogOpen(true)}
        onOpenMaterialsCatalog={() => setIsStandaloneMaterialsOpen(true)}
        onOpenPricesModal={() => setIsRegisteredPricesOpen(true)}
      />

      {/* 11. TOP-LEFT SIDEBAR DRAWER (All tools, catalogs, voltage level & exit) */}
      <SidebarDrawer
        isOpen={isSidebarDrawerOpen}
        onClose={() => setIsSidebarDrawerOpen(false)}
        selectedVoltageLevel={selectedVoltageLevel}
        onSelectVoltageLevel={(lvl) => {
          setSelectedVoltageLevel(lvl);
          setSaveToast({
            show: true,
            type: "success",
            message: `Nível de Tensão alterado para ${lvl}.`,
          });
          setTimeout(() => setSaveToast((prev) => ({ ...prev, show: false })), 2500);
        }}
        networkType={projectData.networkType || networkType}
        onSelectNetworkType={(netType) => {
          handleUpdateNetworkType(netType);
          setSaveToast({
            show: true,
            type: "success",
            message: `Padrão de rede alterado para ${netType} (${netType === "RDR" ? "Rural" : "Urbano"}).`,
          });
          setTimeout(() => setSaveToast((prev) => ({ ...prev, show: false })), 2500);
        }}
        onFileUploadClick={() => fileInputRef.current?.click()}
        onClearProjectClick={() => setShowClearConfirmModal(true)}
        canClear={projectData.materials.length > 0 || projectData.structures.length > 0 || !!currentFileName}
        isProcessing={isProcessing}
        progressPercent={progressPercent}
        onCancelProcessing={handleCancelProcessing}
        onOpenMnemonicsCatalog={() => setIsMnemonicsCatalogOpen(true)}
        onOpenStandaloneMaterials={() => setIsStandaloneMaterialsOpen(true)}
        onOpenRegisteredPrices={() => setIsRegisteredPricesOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onExitAppClick={() => setShowExitConfirmModal(true)}
        currentUser={currentUser}
        trialInfo={trialInfo}
        onOpenAdminPanel={() => setIsAdminModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 12. EXIT APPLICATION CONFIRMATION MODAL */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base">Sair do Aplicativo</h3>
              </div>
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-slate-700 text-sm">
              <p>
                Deseja realmente encerrar a sessão de trabalho atual?
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExitApp}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sim, Sair do Aplicativo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. ADMIN PANEL MODAL (Exclusivo para patricioaug@gmail.com) */}
      {currentUser && currentUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
        <AdminPanelModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentUserEmail={currentUser.email}
        />
      )}

      {/* 14. TRIAL EXPIRED MODAL */}
      <TrialExpiredModal
        isOpen={isTrialExpiredModalOpen}
        onClose={() => setIsTrialExpiredModalOpen(false)}
      />

      {/* 15. AUTHENTICATION MODAL (Obrigatório para acessar o aplicativo) */}
      {!currentUser && (
        <AuthModal onSuccess={handleAuthSuccess} />
      )}

      {/* 16. ANIMAÇÃO DE ABERTURA DO APLICATIVO (Executa uma única vez no início) */}
      {showSplash && (
        <SplashIntro onComplete={() => setShowSplash(false)} />
      )}
    </div>
  );
}
