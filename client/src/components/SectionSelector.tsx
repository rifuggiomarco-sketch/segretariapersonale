import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Section = "briefing" | "shifts";

interface SectionSelectorProps {
  value: Section;
  onChange: (section: Section) => void;
}

const SECTIONS: { value: Section; label: string }[] = [
  { value: "briefing", label: "📋 Briefing Giornaliero" },
  { value: "shifts", label: "⏰ Turni Settimanali" },
];

export default function SectionSelector({ value, onChange }: SectionSelectorProps) {
  return (
    <div className="mb-6">
      <Select value={value} onValueChange={(v) => onChange(v as Section)}>
        <SelectTrigger className="w-full bg-[#1a1a1a] border-[#e8c547] text-white hover:bg-[#252525]">
          <SelectValue placeholder="Seleziona una sezione" />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a1a] border-[#e8c547]">
          {SECTIONS.map((section) => (
            <SelectItem key={section.value} value={section.value} className="text-white hover:bg-[#252525]">
              {section.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
