import React, { useState, useEffect } from "react";

interface SplashIntroProps {
  onComplete: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if splash was already shown in this browser session
    const hasSeenSplash = sessionStorage.getItem("rdr_rdu_splash_completed");
    if (hasSeenSplash === "true") {
      setIsDismissed(true);
      onComplete();
      return;
    }

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const quickTimer = setTimeout(() => {
        finishSplash();
      }, 1000);
      return () => clearTimeout(quickTimer);
    }

    // Standard high-tech sequence: 3.8s total duration
    // Phase 1: 0.0s - 0.8s (Entrada, fade-in da imagem e iluminação verde)
    // Phase 2: 0.8s - 2.0s (Ativação visual, pulso luminoso central no poste/rede)
    // Phase 3: 2.0s - 2.8s (Destaque luminoso nos títulos RDR/RDU)
    // Phase 4: 2.8s - 3.5s (Estabilização visual na imagem original)
    // Exit: 3.5s - 3.9s (Transição suave com fade-out para a tela principal)

    const timerPhase2 = setTimeout(() => setPhase(2), 800);
    const timerPhase3 = setTimeout(() => setPhase(3), 2000);
    const timerPhase4 = setTimeout(() => setPhase(4), 2800);
    const timerExit = setTimeout(() => {
      setIsExiting(true);
    }, 3500);
    const timerComplete = setTimeout(() => {
      finishSplash();
    }, 3950);

    return () => {
      clearTimeout(timerPhase2);
      clearTimeout(timerPhase3);
      clearTimeout(timerPhase4);
      clearTimeout(timerExit);
      clearTimeout(timerComplete);
    };
  }, [onComplete]);

  const finishSplash = () => {
    sessionStorage.setItem("rdr_rdu_splash_completed", "true");
    setIsDismissed(true);
    onComplete();
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => {
      finishSplash();
    }, 300);
  };

  // Keyboard shortcut to skip (Enter, Space, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        handleSkip(e as any);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      id="app-splash-screen"
      onClick={handleSkip}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#020703] overflow-hidden select-none cursor-pointer transition-opacity duration-500 ease-out ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Animação de Abertura - Orçamento de Projetos RDR/RDU"
      role="banner"
    >
      <style>{`
        @keyframes sweepLight {
          0% {
            transform: translateY(-120%) rotate(25deg);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(180%) rotate(25deg);
            opacity: 0;
          }
        }
        @keyframes pulseSymbol {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.85;
          }
        }
        @keyframes shimmerTitle {
          0% {
            opacity: 0.1;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.02);
          }
          100% {
            opacity: 0.1;
            transform: scale(1);
          }
        }
        @keyframes ambientBreathing {
          0%, 100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.65;
          }
        }
      `}</style>

      {/* Atmospheric Ambient Glow Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.15) 0%, rgba(5, 46, 22, 0.35) 45%, rgba(2, 7, 3, 0.95) 85%)",
          opacity: phase >= 2 ? 0.9 : 0.4,
        }}
      />

      {/* Main Responsive Image Container - Preserving exactly the 1:1 original proportion */}
      <div
        className={`relative w-full max-w-[min(94vw,94vh,720px)] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-emerald-950/80 transition-all duration-700 ease-out ${
          phase === 1
            ? "opacity-90 scale-[0.99] filter brightness-95"
            : phase === 2
            ? "opacity-100 scale-100 filter brightness-105"
            : phase === 3
            ? "opacity-100 scale-100 filter brightness-105"
            : "opacity-100 scale-100 filter brightness-100"
        }`}
      >
        {/* Original Splash Image - Displayed intact as a single visual element */}
        <img
          src="/splash_screen.png"
          alt="Orçamento de Projetos RDR/RDU"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover block"
          onError={(e) => {
            // Automatic fallback to chat upload alias if needed
            const target = e.currentTarget;
            if (!target.src.includes("file_000000000bf4820e964dd2c8ded3136c.png")) {
              target.src = "/file_000000000bf4820e964dd2c8ded3136c.png";
            }
          }}
        />

        {/* FASE 1 EFFECT: Leve feixe de iluminação verde percorrendo a imagem */}
        {phase === 1 && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ mixBlendMode: "screen" }}
          >
            <div
              className="absolute -inset-x-full h-48 bg-gradient-to-b from-transparent via-emerald-400/25 to-transparent blur-md"
              style={{
                animation: "sweepLight 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              }}
            />
          </div>
        )}

        {/* FASE 2 EFFECT: Ativação luminosa tecnológica e pulso suave ao redor do símbolo central de poste/rede */}
        {phase === 2 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: "screen" }}
          >
            {/* Luminous aura around central utility badge (centered at 50% vertical height) */}
            <div
              className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(74, 222, 128, 0.45) 0%, rgba(34, 197, 94, 0.2) 50%, transparent 75%)",
                animation: "pulseSymbol 1.2s ease-in-out infinite",
                filter: "blur(14px)",
              }}
            />
            {/* Subtle high-tech horizontal scan beam */}
            <div
              className="absolute left-0 right-0 top-[50%] h-0.5 bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent blur-[1px]"
              style={{
                animation: "ambientBreathing 1.2s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* FASE 3 EFFECT: Destaque sutil e luminoso no título 'ORÇAMENTO DE PROJETOS' e 'RDR / RDU' */}
        {phase === 3 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: "screen" }}
          >
            {/* Soft highlight over the RDR/RDU title zone (positioned at ~80% height) */}
            <div
              className="absolute left-1/2 top-[80%] -translate-x-1/2 -translate-y-1/2 w-[85%] h-24 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(74, 222, 128, 0.35) 0%, rgba(34, 197, 94, 0.12) 60%, transparent 80%)",
                animation: "shimmerTitle 0.8s ease-in-out forwards",
                filter: "blur(12px)",
              }}
            />
          </div>
        )}

        {/* FASE 4: Finalização estável (brilhos se dissipam suavemente, imagem 100% pura) */}
      </div>

      {/* Discretely styled "Pular" button for optimal user experience */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-5 sm:bottom-6 right-5 sm:right-6 px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-emerald-950/70 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-emerald-200 text-xs font-medium tracking-wide transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg group"
        title="Pular animação de abertura (Enter / Espaço / Esc)"
      >
        <span>Pular</span>
        <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">›</span>
      </button>

      {/* Subtle bottom engineering badge */}
      <div className="absolute bottom-5 sm:bottom-6 left-5 sm:left-6 text-[10px] text-emerald-500/60 font-mono tracking-wider hidden sm:flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>SISTEMA DE ENGENHARIA ELÉTRICA • CEMIG RDR/RDU</span>
      </div>
    </div>
  );
};
