import React from "react";
import {
  X,
  FileUp,
  Zap,
  FileSpreadsheet,
  Download,
  Save,
  Printer,
  Boxes,
  ArrowLeft,
  Home,
  Search,
  Sparkles,
  Info,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMnemonicsCatalog?: () => void;
  onOpenMaterialsCatalog?: () => void;
  onOpenPricesModal?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-help-guide-fullscreen"
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col text-slate-100 animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 1. TOP FULLSCREEN HEADER BAR */}
      <header className="px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-md">
        {/* Left: Back to Home Button */}
        <div className="flex items-center gap-3">
          <button
            id="btn-help-back-home-top"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer select-none active:scale-95 shrink-0"
            title="Voltar para a tela inicial do aplicativo"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Voltar à Tela Inicial</span>
          </button>
        </div>

        {/* Right: Quick Action Close */}
        <div className="flex items-center gap-2">
          <button
            id="btn-close-help-fullscreen"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer select-none"
            title="Fechar guia e retornar"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Início</span>
            <X className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* 2. SECTION HEADER */}
      <div className="px-4 sm:px-6 pt-2.5 bg-slate-900/95 border-b border-slate-800 shrink-0 flex items-center gap-1.5">
        <div className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl bg-slate-800/90 text-amber-400 border-t border-x border-slate-700 shadow-xs flex items-center gap-2 select-none">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Passo a Passo (Início Rápido)</span>
        </div>
      </div>

      {/* 3. MAIN FULLSCREEN CONTENT AREA (Scrollable) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              1
            </div>
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Definir o Nível de Tensão do Projeto
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-md">
                  Configuração Inicial
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                No topo da tela, clique no seletor <strong>Nível de Tensão</strong> para guiar a busca automática para a classe correta da rede CEMIG:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-amber-400 font-bold block mb-1 text-xs sm:text-sm">
                    13,8 kV (Classe 15 kV):
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Redes de Média Tensão convencionais urbanas e rurais (estruturas N1, N2, N3, B1, cruzetas de 2.000mm ou 2.400mm e isoladores 15 kV).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-amber-400 font-bold block mb-1 text-xs sm:text-sm">
                    34,5 kV (Classe 35 kV):
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Redes rurais de subtransmissão 34,5 kV (estruturas reforçadas M1, M2, cruzetas de 2.400mm ou 3.000mm e isoladores de 35 kV).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              2
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-amber-400" />
                  Carregar Projeto (Tamanhos e Formatos)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-md">
                  Entrada de Dados
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Importe sua planta técnica ou diagrama unifilar através do <strong>Menu Lateral</strong> no botão <strong>Carregar Projeto (PDF/JPEG)</strong> ou arrastando o arquivo diretamente para o centro da tela.
              </p>

              {/* Informações de Tamanho Máximo de Arquivos */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Tamanhos Máximos Suportados para Leitura:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>Arquivo PDF: até 3,2 MB</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Limite de segurança estrito da infraestrutura em nuvem (Vercel). Ideal para projetos vetorizados de 1 folha ou plantas otimizadas.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Imagens (JPEG/PNG/WEBP): até 20 MB</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      O sistema realiza compressão inteligente no navegador mantendo alta definição de textos, símbolos e numerações de postes.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  💡 <strong className="text-amber-300">Recomendação prática de engenharia:</strong> Se você tiver uma prancha extensa ou arquivo PDF pesado acima de 3,2 MB, salve ou exporte a página principal como <strong>imagem JPEG</strong> no seu leitor de PDF/AutoCAD. A leitura por imagem é mais rápida, tem resolução cristalina e não sofre quedas de conexão.
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              3
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  Auditar Estruturas Reconhecidas
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-md">
                  Rastreabilidade
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                No painel lateral esquerdo <strong>"Estruturas e Postes Identificados"</strong>, confira todos os pontos encontrados na planta (ex: <code>P1 - 11/300 - N1</code>).
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Ao clicar em qualquer estrutura da lista, abre-se a janela de <strong>Auditoria de Composição</strong>, mostrando cada componente do mnemônico correspondente.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              4
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-400" />
                  Explosão de Mnemônicos e Ajuste de Itens
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-md">
                  Edição Flexível
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Na tabela central, todos os materiais repetidos são consolidados automaticamente:
              </p>
              <ul className="text-xs sm:text-sm text-slate-300 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Adicionar Mnemônico / Kit:</strong> Clique em <code>+ Adicionar Mnemônico</code> para consultar o catálogo e incluir novas montagens.
                </li>
                <li>
                  <strong>Adicionar Material Avulso:</strong> Insira itens pontuais digitando o código CEMIG ou descrição (postes, cabos, etc.).
                </li>
                <li>
                  <strong>Margem de Lucro / BDI:</strong> Altere a margem percentual no seletor para calcular o valor de venda orçado em tempo real.
                </li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              5
            </div>
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  Salvar, Exportar e Imprimir
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-md">
                  Exportação Final
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Na barra inferior da tela de materiais, você conta com os seguintes botões de exportação profissional:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <Save className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                  <strong className="block text-white text-xs sm:text-sm font-bold">Salvar Lista</strong>
                  <span className="text-[11px] text-slate-400">Grava no histórico local</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <strong className="block text-white text-xs sm:text-sm font-bold">Planilha Excel</strong>
                  <span className="text-[11px] text-slate-400">Arquivo .XLSX com fórmulas</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <Download className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
                  <strong className="block text-white text-xs sm:text-sm font-bold">Relatório PDF</strong>
                  <span className="text-[11px] text-slate-400">Documento técnico formatado</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <Printer className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                  <strong className="block text-white text-xs sm:text-sm font-bold">Imprimir</strong>
                  <span className="text-[11px] text-slate-400">Layout limpo para impressão</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM FULLSCREEN FOOTER BAR */}
      <footer className="px-4 sm:px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 shadow-lg">
        <button
          id="btn-help-back-home-bottom"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4 text-slate-950" />
          <span>Voltar à Tela Inicial</span>
        </button>
      </footer>
    </div>
  );
};
