import React from "react";
import { CemigMaterialItem, ProjectAnalysisResult, LaborItem } from "../types";
import { getEstimatedMarketPrice } from "../cemigDatabase";
import { resolveOfficialMaterialCode } from "../itemCatalogLookup";
import { calculateProjectLabor } from "../services/laborService";
import { DEFAULT_US_UNIT_PRICE } from "../data/laborCatalog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Printer, Download, FileSpreadsheet, FileText, Save, CheckCircle2, RefreshCw } from "lucide-react";

interface ExportBarProps {
  materials: CemigMaterialItem[];
  projectInfo: ProjectAnalysisResult | null;
  onSaveLocal: () => void;
  hasSaved: boolean;
  isSaving?: boolean;
  profitMargin?: number;
  laborItems?: LaborItem[];
  usUnitPrice?: number;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  materials,
  projectInfo,
  onSaveLocal,
  hasSaved,
  isSaving = false,
  profitMargin = 0,
  laborItems: externalLaborItems,
  usUnitPrice: externalUsUnitPrice,
}) => {
  // 1. Native Print
  const handlePrint = () => {
    window.print();
  };

  // 2. Export Excel (.xlsx)
  const handleExportExcel = () => {
    const installItems = materials.filter(
      (item) => item.status !== "RETIRAR" && !item.description.startsWith("[A RETIRAR]")
    );
    const removeItems = materials.filter(
      (item) => item.status === "RETIRAR" || item.description.startsWith("[A RETIRAR]")
    );

    const margin = profitMargin || 0;
    const marginMultiplier = 1 + margin / 100;
    const workbook = XLSX.utils.book_new();

    // Calculate total materials value
    const totalMaterialsValue = installItems.reduce((acc, item) => {
      const baseUnitPrice =
        item.unitPrice !== undefined && item.unitPrice > 0
          ? item.unitPrice
          : getEstimatedMarketPrice(item.code, item.category, item.description);
      const effectiveUnitPrice = baseUnitPrice * marginMultiplier;
      return acc + item.quantity * effectiveUnitPrice;
    }, 0);

    // Sheet 1: Materiais a Instalar / Projeto
    const wsDataInstall: Record<string, any>[] = installItems.map((item, idx) => {
      const baseUnitPrice =
        item.unitPrice !== undefined && item.unitPrice > 0
          ? item.unitPrice
          : getEstimatedMarketPrice(item.code, item.category, item.description);
      const effectiveUnitPrice = baseUnitPrice * marginMultiplier;
      const totalItemVal = item.quantity * effectiveUnitPrice;

      const codigoDisplay = resolveOfficialMaterialCode(item);

      const row: Record<string, any> = {
        "Item N°": idx + 1,
        "Código": codigoDisplay,
        "Descrição do Material": item.description,
        "Unidade": item.unit,
        "Quantidade": item.quantity,
        "Val. Unit. (R$)": effectiveUnitPrice > 0 ? Number(effectiveUnitPrice.toFixed(2)) : 0,
        "Val. Total (R$)": totalItemVal > 0 ? Number(totalItemVal.toFixed(2)) : 0,
      };

      if (margin > 0) {
        row["Custo Base (R$)"] = baseUnitPrice > 0 ? Number(baseUnitPrice.toFixed(2)) : 0;
        row["Margem de Lucro"] = `${margin}%`;
      }

      row["Categoria"] = item.category || "Geral";
      row["Origem"] = item.sourceStructureName || "Geral";

      return row;
    });

    // O valor total dos materiais deve ficar apenas ao final da lista de materiais consolidados
    wsDataInstall.push({
      "Item N°": "",
      "Código": "TOTAL MATERIAIS",
      "Descrição do Material": margin > 0 ? `VALOR TOTAL DOS MATERIAIS CONSOLIDADOS (C/ MARGEM +${margin}%)` : "VALOR TOTAL DOS MATERIAIS CONSOLIDADOS",
      "Unidade": "",
      "Quantidade": installItems.reduce((acc, i) => acc + i.quantity, 0),
      "Val. Unit. (R$)": "",
      "Val. Total (R$)": Number(totalMaterialsValue.toFixed(2)),
      ...(margin > 0 ? { "Custo Base (R$)": "", "Margem de Lucro": "" } : {}),
      "Categoria": "",
      "Origem": "",
    });

    const worksheetInstall = XLSX.utils.json_to_sheet(wsDataInstall);
    worksheetInstall["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 55 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      ...(margin > 0 ? [{ wch: 16 }, { wch: 16 }] : []),
      { wch: 18 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheetInstall, "Materiais a Instalar");

    // Sheet 2: Materiais a Retirar (Separated)
    if (removeItems.length > 0) {
      const wsDataRemove = removeItems.map((item, idx) => {
        const codigoDisplay = resolveOfficialMaterialCode(item);

        return {
          "Item N°": idx + 1,
          "Código": codigoDisplay,
          "Descrição do Material A RETIRAR": item.description,
          "Unidade": item.unit,
          "Quantidade": item.quantity,
          "Categoria": item.category || "Geral",
          "Origem": item.sourceStructureName || "Geral",
        };
      });
      const worksheetRemove = XLSX.utils.json_to_sheet(wsDataRemove);
      worksheetRemove["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 55 },
        { wch: 10 },
        { wch: 14 },
        { wch: 16 },
        { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheetRemove, "Materiais a Retirar");
    }

    // Sheet 3: Mão de Obra (US) - Folha Separada
    const effectiveLabor =
      externalLaborItems && externalLaborItems.length > 0
        ? {
            items: externalLaborItems,
            totalUS: externalLaborItems.reduce((acc, i) => acc + i.totalUS, 0),
            usUnitPrice: externalUsUnitPrice !== undefined ? externalUsUnitPrice : DEFAULT_US_UNIT_PRICE,
            totalLaborValue: Number(
              (
                externalLaborItems.reduce((acc, i) => acc + i.totalUS, 0) *
                (externalUsUnitPrice !== undefined ? externalUsUnitPrice : DEFAULT_US_UNIT_PRICE)
              ).toFixed(2)
            ),
          }
        : calculateProjectLabor(
            {
              structures: projectInfo?.structures || [],
              cables: projectInfo?.cables || [],
              voltageLevel: projectInfo?.voltageLevel,
              networkType: projectInfo?.networkType,
            },
            externalUsUnitPrice !== undefined ? externalUsUnitPrice : DEFAULT_US_UNIT_PRICE,
            projectInfo?.networkType
          );

    const wsDataLabor = effectiveLabor.items.map((item) => ({
      "Item N°": item.item,
      "Código Atividade": item.code,
      "Descrição da Atividade (Tabela Oficial)": item.description,
      "Unidade": item.unit,
      "Qtd. Projeto": item.quantity,
      "US Unitária": item.usUnit,
      "Total US": item.totalUS,
      "Preço Unitário US (R$)": effectiveLabor.usUnitPrice,
      "Valor Total (R$)": item.totalValue,
    }));

    // Add summary row to labor sheet
    wsDataLabor.push({
      "Item N°": "" as any,
      "Código Atividade": "CONSOLIDADO",
      "Descrição da Atividade (Tabela Oficial)": "TOTAL DE US DO PROJETO",
      "Unidade": "US",
      "Qtd. Projeto": "" as any,
      "US Unitária": "" as any,
      "Total US": effectiveLabor.totalUS,
      "Preço Unitário US (R$)": effectiveLabor.usUnitPrice,
      "Valor Total (R$)": effectiveLabor.totalLaborValue,
    });

    const worksheetLabor = XLSX.utils.json_to_sheet(wsDataLabor);
    worksheetLabor["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 55 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheetLabor, "Mão de Obra (US)");

    // Sheet 4: Cabos & Vãos da Rede
    if (projectInfo?.cables && projectInfo.cables.length > 0) {
      const wsDataCables = projectInfo.cables.map((cable, idx) => ({
        "Item N°": idx + 1,
        "ID Trecho": cable.id,
        "Especificação do Condutor": cable.cableType,
        "Tensão": cable.voltage || "MT",
        "Status": cable.status || "INSTALAR",
        "Vãos Contabilizados": cable.spansCount || 1,
        "Extensão Total (m)": cable.estimatedLengthMeters || 35,
        "Detalhamento dos Vãos": cable.spansDetail || "",
        "Mnemônico Oficial": cable.mnemonicCode || "",
        "Observações": cable.notes || "",
      }));

      // Total row
      wsDataCables.push({
        "Item N°": "" as any,
        "ID Trecho": "TOTAL",
        "Especificação do Condutor": "SOMA TOTAL DE VÃOS E EXTENSÃO",
        "Tensão": "",
        "Status": "",
        "Vãos Contabilizados": projectInfo.cables.reduce((acc, c) => acc + (Number(c.spansCount) || 1), 0),
        "Extensão Total (m)": projectInfo.cables.reduce((acc, c) => acc + (Number(c.estimatedLengthMeters) || 0), 0),
        "Detalhamento dos Vãos": "",
        "Mnemônico Oficial": "",
        "Observações": "Inseridos na Lista de Materiais Consolidados",
      });

      const worksheetCables = XLSX.utils.json_to_sheet(wsDataCables);
      worksheetCables["!cols"] = [
        { wch: 8 },
        { wch: 12 },
        { wch: 35 },
        { wch: 10 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 35 },
        { wch: 18 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheetCables, "Cabos & Vãos da Rede");
    }

    const filename = `Lista_Materiais_${
      projectInfo?.projectName.replace(/[^a-zA-Z0-9]/g, "_") || "Projeto"
    }_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  // 3. Export PDF (.pdf) with A4 layout and consolidated materials list
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = profitMargin || 0;
    const marginMultiplier = 1 + margin / 100;

    const installItems = materials.filter(
      (item) => item.status !== "RETIRAR" && !item.description.startsWith("[A RETIRAR]")
    );
    const removeItems = materials.filter(
      (item) => item.status === "RETIRAR" || item.description.startsWith("[A RETIRAR]")
    );

    // Header Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 22, "F");

    doc.setTextColor(245, 158, 11); // Amber
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Relatório Oficial de Lista de Materiais de Projeto", 12, 14);

    // Calculate Project Total for Materials
    const totalMaterialsValue = installItems.reduce((acc, item) => {
      const basePrice =
        item.unitPrice !== undefined && item.unitPrice > 0
          ? item.unitPrice
          : getEstimatedMarketPrice(item.code, item.category, item.description);
      return acc + item.quantity * basePrice * marginMultiplier;
    }, 0);

    // Metadata Subheader (Note: Total value stays ONLY at the end of materials list as requested)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(`Projeto: ${projectInfo?.projectName || "Projeto de Distribuição"}`, 12, 30);
    doc.setFont("helvetica", "normal");
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}`, 12, 36);
    doc.text(`Itens a Instalar: ${installItems.length} | Itens a Retirar: ${removeItems.length}`, 12, 42);

    if (margin > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(217, 119, 6); // Amber-600
      doc.text(`Margem de Lucro Aplicada: +${margin}%`, 12, 48);
    }

    const tableRowsInstall = installItems.map((item, idx) => {
      const basePrice =
        item.unitPrice !== undefined && item.unitPrice > 0
          ? item.unitPrice
          : getEstimatedMarketPrice(item.code, item.category, item.description);
      const effectiveUnitPrice = basePrice * marginMultiplier;
      const totalVal = item.quantity * effectiveUnitPrice;

      const codigoDisplay = resolveOfficialMaterialCode(item);

      return [
        idx + 1,
        codigoDisplay,
        item.description,
        item.unit,
        (Number(item.quantity) || 0).toLocaleString("pt-BR"),
        effectiveUnitPrice > 0
          ? (Number(effectiveUnitPrice) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "R$ 0,00",
        totalVal > 0 ? (Number(totalVal) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00",
      ];
    });

    autoTable(doc, {
      startY: margin > 0 ? 54 : 48,
      margin: { top: 12, right: 10, bottom: 15, left: 10 },
      head: [
        [
          "#",
          "Código",
          "1. Descrição do Material A INSTALAR",
          "Unid.",
          "Qtd.",
          margin > 0 ? `Val. Unit. (+${margin}%)` : "Val. Unit.",
          margin > 0 ? "Val. Total (c/ Margem)" : "Val. Total",
        ],
      ],
      body: tableRowsInstall,
      theme: "grid",
      showHead: "everyPage",
      showFoot: "lastPage",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "left",
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 26, fontStyle: "bold" },
        2: { cellWidth: 78 },
        3: { cellWidth: 10, halign: "center" },
        4: { cellWidth: 14, halign: "right", fontStyle: "bold" },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
      foot:
        totalMaterialsValue > 0
          ? [
              [
                "",
                "",
                margin > 0 ? `VALOR TOTAL DOS MATERIAIS (INCLUINDO +${margin}% DE LUCRO)` : "VALOR TOTAL DOS MATERIAIS CONSOLIDADOS",
                "",
                "",
                "",
                (Number(totalMaterialsValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
              ],
            ]
          : undefined,
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "right",
      },
    });

    // If there are materials to remove, print a separate table for them!
    if (removeItems.length > 0) {
      const lastTableEnd = (doc as any).lastAutoTable?.finalY || 120;

      const tableRowsRemove = removeItems.map((item, idx) => {
        const codigoDisplay = resolveOfficialMaterialCode(item);

        return [
          idx + 1,
          codigoDisplay,
          item.description,
          item.unit,
          (Number(item.quantity) || 0).toLocaleString("pt-BR"),
          item.sourceStructureName || "Geral",
        ];
      });

      autoTable(doc, {
        startY: lastTableEnd + 10,
        margin: { top: 12, right: 10, bottom: 15, left: 10 },
        head: [["#", "Código", "2. LISTA SEPARADA DE MATERIAIS A RETIRAR", "Unid.", "Qtd. Retirar", "Estrutura Origem"]],
        body: tableRowsRemove,
        theme: "grid",
        showHead: "everyPage",
        headStyles: {
          fillColor: [190, 18, 60], // rose-700
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "left",
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 28, fontStyle: "bold" },
          2: { cellWidth: 84 },
          3: { cellWidth: 10, halign: "center" },
          4: { cellWidth: 18, halign: "right", fontStyle: "bold" },
          5: { cellWidth: 42 },
        },
      });
    }

    // 4. Folha Separada: Cálculo de Mão de Obra do Projeto (US)
    const effectiveLabor =
      externalLaborItems && externalLaborItems.length > 0
        ? {
            items: externalLaborItems,
            totalUS: externalLaborItems.reduce((acc, i) => acc + i.totalUS, 0),
            usUnitPrice: externalUsUnitPrice !== undefined ? externalUsUnitPrice : DEFAULT_US_UNIT_PRICE,
            totalLaborValue: Number(
              (
                externalLaborItems.reduce((acc, i) => acc + i.totalUS, 0) *
                (externalUsUnitPrice !== undefined ? externalUsUnitPrice : DEFAULT_US_UNIT_PRICE)
              ).toFixed(2)
            ),
          }
        : calculateProjectLabor(
            {
              structures: projectInfo?.structures || [],
              cables: projectInfo?.cables || [],
              voltageLevel: projectInfo?.voltageLevel,
              networkType: projectInfo?.networkType,
            },
            externalUsUnitPrice !== undefined ? externalUsUnitPrice : DEFAULT_US_UNIT_PRICE,
            projectInfo?.networkType
          );

    doc.addPage();

    // Sheet Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 22, "F");

    doc.setTextColor(245, 158, 11); // Amber
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("CÁLCULO DE MÃO DE OBRA DO PROJETO (US)", 12, 14);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(`Projeto: ${projectInfo?.projectName || "Projeto de Rede CEMIG"}`, 12, 30);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Tensão: ${projectInfo?.voltageLevel || "13.8kV"} | Padrão: ${projectInfo?.networkType || "RDU"} | Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}`,
      12,
      36
    );
    doc.text(
      `Preço Unitário da US: ${(Number(effectiveLabor.usUnitPrice) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} | Total US: ${effectiveLabor.totalUS.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })} US`,
      12,
      42
    );

    const laborTableRows = effectiveLabor.items.map((item) => [
      item.item.toString(),
      item.code,
      item.description,
      item.unit,
      item.quantity.toString(),
      item.usUnit.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      `${item.totalUS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} US`,
      item.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ]);

    autoTable(doc, {
      startY: 48,
      head: [
        [
          "Item",
          "Código",
          "Descrição da Atividade (Tabela Oficial)",
          "Unid.",
          "Qtd.",
          "US Unit.",
          "Total US",
          "Total (R$)",
        ],
      ],
      body: laborTableRows,
      theme: "striped",
      headStyles: {
        fillColor: [245, 158, 11], // amber-500
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 18, fontStyle: "bold" },
        2: { cellWidth: 78 },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 14, halign: "right" },
        5: { cellWidth: 16, halign: "right" },
        6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
        7: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      },
    });

    const laborFinalY = (doc as any).lastAutoTable.finalY + 8;
    if (laborFinalY < 250) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(12, laborFinalY, 186, 32, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("CONSOLIDAÇÃO FINANCEIRA DO PROJETO", 16, laborFinalY + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(
        `Total de Mão de Obra (${effectiveLabor.totalUS.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
        })} US × ${effectiveLabor.usUnitPrice.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}):`,
        16,
        laborFinalY + 14
      );
      doc.text(
        effectiveLabor.totalLaborValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        192,
        laborFinalY + 14,
        { align: "right" }
      );

      doc.text("Total de Materiais Consolidados:", 16, laborFinalY + 20);
      doc.text(
        totalMaterialsValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        192,
        laborFinalY + 20,
        { align: "right" }
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9); // Amber dark
      doc.text("VALOR TOTAL GERAL (MATERIAIS + MÃO DE OBRA):", 16, laborFinalY + 27);
      doc.text(
        (totalMaterialsValue + effectiveLabor.totalLaborValue).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        192,
        laborFinalY + 27,
        { align: "right" }
      );
    }

    const filename = `Lista_Materiais_${
      projectInfo?.projectName.replace(/[^a-zA-Z0-9]/g, "_") || "Projeto"
    }.pdf`;

    doc.save(filename);
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm">Ações da Lista de Materiais</h4>
          <p className="text-slate-400 text-xs">
            Imprima ou exporte os dados consolidados em formatos padrão.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
        {/* Save Button */}
        <button
          id="btn-save-materials-list"
          onClick={onSaveLocal}
          disabled={isSaving}
          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-xl transition-all cursor-pointer text-center select-none ${
            isSaving
              ? "bg-amber-600 text-white cursor-wait animate-pulse shadow-xs ring-2 ring-amber-400/50"
              : hasSaved
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 active:scale-95"
          }`}
          title={
            isSaving
              ? "Salvando a lista de materiais no histórico..."
              : hasSaved
              ? "Lista de materiais salva no histórico local. Clique para salvar novamente."
              : "Salvar lista de materiais e composições no histórico local"
          }
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 text-amber-100 animate-spin shrink-0" />
              <span>Salvando lista...</span>
            </>
          ) : hasSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Lista Salva</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Salvar Lista</span>
            </>
          )}
        </button>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer text-center"
        >
          <Printer className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Imprimir</span>
        </button>

        {/* PDF Export */}
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-xs cursor-pointer text-center"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Exportar PDF</span>
        </button>

        {/* Excel Export */}
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs cursor-pointer text-center"
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>Exportar Excel</span>
        </button>
      </div>
    </div>
  );
};
