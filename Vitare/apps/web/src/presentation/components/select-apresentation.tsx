import { Label } from "@vitare/ui-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vitare/ui-components";

interface ApresentationSelectProps {
  apresentacoes: string[];
  value: string;
  onChange: (apresentation: string) => void;
  disabled?: boolean;
}

export function ApresentationSelect({
  apresentacoes = [],
  value,
  onChange,
  disabled,
}: ApresentationSelectProps) {
  // Remove duplicados e strings vazias que podem quebrar o Radix UI
  const options = Array.from(new Set(apresentacoes)).filter(Boolean);

  return (
    <div className="grid gap-2">
      <Label htmlFor="apresentation">Apresentação / Dosagem</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger
          id="apresentation"
          className="w-full h-auto min-h-10 text-left whitespace-normal wrap-break-words py-2 px-3 flex items-center justify-between"
        >
          <div className="pr-2 text-sm text-gray-900">
            <SelectValue
              placeholder={
                disabled
                  ? "Selecione um medicamento primeiro"
                  : options.length === 0
                    ? "Nenhuma apresentação disponível"
                    : "Selecione a apresentação"
              }
            />
          </div>
        </SelectTrigger>

        <SelectContent
          position="popper"
          className="max-h-72 w-(--radix-select-trigger-width) overflow-y-auto z-60"
        >
          {options.map((apresentation, idx) => (
            <SelectItem key={`${apresentation}-${idx}`} value={apresentation}>
              {apresentation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
