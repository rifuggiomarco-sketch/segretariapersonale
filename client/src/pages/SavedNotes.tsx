import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function SavedNotes() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  // Query
  const { data: allNotes, isLoading: notesLoading, refetch: refetchNotes } = trpc.notes.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const selectedNote = selectedNoteId
    ? allNotes?.find(n => n.id === selectedNoteId)
    : allNotes?.[0];

  const handleCopyToClipboard = async () => {
    if (!selectedNote) return;
    try {
      await navigator.clipboard.writeText(selectedNote.content);
      toast.success("Nota copiata negli appunti!");
    } catch (err) {
      toast.error("Errore nel copia negli appunti");
    }
  };

  const handleShare = async () => {
    if (!selectedNote) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Nota Segretaria Personale",
          text: selectedNote.content,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      toast.info("Condivisione non disponibile su questo dispositivo");
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">SEGRETARIA PERSONALE</h1>
          <p className="text-muted-foreground mb-8">Accedi per visualizzare le note</p>
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
              📝 Archivio Personale
            </div>
            <h1 className="text-5xl font-bold mb-2">
              NOTE
              <br />
              <span className="text-accent">SALVATE</span>
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">Visualizza tutte le note personali salvate</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - List */}
          <div className="lg:col-span-1">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">📚 Note Disponibili</div>
            
            {notesLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : allNotes && allNotes.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {allNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      (selectedNoteId === note.id || (!selectedNoteId && note.id === allNotes[0]?.id))
                        ? "bg-accent text-accent-foreground border-accent shadow-lg"
                        : "bg-card border-border text-foreground hover:border-accent hover:bg-opacity-80"
                    }`}
                  >
                    <div className="text-sm font-semibold">{formatDate(new Date(note.createdAt))}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {note.content.substring(0, 50)}...
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <div className="text-3xl mb-2 opacity-30">📭</div>
                Nessuna nota salvata
              </div>
            )}
          </div>

          {/* Main - Note Display */}
          <div className="lg:col-span-3">
            {selectedNote ? (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">◈ NOTA</div>
                    <h2 className="text-3xl font-bold">
                      {formatDate(new Date(selectedNote.createdAt))}
                    </h2>
                  </div>
                  <Button
                    onClick={() => setSelectedNoteId(null)}
                    variant="ghost"
                    className="text-xs text-muted-foreground"
                  >
                    ✕ Chiudi
                  </Button>
                </div>

                <Card className="bg-card border-border p-8 mb-8">
                  <div className="prose prose-invert max-w-none">
                    <p className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {selectedNote.content}
                    </p>
                  </div>
                </Card>

                {/* Metadata */}
                <div className="p-4 bg-secondary border border-border rounded text-xs text-muted-foreground mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong className="text-foreground">Data Creazione:</strong>
                      <br />
                      {new Date(selectedNote.createdAt).toLocaleString("it-IT")}
                    </div>
                    <div>
                      <strong className="text-foreground">Data Riferimento:</strong>
                      <br />
                      {formatDate(new Date(selectedNote.forDate))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleCopyToClipboard}
                    className="flex-1 bg-accent text-accent-foreground hover:bg-opacity-90 font-bold tracking-widest uppercase"
                  >
                    📋 Copia Nota
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-bold tracking-widest uppercase"
                  >
                    📤 Condividi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4 opacity-30">📝</div>
                <p className="text-muted-foreground">
                  Seleziona una nota dalla lista per visualizzarla
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
