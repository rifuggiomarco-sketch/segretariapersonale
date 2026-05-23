import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface Shift {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

interface WeekShifts {
  weekStart: Date;
  shifts: Shift[];
}

export default function ShiftsSection() {
  const [weeks, setWeeks] = useState<WeekShifts[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // TODO: Implementare upload e estrazione turni
      toast.success("File caricato! Estrazione turni in corso...");
    } catch (error) {
      toast.error("Errore nel caricamento del file");
    } finally {
      setIsLoading(false);
    }
  };

  const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

  if (selectedWeek !== null && weeks[selectedWeek]) {
    const week = weeks[selectedWeek];
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
            Settimana del {week.weekStart.toLocaleDateString("it-IT")}
          </h3>

          <div className="space-y-3">
            {DAYS.map((day, idx) => {
              const shift = week.shifts[idx];
              return (
                <div key={day} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded border border-[#e8c547]/20">
                  <span className="font-dm-sans text-white w-24">{day}</span>
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

  return (
    <div className="space-y-4">
      <Card className="bg-[#1a1a1a] border-[#e8c547] p-6">
        <h3 className="text-lg font-bebas text-[#e8c547] mb-4">Prossime 2 Settimane</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {weeks.map((week, idx) => (
            <Card
              key={idx}
              onClick={() => setSelectedWeek(idx)}
              className="bg-[#0a0a0a] border-[#e8c547] p-4 cursor-pointer hover:bg-[#1a1a1a] transition"
            >
              <p className="font-bebas text-[#e8c547] text-center">
                {week.weekStart.toLocaleDateString("it-IT", { month: "short", day: "numeric" })}
              </p>
              <div className="text-xs text-gray-400 text-center mt-2">
                {week.shifts.length} turni
              </div>
            </Card>
          ))}
        </div>

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
        </div>
      </Card>
    </div>
  );
}
