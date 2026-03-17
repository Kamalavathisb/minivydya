import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Trash2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  time: string;
}

const formatTime = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

const STORAGE_KEY = "health_ai_messages_v2";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

const AIChatWidget = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };

  useEffect(() => {
    if (open && messages.length === 0) {
      const saved = localStorage.getItem(STORAGE_KEY + user?.id);
      if (saved) {
        try { setMessages(JSON.parse(saved)); } catch {}
      } else {
        setMessages([{
          role: "assistant",
          content: `Good ${getTimeOfDay()}${profile?.full_name ? ", " + profile.full_name : ""}! 👋 I'm your Health AI Assistant. I've analysed your uploaded medical reports and can answer questions about your health metrics, recommendations, and lifestyle tips. What would you like to know?`,
          time: formatTime(),
        }]);
      }
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (user && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY + user.id, JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMsg: Message = { role: "user", content: input.trim(), time: formatTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add placeholder assistant message
    const placeholderMsg: Message = { role: "assistant", content: "", time: formatTime() };
    setMessages((prev) => [...prev, placeholderMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userId: user.id,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: "Rate limit exceeded", description: "Please wait a moment before sending another message.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "AI credits exhausted", description: "Please add funds to your workspace.", variant: "destructive" });
        } else {
          throw new Error(errData.error || "Failed to get response");
        }
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantText = "";
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              assistantText += chunk;
              const captured = assistantText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: captured };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              assistantText += chunk;
              const captured = assistantText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: captured };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((prev) => prev.slice(0, -1));
        toast({ title: "Error", description: e.message || "Failed to get AI response", variant: "destructive" });
      }
    }

    setLoading(false);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
    if (user) localStorage.removeItem(STORAGE_KEY + user.id);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-50"
          style={{ backgroundColor: "hsl(var(--primary))" }}
          aria-label="Open Health AI Assistant"
        >
          <Bot size={24} className="text-white" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 w-80 rounded-2xl overflow-hidden z-50 flex flex-col"
          style={{ height: "520px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "hsl(var(--primary))" }}>
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-white" />
              <div>
                <p className="text-sm font-bold text-white">Health AI Assistant</p>
                <p className="text-xs text-white/80">Powered by your health data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleClear} className="text-white/80 hover:text-white transition-colors" title="Clear chat">
                <Trash2 size={15} />
              </button>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-background space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tr-sm px-3 py-2" style={{ backgroundColor: "hsl(var(--primary))" }}>
                      <p className="text-sm text-white">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">{msg.time}</p>
                  </div>
                ) : (
                  <div className="max-w-[88%]">
                    <div className="rounded-2xl rounded-tl-sm px-3 py-2 bg-card border border-border">
                      {msg.content ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="flex gap-1 py-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{msg.time}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 py-3 bg-card border-t border-border">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your health..."
              className="flex-1 text-sm h-9 bg-background border-border"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <Button size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={handleSend} disabled={!input.trim() || loading}>
              <Send size={14} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
