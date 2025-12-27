import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrganizationData {
  company_name: string;
  cnpj: string | null;
  address: string | null;
  secretary_name: string | null;
  coordinator_name: string | null;
  developer_name: string | null;
  logo_url: string | null;
}

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  // Fetch organization data
  const { data: organization } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as OrganizationData | null;
    },
  });

  // Relatório de Estoque
  const { data: stockReport } = useQuery({
    queryKey: ["stock-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          storage_locations(name)
        `)
        .order("produto");
      if (error) throw error;
      return data;
    },
  });

  // Relatório de Movimentações
  const { data: movementsReport } = useQuery({
    queryKey: ["movements-report"],
    queryFn: async () => {
      const [entriesRes, exitsRes] = await Promise.all([
        supabase
          .from("product_entries")
          .select(`
            *,
            products(produto, marca),
            storage_locations(name),
            invoices(numero)
          `)
          .order("dia", { ascending: false }),
        supabase
          .from("product_exits")
          .select(`
            *,
            products(produto, marca),
            storage_locations(name)
          `)
          .order("dia", { ascending: false }),
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (exitsRes.error) throw exitsRes.error;

      return {
        entries: entriesRes.data,
        exits: exitsRes.data,
      };
    },
  });

  // Relatório de Notas Fiscais
  const { data: invoicesReport } = useQuery({
    queryKey: ["invoices-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          storage_locations(name)
        `)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Relatório de Produtos com Baixo Estoque
  const { data: lowStockReport } = useQuery({
    queryKey: ["low-stock-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          storage_locations(name)
        `)
        .or("status.eq.baixo_estoque,status.eq.fora_de_estoque")
        .order("quantidade");
      if (error) throw error;
      return data;
    },
  });

  // Relatório de Produtos Próximos ao Vencimento
  const { data: expiringReport } = useQuery({
    queryKey: ["expiring-report"],
    queryFn: async () => {
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          storage_locations(name)
        `)
        .not("validade", "is", null)
        .lte("validade", in30Days.toISOString().split("T")[0])
        .order("validade");
      if (error) throw error;
      return data;
    },
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  // PDF Generation Functions
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const createPDFHeader = async (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // Logo
    if (organization?.logo_url) {
      const logoBase64 = await loadImageAsBase64(organization.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 14, yPos, 30, 30);
      }
    }

    // Company info
    const infoX = organization?.logo_url ? 50 : 14;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(organization?.company_name || "Sistema de Gestão", infoX, yPos + 8);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (organization?.cnpj) {
      doc.text(`CNPJ: ${organization.cnpj}`, infoX, yPos + 15);
    }
    if (organization?.address) {
      const addressLines = doc.splitTextToSize(organization.address, pageWidth - infoX - 20);
      doc.text(addressLines, infoX, yPos + 22);
    }

    // Report title
    yPos = 55;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageWidth / 2, yPos, { align: "center" });

    // Date
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth / 2, yPos + 8, { align: "center" });

    // Horizontal line
    doc.setDrawColor(200);
    doc.line(14, yPos + 12, pageWidth - 14, yPos + 12);

    return yPos + 20;
  };

  const addPDFFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      
      // Footer line
      doc.setDrawColor(200);
      doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
      
      // Footer text
      const footerText = [];
      if (organization?.secretary_name) footerText.push(`Secretário(a): ${organization.secretary_name}`);
      if (organization?.coordinator_name) footerText.push(`Coordenador(a): ${organization.coordinator_name}`);
      
      if (footerText.length > 0) {
        doc.text(footerText.join(" | "), 14, pageHeight - 14);
      }

      if (organization?.developer_name) {
        doc.text(`Desenvolvido por: ${organization.developer_name}`, 14, pageHeight - 8);
      }

      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
    }
  };

  const filterByDateRange = (data: any[], dateField: string) => {
    if (!startDate && !endDate) return data;
    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate && itemDate > new Date(endDate)) return false;
      return true;
    });
  };

  const generateStockPDF = async () => {
    setGenerating("stock");
    try {
      const doc = new jsPDF();
      const startY = await createPDFHeader(doc, "Relatório de Inventário de Produtos");

      const tableData = stockReport?.map((p) => [
        p.produto,
        p.marca,
        `${p.quantidade} ${p.unidade || "un"}`,
        p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "-",
        (p.storage_locations as any)?.name || "-",
        p.status === "disponivel" ? "Disponível" : p.status === "baixo_estoque" ? "Baixo Estoque" : "Fora de Estoque",
      ]) || [];

      autoTable(doc, {
        startY,
        head: [["Produto", "Marca", "Quantidade", "Validade", "Local", "Status"]],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 85, 164] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      addPDFFooter(doc);
      doc.save("relatorio-inventario.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateMovementsPDF = async () => {
    setGenerating("movements");
    try {
      const doc = new jsPDF();
      
      const filteredEntries = filterByDateRange(movementsReport?.entries || [], "dia");
      const filteredExits = filterByDateRange(movementsReport?.exits || [], "dia");

      let periodText = "";
      if (startDate || endDate) {
        periodText = ` (${startDate ? new Date(startDate).toLocaleDateString("pt-BR") : "início"} - ${endDate ? new Date(endDate).toLocaleDateString("pt-BR") : "atual"})`;
      }

      let startY = await createPDFHeader(doc, `Relatório de Movimentações${periodText}`);

      // Entries section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("ENTRADAS", 14, startY);

      const entriesData = filteredEntries.map((e) => [
        new Date(e.dia).toLocaleDateString("pt-BR"),
        (e.products as any)?.produto || "-",
        (e.products as any)?.marca || "-",
        `${e.quantidade} un`,
        (e.storage_locations as any)?.name || "-",
        (e.invoices as any)?.numero || "-",
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [["Data", "Produto", "Marca", "Qtd", "Local", "NF"]],
        body: entriesData.length > 0 ? entriesData : [["Nenhuma entrada encontrada", "", "", "", "", ""]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 139, 34] },
        alternateRowStyles: { fillColor: [245, 255, 245] },
      });

      // Exits section
      startY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SAÍDAS", 14, startY);

      const exitsData = filteredExits.map((e) => [
        new Date(e.dia).toLocaleDateString("pt-BR"),
        (e.products as any)?.produto || "-",
        (e.products as any)?.marca || "-",
        `${e.quantidade} un`,
        (e.storage_locations as any)?.name || "-",
        e.motivo || "-",
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [["Data", "Produto", "Marca", "Qtd", "Local", "Motivo"]],
        body: exitsData.length > 0 ? exitsData : [["Nenhuma saída encontrada", "", "", "", "", ""]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [178, 34, 34] },
        alternateRowStyles: { fillColor: [255, 245, 245] },
      });

      addPDFFooter(doc);
      doc.save("relatorio-movimentacoes.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateLowStockPDF = async () => {
    setGenerating("lowstock");
    try {
      const doc = new jsPDF();
      const startY = await createPDFHeader(doc, "Relatório de Produtos em Baixa/Falta");

      const tableData = lowStockReport?.map((p) => [
        p.produto,
        p.marca,
        `${p.quantidade} ${p.unidade || "un"}`,
        `${p.estoque_minimo || 10} ${p.unidade || "un"}`,
        (p.storage_locations as any)?.name || "-",
        p.status === "baixo_estoque" ? "BAIXO ESTOQUE" : "SEM ESTOQUE",
      ]) || [];

      autoTable(doc, {
        startY,
        head: [["Produto", "Marca", "Estoque Atual", "Estoque Mínimo", "Local", "Status"]],
        body: tableData.length > 0 ? tableData : [["Nenhum produto em baixa ou falta", "", "", "", "", ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [178, 34, 34] },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        didParseCell: (data) => {
          if (data.column.index === 5 && data.section === "body") {
            if (data.cell.raw === "SEM ESTOQUE") {
              data.cell.styles.textColor = [255, 0, 0];
              data.cell.styles.fontStyle = "bold";
            } else if (data.cell.raw === "BAIXO ESTOQUE") {
              data.cell.styles.textColor = [255, 165, 0];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("RESUMO:", 14, finalY);
      doc.setFont("helvetica", "normal");
      const outOfStock = lowStockReport?.filter((p) => p.status === "fora_de_estoque").length || 0;
      const lowStock = lowStockReport?.filter((p) => p.status === "baixo_estoque").length || 0;
      doc.text(`Produtos sem estoque: ${outOfStock}`, 14, finalY + 7);
      doc.text(`Produtos com baixo estoque: ${lowStock}`, 14, finalY + 14);
      doc.text(`Total de produtos críticos: ${(lowStockReport?.length || 0)}`, 14, finalY + 21);

      addPDFFooter(doc);
      doc.save("relatorio-produtos-baixa.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateInvoicesPDF = async () => {
    setGenerating("invoices");
    try {
      const doc = new jsPDF();
      
      const filteredInvoices = filterByDateRange(invoicesReport || [], "data");

      let periodText = "";
      if (startDate || endDate) {
        periodText = ` (${startDate ? new Date(startDate).toLocaleDateString("pt-BR") : "início"} - ${endDate ? new Date(endDate).toLocaleDateString("pt-BR") : "atual"})`;
      }

      const startY = await createPDFHeader(doc, `Relatório de Notas Fiscais${periodText}`);

      const tableData = filteredInvoices.map((inv) => [
        inv.numero,
        new Date(inv.data).toLocaleDateString("pt-BR"),
        (inv.storage_locations as any)?.name || "-",
        inv.valor_total ? `R$ ${Number(inv.valor_total).toFixed(2)}` : "-",
      ]);

      autoTable(doc, {
        startY,
        head: [["Número", "Data", "Local de Destino", "Valor Total"]],
        body: tableData.length > 0 ? tableData : [["Nenhuma nota fiscal encontrada", "", "", ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 85, 164] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const totalValue = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.valor_total) || 0), 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("RESUMO:", 14, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de notas fiscais: ${filteredInvoices.length}`, 14, finalY + 7);
      doc.text(`Valor total: R$ ${totalValue.toFixed(2)}`, 14, finalY + 14);

      addPDFFooter(doc);
      doc.save("relatorio-notas-fiscais.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateExpiringPDF = async () => {
    setGenerating("expiring");
    try {
      const doc = new jsPDF();
      const startY = await createPDFHeader(doc, "Relatório de Produtos Próximos ao Vencimento");

      const tableData = expiringReport?.map((p) => [
        p.produto,
        p.marca,
        `${p.quantidade} ${p.unidade || "un"}`,
        p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "-",
        (p.storage_locations as any)?.name || "-",
      ]) || [];

      autoTable(doc, {
        startY,
        head: [["Produto", "Marca", "Quantidade", "Validade", "Local"]],
        body: tableData.length > 0 ? tableData : [["Nenhum produto próximo ao vencimento", "", "", "", ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 165, 0] },
        alternateRowStyles: { fillColor: [255, 250, 240] },
      });

      addPDFFooter(doc);
      doc.save("relatorio-produtos-vencimento.pdf");
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios</h1>
      </div>

      {/* Date Filter Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtro por Período (para PDF)</CardTitle>
          <CardDescription>
            Aplica-se aos relatórios de Movimentações e Notas Fiscais em PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Limpar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!organization?.company_name && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Configure os dados da organização em{" "}
              <a href="/settings" className="text-primary hover:underline">
                Configurações → Organização
              </a>{" "}
              para que a logo e informações apareçam nos PDFs.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="stock">Estoque Atual</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="invoices">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="low-stock">Baixo Estoque</TabsTrigger>
          <TabsTrigger value="expiring">Próximo ao Vencimento</TabsTrigger>
        </TabsList>

        {/* Relatório de Estoque */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>Relatório de Estoque</CardTitle>
                  <CardDescription>
                    Visão geral de todos os produtos em estoque
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateStockPDF}
                    disabled={generating !== null}
                    variant="default"
                  >
                    {generating === "stock" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Gerar PDF
                  </Button>
                  <Button
                    onClick={() => exportToCSV(stockReport || [], "relatorio_estoque")}
                    disabled={!stockReport}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockReport?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.produto}</TableCell>
                        <TableCell>{product.marca}</TableCell>
                        <TableCell>{product.quantidade}</TableCell>
                        <TableCell>{product.unidade}</TableCell>
                        <TableCell>{(product.storage_locations as any)?.name || "-"}</TableCell>
                        <TableCell>
                          {product.valor
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(Number(product.valor))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              product.status === "disponivel"
                                ? "bg-success/20 text-success"
                                : product.status === "baixo_estoque"
                                ? "bg-warning/20 text-warning"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {product.status === "disponivel"
                              ? "Disponível"
                              : product.status === "baixo_estoque"
                              ? "Baixo Estoque"
                              : "Fora de Estoque"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório de Movimentações */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>Relatório de Movimentações</CardTitle>
                  <CardDescription>
                    Entradas e saídas de produtos
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateMovementsPDF}
                    disabled={generating !== null}
                    variant="default"
                  >
                    {generating === "movements" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Entradas</h3>
                  <Button
                    onClick={() =>
                      exportToCSV(movementsReport?.entries || [], "relatorio_entradas")
                    }
                    disabled={!movementsReport?.entries}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementsReport?.entries?.slice(0, 50).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(new Date(entry.dia), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {(entry.products as any)?.produto} - {(entry.products as any)?.marca}
                          </TableCell>
                          <TableCell>{entry.quantidade}</TableCell>
                          <TableCell>{(entry.storage_locations as any)?.name || "-"}</TableCell>
                          <TableCell>{entry.observacao || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Saídas</h3>
                  <Button
                    onClick={() =>
                      exportToCSV(movementsReport?.exits || [], "relatorio_saidas")
                    }
                    disabled={!movementsReport?.exits}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementsReport?.exits?.slice(0, 50).map((exit) => (
                        <TableRow key={exit.id}>
                          <TableCell>
                            {format(new Date(exit.dia), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {(exit.products as any)?.produto} - {(exit.products as any)?.marca}
                          </TableCell>
                          <TableCell>{exit.quantidade}</TableCell>
                          <TableCell>{(exit.storage_locations as any)?.name || "-"}</TableCell>
                          <TableCell>{exit.motivo || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório de Notas Fiscais */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>Relatório de Notas Fiscais</CardTitle>
                  <CardDescription>
                    Todas as notas fiscais cadastradas
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateInvoicesPDF}
                    disabled={generating !== null}
                    variant="default"
                  >
                    {generating === "invoices" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Gerar PDF
                  </Button>
                  <Button
                    onClick={() => exportToCSV(invoicesReport || [], "relatorio_notas_fiscais")}
                    disabled={!invoicesReport}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Arquivos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesReport?.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.numero}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {invoice.valor_total
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(Number(invoice.valor_total))
                            : "-"}
                        </TableCell>
                        <TableCell>{(invoice.storage_locations as any)?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {invoice.xml_file_path && (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            {invoice.pdf_file_path && (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório de Baixo Estoque */}
        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>Produtos com Baixo Estoque</CardTitle>
                  <CardDescription>
                    Produtos que precisam de reposição
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateLowStockPDF}
                    disabled={generating !== null}
                    variant="default"
                  >
                    {generating === "lowstock" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Gerar PDF
                  </Button>
                  <Button
                    onClick={() => exportToCSV(lowStockReport || [], "relatorio_baixo_estoque")}
                    disabled={!lowStockReport}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Quantidade Atual</TableHead>
                      <TableHead>Estoque Mínimo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockReport?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.produto}</TableCell>
                        <TableCell>{product.marca}</TableCell>
                        <TableCell>{product.quantidade}</TableCell>
                        <TableCell>{product.estoque_minimo}</TableCell>
                        <TableCell>{(product.storage_locations as any)?.name || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              product.status === "baixo_estoque"
                                ? "bg-warning/20 text-warning"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {product.status === "baixo_estoque"
                              ? "Baixo Estoque"
                              : "Fora de Estoque"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório de Produtos Próximos ao Vencimento */}
        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>Produtos Próximos ao Vencimento</CardTitle>
                  <CardDescription>
                    Produtos que vencem nos próximos 30 dias
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateExpiringPDF}
                    disabled={generating !== null}
                    variant="default"
                  >
                    {generating === "expiring" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Gerar PDF
                  </Button>
                  <Button
                    onClick={() => exportToCSV(expiringReport || [], "relatorio_vencimento")}
                    disabled={!expiringReport}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Local</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringReport?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.produto}</TableCell>
                        <TableCell>{product.marca}</TableCell>
                        <TableCell>{product.quantidade}</TableCell>
                        <TableCell>
                          {product.validade
                            ? format(new Date(product.validade), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>{(product.storage_locations as any)?.name || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
