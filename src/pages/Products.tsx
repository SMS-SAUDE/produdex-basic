import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Products() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    produto: "",
    marca: "",
    quantidade: "",
    unidade: "unidade",
    validade: "",
    valor: "",
    local_id: "",
    estoque_minimo: "10",
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, storage_locations(name)")
        .order("produto");

      if (search) {
        query = query.or(`produto.ilike.%${search}%,marca.ilike.%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "disponivel" | "baixo_estoque" | "fora_de_estoque");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("products").insert([values]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto criado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar produto", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const { error } = await supabase
        .from("products")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto atualizado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      produto: "",
      marca: "",
      quantidade: "",
      unidade: "unidade",
      validade: "",
      valor: "",
      local_id: "",
      estoque_minimo: "10",
    });
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      produto: formData.produto,
      marca: formData.marca,
      quantidade: parseFloat(formData.quantidade),
      unidade: formData.unidade,
      validade: formData.validade || null,
      valor: formData.valor ? parseFloat(formData.valor) : null,
      local_id: formData.local_id || null,
      estoque_minimo: parseFloat(formData.estoque_minimo),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      produto: product.produto,
      marca: product.marca,
      quantidade: product.quantidade.toString(),
      unidade: product.unidade,
      validade: product.validade || "",
      valor: product.valor?.toString() || "",
      local_id: product.local_id || "",
      estoque_minimo: product.estoque_minimo?.toString() || "10",
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      disponivel: "default",
      baixo_estoque: "secondary",
      fora_de_estoque: "destructive",
    };
    const labels: Record<string, string> = {
      disponivel: "Disponível",
      baixo_estoque: "Baixo Estoque",
      fora_de_estoque: "Fora de Estoque",
    };
    return (
      <Badge variant={variants[status]}>{labels[status] || status}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produto *</Label>
                  <Input
                    required
                    value={formData.produto}
                    onChange={(e) =>
                      setFormData({ ...formData, produto: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Marca *</Label>
                  <Input
                    required
                    value={formData.marca}
                    onChange={(e) =>
                      setFormData({ ...formData, marca: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Quantidade *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={formData.quantidade}
                    onChange={(e) =>
                      setFormData({ ...formData, quantidade: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select
                    value={formData.unidade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unidade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="caixa">Caixa</SelectItem>
                      <SelectItem value="pacote">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={formData.validade}
                    onChange={(e) =>
                      setFormData({ ...formData, validade: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Local</Label>
                  <Select
                    value={formData.local_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, local_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estoque Mínimo *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={formData.estoque_minimo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estoque_minimo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="baixo_estoque">Baixo Estoque</SelectItem>
            <SelectItem value="fora_de_estoque">Fora de Estoque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.produto}</TableCell>
                  <TableCell>{product.marca}</TableCell>
                  <TableCell>{product.quantidade}</TableCell>
                  <TableCell>{product.unidade}</TableCell>
                  <TableCell>
                    {product.validade
                      ? new Date(product.validade).toLocaleDateString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {product.valor
                      ? `R$ ${product.valor.toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {product.storage_locations?.name || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(product.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Deseja excluir este produto?")) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
