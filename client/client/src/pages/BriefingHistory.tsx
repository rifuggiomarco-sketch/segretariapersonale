import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import BriefingRenderer from "@/components/BriefingRenderer";
import { getLoginUrl } from "@/const";

export default function BriefingHistory() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedBriefingId, setSelectedBriefingId] = useState<number | null>(null);

  // Queries
  const { data: briefingHistory, isLoading: historyLoading } = trpc.briefing.getHistory.useQuery(undefined, {
    enabled: !!user,
  });

  // Get selected briefing
  const selectedBriefing = selectedBriefingId
    ? briefingHistory?.find(b => b.id === selectedBriefingId)
    : briefingHistory?.[0];

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">SEGRETARIA PERSONALE</h1>
          <p className="text-muted-foreground mb-8">Accedi per visualizzare lo storico</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-accent text-accent-foreground hover:bg-opacity-90"
          >
            Accedi con Manus
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground mb-4"
            >
              ← Torna indietro
            </Button>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">
              Archivio Personale
            </div>
            <h1 className="text-5xl font-bold mb-2">
              STORICO
              <br />
              <span className="text-accent">BRIEFING</span>
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">Visualizza e consulta tutti i briefing generati</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - List */}
          <div className="lg:col-span-1">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">📅 Briefing Disponibili</div>
            
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : briefingHistory && briefingHistory.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {briefingHistory.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBriefingId(b.id)}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      (selectedBriefingId === b.id || (!selectedBriefingId && b.id === briefingHistory[0]?.id))
                        ? "bg-accent text-accent-foreground border-accent shadow-lg"
                        : "bg-card border-border text-foreground hover:border-accent hover:bg-opacity-80"
                    }`}
                  >
                    <div className="text-sm font-semibold">{formatDate(new Date(b.generatedFor))}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {b.content.substring(0, 50)}...
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <div className="text-3xl mb-2 opacity-30">📭</div>
                Nessun briefing disponibile
              </div>
            )}
          </div>

          {/* Main - Briefing Display */}
          <div className="lg:col-span-3">
            {selectedBriefing ? (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">◈ BRIEFING</div>
                    <h2 className="text-3xl font-bold">
                      {formatDate(new Date(selectedBriefing.generatedFor))}
                    </h2>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Generato il {new Date(selectedBriefing.generatedFor).toLocaleTimeString("it-IT")}
                  </div>
                </div>

                <Card className="bg-card border-border p-8">
                  <BriefingRenderer content={selectedBriefing.content} />
                </Card>

                {/* Metadata */}
                <div className="mt-8 p-4 bg-secondary border border-border rounded text-xs text-muted-foreground">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong className="text-foreground">Data Briefing:</strong>
                      <br />
                      {formatDate(new Date(selectedBriefing.generatedFor))}
                    </div>
                    <div>
                      <strong className="text-foreground">Generato:</strong>
                      <br />
                      {new Date(selectedBriefing.createdAt).toLocaleString("it-IT")}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4 opacity-30">📋</div>
                <p className="text-muted-foreground">
                  Seleziona un briefing dalla lista per visualizzarlo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
