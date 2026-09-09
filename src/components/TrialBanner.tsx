import React from "react";
import { UserTrialInfo, ADMIN_EMAIL } from "../services/authService";
import { AlertTriangle, Clock, Mail, ShieldAlert, Check } from "lucide-react";

interface TrialBannerProps {
  trialInfo: UserTrialInfo | null;
  onOpenContactModal?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  trialInfo,
  onOpenContactModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!trialInfo || trialInfo.isAdmin || trialInfo.status === "liberado") {
    return null;
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(ADMIN_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (trialInfo.isExpired) {
    return (
      <div
        id="trial-expired-blocking-banner"
        className="bg-red-600 text-white px-4 py-3 shadow-md border-b border-red-700 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-white/20 text-white shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">
              Seu período de avaliação terminou.
            </div>
            <div className="text-red-100 text-xs">
              Entre em contato pelo e mail <strong className="underline">{ADMIN_EMAIL}</strong> para continuar.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyEmail}
            className="px-3 py-1.5 rounded-lg bg-white text-red-700 font-bold hover:bg-red-50 transition-colors shadow-xs flex items-center gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Copiar E-mail</span>
              </>
            )}
          </button>
          <a
            href={`mailto:${ADMIN_EMAIL}?subject=Liberacao%20CalcPro%20Distribuicao`}
            className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-900 text-white font-bold transition-colors shadow-xs text-xs flex items-center gap-1.5"
          >
            Enviar E-mail Agora
          </a>
        </div>
      </div>
    );
  }

  // Active trial banner (discrete indicator)
  return (
    <div
      id="trial-active-banner"
      className="bg-amber-500/10 border-b border-amber-300/40 text-amber-900 px-4 py-1.5 text-xs flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>
          <strong>Período de Avaliação Ativo:</strong> Você possui{" "}
          <strong>
            {trialInfo.daysRemaining} dia{trialInfo.daysRemaining > 1 ? "s" : ""}
          </strong>{" "}
          restante{trialInfo.daysRemaining > 1 ? "s" : ""} de acesso gratuito a todos os cálculos.
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-amber-800">
        <span>Para liberar acesso ilimitado permanente:</span>
        <button
          onClick={handleCopyEmail}
          className="font-bold underline hover:text-amber-950 flex items-center gap-1"
        >
          {copied ? "E-mail copiado!" : ADMIN_EMAIL}
        </button>
      </div>
    </div>
  );
};
