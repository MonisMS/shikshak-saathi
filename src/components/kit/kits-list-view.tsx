"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_CHIP, statusChipKey } from "./status-chip";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";

export interface KitRow {
  id: string;
  title: string;
  status: string;
  hasResults: boolean;
  classroomId: string | null;
  classroomName: string | null;
  subject: string | null;
  createdAt: string;
}
interface ClassroomOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["DRAFT", "GENERATING", "READY", "FAILED", "RESULTS_IN"];

/** F51: kit history with filters (classroom, status), search, duplicate, delete. */
export function KitsListView({
  initialKits,
  classrooms,
  initialSearch = "",
  initialClassroom,
}: {
  initialKits: KitRow[];
  classrooms: ClassroomOption[];
  initialSearch?: string;
  initialClassroom?: string;
}) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [kits, setKits] = useState(initialKits);
  const [search, setSearch] = useState(initialSearch);
  const [classroomFilter, setClassroomFilter] = useState<string | undefined>(
    classrooms.some((c) => c.id === initialClassroom) ? initialClassroom : undefined,
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      kits.filter((k) => {
        if (search && !k.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (classroomFilter && k.classroomId !== classroomFilter) return false;
        if (statusFilter && statusChipKey(k.status, k.hasResults) !== statusFilter) return false;
        return true;
      }),
    [kits, search, classroomFilter, statusFilter],
  );

  async function handleDuplicate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/kits/${id}/duplicate`, { method: "POST" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      toast.success(tx(lang, "Kit duplicated", "किट की कॉपी बन गई"));
      router.push(`/kits/${(data as { id: string }).id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Could not duplicate", "कॉपी नहीं बन सकी"));
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tx(lang, "Delete this kit? This cannot be undone.", "यह किट हटाएँ? यह वापस नहीं होगा."))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/kits/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      }
      setKits((prev) => prev.filter((k) => k.id !== id));
      toast.success(tx(lang, "Kit deleted", "किट हटा दी गई"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Could not delete", "हटाया नहीं जा सका"));
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = !!(search || classroomFilter || statusFilter);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{tx(lang, "My kits", "मेरी किट्स")}</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder={tx(lang, "Search kits…", "किट खोजें…")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select items={classrooms.map((c) => ({ value: c.id, label: c.name }))} value={classroomFilter} onValueChange={(v) => setClassroomFilter(v ?? undefined)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={tx(lang, "All classrooms", "सभी कक्षाएँ")} />
          </SelectTrigger>
          <SelectContent>
            {classrooms.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_CHIP[s].label[lang] }))} value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? undefined)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={tx(lang, "All statuses", "सभी स्थितियाँ")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CHIP[s].label[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setClassroomFilter(undefined);
              setStatusFilter(undefined);
            }}
          >
            {tx(lang, "Clear", "साफ़ करें")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">{tx(lang, "No kits match.", "कोई किट नहीं मिली.")}</p>}
        {filtered.map((k) => {
          const chip = STATUS_CHIP[statusChipKey(k.status, k.hasResults)] ?? STATUS_CHIP.DRAFT;
          return (
            <Card key={k.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div className="min-w-0">
                  <Link href={`/kits/${k.id}`} className="font-medium underline">
                    {k.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {k.classroomName ?? tx(lang, "No classroom", "कोई कक्षा नहीं")}
                    {k.subject ? ` · ${k.subject}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className={chip.className}>
                    {chip.label[lang]}
                  </Badge>
                  <Button size="sm" variant="outline" disabled={busyId === k.id} onClick={() => handleDuplicate(k.id)}>
                    {tx(lang, "Duplicate", "कॉपी बनाएँ")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === k.id} onClick={() => handleDelete(k.id)}>
                    {tx(lang, "Delete", "हटाएँ")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
