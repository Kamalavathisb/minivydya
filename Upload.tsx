import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, UploadCloud, FileText } from "lucide-react";

type UploadStep = "idle" | "uploading" | "analyzing" | "done" | "error";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({ metrics: 0, recommendations: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setStep("uploading");

    try {
      // Step 1: Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("medical-reports")
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("medical-reports").getPublicUrl(filePath);

      const { data: reportRow, error: dbError } = await supabase.from("reports").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
      }).select().single();

      if (dbError) throw dbError;

      // Step 2: Analyze with AI
      setStep("analyzing");

      const { data: fnData, error: fnError } = await supabase.functions.invoke("analyze-report", {
        body: {
          reportId: reportRow.id,
          filePath,
          userId: user.id,
        },
      });

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      setProgress({ metrics: fnData.metricsCount, recommendations: fnData.recommendationsCount });
      setStep("done");

      toast({
        title: "Report analysed successfully! 🎉",
        description: `Extracted ${fnData.metricsCount} metrics and ${fnData.recommendationsCount} recommendations.`,
      });
    } catch (err: any) {
      setStep("error");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const stepLabels: Record<UploadStep, string> = {
    idle: "Upload Report",
    uploading: "Uploading file...",
    analyzing: "AI is analysing your report...",
    done: "Analysis complete!",
    error: "Try Again",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Upload Medical Report</h1>
        <p className="text-muted-foreground mb-8">Our AI will automatically extract your health metrics and generate personalised recommendations.</p>

        <div className="bg-card border border-border rounded-xl p-8" style={{ boxShadow: "var(--card-shadow)" }}>
          <p className="text-sm font-medium text-foreground mb-3">Select Report File</p>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-secondary" : "border-border bg-background"
            } ${step !== "idle" && step !== "error" ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => (step === "idle" || step === "error") && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
            {file ? (
              <>
                <FileText className="w-10 h-10 mb-2" style={{ color: "hsl(var(--primary))" }} />
                <p className="text-sm font-medium text-primary">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm">
                  <span className="text-primary font-medium">Upload a file</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
              </>
            )}
          </div>

          {/* Analysis steps progress */}
          {(step === "uploading" || step === "analyzing" || step === "done") && (
            <div className="mt-6 space-y-3">
              <StepRow label="Uploading file" done={step === "analyzing" || step === "done"} active={step === "uploading"} />
              <StepRow label="AI extracting health metrics" done={step === "done"} active={step === "analyzing"} />
              <StepRow label="Generating recommendations" done={step === "done"} active={step === "analyzing"} />
            </div>
          )}

          {step === "done" && (
            <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: "hsl(142 76% 96%)" }}>
              <p className="font-semibold" style={{ color: "hsl(var(--success))" }}>
                ✅ Found {progress.metrics} health metrics &amp; {progress.recommendations} recommendations
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <Button
              className="flex-1 h-12 text-base font-semibold rounded-lg"
              onClick={step === "idle" || step === "error" ? handleUpload : undefined}
              disabled={!file || (step !== "idle" && step !== "error")}
            >
              {(step === "uploading" || step === "analyzing") && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {step === "done" && <CheckCircle className="w-4 h-4 mr-2" />}
              {stepLabels[step]}
            </Button>

            {step === "done" && (
              <Button variant="outline" className="h-12 px-6 rounded-lg" onClick={() => navigate("/metrics")}>
                View Metrics
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StepRow = ({ label, done, active }: { label: string; done: boolean; active: boolean }) => (
  <div className="flex items-center gap-3">
    {done ? (
      <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "hsl(var(--success))" }} />
    ) : active ? (
      <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" style={{ color: "hsl(var(--primary))" }} />
    ) : (
      <div className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-border" />
    )}
    <span className={`text-sm ${done ? "text-foreground font-medium" : active ? "text-foreground" : "text-muted-foreground"}`}>
      {label}
    </span>
  </div>
);

export default Upload;
