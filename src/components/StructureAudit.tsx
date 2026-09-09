import React from "react";
import { IdentifiedStructure, UnrecognizedStructure, CableSegment } from "../types";
import { AlertTriangle, CheckCircle2, Info, Search, Layers, Zap, CornerDownRight } from "lucide-react";

interface AuditModalProps {
  structure: IdentifiedStructure | null;
  onClose: () => void;
}

export const StructureAuditModal: React.FC<AuditModalProps> = ({ structure, onClose }) => {
  if (!structure) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-xs shrink-0">
                {structure.type}
              </span>
              <h3 className="font-bold text-base sm:text-lg text-white truncate">
                Auditoria da Estrutura {structure.code} ({structure.id})
              </h3>
            </div>
            <p className="text-slate-400 text-xs mt-1 break-words line-clamp-2 sm:line-clamp-none">{structure.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0 w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Código / Identificador</span>
              <span className="font-bold text-slate-800 text-sm">{structure.code}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Status de Instalação</span>
              <span
                className={`font-bold px-2 py-0.5 rounded inline-block text-[11px] mt-0.5 ${
                  structure.status === "INSTALAR"
                    ? "bg-emerald-100 text-emerald-800"
                    : structure.status === "RETIRAR"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {structure.status === "INSTALAR"
                  ? "A INSTALAR (PROPOSTO)"
                  : structure.status === "RETIRAR"
                  ? "A RETIRAR (PROPOSTO)"
                  : "EXISTENTE"}
              </span>
            </div>
            {structure.associatedPost && (
              <div>
                <span className="text-slate-500 font-semibold block uppercase">Poste Associado</span>
                <span className="font-mono font-bold text-slate-800 break-words">{structure.associatedPost}</span>
              </div>
            )}
            {structure.locationHint && (
              <div>
                <span className="text-slate-500 font-semibold block uppercase">Localização / Vão</span>
                <span className="text-slate-700 break-words">{structure.locationHint}</span>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Materiais Contabilizados para esta Estrutura
            </h4>

            {structure.computedMaterials.length === 0 ? (
              <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded border text-center">
                Nenhum item de material isolado atribuído diretamente nesta estrutura.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs min-w-[360px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-28">Código</th>
                      <th className="py-2.5 px-3">Descrição do Item</th>
                      <th className="py-2.5 px-3 w-16 text-center">Un.</th>
                      <th className="py-2.5 px-3 w-20 text-right">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {structure.computedMaterials.map((m, mIdx) => (
                      <tr key={`aud_mat_${m.id || m.code}_${mIdx}`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 bg-slate-50">
                          {m.code}
                        </td>
                        <td className="py-2 px-3 text-slate-700 break-words">{m.description}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{m.unit}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {m.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors text-center"
          >
            Fechar Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};

interface AuditPanelProps {
  structures: IdentifiedStructure[];
  cables: CableSegment[];
  unrecognized: UnrecognizedStructure[];
  onSelectStructure: (s: IdentifiedStructure) => void;
}

export const StructureAuditList: React.FC<AuditPanelProps> = ({
  structures,
  cables,
  unrecognized,
  onSelectStructure,
}) => {
  const [filterType, setFilterType] = React.useState<string>("ALL");

  const filteredStructures = structures.filter((s) => {
    if (filterType === "ALL") return true;
    return s.type === filterType;
  });

  return (
    <div className="space-y-6 mb-8">
      {/* Unrecognized Warning Box */}
      {unrecognized.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 w-full">
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Atenção: {unrecognized.length} estrutura(s) / anotação(ões) não reconhecidas no padrão CEMIG
                </h4>
                <p className="text-xs text-amber-800 mt-1">
                  Os seguintes itens foram encontrados na planta, mas não correspondem a mnemônicos oficiais do catálogo CEMIG. Verifique manualmente:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {unrecognized.map((u, i) => (
                  <div
                    key={i}
                    className="bg-white/80 border border-amber-200 rounded p-2.5 text-xs text-slate-800"
                  >
                    <span className="font-mono font-bold text-rose-600 block">{u.rawText}</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {u.contextHint || "Sem detalhe de localização"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Identified Structures Grid & Auditor */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200 mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Conferência de Estruturas & Cabos Lidos no Projeto</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Clique em qualquer estrutura para conferir os componentes e materiais contabilizados.
            </p>
          </div>

          {/* Quick Filter */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 flex-wrap">
            {["ALL", "MT", "BT", "POSTE", "TRANSFORMADOR", "ESTAI"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filterType === t
                    ? "bg-amber-500 text-slate-950 font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {t === "ALL" ? "Todas" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Structures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStructures.map((s, sIdx) => (
            <div
              key={`struct_${s.id}_${sIdx}`}
              onClick={() => onSelectStructure(s)}
              className="group bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-400 rounded-xl p-4 cursor-pointer transition-all shadow-xs hover:shadow-md relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                    {s.code}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    ID: {s.id}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    s.status === "INSTALAR"
                      ? "bg-emerald-100 text-emerald-800"
                      : s.status === "RETIRAR"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <p className="text-xs text-slate-700 font-medium line-clamp-2 mb-3">
                {s.description}
              </p>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {s.computedMaterials.length} materiais contabilizados
                </span>
                <span className="text-amber-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Conferir <CornerDownRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Cables Section */}
        {cables.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Condutores e Cabos Identificados ({cables.length} trechos/vãos)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cables.map((c, cIdx) => (
                <div
                  key={`cable_${c.id}_${cIdx}`}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {c.cableType} ({c.voltage})
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {c.spansCount} vãos • {c.estimatedLengthMeters} metros calculados
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                      c.status === "INSTALAR"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {c.estimatedLengthMeters}m ({c.status})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
