import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Reports() {
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
            storage_locations(name)
          `)
          .order("dia", { ascending: false })
          .limit(50),
        supabase
          .from("product_exits")
          .select(`
            *,
            products(produto, marca),
            storage_locations(name)
          `)
          .order("dia", { ascending: false })
          .limit(50),
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios</h1>
      </div>

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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Relatório de Estoque</CardTitle>
                  <CardDescription>
                    Visão geral de todos os produtos em estoque
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(stockReport || [], "relatorio_estoque")}
                  disabled={!stockReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
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
                        <TableCell>{product.storage_locations?.name || "-"}</TableCell>
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
              <CardTitle>Relatório de Movimentações</CardTitle>
              <CardDescription>
                Últimas 50 entradas e saídas de produtos
              </CardDescription>
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
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
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
                      {movementsReport?.entries?.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(new Date(entry.dia), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {entry.products?.produto} - {entry.products?.marca}
                          </TableCell>
                          <TableCell>{entry.quantidade}</TableCell>
                          <TableCell>{entry.storage_locations?.name || "-"}</TableCell>
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
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
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
                      {movementsReport?.exits?.map((exit) => (
                        <TableRow key={exit.id}>
                          <TableCell>
                            {format(new Date(exit.dia), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {exit.products?.produto} - {exit.products?.marca}
                          </TableCell>
                          <TableCell>{exit.quantidade}</TableCell>
                          <TableCell>{exit.storage_locations?.name || "-"}</TableCell>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Relatório de Notas Fiscais</CardTitle>
                  <CardDescription>
                    Todas as notas fiscais cadastradas
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(invoicesReport || [], "relatorio_notas_fiscais")}
                  disabled={!invoicesReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
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
                        <TableCell>{invoice.storage_locations?.name || "-"}</TableCell>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Produtos com Baixo Estoque</CardTitle>
                  <CardDescription>
                    Produtos que precisam de reposição
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(lowStockReport || [], "relatorio_baixo_estoque")}
                  disabled={!lowStockReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
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
                        <TableCell>{product.storage_locations?.name || "-"}</TableCell>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Produtos Próximos ao Vencimento</CardTitle>
                  <CardDescription>
                    Produtos que vencem nos próximos 30 dias
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(expiringReport || [], "relatorio_vencimento")}
                  disabled={!expiringReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
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
                      <TableHead>Dias para Vencer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringReport?.map((product) => {
                      const daysToExpire = Math.ceil(
                        (new Date(product.validade!).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.produto}</TableCell>
                          <TableCell>{product.marca}</TableCell>
                          <TableCell>{product.quantidade}</TableCell>
                          <TableCell>
                            {format(new Date(product.validade!), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>{product.storage_locations?.name || "-"}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                daysToExpire < 0
                                  ? "bg-destructive/20 text-destructive"
                                  : daysToExpire <= 7
                                  ? "bg-warning/20 text-warning"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {daysToExpire < 0 ? "Vencido" : `${daysToExpire} dias`}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
