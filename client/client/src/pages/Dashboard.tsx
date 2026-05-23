import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import BriefingRenderer from "@/components/BriefingRenderer";
import NotePreview from "@/components/NotePreview";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [selectedBriefingId, setSelectedBriefingId] = useState<number | null>(null);
  const [showNotePreview, setShowNotePreview] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Query per verificare se Google è connesso
  const { data: googleStatus, refetch: refetchGoogleStatus } = trpc.google.isConnected.useQuery(undefined, {
    enabled: !!user,
  });

  // Queries
  const { data: currentBriefing, isLoading: briefingLoading, refetch: refetchCurrent } = trpc.briefing.getCurrent.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: briefingHistory } = trpc.briefing.getHistory.useQuery(undefined, {
    enabled: !!user,
  });

  // Mutations (must be before conditional return)
  const generateBriefingMutation = trpc.briefing.generate.useMutation();
  const syncGmailMutation = trpc.sync.gmail.useMutation();
  const syncCalendarMutation = trpc.sync.calendar.useMutation();
  const saveNotesMutation = trpc.notes.save.useMutation();
  const saveWithEventMutation = trpc.notes.saveWithCalendarEvent.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const getGoogleAuthUrlQuery = trpc.google.getAuthUrl.useQuery(undefined, {
    enabled: false,
  });

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const result = await getGoogleAuthUrlQuery.refetch();
      if (!result.data?.authUrl) {
        throw new Error("Failed to get Google auth URL");
      }
      const { authUrl } = result.data;
      // Apri la finestra di Google OAuth
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        "Google OAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Ascolta il messaggio dal popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "google-oauth-success") {
          setGoogleConnected(true);
          toast.success("Google connesso con successo!");
          refetchGoogleStatus();
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      // Chiudi il popup dopo 5 minuti se ancora aperto
      setTimeout(() => {
        if (popup && !popup.closed) {
          popup.close();
        }
      }, 5 * 60 * 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nella connessione a Google";
      toast.error(message);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      setError("Inserisci almeno una nota");
      return;
    }
    setShowNotePreview(true);
  };

  const handleSaveNoteWithPreview = async (createEvent: boolean) => {
    try {
      if (createEvent) {
        await saveWithEventMutation.mutateAsync({ content: notes, createEvent: true });
        toast.success("Nota salvata e evento creato nel calendario!");
      } else {
        await saveNotesMutation.mutateAsync({ content: notes });
        toast.success("Nota salvata con successo!");
      }
      setNotes("");
      setError("");
      setShowNotePreview(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore nel salvataggio";
      setError(message);
      toast.error(message);
    }
  };

  const handleGenerate = async () => {
    setStep(0);
    setError("");

    try {
      // Step 1: Sync Gmail (optional - continua anche se fallisce)
      setStep(1);
      try {
        await syncGmailMutation.mutateAsync();
      } catch (err) {
        console.warn("Gmail sync failed, continuing...", err);
      }

      // Step 2: Sync Calendar (optional - continua anche se fallisce)
      setStep(2);
      try {
        await syncCalendarMutation.mutateAsync();
      } catch (err) {
        console.warn("Calendar sync failed, continuing...", err);
      }

      // Step 3: Save notes if any
      if (notes.trim()) {
        setStep(3);
        await saveNotesMutation.mutateAsync({ content: notes });
      }

      // Step 4: Generate briefing
      setStep(4);
      await generateBriefingMutation.mutateAsync();

      toast.success("Briefing generato con successo!");
      setNotes("");
      setSelectedBriefingId(null);
      setStep(0);
      await refetchCurrent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(message);
      toast.error(message);
    }
  };

  const stepList = [
    { label: "Lettura dati calendario", state: step > 1 ? "done" : step === 1 ? "active" : "waiting" },
    { label: "Analisi email", state: step > 2 ? "done" : step === 2 ? "active" : "waiting" },
    { label: "Salvataggio note", state: step > 3 ? "done" : step === 3 ? "active" : "waiting" },
    { label: "Elaborazione AI briefing", state: step > 4 ? "done" : step === 4 ? "active" : "waiting" },
  ];

  const isGenerating = generateBriefingMutation.isPending || syncGmailMutation.isPending || syncCalendarMutation.isPending;

  // Get selected briefing from history or use current
  const displayedBriefing = selectedBriefingId 
    ? briefingHistory?.find(b => b.id === selectedBriefingId)
    : currentBriefing;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">SEGRETARIA PERSONALE</h1>
          <p className="text-muted-foreground mb-8">Accedi per iniziare</p>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-6 py-8">
        <div className="max-w-2xl mx-auto flex justify-between items-start">
          <div>
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">◈ BRIEFING PERSONALE</div>
            <h1 className="text-5xl font-bold mb-2">
              MARCO
              <br />
              <span className="text-accent">AGENDA</span>
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">Riepilogo intelligente della tua giornata</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConnectGoogle}
              disabled={isConnectingGoogle}
              className={`text-xs px-4 py-2 rounded flex items-center gap-2 font-semibold ${
                googleConnected || googleStatus?.connected
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              title={googleConnected || googleStatus?.connected ? "Google connesso" : "Connetti Google"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isConnectingGoogle ? "Connessione..." : googleConnected || googleStatus?.connected ? "Google ✓" : "Connetti Google"}
            </Button>
            <Button
              onClick={() => logoutMutation.mutate()}
              variant="outline"
              className="text-xs border-muted-foreground text-muted-foreground hover:bg-secondary"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Date Bar */}
      <div className="border-b border-border px-6 py-4 bg-secondary text-xs text-muted-foreground tracking-widest">
        <strong className="text-accent">{formatDate(new Date()).toUpperCase()}</strong>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Note Preview Modal */}
        {showNotePreview && (
          <div className="mb-8 p-6 bg-card border border-accent border-opacity-30 rounded">
            <NotePreview
              content={notes}
              onClose={() => setShowNotePreview(false)}
              onSave={handleSaveNoteWithPreview}
            />
          </div>
        )}

        {/* Notes Section */}
        {!showNotePreview && (
          <div className="mb-8">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">✈️ Note Personali</div>
            <Textarea
              rows={4}
              placeholder="Inserisci appunti, promemoria o note aggiuntive per il briefing di oggi... (es: 'Riunione domani 14:00', 'Pranzo lunedì 12:30')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-card border-border text-foreground placeholder-muted-foreground"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleSaveNotes}
                disabled={!notes.trim() || saveNotesMutation.isPending}
                className="px-4 py-2 bg-accent text-accent-foreground hover:bg-opacity-90 font-bold text-xs tracking-widest uppercase"
                title="Salva le note senza generare il briefing"
              >
                💾 SALVA
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">💡 Aggiungi data/orario nelle note e verranno automaticamente aggiunte al calendario!</div>
          </div>
        )}

        {/* Generate Button */}
        {!showNotePreview && (
          <div className="mb-8">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-6 bg-accent text-accent-foreground hover:bg-opacity-90 font-bold text-xl tracking-widest uppercase"
            >
              {isGenerating ? "ELABORAZIONE..." : "⚡ GENERA BRIEFING"}
            </Button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900 bg-opacity-20 border border-red-600 border-opacity-50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="mb-8 p-6 bg-card border border-border rounded">
            {stepList.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-3 border-b border-border last:border-b-0 transition-colors ${
                  s.state === "done" ? "text-accent" : s.state === "active" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                  {s.state === "done" ? "✓" : s.state === "active" ? "●" : "○"}
                </div>
                <span className="text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Briefing Display */}
        {displayedBriefing && !isGenerating && (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">◈ BRIEFING</div>
                <h2 className="text-3xl font-bold">
                  {formatDate(new Date(displayedBriefing.generatedFor))}
                </h2>
              </div>
              <Button
                onClick={() => setSelectedBriefingId(null)}
                variant="ghost"
                className="text-xs text-muted-foreground"
              >
                ✕ Chiudi
              </Button>
            </div>

            <Card className="bg-card border-border p-8 mb-8">
              <BriefingRenderer content={displayedBriefing.content} />
            </Card>

            {/* Metadata */}
            <div className="p-4 bg-secondary border border-border rounded text-xs text-muted-foreground">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong className="text-foreground">Data Briefing:</strong>
                  <br />
                  {formatDate(new Date(displayedBriefing.generatedFor))}
                </div>
                <div>
                  <strong className="text-foreground">Generato:</strong>
                  <br />
                  {new Date(displayedBriefing.createdAt).toLocaleString("it-IT")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!displayedBriefing && !isGenerating && !showNotePreview && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">📋</div>
            <p className="text-muted-foreground mb-6">Nessun briefing disponibile</p>
            <p className="text-xs text-muted-foreground mb-8">
              Aggiungi le tue note e clicca "GENERA BRIEFING" per iniziare
            </p>
          </div>
        )}

        {/* Briefing History */}
        {briefingHistory && briefingHistory.length > 0 && !showNotePreview && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs font-semibold tracking-widest text-accent uppercase">📚 STORICO BRIEFING</div>
              <div className="flex gap-2">
                <a href="/notes" className="text-xs text-accent hover:underline">📝 Note →</a>
                <a href="/history" className="text-xs text-accent hover:underline">Visualizza tutto →</a>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {briefingHistory.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBriefingId(b.id)}
                  className={`w-full text-left p-3 rounded border transition-all ${
                    selectedBriefingId === b.id
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card border-border text-foreground hover:border-accent"
                  }`}
                >
                  <div className="text-sm font-semibold">{formatDate(new Date(b.generatedFor))}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {b.content.substring(0, 50)}...
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
