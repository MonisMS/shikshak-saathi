import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, tooltip }: { label: string; value: string | number; tooltip?: string }) {
  return (
    <Card title={tooltip}>
      <CardContent className="pt-6">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
