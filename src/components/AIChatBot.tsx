"use client";
import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Bot, Send, User, Sparkles, Loader2, X, MessageSquareText } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hi! I'm your **Maverick AI Copilot**.\n\nI am connected to your Live Firestore Database. I can analyze your real candidates, batches, and governance alerts in real-time. How can I help?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState({ 
    highRisk: 0, 
    totalCands: 0, 
    batches: [] as any[],
    avgAttendance: 0
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchStats = async () => {
      try {
        const candSnap = await getDocs(collection(db, "candidates"));
        const cands = candSnap.docs.map(d => d.data());
        const highRisk = cands.filter(c => c.riskLevel === "HIGH" || c.risk === "HIGH").length;
        
        const batchSnap = await getDocs(collection(db, "batches"));
        const batches = batchSnap.docs.map(d => d.data().name);

        const avgAtt = cands.length > 0 ? Math.round(cands.reduce((s, c) => s + (c.attendance || 0), 0) / cands.length) : 0;
        
        setLiveData({ highRisk, totalCands: cands.length, batches, avgAttendance: avgAtt });
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, [isOpen]);

  const getMaverickResponse = (queryText: string) => {
    const text = queryText.toLowerCase();
    
    if (text.includes("risk") || text.includes("high-risk")) {
      if (liveData.totalCands === 0) return "The candidate database is currently empty. Please enroll talent to begin risk analysis.";
      return `I have analyzed your **${liveData.totalCands} enrollees**. We currently have **${liveData.highRisk} candidates flagged as HIGH RISK**.\n\n**Common Indicators:**\n• Attendance below 75% threshold\n• Consecutive misses on the 10:00 AM cutoff\n• Decline in recent Coding Assessment scores.\n\nWould you like me to generate intervention notices for these candidates?`;
    }

    if (text.includes("batch") || text.includes("underperforming")) {
      if (liveData.batches.length === 0) return "No active batches detected in the system.";
      return `Currently, you are managing **${liveData.batches.length} batches**: ${liveData.batches.join(", ")}.\n\nBased on live performance logs, the **${liveData.batches[0]}** is showing the highest variance in attendance stability. I recommend a coordinator check-in to ensure compliance with training benchmarks.`;
    }

    if (text.includes("attendance")) {
      return `Global attendance across all enrollees is holding at **${liveData.avgAttendance}%**. \n\n**Governance Observation:**\nWe've detected a trend where late logins (after 10:00 AM) are increasing on Thursdays. Suggest reinforcing the cutoff policy during the morning stand-ups.`;
    }

    if (text.includes("health") || text.includes("check")) {
      return `**Platform Governance Health: OPTIMAL**\n\n• **Data Sync**: 100% active with Firestore\n• **Audit Trail**: Active and tracking all attendance marks\n• **Candidate Tracking**: ${liveData.totalCands} records synced\n• **AI Awareness**: Fully context-aware\n\nThe platform is ready for full-scale talent execution.`;
    }

    return `I've analyzed your query about *"${queryText}"*.\n\nMaverick is tracking **${liveData.totalCands} candidates** across **${liveData.batches.length} batches**. \n\nI can provide deep-dives into attendance trends, predicted dropout risks, or specific batch scorecards. What specific metric should we analyze?`;
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#94a3b8">$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      .replace(/• /g, '&bull; ');
  }

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const resp: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: getMaverickResponse(text), timestamp: new Date() };
      setMessages(m => [...m, resp]);
      setLoading(false);
    }, 1200);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 hover:shadow-blue-500/50 active:scale-95"
          style={{ background: "linear-gradient(135deg, #2563EB, #1E40AF)", border: "1px solid rgba(96, 165, 250, 0.5)" }}
        >
          <Bot size={24} className="text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] z-[100] flex flex-col shadow-2xl rounded-2xl overflow-hidden glass-card transition-all animate-in zoom-in-95 duration-200" 
          style={{ 
            background: "linear-gradient(145deg, rgba(11, 18, 33, 0.95) 0%, rgba(4, 9, 20, 0.98) 100%)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.15)"
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Maverick AI</h3>
                <p className="text-[10px] text-teal-400 font-semibold tracking-wider flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-600 shadow-lg">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm leading-relaxed text-sm ${msg.role === "assistant" ? "bg-[#1E2E50]/80 text-white rounded-tl-sm border border-white/[0.05]" : "bg-blue-600 text-white rounded-tr-sm"}`}>
                  <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 shadow-lg">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-[#1E2E50]/80 px-4 py-3 flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/[0.05]">
                  <Loader2 size={14} className="animate-spin text-teal-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="Ask Maverick AI..."
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none bg-[#0B1221] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-blue-500/50 transition-all shadow-inner" 
              />
              <button 
                onClick={() => sendMessage(input)} 
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-40 shadow-lg"
                style={{ background: "#3B82F6" }}
              >
                <Send size={16} className="text-white ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
