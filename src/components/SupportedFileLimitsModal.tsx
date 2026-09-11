import React from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileUp,
  HardDrive,
  CloudLightning,
} from "lucide-react";

interface SupportedFileLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFileClick?: () => void;
}

export const SupportedFileLimitsModal: React.FC<SupportedFileLimitsModalProps> = ({
  isOpen,
  onClose,
  onSelectFileClick,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-supported-file-limits"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Tamanhos Máximos e Formatos de Arquivo
              </h3>
              <p className="text-[11px] text-slate-300">
                Diretrizes de engenharia para leitura automática no CalcPro
              </p>
            </div>
          </div>

          <button
            id="btn-close-file-limits-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* Format Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card PDF */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border-2 border-rose-200 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs sm:text-sm">
                    <FileText className="w-4 h-4 text-rose-600" />
                    Arquivo PDF (.pdf)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-600 text-white shadow-2xs">
                    MÁX 3,2 MB
                  </span>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed font-medium">
                  Adequado para pranchas vetorizadas de folha única ou arquivos otimizados gerados pelo AutoCAD/MicroStation.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-rose-200/80 text-[11px] text-rose-800 flex items-center gap-1">
                <CloudLightning className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Limite seguro da nuvem sem risco de queda</span>
              </div>
            </div>

            {/* Card Imagens */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs sm:text-sm">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    Imagens (JPEG / PNG)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-600 text-white shadow-2xs">
                    ATÉ 20 MB
                  </span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  Recomendado para plantas volumosas. O CalcPro processa a imagem em alta resolução mantendo textos e postes nítidos.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-200/80 text-[11px] text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Otimização no navegador (mais rápido)</span>
              </div>
            </div>
          </div>

          {/* Por que esse limite existe? */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Por que existe o limite de 3,2 MB para arquivos PDF?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Durante o envio para análise em nuvem (Vercel Serverless), o arquivo PDF é convertido em dados criptografados Base64, o que expande o volume de dados em cerca de <strong>33%</strong>. Como o teto máximo de transferência é de <strong>4,5 MB</strong>, arquivos PDF acima de 3,2 MB provocam o corte da conexão (erro <em>Failed to fetch</em>).
            </p>
          </div>

          {/* Dicas Práticas de Engenharia */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
              <Lightbulb className="w-4 h-4 text-amber-700 shrink-0" />
              Dicas para carregar qualquer projeto sem erros:
            </div>
            <ul className="space-y-1.5 text-xs text-amber-950 font-medium">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-700 font-bold">•</span>
                <span>
                  <strong>Prancha pesada?</strong> Exporte ou salve a página do projeto em <strong>imagem JPEG</strong> no seu leitor de PDF (Adobe Reader, Foxit) ou software CAD. Imagens são enviadas instantaneamente e possuem leitura exemplar.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-700 font-bold">•</span>
                <span>
                  <strong>Evite PDFs multifolha com dezenas de páginas:</strong> Envie apenas a folha principal do traçado da rede com os postes, estruturas e equipamentos.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-700 font-bold">•</span>
                <span>
                  <strong>Resolução ideal:</strong> 150 a 300 DPI já é suficiente para identificação precisa de mnemônicos (N1, N2, B1, M1, etc.).
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
          {onSelectFileClick && (
            <button
              onClick={() => {
                onClose();
                onSelectFileClick();
              }}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>Selecionar Arquivo Agora</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
