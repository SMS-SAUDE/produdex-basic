import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  todayEntries: number;
  todayExits: number;
  shoppingListItems: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    todayEntries: 0,
    todayExits: 0,
    shoppingListItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total de produtos
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Produtos com estoque baixo
      const { count: lowStockProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "baixo_estoque");

      // Produtos fora de estoque
      const { count: outOfStockProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "fora_de_estoque");

      // Valor total do estoque
      const { data: productsData } = await supabase
        .from("products")
        .select("quantidade, valor");

      const totalValue = productsData?.reduce(
        (sum, p) => sum + (Number(p.quantidade) * Number(p.valor || 0)),
        0
      ) || 0;

      // Entradas de hoje
      const today = new Date().toISOString().split("T")[0];
      const { count: todayEntries } = await supabase
        .from("product_entries")
        .select("*", { count: "exact", head: true })
        .eq("dia", today);

      // Saídas de hoje
      const { count: todayExits } = await supabase
        .from("product_exits")
        .select("*", { count: "exact", head: true })
        .eq("dia", today);

      // Itens na lista de compras
      const { count: shoppingListItems } = await supabase
        .from("shopping_list")
        .select("*", { count: "exact", head: true })
        .eq("comprado", false);

      setStats({
        totalProducts: totalProducts || 0,
        lowStockProducts: lowStockProducts || 0,
        outOfStockProducts: outOfStockProducts || 0,
        totalValue,
        todayEntries: todayEntries || 0,
        todayExits: todayExits || 0,
        shoppingListItems: shoppingListItems || 0,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar estatísticas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de estoque</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              Produtos com estoque baixo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fora de Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              Produtos sem estoque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total do estoque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.todayEntries}</div>
            <p className="text-xs text-muted-foreground">
              Entradas registradas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas Hoje</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.todayExits}</div>
            <p className="text-xs text-muted-foreground">
              Saídas registradas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lista de Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shoppingListItems}</div>
            <p className="text-xs text-muted-foreground">
              Itens pendentes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
