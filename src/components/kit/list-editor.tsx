"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";

/** Generic add/remove-rows editor (F19: "add/remove rows for arrays"). */
export function ListEditor<T>({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, onItemChange: (item: T) => void, index: number) => React.ReactNode;
  newItem: () => T;
  addLabel?: string;
}) {
  const { lang } = useLanguage();
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-md border p-2">
          <div className="flex-1 space-y-2">{renderItem(item, (next) => onChange(items.map((it, j) => (j === i ? next : it))), i)}</div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={tx(lang, "Remove", "हटाएँ")}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, newItem()])}>
        <Plus className="size-4" /> {addLabel ?? tx(lang, "Add", "जोड़ें")}
      </Button>
    </div>
  );
}

/** Textarea bound to a string[] — one line per item, F19's "text inputs/textarea for strings". */
export function linesToArray(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}
export function arrayToLines(items: string[]): string {
  return items.join("\n");
}
