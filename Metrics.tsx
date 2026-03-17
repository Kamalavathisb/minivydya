import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  status: string;
  recorded_at: string;
}

const statusColors: Record<string, string> = {
  normal: "hsl(142 71% 45%)",
  elevated: "hsl(0 84% 60%)",
  low: "hsl(38 92% 50%)",
};

const statusBg: Record<string, string> = {
  normal: "hsl(142 76% 96%)",
  elevated: "hsl(0 100% 97%)",
  low: "hsl(38 100% 97%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-sm font-bold" style={{ color: payload[0].fill }}>
          {payload[0].value} {payload[0].payload.unit}
        </p>
        <p className="text-xs text-muted-foreground capitalize">{payload[0].payload.status}</p>
      </div>
    );
  }
  return null;
};

const Metrics = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .then(({ data }) => setMetrics(data || []));
  }, [user]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

  if (loading || !user) return null;

  // Prepare chart data — shorten long metric names
  const chartData = metrics.map((m) => ({
    name: m.metric_type.length > 14 ? m.metric_type.slice(0, 14) + "…" : m.metric_type,
    fullName: m.metric_type,
    value: m.value,
    unit: m.unit,
    status: m.status,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-extrabold text-foreground mb-1">Health Metrics</h1>
        <p className="text-muted-foreground mb-8">Extracted from your uploaded medical reports</p>

        {metrics.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No health metrics recorded yet. Upload a report to get started.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["normal", "elevated", "low"] as const).map((s) => {
                const count = metrics.filter((m) => m.status === s).length;
                if (count === 0) return null;
                return (
                  <div
                    key={s}
                    className="rounded-xl p-4 border border-transparent"
                    style={{ backgroundColor: statusBg[s] }}
                  >
                    <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: statusColors[s] }}>
                      {s}
                    </p>
                    <p className="text-3xl font-bold" style={{ color: statusColors[s] }}>{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">metric{count !== 1 ? "s" : ""}</p>
                  </div>
                );
              })}
              <div className="rounded-xl p-4 border border-border bg-card" style={{ boxShadow: "var(--card-shadow)" }}>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total</p>
                <p className="text-3xl font-bold text-primary">{metrics.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">metrics tracked</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--card-shadow)" }}>
              <h2 className="text-lg font-bold text-foreground mb-6">Metrics Overview</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={statusColors[entry.status] || "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-2 justify-center flex-wrap">
                {Object.entries(statusColors).map(([s, color]) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted-foreground capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Numeric table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Detailed Values</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-3">Metric</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-3">Value</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-3">Status</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={m.id} className={i < metrics.length - 1 ? "border-b border-border" : ""}>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{m.metric_type}</td>
                      <td className="px-6 py-4 text-sm text-foreground font-mono">{m.value} <span className="text-muted-foreground font-sans">{m.unit}</span></td>
                      <td className="px-6 py-4">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{
                            backgroundColor: statusBg[m.status] || "hsl(var(--secondary))",
                            color: statusColors[m.status] || "hsl(var(--foreground))",
                          }}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(m.recorded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Metrics;
