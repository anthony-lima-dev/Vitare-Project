import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, Loader2 } from "lucide-react";
import {
  diseaseDictionaryApi,
  type DiseaseSearchResult,
} from "../../core/infrastructure/api/disease-dictionary.api";
import { Input } from "@vitare/ui-components";
import { cn } from "../../../lib/utils";

interface DiseaseAutocompleteProps {
  selected: DiseaseSearchResult | null;
  onSelect: (disease: DiseaseSearchResult | null) => void;
}

export function DiseaseAutocomplete({
  selected,
  onSelect,
}: DiseaseAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["disease-search", debounced],
    queryFn: async () => (await diseaseDictionaryApi.search(debounced)).data,
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
          placeholder="Digite o nome da condição ou código CID"
          value={selected ? `${selected.name} (${selected.code})` : query}
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
              Nenhuma condição encontrada.
            </p>
          )}
          {results?.map((disease) => (
            <button
              key={disease.id}
              type="button"
              onClick={() => {
                onSelect(disease);
                setQuery("");
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
                selected?.id === disease.id && "bg-[#52AF7A]/10",
              )}
            >
              <div>
                <p className="font-medium text-gray-900">{disease.name}</p>
                <p className="text-xs text-gray-400">
                  {disease.code}
                  {disease.groupName ? ` · ${disease.groupName}` : ""}
                </p>
              </div>
              {selected?.id === disease.id && (
                <Check className="h-4 w-4 text-[#52AF7A] shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
