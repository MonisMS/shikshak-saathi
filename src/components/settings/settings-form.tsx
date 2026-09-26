"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useLanguage, useT } from "@/components/layout/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FadeIn } from "@/components/motion/fade-in";

interface SettingsInitial {
  name: string;
  school: string;
  district: string;
  preferredLanguage: "hi" | "en";
  defaultPeriodMinutes: number;
  lowResourceDefault: boolean;
}

/** A6: teacher settings — profile + defaults used when creating a new kit.
 * Interface language (uiLanguage) is handled separately by the topbar toggle/LanguageProvider,
 * which already persists it via the same authClient.updateUser call. */
export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof SettingsInitial>(key: K, value: SettingsInitial[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authClient.updateUser({
        name: form.name,
        school: form.school || undefined,
        district: form.district || undefined,
        preferredLanguage: form.preferredLanguage,
        defaultPeriodMinutes: form.defaultPeriodMinutes,
        lowResourceDefault: form.lowResourceDefault,
      });
      toast.success(t("settings_saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-10">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings_title")}</h1>
      </FadeIn>

      <FadeIn index={1}>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">{t("settings_profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("settings_name")}</Label>
              <Input className="h-11" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("settings_school")}</Label>
                <Input className="h-11" value={form.school} onChange={(e) => set("school", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings_district")}</Label>
                <Input className="h-11" value={form.district} onChange={(e) => set("district", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn index={2}>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">{t("settings_defaultLanguage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("settings_defaultLanguage")}</Label>
              <Select items={{ hi: "हिंदी (Hindi)", en: "English" }} value={form.preferredLanguage} onValueChange={(v) => set("preferredLanguage", v as "hi" | "en")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("settings_uiLanguage")}</Label>
              <Select items={{ hi: "हिंदी (Hindi)", en: "English" }} value={lang} onValueChange={(v) => setLang(v as "hi" | "en")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Kit defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("settings_periodLength")}</Label>
              <Input
                className="h-11 max-w-32"
                type="number"
                min={20}
                max={90}
                value={form.defaultPeriodMinutes}
                onChange={(e) => set("defaultPeriodMinutes", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/40 px-3 py-3">
              <Label htmlFor="low-resource-default" className="text-sm leading-snug">
                {t("settings_lowResourceDefault")}
                <span className="block font-normal text-muted-foreground">Blackboard + local objects only, no projector</span>
              </Label>
              <Switch id="low-resource-default" checked={form.lowResourceDefault} onCheckedChange={(v) => set("lowResourceDefault", v)} />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn index={4}>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving…" : t("cta_save")}
        </Button>
      </FadeIn>
    </form>
  );
}
