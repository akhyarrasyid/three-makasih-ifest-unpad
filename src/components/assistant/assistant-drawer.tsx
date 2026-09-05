"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/primitives";
import { useUiStore } from "@/store/ui-store";
import { useSelectionStore } from "@/store/selection-store";
import { MODEL } from "@/config/constants";
import { ArrowRight, ChevronDown, ChevronUp, CornerDownLeft, FileText, Sparkles, X } from "lucide-react";
import type { AssistantAction, AssistantCitation, AssistantResponse } from "@/server/rag/pipeline";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: AssistantCitation[];
  actions?: AssistantAction[];
  isThinking?: boolean;
}

const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  "/overview": [
    "Station mana yang sedang warning?",
    "Berapa RMSE model production?",
    "Kenapa model menggunakan direct multi-horizon?",
    "Apa pengaruh spatial reconciliation?",
  ],
  "/stations": [
    "Kenapa stasiun ini diprediksi naik?",
    "Apa perbedaan station natural dan dam/weir?",
    "Berapa ambang batas waspada di stasiun ini?",
    "Bagaimana korelasi stasiun hulu terhadap hilir?",
  ],
  "/forecasts": [
    "Kenapa model menggunakan direct multi-horizon?",
    "Bagaimana perhitungan interval confidence 90%?",
    "Apa stasiun yang mengalami tren kenaikan?",
  ],
  "/models": [
    "Berapa RMSE model production?",
    "Bandingkan hasil ablation study",
    "Apa perbedaan holdout RMSE dengan public leaderboard?",
    "Apa pengaruh spatial reconciliation?",
  ],
  "/network": [
    "Bagaimana perambatan residual dari hulu ke hilir?",
    "Berapa jumlah stasiun natural dan dam/weir?",
    "Apa fungsi Bendung Babat dan Bendung Sembayat?",
  ],
  "/data-quality": [
    "Berapa jumlah data missing pada dataset?",
    "Bagaimana kriteria pemfilteran outlier 4σ?",
    "Apa saja detektor anomali sensor otomatis?",
  ],
  "/alerts": [
    "Jelaskan tingkatan severity alert di ANCHOR",
    "Apa tindakan operator saat alert CRITICAL muncul?",
    "Kenapa ALR-1412 di Karanggeneng berstatus open?",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "Berapa RMSE model production?",
  "Kenapa model menggunakan direct multi-horizon?",
  "Apa pengaruh spatial reconciliation?",
  "Station mana yang sedang warning?",
];

export function AssistantDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const open = useUiStore((s) => s.assistantOpen);
  const setOpen = useUiStore((s) => s.setAssistant);
  const selectedStation = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Halo, saya ANCHOR Intelligence Assistant. Saya dapat menjawab pertanyaan seputar prediksi TMA, model hidrologi Bengawan Solo, stasiun pantau, kualitas sensor, dan sistem peringatan dini.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Scroll to bottom on message update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const currentSuggestions = ROUTE_SUGGESTIONS[pathname] || DEFAULT_SUGGESTIONS;

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const userMsgId = `u-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const thinkingId = `ast-${Date.now()}`;
    const thinkingMsg: ChatMessage = {
      id: thinkingId,
      role: "assistant",
      content: "Menganalisis domain hidrologi & dokumen ANCHOR…",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          context: {
            route: pathname,
            station_id: selectedStation,
            model_version: MODEL.productionVersion,
          },
        }),
      });

      const json = await res.json();
      const data: AssistantResponse = json.data;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: data.answer,
                citations: data.citations,
                actions: data.actions,
                isThinking: false,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content:
                  "Terjadi kesalahan saat memproses pertanyaan. Pastikan sistem inference berjalan atau coba lagi beberapa saat.",
                isThinking: false,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleAction = (action: AssistantAction) => {
    if (action.stationId) {
      selectStation(action.stationId);
    }
    if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title="ANCHOR Intelligence"
      subtitle={`Hydrological RAG · ${MODEL.productionVersion}`}
      width="w-full max-w-lg"
    >
      <div className="flex flex-col h-[calc(100vh-6.5rem)] -m-4">
        {/* Messages scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-mono uppercase text-fg-subtle">
                  {m.role === "user" ? "You" : "ANCHOR RAG"}
                </span>
                <span className="text-[10px] font-mono text-fg-faint">{m.timestamp}</span>
              </div>

              <div
                className={`text-xs leading-relaxed max-w-[95%] rounded-md p-3.5 ${
                  m.role === "user"
                    ? "bg-surface-3 text-fg border border-border-strong font-medium"
                    : "bg-surface-1 text-fg border border-border"
                } ${m.isThinking ? "animate-pulse text-fg-muted font-mono" : ""}`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Grounded Citations & Sources */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border-subtle">
                    <button
                      onClick={() => toggleSource(m.id)}
                      className="flex items-center gap-1 text-[11px] font-mono text-water hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      <span>{m.citations.length} Verified Sources</span>
                      {expandedSources[m.id] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {expandedSources[m.id] && (
                      <ul className="mt-2 space-y-1.5 font-mono text-[10px] text-fg-subtle bg-surface-0/60 p-2 rounded border border-border-subtle">
                        {m.citations.map((c, idx) => (
                          <li key={idx} className="flex flex-col gap-0.5">
                            <span className="text-fg font-medium">
                              • {c.document} <span className="text-fg-faint">§ {c.section}</span>
                            </span>
                            <span className="text-fg-faint">
                              Match: {Math.round(c.relevance * 100)}%
                              {c.stationId && ` · Station: ${c.stationId}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Contextual Actions */}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-3 pt-2 flex flex-wrap gap-1.5 border-t border-border-subtle">
                    {m.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAction(act)}
                        className="btn btn-sm !h-6 !text-[11px] font-mono"
                      >
                        {act.label}
                        <ArrowRight className="h-2.5 w-2.5 text-fg-subtle" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Queries */}
        <div className="px-4 py-2 bg-surface-0/70 border-t border-border shrink-0">
          <p className="text-[10px] font-mono uppercase text-fg-subtle mb-1.5 tracking-wider">
            Suggested Operational Queries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentSuggestions.slice(0, 3).map((sugg, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(sugg)}
                className="text-[11px] font-mono text-left px-2 py-1 bg-surface-2 hover:bg-surface-3 text-fg-muted hover:text-fg rounded border border-border transition-colors truncate max-w-full"
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>

        {/* Chat input box */}
        <div className="p-3 bg-surface-0 border-t border-border shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about water levels, RMSE, BS-017, routing… (⌘J)"
              disabled={loading}
              className="flex-1 input font-mono text-xs"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn btn-primary btn-sm !h-7 !px-2.5 font-mono"
              aria-label="Send query"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </form>
          <p className="text-[10px] font-mono text-fg-faint mt-1.5 text-center">
            Domain-constrained: answers only ANCHOR hydrological and operational topics.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
