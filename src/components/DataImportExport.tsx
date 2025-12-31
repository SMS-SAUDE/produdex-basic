import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TableName = "products" | "storage_locations" | "invoices" | "product_entries" | "product_exits" | "shopping_list";

const tableLabels: Record<TableName, string> = {
  products: "Produtos",
  storage_locations: "Locais de Armazenamento",
  invoices: "Notas Fiscais",
  product_entries: "Entradas de Produtos",
  product_exits: "Saídas de Produtos",
  shopping_list: "Lista de Compras",
};

const tableColumns: Record<TableName, { key: string; label: string }[]> = {
  products: [
    { key: "produto", label: "Produto" },
    { key: "marca", label: "Marca" },
    { key: "quantidade", label: "Quantidade" },
    { key: "unidade", label: "Unidade" },
    { key: "validade", label: "Validade" },
    { key: "valor", label: "Valor" },
    { key: "estoque_minimo", label: "Estoque Mínimo" },
    { key: "status", label: "Status" },
  ],
  storage_locations: [
    { key: "name", label: "Nome" },
    { key: "description", label: "Descrição" },
  ],
  invoices: [
    { key: "numero", label: "Número" },
    { key: "data", label: "Data" },
    { key: "valor_total", label: "Valor Total" },
  ],
  product_entries: [
    { key: "dia", label: "Data" },
    { key: "produto_id", label: "Produto ID" },
    { key: "quantidade", label: "Quantidade" },
    { key: "observacao", label: "Observação" },
  ],
  product_exits: [
    { key: "dia", label: "Data" },
    { key: "produto_id", label: "Produto ID" },
    { key: "quantidade", label: "Quantidade" },
    { key: "motivo", label: "Motivo" },
  ],
  shopping_list: [
    { key: "produto", label: "Produto" },
    { key: "quantidade", label: "Quantidade" },
    { key: "unidade", label: "Unidade" },
    { key: "prioridade", label: "Prioridade" },
    { key: "comprado", label: "Comprado" },
  ],
};

export default function DataImportExport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedExportTable, setSelectedExportTable] = useState<TableName>("products");
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [selectedTables, setSelectedTables] = useState<Record<TableName, boolean>>({
    products: true,
    storage_locations: true,
    invoices: true,
    product_entries: true,
    product_exits: true,
    shopping_list: true,
  });

  const { data: organization } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Gerar modelo Excel para importação
  const handleGenerateTemplate = (tableName: TableName) => {
    const columns = tableColumns[tableName];
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    
    // Adicionar algumas linhas de exemplo
    const exampleData = getExampleData(tableName);
    XLSX.utils.sheet_add_aoa(ws, exampleData, { origin: "A2" });
    
    // Ajustar largura das colunas
    ws["!cols"] = columns.map(() => ({ wch: 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableLabels[tableName]);
    XLSX.writeFile(wb, `modelo-${tableName}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({ title: "Modelo gerado com sucesso!" });
  };

  const getExampleData = (tableName: TableName): any[][] => {
    switch (tableName) {
      case "products":
        return [
          ["Arroz Integral", "Marca X", 100, "kg", "2025-12-31", 5.99, 10, "disponivel"],
          ["Feijão Preto", "Marca Y", 50, "kg", "2025-06-30", 8.50, 5, "disponivel"],
        ];
      case "storage_locations":
        return [
          ["Almoxarifado Central", "Local principal de armazenamento"],
          ["Depósito Secundário", "Depósito auxiliar"],
        ];
      case "invoices":
        return [
          ["NF-001", "2025-01-15", 1500.00],
          ["NF-002", "2025-01-20", 2300.50],
        ];
      case "product_entries":
        return [
          ["2025-01-15", "uuid-do-produto", 100, "Recebimento de compra"],
        ];
      case "product_exits":
        return [
          ["2025-01-15", "uuid-do-produto", 10, "Distribuição para unidade"],
        ];
      case "shopping_list":
        return [
          ["Arroz", 50, "kg", "alta", false],
          ["Feijão", 30, "kg", "media", false],
        ];
      default:
        return [];
    }
  };

  // Exportar dados para Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const tablesToExport = Object.entries(selectedTables)
        .filter(([_, selected]) => selected)
        .map(([table]) => table as TableName);

      if (tablesToExport.length === 0) {
        toast({ title: "Selecione pelo menos uma tabela", variant: "destructive" });
        return;
      }

      const wb = XLSX.utils.book_new();

      for (const tableName of tablesToExport) {
        const { data, error } = await supabase.from(tableName).select("*");
        if (error) throw error;

        const columns = tableColumns[tableName];
        const headers = columns.map((c) => c.label);
        const rows = (data || []).map((row) =>
          columns.map((c) => {
            const value = row[c.key];
            if (value === null || value === undefined) return "";
            if (typeof value === "boolean") return value ? "Sim" : "Não";
            return value;
          })
        );

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws["!cols"] = columns.map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, ws, tableLabels[tableName].slice(0, 31));
      }

      XLSX.writeFile(wb, `exportacao-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`);
      toast({ title: "Dados exportados com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({ title: "Erro ao exportar dados", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar dados para PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const tablesToExport = Object.entries(selectedTables)
        .filter(([_, selected]) => selected)
        .map(([table]) => table as TableName);

      if (tablesToExport.length === 0) {
        toast({ title: "Selecione pelo menos uma tabela", variant: "destructive" });
        return;
      }

      const doc = new jsPDF();
      let yPosition = 20;

      // Cabeçalho com dados da organização
      if (organization?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = organization.logo_url!;
          });
          doc.addImage(img, "PNG", 14, 10, 25, 25);
          yPosition = 40;
        } catch {
          // Ignora erro de logo
        }
      }

      doc.setFontSize(16);
      doc.text(organization?.company_name || "Exportação de Dados", 45, 20);
      doc.setFontSize(10);
      if (organization?.cnpj) {
        doc.text(`CNPJ: ${organization.cnpj}`, 45, 27);
      }
      doc.text(`Data: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 45, 34);

      yPosition = 45;

      for (const tableName of tablesToExport) {
        const { data, error } = await supabase.from(tableName).select("*");
        if (error) throw error;

        const columns = tableColumns[tableName];

        // Título da seção
        doc.setFontSize(12);
        doc.text(tableLabels[tableName], 14, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [columns.map((c) => c.label)],
          body: (data || []).map((row) =>
            columns.map((c) => {
              const value = row[c.key];
              if (value === null || value === undefined) return "-";
              if (typeof value === "boolean") return value ? "Sim" : "Não";
              return String(value);
            })
          ),
          theme: "striped",
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        // Nova página se necessário
        if (yPosition > 250 && tablesToExport.indexOf(tableName) < tablesToExport.length - 1) {
          doc.addPage();
          yPosition = 20;
        }
      }

      doc.save(`exportacao-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Importar dados do Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      
      const results: { table: string; success: number; errors: string[] }[] = [];

      for (const sheetName of wb.SheetNames) {
        const tableName = Object.entries(tableLabels).find(
          ([_, label]) => label === sheetName || label.startsWith(sheetName)
        )?.[0] as TableName | undefined;

        if (!tableName) {
          results.push({ table: sheetName, success: 0, errors: ["Tabela não reconhecida"] });
          continue;
        }

        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        if (jsonData.length === 0) {
          results.push({ table: tableLabels[tableName], success: 0, errors: ["Sem dados para importar"] });
          continue;
        }

        const columns = tableColumns[tableName];
        const mappedData = jsonData.map((row: any) => {
          const mapped: any = {};
          columns.forEach((col) => {
            const value = row[col.label];
            if (value !== undefined && value !== "") {
              if (col.key === "comprado") {
                mapped[col.key] = value === "Sim" || value === true || value === "true";
              } else {
                mapped[col.key] = value;
              }
            }
          });
          return mapped;
        });

        // Remover linhas vazias
        const validData = mappedData.filter((row: any) => Object.keys(row).length > 0);

        if (validData.length === 0) {
          results.push({ table: tableLabels[tableName], success: 0, errors: ["Sem dados válidos"] });
          continue;
        }

        const { error } = await supabase.from(tableName).insert(validData);
        
        if (error) {
          results.push({ table: tableLabels[tableName], success: 0, errors: [error.message] });
        } else {
          results.push({ table: tableLabels[tableName], success: validData.length, errors: [] });
        }
      }

      queryClient.invalidateQueries();

      const successCount = results.reduce((acc, r) => acc + r.success, 0);
      const errorTables = results.filter((r) => r.errors.length > 0);

      if (errorTables.length > 0) {
        toast({
          title: `Importação concluída com avisos`,
          description: `${successCount} registros importados. Erros: ${errorTables.map((e) => `${e.table}: ${e.errors.join(", ")}`).join("; ")}`,
          variant: "destructive",
        });
      } else {
        toast({ title: `${successCount} registros importados com sucesso!` });
      }
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro ao importar arquivo",
        description: error instanceof Error ? error.message : "Formato inválido",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleTable = (table: TableName) => {
    setSelectedTables((prev) => ({ ...prev, [table]: !prev[table] }));
  };

  const toggleAll = (selected: boolean) => {
    setSelectedTables({
      products: selected,
      storage_locations: selected,
      invoices: selected,
      product_entries: selected,
      product_exits: selected,
      shopping_list: selected,
    });
  };

  return (
    <div className="space-y-6">
      {/* Modelos para Importação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Modelos para Importação
          </CardTitle>
          <CardDescription>
            Baixe os modelos em Excel para preencher e importar dados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(tableLabels) as TableName[]).map((table) => (
              <Button
                key={table}
                variant="outline"
                className="justify-start"
                onClick={() => handleGenerateTemplate(table)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {tableLabels[table]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dados
          </CardTitle>
          <CardDescription>
            Exporte os dados do sistema em Excel ou PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Selecione as tabelas:</Label>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
                  Nenhuma
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(tableLabels) as TableName[]).map((table) => (
                <div
                  key={table}
                  className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => toggleTable(table)}
                >
                  <Checkbox
                    id={`export-${table}`}
                    checked={selectedTables[table]}
                    onCheckedChange={() => toggleTable(table)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label htmlFor={`export-${table}`} className="cursor-pointer text-sm">
                    {tableLabels[table]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleExportExcel}
              disabled={isExporting || !Object.values(selectedTables).some((v) => v)}
              className="flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar Excel"}
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isExporting || !Object.values(selectedTables).some((v) => v)}
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isExporting ? "Gerando..." : "Exportar PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Importação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Dados
          </CardTitle>
          <CardDescription>
            Importe dados a partir de um arquivo Excel. Use os modelos acima para garantir o formato correto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
              id="excel-import"
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Selecione um arquivo Excel (.xlsx ou .xls) para importar
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importando..." : "Selecionar Arquivo"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Instruções:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>O nome da aba deve corresponder ao nome da tabela (ex: "Produtos")</li>
              <li>A primeira linha deve conter os cabeçalhos conforme o modelo</li>
              <li>Dados duplicados não serão substituídos (use backup para atualização)</li>
              <li>Campos obrigatórios devem estar preenchidos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
