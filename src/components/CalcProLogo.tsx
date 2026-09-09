import React from "react";
import { ExternalLink } from "lucide-react";

interface CalcProLogoProps {
  className?: string;
  showText?: boolean;
  showSlogan?: boolean;
  showIcon?: boolean;
  variant?: "dark" | "light";
}

export const CalcProLogo: React.FC<CalcProLogoProps> = ({
  className = "",
  showText = true,
  showSlogan = false,
  showIcon = false, // Excluído o símbolo gráfico conforme solicitado, mantendo apenas o texto
  variant = "dark", // "dark" = on dark background (header), "light" = on light background
}) => {
  const isDark = variant === "dark";

  return (
    <a
      href="https://www.google.com/url?sa=E&q=https%3A%2F%2Fsites.google.com%2Fview%2Fcalcprosolucoes%2Fin%25C3%25ADcio"
      target="_blank"
      rel="noopener noreferrer"
      title="CalcPro Soluções"
      className={`group inline-flex items-center gap-3 transition-all duration-200 hover:opacity-95 cursor-pointer select-none ${className}`}
    >
      {/* High-Definition Vector Shield Emblem (Opcional - oculto por padrão) */}
      {showIcon && (
        <div className="relative shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-md border border-slate-700/80 group-hover:border-[#008037] group-hover:shadow-lg group-hover:shadow-[#008037]/30 group-hover:scale-105 transition-all duration-200">
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full text-[#008037]"
            xmlns="http://www.w3.org/2000/svg"
            style={{ shapeRendering: "geometricPrecision" }}
          >
            {/* Shield Outer Outline */}
            <path
              d="M 22 18 C 22 18, 60 18, 98 18 C 105 18, 106 23, 106 30 L 106 58 C 106 82, 60 106, 60 106 C 60 106, 14 82, 14 58 L 14 30 C 14 23, 15 18, 22 18 Z"
              fill="none"
              stroke="#008037"
              strokeWidth="10"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Monogram 'cp' / spiral symbol inside shield */}
            <path
              d="M 64 36 C 48 36, 38 46, 38 60 C 38 74, 48 84, 62 84 C 74 84, 82 76, 82 64 C 82 52, 72 44, 58 44 C 47 44, 42 50, 42 58 C 42 66, 48 71, 56 71 C 62 71, 66 67, 66 61 L 66 82"
              fill="none"
              stroke="#008037"
              strokeWidth="9.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* External Link Indicator Badge */}
          <div className="absolute -top-1 -right-1 bg-[#008037] group-hover:bg-[#00a847] text-white p-0.5 rounded-full shadow-xs border border-slate-900 transition-colors">
            <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </div>
      )}

      {showText && (
        <div className="flex flex-col justify-center">
          {/* Brand Name & Tag */}
          <div className="flex items-baseline gap-1.5 leading-none">
            <span
              className={`text-2xl font-black tracking-tight font-sans transition-colors ${
                isDark
                  ? "text-white group-hover:text-[#22c55e]"
                  : "text-[#008037] group-hover:text-[#00a847]"
              }`}
            >
              Calc<span className="text-[#008037] dark:text-[#22c55e]">Pro</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#008037] dark:text-[#22c55e] bg-[#008037]/15 border border-[#008037]/30 px-1.5 py-0.5 rounded-md">
              SOLUÇÕES
            </span>
          </div>
        </div>
      )}
    </a>
  );
};


