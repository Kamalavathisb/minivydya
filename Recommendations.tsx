import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  icon: string | null;
}

const priorityColors: Record<string, string> = {
  high: "hsl(0 84% 60%)",
  medium: "hsl(38 92% 50%)",
  low: "hsl(142 71% 45%)",
};

const categoryBg: Record<string, string> = {
  "Food & Nutrition": "hsl(142 76% 96%)",
  "Exercise & Activity": "hsl(214 100% 97%)",
  "Sleep & Recovery": "hsl(271 100% 97%)",
  "Stress Management": "hsl(38 100% 97%)",
};

const categoryIcons: Record<string, string> = {
  "Food & Nutrition": "🥗",
  "Exercise & Activity": "💪",
  "Sleep & Recovery": "😴",
  "Stress Management": "🧘",
};

const Recommendations = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [recs, setRecs] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRecs(data || []));
  }, [user]);

  if (loading || !user) return null;

  const categories = [...new Set(recs.map((r) => r.category))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-extrabold text-foreground mb-1">Personalized Recommendations</h1>
        <p className="text-muted-foreground mb-8">Based on your health metrics and medical reports</p>

        {recs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No recommendations yet. Upload a medical report to receive personalized health advice.
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{categoryIcons[cat] || "📋"}</span>
                  <h2 className="text-xl font-bold text-foreground">{cat}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recs.filter((r) => r.category === cat).map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl p-5 border border-transparent relative"
                      style={{ backgroundColor: categoryBg[cat] || "hsl(var(--secondary))" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{rec.icon || "💊"}</span>
                          <h3 className="font-bold text-sm" style={{ color: "hsl(var(--primary))" }}>{rec.title}</h3>
                        </div>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: "hsl(0 84% 96%)",
                            color: priorityColors[rec.priority] || "hsl(var(--foreground))",
                          }}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
