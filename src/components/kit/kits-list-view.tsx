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
export function KitsListView({ initialKits, classrooms }: { initialKits: KitRow[]; classrooms: ClassroomOption[] }) {
  const router = useRouter();
  const [kits, setKits] = useState(initialKits);
  const [search, setSearch] = useState("");
  const [classroomFilter, setClassroomFilter] = useState<string | undefined>(undefined);
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
      toast.success("Kit duplicated");
      router.push(`/kits/${(data as { id: string }).id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not duplicate");
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this kit? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/kits/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      }
      setKits((prev) => prev.filter((k) => k.id !== id));
      toast.success("Kit deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = !!(search || classroomFilter || statusFilter);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">My kits</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search kits…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={classroomFilter} onValueChange={(v) => setClassroomFilter(v ?? undefined)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All classrooms" />
          </SelectTrigger>
          <SelectContent>
            {classrooms.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? undefined)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CHIP[s].label}
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
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No kits match.</p>}
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
                    {k.classroomName ?? "No classroom"}
                    {k.subject ? ` · ${k.subject}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className={chip.className}>
                    {chip.label}
                  </Badge>
                  <Button size="sm" variant="outline" disabled={busyId === k.id} onClick={() => handleDuplicate(k.id)}>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === k.id} onClick={() => handleDelete(k.id)}>
                    Delete
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
