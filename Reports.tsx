import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  file_name: string;
  file_url: string | null;
  uploaded_at: string;
}

const Reports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select("id,file_name,file_url,uploaded_at")
      .eq("user_id", user!.id)
      .order("uploaded_at", { ascending: false });
    setReports(data || []);
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (filePath) {
      await supabase.storage.from("medical-reports").remove([filePath]);
    }
    await supabase.from("reports").delete().eq("id", id);
    toast({ title: "Report deleted" });
    fetchReports();
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">My Reports</h1>
          <Button onClick={() => navigate("/upload")}>Upload New Report</Button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No reports uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((report) => (
              <div key={report.id} className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--card-shadow)" }}>
                <p className="text-base font-bold text-foreground mb-1">{report.file_name}</p>
                <p className="text-sm text-muted-foreground mb-4">Uploaded: {formatDate(report.uploaded_at)}</p>
                <div className="flex gap-2">
                  {report.file_url ? (
                    <Button size="sm" className="flex-1" onClick={() => window.open(report.file_url!, "_blank")}>View</Button>
                  ) : (
                    <Button size="sm" className="flex-1" disabled>View</Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(report.id, null)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
