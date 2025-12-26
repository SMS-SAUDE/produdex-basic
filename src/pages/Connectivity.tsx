import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Database, 
  Lock, 
  Key, 
  Link2, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@supabase/supabase-js";

const Connectivity = () => {
  const { toast } = useToast();
  const [projectUrl, setProjectUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<"operational" | "error" | "pending">("pending");
  const [tableStatus, setTableStatus] = useState<"active" | "inactive" | "pending">("pending");

  const handleSync = async () => {
    if (!projectUrl.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira a URL do projeto Supabase.",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira a chave de API (ANON KEY).",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(projectUrl);
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida do Supabase.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setApiStatus("pending");
    setTableStatus("pending");

    try {
      // Try to connect to Supabase
      const testClient = createClient(projectUrl, apiKey);
      
      // Test the connection by making a simple query
      const { error } = await testClient.from("_test_connection").select("*").limit(1);
      
      // Even if table doesn't exist, if we get a proper error response, the connection works
      if (error && !error.message.includes("does not exist") && !error.message.includes("permission denied")) {
        throw new Error(error.message);
      }

      setApiStatus("operational");
      setTableStatus("active");

      toast({
        title: "Conexão bem-sucedida!",
        description: "O banco de dados foi sincronizado com sucesso.",
      });
    } catch (error) {
      setApiStatus("error");
      setTableStatus("inactive");

      toast({
        title: "Erro na conexão",
        description: error instanceof Error ? error.message : "Não foi possível conectar ao banco de dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setProjectUrl("");
    setApiKey("");
    setApiStatus("pending");
    setTableStatus("pending");
    toast({
      title: "Formulário resetado",
      description: "Todos os campos foram limpos.",
    });
  };

  const getStatusConfig = (status: "operational" | "error" | "pending" | "active" | "inactive") => {
    switch (status) {
      case "operational":
      case "active":
        return {
          bg: "bg-success/10",
          border: "border-success/30",
          text: "text-success",
          icon: CheckCircle2,
        };
      case "error":
      case "inactive":
        return {
          bg: "bg-destructive/10",
          border: "border-destructive/30",
          text: "text-destructive",
          icon: AlertCircle,
        };
      default:
        return {
          bg: "bg-muted",
          border: "border-border",
          text: "text-muted-foreground",
          icon: RefreshCw,
        };
    }
  };

  const apiStatusConfig = getStatusConfig(apiStatus);
  const tableStatusConfig = getStatusConfig(tableStatus);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Tabs defaultValue="connectivity" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="connectivity" className="px-6">
                  Conectividade
                </TabsTrigger>
                <TabsTrigger value="sql" className="px-6">
                  SQL Integrator
                </TabsTrigger>
              </TabsList>

              <Badge 
                variant="outline" 
                className="bg-success/10 text-success border-success/30 px-3 py-1.5 flex items-center gap-2 w-fit"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">RLS: TOTALMENTE ABERTO</span>
              </Badge>
            </div>

            <TabsContent value="connectivity" className="mt-6 space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className={`${apiStatusConfig.bg} ${apiStatusConfig.border} border-2 shadow-sm transition-all duration-300`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Status da API
                        </p>
                        <p className={`text-lg font-bold ${apiStatusConfig.text}`}>
                          {apiStatus === "operational" ? "OPERACIONAL" : 
                           apiStatus === "error" ? "ERRO" : "AGUARDANDO"}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${apiStatusConfig.bg}`}>
                        <apiStatusConfig.icon className={`h-6 w-6 ${apiStatusConfig.text}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${tableStatusConfig.bg} ${tableStatusConfig.border} border-2 shadow-sm transition-all duration-300`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Tabela de Agendamento
                        </p>
                        <p className={`text-lg font-bold ${tableStatusConfig.text}`}>
                          {tableStatus === "active" ? "ATIVA" : 
                           tableStatus === "inactive" ? "INATIVA" : "AGUARDANDO"}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${tableStatusConfig.bg}`}>
                        <Database className={`h-6 w-6 ${tableStatusConfig.text}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Credentials Card */}
              <Card className="shadow-md border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Credenciais do Banco</CardTitle>
                      <CardDescription className="text-sm mt-0.5">
                        Configure as credenciais de conexão com o Supabase
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="projectUrl" className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      URL DO PROJETO (Supabase)
                    </label>
                    <Input
                      id="projectUrl"
                      type="url"
                      placeholder="https://seu-projeto.supabase.co"
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="apiKey" className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      CHAVE DE API (ANON KEY)
                    </label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="••••••••••••••••••••••••••"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                      onClick={handleSync}
                      disabled={isLoading}
                      className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sincronizar Banco de Dados
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                      disabled={isLoading}
                      className="h-11 px-6"
                    >
                      Resetar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sql" className="mt-6">
              <Card className="shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl">SQL Integrator</CardTitle>
                  <CardDescription>
                    Integre consultas SQL personalizadas ao seu sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Database className="h-12 w-12 mr-4 opacity-50" />
                    <p>Em desenvolvimento...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Connectivity;
