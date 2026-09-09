import React from "react";
import {
  X,
  Zap,
  FileUp,
  Trash2,
  BookOpen,
  Package,
  DollarSign,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  XCircle,
  RefreshCw,
  Building2,
  Trees,
} from "lucide-react";
import { ProjectVoltageLevel, NetworkEnvironment } from "../types";
import { VOLTAGE_LEVEL_OPTIONS } from "../App";
import { CalcProLogo } from "./CalcProLogo";
import { SafeUser, UserTrialInfo, ADMIN_EMAIL } from "../services/authService";
import { Shield, Clock, CheckCircle2, User as UserIcon } from "lucide-react";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoltageLevel: ProjectVoltageLevel;
  onSelectVoltageLevel: (level: ProjectVoltageLevel) => void;
  networkType?: NetworkEnvironment;
  onSelectNetworkType?: (type: NetworkEnvironment) => void;
  onFileUploadClick: () => void;
  onClearProjectClick: () => void;
  canClear: boolean;
  isProcessing?: boolean;
  progressPercent?: number;
  onCancelProcessing?: () => void;
  onOpenMnemonicsCatalog: () => void;
  onOpenStandaloneMaterials: () => void;
  onOpenRegisteredPrices: () => void;
  onOpenHelpModal: () => void;
  onExitAppClick: () => void;
  currentUser?: SafeUser | null;
  trialInfo?: UserTrialInfo | null;
  onOpenAdminPanel?: () => void;
  onLogout?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  selectedVoltageLevel,
  onSelectVoltageLevel,
  networkType = "RDU",
  onSelectNetworkType,
  onFileUploadClick,
  onClearProjectClick,
  canClear,
  isProcessing,
  progressPercent = 0,
  onCancelProcessing,
  onOpenMnemonicsCatalog,
  onOpenStandaloneMaterials,
  onOpenRegisteredPrices,
  onOpenHelpModal,
  onExitAppClick,
  currentUser,
  trialInfo,
  onOpenAdminPanel,
  onLogout,
}) => {
  if (!isOpen) return null;

  const currentVoltage =
    VOLTAGE_LEVEL_OPTIONS.find((v) => v.value === selectedVoltageLevel) ||
    VOLTAGE_LEVEL_OPTIONS[0];

  return (
    <div
      id="modal-sidebar-drawer-overlay"
      className="fixed inset-0 z-50 flex animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Sidebar Panel (From top-left) */}
      <div
        id="sidebar-drawer-panel"
        className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 text-slate-100 h-full shadow-2xl flex flex-col z-50 border-r border-slate-800 animate-in slide-in-from-left duration-250 overflow-hidden"
      >
        {/* 1. DRAWER HEADER */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CalcProLogo />
          </div>
          <button
            id="btn-close-sidebar-drawer"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer select-none"
            title="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account & Admin Card */}
        {currentUser && (
          <div className="p-3 bg-slate-950/60 border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                  {currentUser.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{currentUser.nome}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser.email}</div>
                </div>
              </div>

              {/* Status Badge */}
              {currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || trialInfo?.isAdmin ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40 shrink-0">
                  Admin Vitalício
                </span>
              ) : trialInfo?.status === "liberado" ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                  Liberado
                </span>
              ) : trialInfo?.status === "bloqueado" ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30 shrink-0">
                  Bloqueado
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${trialInfo?.isExpired ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                  {trialInfo?.isExpired ? "Expirado" : `Trial (${trialInfo?.daysRemaining}d)`}
                </span>
              )}
            </div>

            {/* Exclusive Administrator Button if user is patricioaug@gmail.com */}
            {currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
              <button
                id="btn-drawer-admin-panel"
                type="button"
                onClick={() => {
                  if (onOpenAdminPanel) onOpenAdminPanel();
                  onClose();
                }}
                className="w-full mt-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 border border-amber-400/40"
              >
                <Shield className="w-4 h-4 text-white" />
                <span>Painel do Administrador</span>
              </button>
            )}
          </div>
        )}

        {/* 2. DRAWER BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* SECTION A: Ações Principais de Projeto */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Ações de Projeto</span>
            </div>

            {/* If currently processing, show prominent Cancel button */}
            {isProcessing && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    Carregando ({progressPercent}%)
                  </span>
                </div>
                <button
                  id="btn-drawer-cancel-processing"
                  onClick={() => {
                    onCancelProcessing?.();
                    onClose();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                  title="Cancelar carregamento do arquivo"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancelar Carregamento</span>
                </button>
              </div>
            )}

            {/* Upload Button */}
            <button
              id="btn-drawer-upload-project"
              onClick={() => {
                onFileUploadClick();
                onClose();
              }}
              className="w-full inline-flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <FileUp className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Carregar Projeto (PDF/JPEG)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-950/70 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Clear Project Button */}
            <button
              id="btn-drawer-clear-project"
              onClick={() => {
                if (canClear) {
                  onClearProjectClick();
                  onClose();
                }
              }}
              disabled={!canClear}
              className={`w-full inline-flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                canClear
                  ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 active:scale-98 cursor-pointer"
                  : "bg-slate-800/30 text-slate-600 border border-slate-800/40 cursor-not-allowed opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Limpar Dados do Projeto</span>
              </div>
              {canClear && <span className="text-[10px] uppercase font-mono text-rose-400">Ativo</span>}
            </button>
          </div>

          {/* SECTION B: Nível de Tensão Selector */}
          <div className="space-y-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                Nível de Tensão
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase">
                {currentVoltage.badge}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Direciona a busca dos mnemônicos e equipamentos na classe correta:
            </p>

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {VOLTAGE_LEVEL_OPTIONS.map((opt) => {
                const isSelected = selectedVoltageLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSelectVoltageLevel(opt.value);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500/80 text-white font-bold shadow-xs"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs truncate">{opt.label}</div>
                      <div className="text-[9px] text-slate-400 font-normal truncate">
                        {opt.badge}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION B.2: Padrão de Rede (RDU vs RDR) */}
          <div className="space-y-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Padrão de Rede (Mão de Obra)
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase">
                {networkType}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Alterna as descrições e cálculo de serviços entre Urbano (RDU) e Rural (RDR):
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSelectNetworkType?.("RDU")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  networkType === "RDU"
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
                }`}
              >
                <Building2 className="w-4 h-4 mb-1" />
                <span>RDU</span>
                <span className="text-[9px] font-normal opacity-80">Rede Urbana</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectNetworkType?.("RDR")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  networkType === "RDR"
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
                }`}
              >
                <Trees className="w-4 h-4 mb-1" />
                <span>RDR</span>
                <span className="text-[9px] font-normal opacity-80">Rede Rural</span>
              </button>
            </div>
          </div>

          {/* SECTION C: Catálogos e Ferramentas */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>Catálogos e Ferramentas</span>
            </div>

            <div className="space-y-1.5">
              {/* 1. Catálogo Mnemônicos */}
              <button
                id="btn-drawer-mnemonics-catalog"
                onClick={() => {
                  onOpenMnemonicsCatalog();
                  onClose();
                }}
                className="w-full inline-flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-amber-300 hover:text-amber-200 border border-slate-700/80 text-xs font-bold transition-all active:scale-98 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Catálogo de Mnemônicos</span>
                </div>
                <span className="text-[10px] font-normal text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                  7.203
                </span>
              </button>

              {/* 2. Materiais Avulsos */}
              <button
                id="btn-drawer-standalone-materials"
                onClick={() => {
                  onOpenStandaloneMaterials();
                  onClose();
                }}
                className="w-full inline-flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-bold transition-all active:scale-98 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Materiais Avulsos</span>
                </div>
                <span className="text-[10px] font-normal text-slate-400 bg-slate-700/40 px-1.5 py-0.5 rounded border border-slate-700">
                  1.558
                </span>
              </button>

              {/* 3. Preços Unitários */}
              <button
                id="btn-drawer-registered-prices"
                onClick={() => {
                  onOpenRegisteredPrices();
                  onClose();
                }}
                className="w-full inline-flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-emerald-300 hover:text-emerald-200 border border-slate-700/80 text-xs font-bold transition-all active:scale-98 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tabela de Preços Unitários</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400/70 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 4. Guia de Ajuda */}
              <button
                id="btn-drawer-help-guide"
                onClick={() => {
                  onOpenHelpModal();
                  onClose();
                }}
                className="w-full inline-flex items-center justify-between p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition-all active:scale-98 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Guia de Ajuda (Passo a Passo)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. DRAWER FOOTER - Encerrar Sessão do Projeto */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <button
            id="btn-drawer-exit-app"
            onClick={() => {
              onExitAppClick();
              onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-500 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer select-none"
            title="Sair e encerrar o projeto"
          >
            <XCircle className="w-4 h-4 text-rose-400 group-hover:text-white shrink-0" />
            <span>Encerrar Sessão do Projeto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
