"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";

type ClassroomDraft = {
  name: string;
  subject: string;
  grades: string; // comma-separated, e.g. "7" or "3,4,5"
  studentCount: string;
  isMultiGrade: boolean;
};

const STEPS = ["About you", "What you teach", "Preferences"] as const;

function emptyClassroom(): ClassroomDraft {
  return { name: "", subject: "", grades: "", studentCount: "40", isMultiGrade: false };
}

export function OnboardingWizard({ teacherName }: { teacherName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [school, setSchool] = useState("");
  const [district, setDistrict] = useState("");
  const [schoolType, setSchoolType] = useState("Govt");

  const [classrooms, setClassrooms] = useState<ClassroomDraft[]>([emptyClassroom()]);

  const [preferredLanguage, setPreferredLanguage] = useState("hi");
  const [periodMinutes, setPeriodMinutes] = useState("40");
  const [resources, setResources] = useState("blackboard");

  function updateClassroom(i: number, patch: Partial<ClassroomDraft>) {
    setClassrooms((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function canProceed() {
    if (step === 0) return school.trim().length > 0 && district.trim().length > 0;
    if (step === 1)
      return classrooms.every(
        (c) => c.name.trim() && c.subject.trim() && c.grades.trim() && Number(c.studentCount) > 0
      );
    return true;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school,
          district,
          schoolType,
          preferredLanguage,
          defaultPeriodMinutes: Number(periodMinutes),
          lowResourceDefault: resources === "blackboard",
          classrooms: classrooms.map((c) => ({
            name: c.name,
            subject: c.subject,
            grades: c.grades
              .split(",")
              .map((g) => Number(g.trim()))
              .filter((g) => !Number.isNaN(g)),
            studentCount: Number(c.studentCount),
            isMultiGrade: c.isMultiGrade,
            language: preferredLanguage,
            lowResource: resources === "blackboard",
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save your setup");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Progress value={((step + 1) / STEPS.length) * 100}>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
        <CardTitle className="mt-2">{STEPS[step]}</CardTitle>
        <CardDescription>
          {step === 0 && `नमस्ते ${teacherName} जी — tell us about your school.`}
          {step === 1 && "Add every class you teach. Mark a room as multi-grade if it mixes grades."}
          {step === 2 && "A few defaults we'll use every time you make a kit."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="school">School name</Label>
              <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District / State</Label>
              <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>School type</Label>
              <RadioGroup value={schoolType} onValueChange={setSchoolType} className="flex gap-4">
                {["Govt", "Private", "Aided"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={opt} />
                    {opt}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {classrooms.map((c, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Class {i + 1}</p>
                  {classrooms.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setClassrooms((rows) => rows.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      placeholder="7-A Science"
                      value={c.name}
                      onChange={(e) => updateClassroom(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Input
                      placeholder="Science"
                      value={c.subject}
                      onChange={(e) => updateClassroom(i, { subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Grade(s)</Label>
                    <Input
                      placeholder="7 or 3,4,5"
                      value={c.grades}
                      onChange={(e) => updateClassroom(i, { grades: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Students</Label>
                    <Input
                      type="number"
                      value={c.studentCount}
                      onChange={(e) => updateClassroom(i, { studentCount: e.target.value })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={c.isMultiGrade}
                    onCheckedChange={(checked) => updateClassroom(i, { isMultiGrade: checked })}
                  />
                  Do you teach more than one grade in this same room?
                </label>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setClassrooms((rows) => [...rows, emptyClassroom()])}
            >
              + Add another class
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Content language</Label>
              <RadioGroup value={preferredLanguage} onValueChange={setPreferredLanguage} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="hi" /> हिंदी
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="en" /> English
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period">Period length (minutes)</Label>
              <Input
                id="period"
                type="number"
                value={periodMinutes}
                onChange={(e) => setPeriodMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Classroom resources</Label>
              <RadioGroup value={resources} onValueChange={setResources} className="gap-2">
                {[
                  { value: "blackboard", label: "Blackboard only" },
                  { value: "charts", label: "Charts / printed material" },
                  { value: "projector", label: "Projector" },
                  { value: "smartphone", label: "Smartphone (mine or a shared one)" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canProceed()} onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button type="button" disabled={submitting} onClick={submit}>
              {submitting ? "Saving..." : "Finish"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
