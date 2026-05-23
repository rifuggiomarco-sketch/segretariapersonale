import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
}

export default function GoogleAuthButton({ onSuccess }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check if Google is already connected
  const { data: connectionStatus } = trpc.google.isConnected.useQuery();

  useEffect(() => {
    if (connectionStatus?.connected) {
      setIsConnected(true);
    }
  }, [connectionStatus]);

  // Get auth URL — disabled by default so it doesn't fire before auth is confirmed
  const getAuthUrlQuery = trpc.google.getAuthUrl.useQuery(undefined, { enabled: false });

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const result = await getAuthUrlQuery.refetch();
      if (!result.data?.authUrl) {
        toast.error("Impossibile generare l'URL di autorizzazione");
        return;
      }
      // Redirect directly to Google OAuth
      window.location.href = result.data.authUrl;
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      toast.error("Errore durante la connessione a Google");
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-accent">
        <span className="w-2 h-2 bg-accent rounded-full"></span>
        <span className="text-sm">Google Connesso</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading || !getAuthUrlQuery.data}
      className="bg-accent text-accent-foreground hover:bg-opacity-90"
    >
      {isLoading ? <Spinner className="w-4 h-4" /> : "Connetti Google"}
    </Button>
  );
}
