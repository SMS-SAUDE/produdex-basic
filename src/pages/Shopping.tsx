import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function Shopping() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    produto: "",
    quantidade: "",
    unidade: "unidade",
    prioridade: "media",
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["shopping", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("shopping_list")
        .select("*")
        .order("comprado")
        .order("prioridade");

      if (statusFilter === "pending") {
        query = query.eq("comprado", false);
      } else if (statusFilter === "bought") {
        query = query.eq("comprado", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("shopping_list").insert([values]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      toast({ title: "Item adicionado à lista!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao adicionar item", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, comprado }: { id: string; comprado: boolean }) => {
      const { error } = await supabase
        .from("shopping_list")
        .update({ comprado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      toast({ title: "Item removido da lista!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover item", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      produto: "",
      quantidade: "",
      unidade: "unidade",
      prioridade: "media",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      produto: formData.produto,
      quantidade: parseFloat(formData.quantidade),
      unidade: formData.unidade,
      prioridade: formData.prioridade,
      comprado: false,
    });
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "destructive" | "secondary" | "default"> = {
      alta: "destructive",
      media: "secondary",
      baixa: "default",
    };
    const labels: Record<string, string> = {
      alta: "Alta",
      media: "Média",
      baixa: "Baixa",
    };
    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lista de Compras</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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
                <div className="col-span-2">
                  <Label>Prioridade *</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, prioridade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Button type="submit">Adicionar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os itens</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="bought">Comprados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Comprado</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum item na lista
                </TableCell>
              </TableRow>
            ) : (
              items?.map((item) => (
                <TableRow key={item.id} className={item.comprado ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={item.comprado}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          id: item.id,
                          comprado: checked as boolean,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className={item.comprado ? "line-through" : "font-medium"}>
                    {item.produto}
                  </TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>{item.unidade}</TableCell>
                  <TableCell>{getPriorityBadge(item.prioridade)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Deseja remover este item?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
