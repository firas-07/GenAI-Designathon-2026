"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { Bot, Send, User, Sparkles, Loader2, X, MessageSquareText, Zap } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Robust Markdown-to-HTML renderer ───
function renderMarkdown(text: string): string {
  // Escape HTML entities first to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // ── Code blocks (``` ... ```) ──
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="ai-code-block"><code>${code.trim()}</code></pre>`;
  });

  // ── Inline code (`...`) ──
  html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

  // Process line-by-line for block elements
  const lines = html.split("\n");
  const processed: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inTable = false;
  let tableRows: string[] = [];

  const closeList = () => {
    if (inList && listType) {
      processed.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  const closeTable = () => {
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<div class="ai-table-wrap"><table class="ai-table">';
      tableRows.forEach((row, idx) => {
        const cells = row.split("|").filter(c => c.trim() !== "");
        if (idx === 0) {
          tableHtml += "<thead><tr>";
          cells.forEach(c => { tableHtml += `<th>${c.trim()}</th>`; });
          tableHtml += "</tr></thead><tbody>";
        } else if (idx === 1 && /^[\s\-:|]+$/.test(row)) {
          // separator row — skip
        } else {
          tableHtml += "<tr>";
          cells.forEach(c => { tableHtml += `<td>${c.trim()}</td>`; });
          tableHtml += "</tr>";
        }
      });
      tableHtml += "</tbody></table></div>";
      processed.push(tableHtml);
      inTable = false;
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines but close open blocks
    if (trimmed === "") {
      closeList();
      closeTable();
      processed.push("");
      continue;
    }

    // ── Table detection (lines with |) ──
    if (trimmed.includes("|") && (trimmed.startsWith("|") || trimmed.endsWith("|"))) {
      closeList();
      if (!inTable) inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      closeTable();
    }

    // ── Headers ──
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      closeList();
      const level = headerMatch[1].length;
      const headerClass = `ai-h${level}`;
      processed.push(`<div class="${headerClass}">${applyInlineFormatting(headerMatch[2])}</div>`);
      continue;
    }

    // ── Unordered list items (-, *, •) ──
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        processed.push('<ul class="ai-list">');
        inList = true;
        listType = "ul";
      }
      processed.push(`<li>${applyInlineFormatting(ulMatch[1])}</li>`);
      continue;
    }

    // ── Ordered list items (1. 2. etc.) ──
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        processed.push('<ol class="ai-list ai-ol">');
        inList = true;
        listType = "ol";
      }
      processed.push(`<li>${applyInlineFormatting(olMatch[2])}</li>`);
      continue;
    }

    // ── Horizontal rule ──
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeList();
      processed.push('<hr class="ai-hr"/>');
      continue;
    }

    // ── Blockquote ──
    if (trimmed.startsWith("&gt;")) {
      closeList();
      const quoteContent = trimmed.replace(/^&gt;\s*/, "");
      processed.push(`<blockquote class="ai-blockquote">${applyInlineFormatting(quoteContent)}</blockquote>`);
      continue;
    }

    // ── Regular paragraph ──
    closeList();
    processed.push(`<p class="ai-p">${applyInlineFormatting(trimmed)}</p>`);
  }

  closeList();
  closeTable();

  return processed.join("");
}

// ── Inline formatting (bold, italic, links, strikethrough) ──
function applyInlineFormatting(text: string): string {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="ai-bold">$1</strong>');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em class="ai-italic">$1</em>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Links: [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-link">$1</a>'
  );
  return text;
}

// ── Recommendation suggestions based on context ──
function getRecommendations(pathname: string, messageCount: number): string[] {
  // Only show recommendations on initial load or after AI responses
  const contextRecommendations: Record<string, string[]> = {
    "/dashboard": [
      "Show system overview stats",
      "Who are the high-risk candidates?",
      "Which batches are underperforming?",
    ],
    "/candidates": [
      "Show system stats",
      "List high-risk candidates",
      "Explain how risk scores work",
    ],
    "/batches": [
      "Show batch performance",
      "Which batch has the lowest attendance?",
      "Explain batch management",
    ],
    "/attendance": [
      "Show attendance summary",
      "Explain the 10 AM cutoff rule",
      "Which candidates have low attendance?",
    ],
    "/analytics": [
      "Show system overview stats",
      "Predict dropout risks",
      "Explain the analytics dashboard",
    ],
    "/alerts": [
      "Show active alerts",
      "What are the high-risk alerts?",
      "Explain the alert system",
    ],
    "/feedback": [
      "Show feedback summary",
      "Explain the feedback module",
      "Launch feedback for a batch",
    ],
    "/settings": [
      "Explain the settings page",
      "What governance thresholds are set?",
      "Show system overview stats",
    ],
  };

  // Default recommendations
  const defaults = [
    "Show system overview stats",
    "Who are the high-risk candidates?",
    "Explain this page",
  ];

  // After first exchange, show follow-up suggestions
  if (messageCount > 2) {
    return [
      "Tell me more",
      "Show detailed stats",
      "What actions can you take?",
    ];
  }

  // Try to match by path prefix
  for (const key of Object.keys(contextRecommendations)) {
    if (pathname.startsWith(key)) {
      return contextRecommendations[key];
    }
  }

  return defaults;
}

export default function AIChatBot() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hi! I'm your **Maverick AI Copilot**.\n\nI am connected to your Live Firestore Database. I can analyze your real candidates, batches, and governance alerts in real-time.\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Compute recommendations based on current context
  const recommendations = useMemo(
    () => getRecommendations(pathname, messages.length),
    [pathname, messages.length]
  );

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userRole: profile?.role || "Guest",
          currentPath: pathname,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const resp: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          data.content ||
          "I encountered an issue processing that. How else can I help?",
        timestamp: new Date(),
      };
      setMessages((m) => [...m, resp]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationClick = (text: string) => {
    sendMessage(text);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 hover:shadow-blue-500/50 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #2563EB, #1E40AF)",
            border: "1px solid rgba(96, 165, 250, 0.5)",
          }}
        >
          <Bot size={24} className="text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 w-[400px] h-[620px] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] z-[100] flex flex-col shadow-2xl rounded-2xl overflow-hidden glass-card transition-all animate-in zoom-in-95 duration-200"
          style={{
            background:
              "linear-gradient(145deg, rgba(11, 18, 33, 0.95) 0%, rgba(4, 9, 20, 0.98) 100%)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.15)",
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
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>{" "}
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-600 shadow-lg">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm ${
                    msg.role === "assistant"
                      ? "bg-[#1E2E50]/80 text-white rounded-tl-sm border border-white/[0.05]"
                      : "bg-blue-600 text-white rounded-tr-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="ai-markdown-body"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content),
                      }}
                    />
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 shadow-lg">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-[#1E2E50]/80 px-4 py-3 flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/[0.05]">
                  <Loader2
                    size={14}
                    className="animate-spin text-teal-400"
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            {/* Recommendation Bubbles — shown after last assistant message when not loading */}
            {!loading && messages[messages.length - 1]?.role === "assistant" && (
              <div className="ai-recommendations-wrap">
                <div className="flex items-center gap-1.5 mb-2 ml-11">
                  <Zap size={11} className="text-blue-400" />
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Suggestions
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 ml-11">
                  {recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecommendationClick(rec)}
                      className="ai-rec-bubble"
                    >
                      {rec}
                    </button>
                  ))}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage(input)
                }
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
