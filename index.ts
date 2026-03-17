import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch user's health data
    const [{ data: metrics }, { data: recommendations }, { data: reports }] = await Promise.all([
      supabase.from("health_metrics").select("*").eq("user_id", userId).order("recorded_at", { ascending: false }),
      supabase.from("recommendations").select("*").eq("user_id", userId),
      supabase.from("reports").select("file_name, uploaded_at").eq("user_id", userId).order("uploaded_at", { ascending: false }).limit(5),
    ]);

    // Build health context
    let healthContext = "## User's Health Data\n\n";

    if (reports && reports.length > 0) {
      healthContext += `### Uploaded Reports\n`;
      reports.forEach((r: any) => {
        healthContext += `- ${r.file_name} (uploaded: ${new Date(r.uploaded_at).toLocaleDateString()})\n`;
      });
      healthContext += "\n";
    }

    if (metrics && metrics.length > 0) {
      healthContext += `### Health Metrics\n`;
      metrics.forEach((m: any) => {
        healthContext += `- ${m.metric_type}: ${m.value} ${m.unit} (status: ${m.status})\n`;
      });
      healthContext += "\n";
    } else {
      healthContext += "### Health Metrics\nNo metrics recorded yet.\n\n";
    }

    if (recommendations && recommendations.length > 0) {
      healthContext += `### Current Recommendations\n`;
      recommendations.forEach((r: any) => {
        healthContext += `- [${r.category}] ${r.title} (${r.priority} priority): ${r.description}\n`;
      });
    }

    const systemPrompt = `You are a knowledgeable and empathetic Medical Health AI Assistant. You have access to the user's personal health data extracted from their uploaded medical reports.

${healthContext}

Guidelines:
- Always refer to the user's actual health metrics when answering questions
- Provide specific, actionable advice based on their real values
- If a metric is elevated or low, explain what that means and suggest improvements
- Be warm, supportive, and easy to understand (avoid excessive medical jargon)
- Always recommend consulting a doctor for medical decisions
- Keep responses concise but informative (2-4 paragraphs max)
- Use the user's actual numbers when discussing their health`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${errText}`);
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("health-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
