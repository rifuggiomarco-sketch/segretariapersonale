import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface NotePreviewProps {
  content: string;
  onClose: () => void;
  onSave?: (createEvent: boolean) => void;
}

export default function NotePreview({ content, onClose, onSave }: NotePreviewProps) {
  const [createEvent, setCreateEvent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Query for parsing
  const { data: parsed, isLoading: isParsing } = trpc.notes.parseAndPreview.useQuery(
    { content },
    { enabled: !!content }
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        onSave(createEvent);
      }
      toast.success("Nota salvata con successo!");
      onClose();
    } catch (error) {
      toast.error("Errore nel salvataggio della nota");
    } finally {
      setIsSaving(false);
    }
  };

  if (isParsing) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parsed Content */}
      <Card className="bg-card border-border p-6">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">
            ✓ Titolo Riconosciuto
          </div>
          <h3 className="text-lg font-bold text-foreground">{parsed?.title}</h3>
        </div>

        {parsed?.canCreateEvent && parsed?.dateTime && (
          <div className="mb-4 p-4 bg-accent bg-opacity-10 border border-accent border-opacity-30 rounded">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">
              📅 Data e Orario Riconosciuti
            </div>
            <p className="text-sm text-foreground font-semibold">{parsed.formattedDateTime}</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                id="createEvent"
                checked={createEvent}
                onChange={(e) => setCreateEvent(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="createEvent" className="text-sm text-foreground cursor-pointer">
                Crea evento nel calendario Google
              </label>
            </div>
          </div>
        )}

        <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
          📝 Contenuto Completo
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{parsed?.description}</p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-accent text-accent-foreground hover:bg-opacity-90 font-bold tracking-widest uppercase"
        >
          {isSaving ? "Salvataggio..." : "✓ Salva Nota"}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="px-6 border-muted-foreground text-muted-foreground hover:bg-secondary"
        >
          ✕ Annulla
        </Button>
      </div>
    </div>
  );
}
