import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Building2, Upload, X, User, Code } from "lucide-react";

interface OrganizationData {
  id?: string;
  company_name: string;
  cnpj: string;
  address: string;
  secretary_name: string;
  coordinator_name: string;
  developer_name: string;
  logo_url: string | null;
}

export default function OrganizationSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<OrganizationData>({
    company_name: "",
    cnpj: "",
    address: "",
    secretary_name: "",
    coordinator_name: "",
    developer_name: "",
    logo_url: null,
  });

  const { data: organization, isLoading } = useQuery({
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

  useEffect(() => {
    if (organization) {
      setFormData({
        id: organization.id,
        company_name: organization.company_name || "",
        cnpj: organization.cnpj || "",
        address: organization.address || "",
        secretary_name: organization.secretary_name || "",
        coordinator_name: organization.coordinator_name || "",
        developer_name: organization.developer_name || "",
        logo_url: organization.logo_url,
      });
    }
  }, [organization]);

  const saveMutation = useMutation({
    mutationFn: async (data: OrganizationData) => {
      if (data.id) {
        const { error } = await supabase
          .from("organization_settings")
          .update({
            company_name: data.company_name,
            cnpj: data.cnpj,
            address: data.address,
            secretary_name: data.secretary_name,
            coordinator_name: data.coordinator_name,
            developer_name: data.developer_name,
            logo_url: data.logo_url,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert([{
            company_name: data.company_name,
            cnpj: data.cnpj,
            address: data.address,
            secretary_name: data.secretary_name,
            coordinator_name: data.coordinator_name,
            developer_name: data.developer_name,
            logo_url: data.logo_url,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      setFormData({ ...formData, logo_url: urlData.publicUrl });
      toast({ title: "Logo carregada com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (formData.logo_url) {
      // Extrair nome do arquivo da URL
      const fileName = formData.logo_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("logos").remove([fileName]);
      }
    }
    setFormData({ ...formData, logo_url: null });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da empresa é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Dados da Organização
        </CardTitle>
        <CardDescription>
          Configure os dados da empresa que aparecerão nos relatórios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <div className="relative">
                  <img
                    src={formData.logo_url}
                    alt="Logo da empresa"
                    className="h-24 w-24 object-contain border rounded-lg bg-background p-2"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Enviando..." : "Carregar Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG. Máximo 2MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                placeholder="Nome da empresa ou órgão"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) =>
                  setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })
                }
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Endereço completo da empresa"
              rows={2}
            />
          </div>

          {/* Responsáveis */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Responsáveis
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="secretary_name">Secretário(a) Municipal de Saúde</Label>
                <Input
                  id="secretary_name"
                  value={formData.secretary_name}
                  onChange={(e) =>
                    setFormData({ ...formData, secretary_name: e.target.value })
                  }
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordinator_name">Coordenador(a)</Label>
                <Input
                  id="coordinator_name"
                  value={formData.coordinator_name}
                  onChange={(e) =>
                    setFormData({ ...formData, coordinator_name: e.target.value })
                  }
                  placeholder="Nome completo"
                />
              </div>
            </div>
          </div>

          {/* Desenvolvedor */}
          <div className="space-y-2">
            <Label htmlFor="developer_name" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Desenvolvedor
            </Label>
            <Input
              id="developer_name"
              value={formData.developer_name}
              onChange={(e) =>
                setFormData({ ...formData, developer_name: e.target.value })
              }
              placeholder="Nome do desenvolvedor"
            />
          </div>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
