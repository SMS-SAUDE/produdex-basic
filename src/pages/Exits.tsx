import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function Exits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExit, setEditingExit] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exitToDelete, setExitToDelete] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState("");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    dia: new Date().toISOString().split("T")[0],
    produto_id: "",
    local_id: "",
    quantidade: "",
    motivo: "",
  });

  const { data: exits, isLoading } = useQuery({
    queryKey: ["exits", dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("product_exits")
        .select("*, products(produto, marca), storage_locations(name)")
        .order("dia", { ascending: false });

      if (dateFilter) {
        query = query.eq("dia", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("produto");
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
      const { error } = await supabase.from("product_exits").insert([values]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exits"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Saída registrada com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao registrar saída", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from("product_exits")
        .update(values)
        .eq("id", editingExit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exits"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Saída atualizada com sucesso!" });
      setDialogOpen(false);
      setEditingExit(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar saída", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_exits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exits"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Saída excluída com sucesso!" });
      setDeleteDialogOpen(false);
      setExitToDelete(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir saída", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      dia: new Date().toISOString().split("T")[0],
      produto_id: "",
      local_id: "",
      quantidade: "",
      motivo: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      dia: formData.dia,
      produto_id: formData.produto_id,
      local_id: formData.local_id || null,
      quantidade: parseFloat(formData.quantidade),
      motivo: formData.motivo || null,
    };

    if (editingExit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (exit: any) => {
    setEditingExit(exit);
    setFormData({
      dia: exit.dia,
      produto_id: exit.produto_id,
      local_id: exit.local_id || "",
      quantidade: exit.quantidade.toString(),
      motivo: exit.motivo || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (exit: any) => {
    setExitToDelete(exit);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (exitToDelete) {
      deleteMutation.mutate(exitToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Saídas de Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingExit(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Saída
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingExit ? "Editar Saída" : "Nova Saída"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data *</Label>
                  <Input
                    required
                    type="date"
                    value={formData.dia}
                    onChange={(e) =>
                      setFormData({ ...formData, dia: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Produto *</Label>
                  <Select
                    value={formData.produto_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, produto_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.produto} - {product.marca} ({product.quantidade} disponível)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="col-span-2">
                  <Label>Motivo</Label>
                  <Textarea
                    value={formData.motivo}
                    onChange={(e) =>
                      setFormData({ ...formData, motivo: e.target.value })
                    }
                    placeholder="Motivo da saída..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                  <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingExit(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{editingExit ? "Atualizar" : "Registrar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Filtrar por Data</Label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Todas as datas"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : exits?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhuma saída encontrada
                </TableCell>
              </TableRow>
            ) : (
              exits?.map((exit) => (
                <TableRow key={exit.id}>
                  <TableCell>
                    {new Date(exit.dia).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {exit.products?.produto}
                  </TableCell>
                  <TableCell>{exit.products?.marca}</TableCell>
                  <TableCell>{exit.quantidade}</TableCell>
                  <TableCell>{exit.storage_locations?.name || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {exit.motivo || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(exit)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(exit)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta saída? O estoque do produto será ajustado automaticamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
