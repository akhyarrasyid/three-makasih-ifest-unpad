"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/primitives";
import { useUiStore } from "@/store/ui-store";
import { useSelectionStore } from "@/store/selection-store";
import { MODEL, SCORES } from "@/config/constants";
import { ArrowRight, ChevronDown, ChevronUp, CornerDownLeft, FileText, Sparkles, X, Droplets } from "lucide-react";
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
    "Sub-basin mana yang saat ini memiliki risiko water-stress tertinggi?",
    "Berapa skor Public Leaderboard vs Stress-Test Validation?",
    "Bagaimana defisit air merambat dari hulu ke hilir?",
    "Apa arti Cold-Start Spatial Generalization?",
  ],
  "/network": [
    "Bagaimana perambatan 1-hop, 2-hop, dan 3-hop dihitung?",
    "Jelaskan relasi fisik id -> to_id pada river DAG",
    "Mengapa graf sungai tidak dimodelkan sebagai jaringan acak?",
  ],
  "/forecasts": [
    "Bagaimana prediksi next-month water stress diformulasikan?",
    "Apa faktor penyebab utama kenaikan risiko di HUC-DEMO-0014?",
    "Bagaimana interpretasi risk tier (LOW/MODERATE/HIGH/CRITICAL)?",
  ],
  "/validation": [
    "Kenapa Naive Random CV menghasilkan skor optimis palsu (0.8421)?",
    "Jelaskan 4 safeguard pada Stress-Test Validation",
    "Bagaimana temporal lineage reconstruction memecahkan 168 origin?",
  ],
  "/models": [
    "Bandingkan performa Tabular Baseline, CatBoost, dan Directed GNN",
    "Kenapa skor GNN 0.7641 diberi label Internal Research Evaluation?",
    "Apa bobot optimal ensemble GBDT (CatBoost, LightGBM, XGBoost)?",
  ],
  "/features": [
    "Mengapa Climatology Anomaly menjadi fitur terkuat (+4.82% AP)?",
    "Apa perbedaan Water Availability Proxy dengan Official SUI?",
    "Jelaskan 6 keluarga fitur dalam TIRTA",
  ],
  "/alerts": [
    "Jelaskan 10 tipe alert water-stress di TIRTA",
    "Apa tindakan operator saat UPSTREAM_STRESS_PROPAGATION aktif?",
    "Bagaimana kaitan alert dengan inference trace?",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "Berapa skor Public Leaderboard vs Stress-Test Validation?",
  "Kenapa Naive Random CV gagal dan digantikan Stress-Test Validation?",
  "Jelaskan peran Directed Multi-Hop Reachability",
  "Apa perbedaan model CatBoost dengan Directed Reachability GNN?",
];

let messageCounter = 0;
function createMsgId(prefix: string) {
  messageCounter++;
  return `${prefix}-${messageCounter}`;
}

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
        "Halo, saya TIRTA Intelligence Assistant. Saya dapat menjawab pertanyaan seputar prediksi next-month water stress, graf terarah sungai HUC12, validasi stress-test, dan metodologi IFEST DAC 2026.",
      timestamp: "09:00",
    },
  ]);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const currentSuggestions = ROUTE_SUGGESTIONS[pathname] || DEFAULT_SUGGESTIONS;

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const userMsgId = createMsgId("usr");
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: "Now",
    };

    const thinkingId = createMsgId("ast");
    const thinkingMsg: ChatMessage = {
      id: thinkingId,
      role: "assistant",
      content: "Menganalisis metodologi TIRTA & dokumen hidrologi IFEST DAC 2026…",
      timestamp: "Now",
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
            basin_id: selectedStation,
            model_version: MODEL.championVersion,
          },
        }),
      });

      const data: AssistantResponse = await res.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? {
                id: thinkingId,
                role: "assistant",
                content: data.answer,
                timestamp: "Now",
                citations: data.citations,
                actions: data.actions,
                isThinking: false,
              }
            : msg
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? {
                id: thinkingId,
                role: "assistant",
                content: "Maaf, terjadi kendala saat memproses kueri intelijen hidrologi.",
                timestamp: "Now",
                isThinking: false,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="TIRTA Intelligence Assistant" width="w-full max-w-md">
      <div className="flex h-full flex-col">
        {/* Subtitle banner */}
        <div className="border-b border-border bg-surface-1 px-4 py-2.5 text-xs text-fg-muted flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-water" />
            <span className="font-semibold text-fg">TIRTA Knowledge Retrieval</span>
          </div>
          <span className="text-[10px] text-ok border border-ok/30 bg-ok/10 px-1.5 py-0.5 rounded">Grounded Domain AI</span>
        </div>

        {/* Message history */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[92%] rounded-md p-3 border ${isUser ? "bg-surface-2 border-water/40 text-fg" : "bg-surface-0 border-border text-fg-muted"}`}>
                  <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-border-subtle text-[10px] text-fg-subtle">
                    <span className="font-medium text-fg">{isUser ? "You" : "TIRTA Assistant"}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="whitespace-pre-wrap leading-relaxed text-fg text-[11px] font-sans">
                    {msg.content}
                  </div>

                  {/* Grounded citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border-subtle">
                      <button
                        onClick={() =>
                          setExpandedSources((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="flex items-center gap-1 text-[10px] text-fg-subtle hover:text-water transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{msg.citations.length} Grounded Source(s)</span>
                        {expandedSources[msg.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="mt-1.5 space-y-1.5">
                          {msg.citations.map((c, idx) => (
                            <div key={idx} className="p-1.5 rounded bg-surface-1 border border-border-subtle text-[10px]">
                              <div className="font-semibold text-fg flex items-center justify-between">
                                <span>{c.document}</span>
                                <span className="text-water">{(c.relevance * 100).toFixed(0)}% Match</span>
                              </div>
                              <div className="text-fg-subtle text-[9px] mt-0.5">{c.section}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contextual actions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border-subtle flex flex-wrap gap-1.5">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (act.stationId) selectStation(act.stationId);
                            router.push(act.href);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 border border-border text-[10px] text-water transition-colors"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Suggested queries */}
        <div className="border-t border-border bg-surface-1 p-2">
          <div className="text-[10px] text-fg-faint px-1 mb-1 font-mono uppercase">Suggested Research Queries:</div>
          <div className="flex flex-wrap gap-1">
            {currentSuggestions.slice(0, 3).map((s, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(s)}
                className="text-[10px] px-2 py-1 rounded bg-surface-0 border border-border hover:border-water hover:text-water text-fg-subtle transition-colors truncate max-w-full"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-3 border-t border-border bg-surface-0">
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
              placeholder="Ask about water-stress risk, river topology, GBDT/GNN…"
              className="flex-1 bg-surface-1 border border-border rounded px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-water font-mono"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn btn-sm bg-water text-white hover:bg-water-soft disabled:opacity-50 !h-8 px-2.5"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </Drawer>
  );
}
