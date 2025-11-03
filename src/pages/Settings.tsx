import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [profileData, setProfileData] = useState({
    full_name: "",
  });

  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user" as "admin" | "user",
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupPreview, setBackupPreview] = useState<any>(null);
  const [selectedTables, setSelectedTables] = useState({
    products: true,
    storage_locations: true,
    invoices: true,
    product_entries: true,
    product_exits: true,
    shopping_list: true
  });

  const { data: locations, isLoading } = useQuery({
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

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      setProfileData({ full_name: data.full_name || "" });
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar todos os usuários (apenas para admin)
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("email");
      
      if (profilesError) throw profilesError;

      // Buscar roles de cada usuário
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      
      if (rolesError) throw rolesError;

      // Combinar dados
      return profilesData.map((profile) => ({
        ...profile,
        roles: rolesData.filter((role) => role.user_id === profile.id),
      }));
    },
    enabled: isAdmin,
  });

  const createLocationMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("storage_locations").insert([values]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({ title: "Local criado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar local", variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const { error } = await supabase
        .from("storage_locations")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({ title: "Local atualizado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar local", variant: "destructive" });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("storage_locations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({ title: "Local excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir local", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!user?.id) throw new Error("No user");
      const { error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
    setEditingLocation(null);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateLocationMutation.mutate({ id: editingLocation.id, values: formData });
    } else {
      createLocationMutation.mutate(formData);
    }
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
    });
    setDialogOpen(true);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const addUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Role adicionado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar role", variant: "destructive" });
    },
  });

  const removeUserRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Role removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover role", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      // Criar usuário via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Adicionar role ao usuário
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: authData.user.id, role: userData.role }]);

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário criado com sucesso!" });
      setUserDialogOpen(false);
      resetUserForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetUserForm = () => {
    setNewUserData({
      email: "",
      password: "",
      full_name: "",
      role: "user",
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUserData);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Buscar todos os dados das tabelas principais
      const [
        { data: products },
        { data: locations },
        { data: invoices },
        { data: entries },
        { data: exits },
        { data: shopping }
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("storage_locations").select("*"),
        supabase.from("invoices").select("*"),
        supabase.from("product_entries").select("*"),
        supabase.from("product_exits").select("*"),
        supabase.from("shopping_list").select("*")
      ]);

      const backupData = {
        version: "1.0",
        export_date: new Date().toISOString(),
        data: {
          products: products || [],
          storage_locations: locations || [],
          invoices: invoices || [],
          product_entries: entries || [],
          product_exits: exits || [],
          shopping_list: shopping || []
        }
      };

      // Criar arquivo para download
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Backup exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro ao exportar dados",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleLoadBackupFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.data) {
        throw new Error("Formato de backup inválido");
      }

      setBackupPreview(backupData);
      toast({ title: "Backup carregado! Selecione os dados para importar." });
    } catch (error) {
      console.error("Erro ao carregar backup:", error);
      toast({
        title: "Erro ao carregar backup",
        description: error instanceof Error ? error.message : "Formato inválido",
        variant: "destructive"
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportSelectedData = async () => {
    if (!backupPreview) return;

    setIsImporting(true);
    try {
      const { data } = backupPreview;
      
      // Importar apenas os dados selecionados na ordem correta
      if (selectedTables.storage_locations && data.storage_locations?.length > 0) {
        await supabase.from("storage_locations").upsert(data.storage_locations);
      }

      if (selectedTables.invoices && data.invoices?.length > 0) {
        await supabase.from("invoices").upsert(data.invoices);
      }

      if (selectedTables.products && data.products?.length > 0) {
        await supabase.from("products").upsert(data.products);
      }

      if (selectedTables.product_entries && data.product_entries?.length > 0) {
        await supabase.from("product_entries").upsert(data.product_entries);
      }

      if (selectedTables.product_exits && data.product_exits?.length > 0) {
        await supabase.from("product_exits").upsert(data.product_exits);
      }

      if (selectedTables.shopping_list && data.shopping_list?.length > 0) {
        await supabase.from("shopping_list").upsert(data.shopping_list);
      }

      // Recarregar dados
      queryClient.invalidateQueries();

      toast({ title: "Dados importados com sucesso!" });
      setBackupPreview(null);
      setSelectedTables({
        products: true,
        storage_locations: true,
        invoices: true,
        product_entries: true,
        product_exits: true,
        shopping_list: true
      });
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro ao importar dados",
        description: error instanceof Error ? error.message : "Erro ao processar dados",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleTableSelection = (table: keyof typeof selectedTables) => {
    setSelectedTables(prev => ({ ...prev, [table]: !prev[table] }));
  };

  const toggleAllTables = (selected: boolean) => {
    setSelectedTables({
      products: selected,
      storage_locations: selected,
      invoices: selected,
      product_entries: selected,
      product_exits: selected,
      shopping_list: selected
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
          {isAdmin && <TabsTrigger value="locations">Locais de Armazenamento</TabsTrigger>}
          {isAdmin && <TabsTrigger value="backup">Backup</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
                <div>
                  <Label>Nome Completo</Label>
                  <Input
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, full_name: e.target.value })
                    }
                  />
                </div>
                <Button type="submit">Salvar Alterações</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>
                      Gerencie os usuários e suas permissões no sistema
                    </CardDescription>
                  </div>
                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetUserForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Novo Usuário</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            required
                            value={newUserData.email}
                            onChange={(e) =>
                              setNewUserData({ ...newUserData, email: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Senha *</Label>
                          <Input
                            type="password"
                            required
                            minLength={6}
                            value={newUserData.password}
                            onChange={(e) =>
                              setNewUserData({ ...newUserData, password: e.target.value })
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Mínimo 6 caracteres
                          </p>
                        </div>
                        <div>
                          <Label>Nome Completo</Label>
                          <Input
                            value={newUserData.full_name}
                            onChange={(e) =>
                              setNewUserData({ ...newUserData, full_name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Perfil *</Label>
                          <Select
                            value={newUserData.role}
                            onValueChange={(value: "admin" | "user") =>
                              setNewUserData({ ...newUserData, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setUserDialogOpen(false);
                              resetUserForm();
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={createUserMutation.isPending}>
                            {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell className="font-medium">{userItem.email}</TableCell>
                          <TableCell>{userItem.full_name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {userItem.roles.map((role: any) => (
                                <span
                                  key={role.id}
                                  className="px-2 py-1 rounded text-xs bg-primary/10 text-primary flex items-center gap-1"
                                >
                                  {role.role}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-3 w-3 p-0 hover:bg-destructive/20"
                                    onClick={() => {
                                      if (confirm("Deseja remover este role?")) {
                                        removeUserRoleMutation.mutate(role.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-2 w-2" />
                                  </Button>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              onValueChange={(value: "admin" | "user") =>
                                addUserRoleMutation.mutate({
                                  userId: userItem.id,
                                  role: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Adicionar role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Locais de Armazenamento</CardTitle>
                    <CardDescription>
                      Gerencie os locais onde os produtos são armazenados
                    </CardDescription>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Local
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingLocation ? "Editar Local" : "Novo Local"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLocationSubmit} className="space-y-4">
                        <div>
                          <Label>Nome *</Label>
                          <Input
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Descrição do local..."
                          />
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
                            {editingLocation ? "Atualizar" : "Criar"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : locations?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center">
                            Nenhum local cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        locations?.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell className="font-medium">
                              {location.name}
                            </TableCell>
                            <TableCell>{location.description || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(location)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Deseja excluir este local?")) {
                                      deleteLocationMutation.mutate(location.id);
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
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Backup e Restauração</CardTitle>
                <CardDescription>
                  Exporte ou importe todos os dados do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Exportar Dados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Baixe um arquivo JSON contendo todos os dados do sistema (produtos, entradas, saídas, notas fiscais, locais e lista de compras).
                    </p>
                    <Button
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {isExporting ? "Exportando..." : "Exportar Backup"}
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">Importação Seletiva</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Carregue um arquivo de backup e escolha quais dados deseja importar.
                      <span className="font-semibold text-destructive"> Atenção: </span>
                      Os dados existentes com os mesmos IDs serão substituídos.
                    </p>
                    
                    {!backupPreview ? (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleLoadBackupFile}
                          className="hidden"
                          id="file-upload"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Carregar Arquivo de Backup
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">Backup Carregado</p>
                            <p className="text-xs text-muted-foreground">
                              Exportado em: {new Date(backupPreview.export_date).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBackupPreview(null);
                              setSelectedTables({
                                products: true,
                                storage_locations: true,
                                invoices: true,
                                product_entries: true,
                                product_exits: true,
                                shopping_list: true
                              });
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-sm">Selecione os dados para importar:</h4>
                            <div className="space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAllTables(true)}
                              >
                                Todos
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAllTables(false)}
                              >
                                Nenhum
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {Object.entries({
                              products: "Produtos",
                              storage_locations: "Locais de Armazenamento",
                              invoices: "Notas Fiscais",
                              product_entries: "Entradas de Produtos",
                              product_exits: "Saídas de Produtos",
                              shopping_list: "Lista de Compras"
                            }).map(([key, label]) => {
                              const count = backupPreview.data[key]?.length || 0;
                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-accent/50 transition-colors cursor-pointer"
                                  onClick={() => toggleTableSelection(key as keyof typeof selectedTables)}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedTables[key as keyof typeof selectedTables]}
                                      onChange={() => toggleTableSelection(key as keyof typeof selectedTables)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <div>
                                      <p className="font-medium text-sm">{label}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {count} {count === 1 ? 'registro' : 'registros'}
                                      </p>
                                    </div>
                                  </div>
                                  {count === 0 && (
                                    <span className="text-xs text-muted-foreground italic">
                                      Sem dados
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <Button
                            onClick={handleImportSelectedData}
                            disabled={isImporting || !Object.values(selectedTables).some(v => v)}
                            className="w-full"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {isImporting ? "Importando..." : "Importar Dados Selecionados"}
                          </Button>
                          {!Object.values(selectedTables).some(v => v) && (
                            <p className="text-xs text-destructive text-center mt-2">
                              Selecione pelo menos uma tabela para importar
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">Informações</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>O backup inclui: produtos, entradas, saídas, notas fiscais, locais de armazenamento e lista de compras</li>
                      <li>Dados de usuários e permissões não são incluídos por segurança</li>
                      <li>A importação seletiva permite escolher exatamente quais dados restaurar</li>
                      <li>Ao importar, os dados com IDs existentes serão atualizados</li>
                      <li>Guarde os backups em local seguro</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
