import React, { useState, useEffect } from "react";
import { UnrecognizedStructure } from "../types";
import {
  AlertTriangle,
  X,
  Search,
  Copy,
  Check,
  ArrowLeft,
  HelpCircle,
  FileQuestion,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Info,
} from "lucide-react";

interface UnrecognizedStructuresModalProps {
  isOpen: boolean;
  onClose: () => void;
  unrecognized: UnrecognizedStructure[];
  mnemonicosNaoEncontrados?: string[];
  projectName?: string;
  onOpenCatalog?: () => void;
}

export const UnrecognizedStructuresModal: React.FC<UnrecognizedStructuresModalProps> = ({
  isOpen,
  onClose,
  unrecognized,
  mnemonicosNaoEncontrados = [],
  projectName,
  onOpenCatalog,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key press & prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUnrecognized = unrecognized.filter((u, idx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const id = (u.id || `UN${idx + 1}`).toLowerCase();
    const raw = (u.rawText || "").toLowerCase();
    const reason = (u.reason || "").toLowerCase();
    const location = (u.locationHint || u.contextHint || "").toLowerCase();
    const suggested = (u.suggestedCode || "").toLowerCase();
    return (
      id.includes(term) ||
      raw.includes(term) ||
      reason.includes(term) ||
      location.includes(term) ||
      suggested.includes(term)
    );
  });

  return (
    <div
      id="unrecognized-structures-fullscreen-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col p-0 sm:p-3 md:p-6 overflow-hidden animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl w-full max-w-5xl mx-auto flex-1 flex flex-col overflow-hidden max-h-[100dvh] sm:max-h-[95vh]">
        {/* ========================================================= */}
        {/* 1. TOP HEADER (Dark Theme with High Contrast)             */}
        {/* ========================================================= */}
        <header className="p-3 sm:p-5 bg-slate-900 text-white flex flex-col gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shrink-0">
                    Alerta de Simbologia
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-rose-300 border border-rose-500/30">
                    {unrecognized.length} {unrecognized.length === 1 ? "Estrutura Não Identificada" : "Estruturas Não Identificadas"}
                  </span>
                </div>

                <h2 id="modal-title" className="text-base sm:text-xl font-extrabold tracking-tight text-white mt-1">
                  Estruturas Não Lidas / Não Identificadas
                </h2>

                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {projectName ? `Projeto: ${projectName} — ` : ""}
                  Simbologias e anotações encontradas que não correspondem a mnemônicos oficiais do catálogo CEMIG.
                </p>
              </div>
            </div>

            {/* Close Button on Top Right */}
            <button
              id="btn-close-unrecognized-modal-top"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white font-bold text-xs transition-all border border-slate-700 shrink-0 cursor-pointer shadow-xs"
              title="Fechar janela e voltar à tela principal (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Fechar Janela</span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. BODY CONTENT                                           */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 space-y-4">
          {/* Informational Guidance Banner */}
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-black text-amber-900 text-xs sm:text-sm">
                Diretriz de Rigor Técnico CEMIG: Sem Invenção de Materiais
              </h4>
              <p className="text-amber-800 leading-relaxed text-[11px] sm:text-xs">
                De acordo com as regras de engenharia de distribuição, quando uma estrutura ou anotação não é identificada com certeza ou não consta no cadastro anexado, o sistema <strong>não gera materiais fictícios</strong>. Abaixo estão detalhadas todas as anotações não lidas para conferência manual na prancha do projeto.
              </p>
            </div>
          </div>

          {/* Search bar & Statistics */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por texto lido, motivo ou localização..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
              <span className="text-slate-500">
                Mostrando: <strong className="text-slate-800">{filteredUnrecognized.length}</strong> de {unrecognized.length}
              </span>
              {onOpenCatalog && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCatalog();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Consultar Catálogo</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Unrecognized Structures */}
          {filteredUnrecognized.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-sm text-slate-700">
                {searchTerm ? "Nenhuma anotação encontrada para o filtro informado." : "Nenhuma estrutura não identificada no momento."}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-xs text-rose-600 font-bold underline cursor-pointer"
                >
                  Limpar filtro de busca
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredUnrecognized.map((item, idx) => {
                const itemId = item.id || `UN${idx + 1}`;
                const location = item.locationHint || item.contextHint;
                const isCopied = copiedId === itemId;

                return (
                  <div
                    key={`unrec_${itemId}_${idx}`}
                    className="bg-white rounded-xl border border-rose-200 shadow-xs hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Top Strip */}
                    <div className="px-4 py-2.5 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-rose-600 text-white px-2 py-0.5 rounded shadow-2xs">
                          {itemId}
                        </span>
                        <span className="text-xs font-extrabold text-rose-950 uppercase tracking-tight">
                          Estrutura Não Reconhecida
                        </span>
                      </div>

                      {location && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate max-w-xs">{location}</span>
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Raw Text Detected */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Texto / Simbologia Lido na Planta:
                          </span>
                          <button
                            onClick={() => handleCopy(item.rawText, itemId)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-bold hover:underline cursor-pointer"
                            title="Copiar texto lido"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-3 bg-slate-900 text-rose-200 rounded-lg font-mono text-xs sm:text-sm font-bold border border-slate-800 break-words">
                          {item.rawText || "Texto não legível"}
                        </div>
                      </div>

                      {/* Reason & Diagnostics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Motivo do Não Reconhecimento:
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">
                            {item.reason || "Simbologia fora dos padrões normatizados CEMIG ou texto com rasura na imagem."}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Ação Recomendada:
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">
                            Conferir a legenda original da prancha e, se aplicável, inserir o mnemônico oficial manualmente na lista explodida de materiais.
                          </p>
                          {item.suggestedCode && (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px]">
                              <span className="text-slate-500">Mnemônico sugerido: </span>
                              <strong className="text-amber-800 font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                                {item.suggestedCode}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Uncataloged Mnemonics Section (if any) */}
          {mnemonicosNaoEncontrados && mnemonicosNaoEncontrados.length > 0 && (
            <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-950 uppercase">
                  Mnemônicos Não Encontrados no Catálogo Oficial ({mnemonicosNaoEncontrados.length})
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                Os seguintes códigos foram informados no projeto mas não constam na base oficial de mnemônicos CEMIG:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mnemonicosNaoEncontrados.map((code, cIdx) => (
                  <span
                    key={`mne_nf_${cIdx}`}
                    className="font-mono text-xs font-black px-2 py-1 bg-amber-100 text-amber-900 rounded border border-amber-300"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. FOOTER (With prominent close button)                   */}
        {/* ========================================================= */}
        <footer className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>
              Total de <strong>{unrecognized.length}</strong> estrutura(s) requerendo verificação manual
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              id="btn-close-unrecognized-modal-bottom"
              onClick={onClose}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Fechar Janela e Voltar à Tela Principal</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
