import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Check } from "lucide-react";
import {
  medicationDictionaryApi,
  type MedicationSearchResult,
} from "../../core/infrastructure/api/medication-dictionary.api";
import { Input } from "@vitare/ui-components";
import { Badge } from "@vitare/ui-components";
import { cn } from "../../../lib/utils";

interface MedicationAutocompleteProps {
  selected: MedicationSearchResult | null;
  onSelect: (medication: MedicationSearchResult | null) => void;
}

export function MedicationAutocomplete({
  selected,
  onSelect,
}: MedicationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["medication-search", debounced],
    queryFn: async () =>
      (await medicationDictionaryApi.search(debounced)).data,
    enabled: debounced.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Digite o nome do medicamento"
          value={selected ? selected.nome : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (selected) onSelect(null);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9"
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {isOpen && debounced.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-y-auto">
          {!isFetching && results?.length === 0 && (
            <p className="p-3 text-sm text-gray-400">
              Nenhum medicamento encontrado.
            </p>
          )}
          {results?.map((med) => (
            <button
              key={med.id}
              type="button"
              onClick={() => {
                onSelect(med);
                setQuery("");
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
                selected?.id === med.id && "bg-[#52AF7A]/10",
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{med.nome}</p>
                <p className="text-xs text-gray-400 truncate">
                  {med.laboratorio}
                </p>
                {med.tarjas.some(
                  (t) =>
                    t.toLowerCase().includes("preta") ||
                    t.toLowerCase().includes("vermelha"),
                ) && (
                  <Badge
                    variant="outline"
                    className="mt-1 border-red-300 text-red-600 text-[10px] px-1.5 py-0"
                  >
                    {med.tarjas.find(
                      (t) =>
                        t.toLowerCase().includes("preta") ||
                        t.toLowerCase().includes("vermelha"),
                    )}
                  </Badge>
                )}
              </div>
              {selected?.id === med.id && (
                <Check className="h-4 w-4 text-[#52AF7A] shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
