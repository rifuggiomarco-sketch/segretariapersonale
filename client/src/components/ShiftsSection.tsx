import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Shift {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
}

interface WeekShifts {
  weekStart: Date;
  shifts: Shift[];
}

const DAYS_IT: Record<string, string> = {
  Monday: "Lunedì",
  Tuesday: "Martedì",
  Wednesday: "Mercoledì",
  Thursday: "Giovedì",
  Friday: "Venerdì",
  Saturday: "Sabato",
  Sunday: "Domenica",
};
const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Returns the Monday of the week containing the given date */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ShiftsSection() {
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch upcoming 2 weeks of shifts from DB
  const { data: upcomingShifts, refetch: refetchUpcoming } = trpc.shifts.getUpcoming.useQuery(
    { weeksAhead: 2 },
    { refetchOnWindowFocus: false }
  );

  // Fetch shifts for selected week
  const { data: weekShifts } = trpc.shifts.getWeek.useQuery(
    { weekStartDate: selectedWeek! },
    { enabled: !!selectedWeek, refetchOnWindowFocus: false }
  );

  const uploadMutation = trpc.shifts.upload.useMutation({
    onSuccess: (data) => {
      toast.success(`Estratti ${data.count} turni!`);
      refetchUpcoming();
    },
    onError: (err) => {
      toast.error(`Errore estrazione turni: ${err.message}`);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    event.target.value = "";

    setIsUploading(true);
    try {
      // Convert file to base64 data URL to pass to the backend
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const weekStart = getWeekMonday(new Date());
      await uploadMutation.mutateAsync({ imageUrl: dataUrl, weekStartDate: weekStart });
    } catch (error) {
      toast.error("Errore nel caricamento del file");
    } finally {
      setIsUploading(false);
    }
  };

  // Build week summary cards from DB data
  const weekCards: WeekShifts[] = [];
  if (upcomingShifts && upcomingShifts.length > 0) {
    const byWeek: Record<string, Shift[]> = {};
    for (const s of upcomingShifts) {
      const key = new Date(s.weekStartDate).toISOString();
      if (!byWeek[key]) byWeek[key] = [];
      byWeek[key]!.push({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, notes: s.notes });
    }
    for (const [isoDate, shifts] of Object.entries(byWeek)) {
      weekCards.push({ weekStart: new Date(isoDate), shifts });
    }
    weekCards.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }

  // Detail view for a selected week
  if (selectedWeek && weekShifts) {
    const shiftsByDay: Record<string, Shift | undefined> = {};
    for (const s of weekShifts) {
      shiftsByDay[s.dayOfWeek] = { dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, notes: s.notes };
    }

    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setSelectedWeek(null)}
          className="mb-4 bg-[#1a1a1a] border-[#e8c547] text-[#e8c547] hover:bg-[#252525]"
        >
          ← Torna alla vista settimanale
        </Button>

        <Card className="bg-[#1a1a1a] border-[#e8c547] p-6">
          <h3 className="text-xl font-bebas text-[#e8c547] mb-4">
            Settimana del {selectedWeek.toLocaleDateString("it-IT")}
          </h3>

          <div className="space-y-3">
            {DAYS_ORDER.map((day) => {
              const shift = shiftsByDay[day];
              return (
                <div
                  key={day}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded border border-[#e8c547]/20"
                >
                  <span className="font-dm-sans text-white w-24">{DAYS_IT[day]}</span>
                  {shift ? (
                    <span className="font-dm-sans text-[#e8c547]">
                      {shift.startTime} - {shift.endTime}
                      {shift.notes && <span className="text-gray-400 ml-2">({shift.notes})</span>}
                    </span>
                  ) : (
                    <span className="font-dm-sans text-gray-500">Riposo</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const isLoading = isUploading || uploadMutation.isPending;

  return (
    <div className="space-y-4">
      <Card className="bg-[#1a1a1a] border-[#e8c547] p-6">
        <h3 className="text-lg font-bebas text-[#e8c547] mb-4">Prossime 2 Settimane</h3>

        {weekCards.length === 0 ? (
          <p className="text-sm text-gray-400 mb-6">
            Nessun turno caricato. Importa un orario con il pulsante qui sotto.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {weekCards.map((week, idx) => (
              <Card
                key={idx}
                onClick={() => setSelectedWeek(week.weekStart)}
                className="bg-[#0a0a0a] border-[#e8c547] p-4 cursor-pointer hover:bg-[#1a1a1a] transition"
              >
                <p className="font-bebas text-[#e8c547] text-center">
                  {week.weekStart.toLocaleDateString("it-IT", { month: "short", day: "numeric" })}
                </p>
                <div className="text-xs text-gray-400 text-center mt-2">{week.shifts.length} turni</div>
              </Card>
            ))}
          </div>
        )}

        <div className="border-t border-[#e8c547]/20 pt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button
              asChild
              className="w-full bg-[#e8c547] text-[#0a0a0a] hover:bg-[#d4b03a] font-bebas"
              disabled={isLoading}
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {isLoading ? "Caricamento..." : "IMPORTA TURNI"}
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Supporta Excel, PDF, foto dell'orario — AI estrae i turni automaticamente
          </p>
        </div>
      </Card>
    </div>
  );
}
