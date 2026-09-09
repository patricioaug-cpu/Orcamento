import React, { useState } from "react";
import { ADMIN_EMAIL } from "../services/authService";
import { ShieldAlert, Mail, Check, X } from "lucide-react";

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(ADMIN_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="trial-expired-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        id="trial-expired-modal-card"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden text-center"
      >
        {/* Red Header */}
        <div className="bg-red-600 px-6 py-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">Período de Avaliação Encerrado</h3>
          <p className="text-xs text-red-100 mt-1">
            Seus 7 dias de avaliação gratuita do CalcPro expiraram.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm font-semibold">
            “Seu período de avaliação terminou. Entre em contato pelo e mail{" "}
            <span className="underline font-bold text-red-700">{ADMIN_EMAIL}</span> para continuar.”
          </div>

          <p className="text-xs text-slate-500">
            Para continuar realizando cálculos de engenharia de distribuição, leitura automática de pranchas CEMIG e consolidação de materiais, solicite a liberação da sua conta com o administrador.
          </p>

          <div className="space-y-2 pt-2">
            <a
              href={`mailto:${ADMIN_EMAIL}?subject=Solicitacao%20de%20Acesso%20CalcPro%20Distribuicao`}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar E-mail para {ADMIN_EMAIL}</span>
            </a>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>E-mail copiado para a área de transferência!</span>
                </>
              ) : (
                <span>Copiar e-mail: {ADMIN_EMAIL}</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
