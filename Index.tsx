import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const featureCards = [
  {
    icon: "📄",
    title: "Upload Reports",
    desc: "Easily upload your medical reports in PDF or image format",
  },
  {
    icon: "📊",
    title: "Track Metrics",
    desc: "Monitor your health metrics and see trends over time",
  },
  {
    icon: "💡",
    title: "Get Recommendations",
    desc: "Receive personalized diet and lifestyle recommendations",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <section className="py-24" style={{ background: "var(--hero-gradient)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-extrabold text-foreground mb-5 leading-tight">
            Medical Report Advisor
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Your personalized health insights and recommendations
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="px-10 py-3 text-base font-semibold rounded-lg" onClick={() => navigate("/register")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="px-10 py-3 text-base font-semibold rounded-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {featureCards.map((card) => (
          <div
            key={card.title}
            className="bg-card rounded-xl border border-border p-8 transition-all duration-200"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <div className="text-4xl mb-5">{card.icon}</div>
            <h3 className="text-lg font-bold text-foreground mb-2">{card.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Index;
