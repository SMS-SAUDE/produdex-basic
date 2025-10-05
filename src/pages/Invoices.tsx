import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Download } from "lucide-react";
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

export default function Invoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    numero: "",
    data: new Date().toISOString().split("T")[0],
    valor_total: "",
    local_id: "",
    qr_code: "",
  });

  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, storage_locations(name)")
        .order("data", { ascending: false });
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
      let xmlPath = null;
      let pdfPath = null;

      if (xmlFile) {
        const xmlFileName = `${Date.now()}_${xmlFile.name}`;
        const { error: xmlError } = await supabase.storage
          .from("invoices")
          .upload(xmlFileName, xmlFile);
        if (xmlError) throw xmlError;
        xmlPath = xmlFileName;
      }

      if (pdfFile) {
        const pdfFileName = `${Date.now()}_${pdfFile.name}`;
        const { error: pdfError } = await supabase.storage
          .from("invoices")
          .upload(pdfFileName, pdfFile);
        if (pdfError) throw pdfError;
        pdfPath = pdfFileName;
      }

      const { error } = await supabase.from("invoices").insert([{
        ...values,
        xml_file_path: xmlPath,
        pdf_file_path: pdfPath,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Nota fiscal cadastrada com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar nota fiscal", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      numero: "",
      data: new Date().toISOString().split("T")[0],
      valor_total: "",
      local_id: "",
      qr_code: "",
    });
    setXmlFile(null);
    setPdfFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      numero: formData.numero,
      data: formData.data,
      valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
      local_id: formData.local_id || null,
      qr_code: formData.qr_code || null,
    });
  };

  const downloadFile = async (path: string, type: "xml" | "pdf") => {
    const { data, error } = await supabase.storage
      .from("invoices")
      .download(path);
    
    if (error) {
      toast({ title: "Erro ao baixar arquivo", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = path;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Notas Fiscais</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Nota Fiscal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Nova Nota Fiscal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número *</Label>
                  <Input
                    required
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData({ ...formData, numero: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input
                    required
                    type="date"
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Valor Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_total: e.target.value })
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
                <div className="col-span-2">
                  <Label>QR Code</Label>
                  <Input
                    value={formData.qr_code}
                    onChange={(e) =>
                      setFormData({ ...formData, qr_code: e.target.value })
                    }
                    placeholder="Dados do QR Code"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Arquivo XML</Label>
                  <Input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Arquivo PDF ou Imagem</Label>
                  <Input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
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
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : invoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhuma nota fiscal encontrada
                </TableCell>
              </TableRow>
            ) : (
              invoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.numero}</TableCell>
                  <TableCell>
                    {new Date(invoice.data).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {invoice.valor_total
                      ? `R$ ${invoice.valor_total.toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell>{invoice.storage_locations?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {invoice.xml_file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(invoice.xml_file_path!, "xml")}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          XML
                        </Button>
                      )}
                      {invoice.pdf_file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(invoice.pdf_file_path!, "pdf")}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      )}
                      {!invoice.xml_file_path && !invoice.pdf_file_path && "-"}
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
