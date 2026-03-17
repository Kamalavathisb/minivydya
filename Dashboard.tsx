import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import AIChatWidget from "@/components/AIChatWidget";

interface Report {
  id: string;
  file_name: string;
  uploaded_at: string;
}

interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  status: string;
}

interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  icon: string | null;
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

const priorityColors: Record<string, string> = {
  high: "hsl(0 84% 60%)",
  medium: "hsl(38 92% 50%)",
  low: "hsl(142 71% 45%)",
};

const categoryIcons: Record<string, string> = {
  "Food & Nutrition": "🥗",
  "Exercise & Activity": "💪",
  "Sleep & Recovery": "😴",
  "Stress Management": "🧘",
};

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: reps }, { data: mets }, { data: recs }] = await Promise.all([
        supabase.from("reports").select("id,file_name,uploaded_at").eq("user_id", user.id).order("uploaded_at", { ascending: false }).limit(3),
        supabase.from("health_metrics").select("id,metric_type,value,unit,status").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(6),
        supabase.from("recommendations").select("id,category,title,description,priority,icon").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
      ]);
      setReports(reps || []);
      setMetrics(mets || []);
      setRecommendations(recs || []);
    };
    load();
  }, [user]);

  if (loading || !user) return null;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

  const normalCount = metrics.filter((m) => m.status === "normal").length;
  const elevatedCount = metrics.filter((m) => m.status === "elevated").length;
  const lowCount = metrics.filter((m) => m.status === "low").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">
            Welcome back, {profile?.full_name || user.email}!
          </h1>
          <p className="text-muted-foreground mt-1">Here's your health overview</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5" style={{ boxShadow: "var(--card-shadow)" }}>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Reports</p>
            <p className="text-3xl font-bold text-primary">{reports.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5" style={{ boxShadow: "var(--card-shadow)" }}>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Metrics</p>
            <p className="text-3xl font-bold text-foreground">{metrics.length}</p>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: statusBg.normal, boxShadow: "var(--card-shadow)" }}>
            <p className="text-xs mb-1 uppercase tracking-wide font-medium" style={{ color: statusColors.normal }}>Normal</p>
            <p className="text-3xl font-bold" style={{ color: statusColors.normal }}>{normalCount}</p>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: statusBg.elevated, boxShadow: "var(--card-shadow)" }}>
            <p className="text-xs mb-1 uppercase tracking-wide font-medium" style={{ color: statusColors.elevated }}>Elevated</p>
            <p className="text-3xl font-bold" style={{ color: statusColors.elevated }}>{elevatedCount}</p>
          </div>
        </div>

        {/* Metrics + Recommendations row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Recent Metrics */}
          <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--card-shadow)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Health Metrics</h2>
              <Link to="/metrics" className="text-sm text-primary font-medium hover:underline">View all →</Link>
            </div>
            {metrics.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No metrics yet. Upload a report to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.metric_type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium text-foreground">
                        {m.value} <span className="text-xs text-muted-foreground font-sans">{m.unit}</span>
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{
                          backgroundColor: statusBg[m.status] || "hsl(var(--secondary))",
                          color: statusColors[m.status] || "hsl(var(--foreground))",
                        }}
                      >
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/metrics")}>
              View Full Metrics
            </Button>
          </div>

          {/* Recent Recommendations */}
          <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--card-shadow)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Recommendations</h2>
              <Link to="/recommendations" className="text-sm text-primary font-medium hover:underline">View all →</Link>
            </div>
            {recommendations.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No recommendations yet. Upload a report to get personalised advice.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {rec.icon || categoryIcons[rec.category] || "💊"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">{rec.title}</p>
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            backgroundColor: `${priorityColors[rec.priority]}20`,
                            color: priorityColors[rec.priority] || "hsl(var(--foreground))",
                          }}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/recommendations")}>
              View All Recommendations
            </Button>
          </div>
        </div>

        {/* Recent Reports + Upload */}
        <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent Reports</h2>
            <Link to="/reports" className="text-sm text-primary font-medium hover:underline">View all →</Link>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No reports uploaded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3 mb-4">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <span className="text-base">📄</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{r.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.uploaded_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button onClick={() => navigate("/upload")}>
            + Upload New Report
          </Button>
        </div>
      </div>

      <AIChatWidget />
    </div>
  );
};

export default Dashboard;
