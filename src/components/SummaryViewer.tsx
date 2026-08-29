import React, { useState } from "react";
import {
  Sparkles,
  CheckSquare,
  Square,
  List,
  Tag,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  User,
  Clock,
  MessageSquare,
  PieChart,
} from "lucide-react";
import { SummaryResult, SpeakerInfo, TranscriptSegment } from "../types";
import { formatTime, copyToClipboard } from "../utils/audioUtils";

interface SummaryViewerProps {
  summary: SummaryResult;
  speakers: SpeakerInfo[];
  segments: TranscriptSegment[];
  speakerNames: Record<string, string>;
  fullTranscript: string;
  onRefreshSummary: (focus: string) => Promise<void>;
  isRefreshing: boolean;
}

export const SummaryViewer: React.FC<SummaryViewerProps> = ({
  summary,
  speakers,
  segments,
  speakerNames = {},
  fullTranscript = "",
  onRefreshSummary,
  isRefreshing,
}) => {
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<string>("general");

  const safeSpeakers = Array.isArray(speakers) ? speakers : [];
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeSummary: SummaryResult = summary || {
    executiveSummary: "Transcription completed.",
    keyPoints: [],
    actionItems: [],
    topics: [],
    sentiment: "Neutral",
    speakerInsights: [],
  };

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const copyText = async (section: string, text: string) => {
    await copyToClipboard(text || "");
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Compute speaker statistics (speaking duration & words)
  const speakerStats = safeSpeakers.map((sp) => {
    let duration = 0;
    let wordCount = 0;
    safeSegments.forEach((seg) => {
      if (seg && seg.speakerId === sp.id) {
        duration += Math.max(0, (Number(seg.endTime) || 0) - (Number(seg.startTime) || 0));
        wordCount += Array.isArray(seg.words)
          ? seg.words.length
          : typeof seg.text === "string"
          ? seg.text.split(/\s+/).filter(Boolean).length
          : 0;
      }
    });
    return {
      ...sp,
      duration,
      wordCount,
    };
  });

  const totalDuration = speakerStats.reduce((acc, curr) => acc + curr.duration, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Executive Summary Bento Card */}
      <div className="bg-orange-50 border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 border-black border-dashed">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-orange-600 border border-black text-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="text-lg sm:text-xl font-black uppercase tracking-tight text-stone-900">
              Executive Overview
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyText("exec", safeSummary.executiveSummary || "")}
            className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-900 border-2 border-black font-black text-xs uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy summary"
          >
            {copiedSection === "exec" ? (
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            ) : (
              <Copy className="w-4 h-4 stroke-[2.5]" />
            )}
            <span className="hidden sm:inline">Copy Brief</span>
          </button>
        </div>
        <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-medium">
          {safeSummary.executiveSummary || "Summary generated successfully based on dialogue context."}
        </p>

        {Array.isArray(safeSummary.topics) && safeSummary.topics.length > 0 && (
          <div className="mt-5 pt-4 border-t-2 border-black border-dashed flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-stone-700 mr-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-orange-600 stroke-[2.5]" />
              Tags:
            </span>
            {safeSummary.topics.map((t, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 bg-white border border-black text-stone-900 font-mono text-[11px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                #{t}
              </span>
            ))}
            {safeSummary.sentiment && (
              <span className="ml-auto text-xs text-stone-600 font-black uppercase">
                Tone: <span className="text-orange-600">{safeSummary.sentiment}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid: Key Points & Action Items Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Points */}
        <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black border-dashed">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-stone-900 text-white flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <List className="w-4 h-4 text-orange-400 stroke-[2.5]" />
                </div>
                <span className="text-base font-black uppercase tracking-tight text-stone-900">
                  Key Discussion Takeaways
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    "keyPoints",
                    Array.isArray(safeSummary.keyPoints)
                      ? safeSummary.keyPoints.map((k) => `• ${k}`).join("\n")
                      : ""
                  )
                }
                className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-transparent hover:border-black transition-all"
                title="Copy key points"
              >
                {copiedSection === "keyPoints" ? (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                ) : (
                  <Copy className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>

            <ul className="space-y-3">
              {Array.isArray(safeSummary.keyPoints) && safeSummary.keyPoints.length > 0 ? (
                safeSummary.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
                    <span className="w-5 h-5 bg-stone-100 border border-black font-mono font-bold text-stone-900 text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {idx + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs font-mono uppercase text-stone-500">No specific key points identified.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black border-dashed">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-600 text-white flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-base font-black uppercase tracking-tight text-stone-900">
                  Action Items & Deliverables
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    "actionItems",
                    Array.isArray(safeSummary.actionItems)
                      ? safeSummary.actionItems
                          .map((a) => `[ ] ${a.task || ""} (Owner: ${a.owner || "Unassigned"})`)
                          .join("\n")
                      : ""
                  )
                }
                className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-transparent hover:border-black transition-all"
                title="Copy action items"
              >
                {copiedSection === "actionItems" ? (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                ) : (
                  <Copy className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>

            <div className="space-y-2.5">
              {Array.isArray(safeSummary.actionItems) && safeSummary.actionItems.length > 0 ? (
                safeSummary.actionItems.map((item, idx) => {
                  const isDone = Boolean(completedTasks[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(idx)}
                      className={`p-3 border-2 border-black flex items-start gap-3 cursor-pointer transition-all ${
                        isDone
                          ? "bg-stone-100 opacity-60 line-through shadow-none"
                          : "bg-stone-50 hover:bg-orange-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-stone-900 hover:text-orange-600">
                        {isDone ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <Square className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                          {item.task}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
                          {item.owner && (
                            <span className="inline-flex items-center gap-1 font-bold text-stone-800 bg-stone-200 px-1.5 py-0.5 border border-black uppercase text-[10px]">
                              <User className="w-3 h-3 text-stone-600" />
                              {item.owner}
                            </span>
                          )}
                          {item.priority && (
                            <span
                              className={`px-1.5 py-0.5 border border-black text-[10px] uppercase font-black ${
                                item.priority === "high"
                                  ? "bg-red-100 text-red-900"
                                  : item.priority === "medium"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-stone-200 text-stone-800"
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs font-mono uppercase text-stone-500 py-3">No explicit action items assigned.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Speaker Talk Time & Insights Bento Card */}
      <div className="bg-white border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black border-dashed">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-900 text-white flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <PieChart className="w-4 h-4 text-orange-400 stroke-[2.5]" />
            </div>
            <span className="text-base font-black uppercase tracking-tight text-stone-900">
              Speaker Participation & Talk Time
            </span>
          </div>
          <span className="text-xs font-mono font-bold uppercase text-stone-500">
            {safeSpeakers.length} Identified Speaker{safeSpeakers.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Multi-segmented talk time bar */}
        <div className="h-5 w-full bg-stone-100 border-2 border-black overflow-hidden flex shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {speakerStats.map((sp) => {
            const pct = Math.max(5, (sp.duration / totalDuration) * 100);
            return (
              <div
                key={sp.id}
                style={{ width: `${pct}%`, backgroundColor: sp.color }}
                className="h-full border-r border-black last:border-r-0 transition-all relative group"
                title={`${(speakerNames && speakerNames[sp.id]) || sp.label}: ${Math.round(pct)}%`}
              />
            );
          })}
        </div>

        {/* Speaker detail cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {speakerStats.map((sp) => {
            const pct = Math.round((sp.duration / totalDuration) * 100);
            const insight = Array.isArray(safeSummary.speakerInsights)
              ? safeSummary.speakerInsights.find(
                  (si) =>
                    si &&
                    typeof si.speakerLabel === "string" &&
                    typeof sp.label === "string" &&
                    si.speakerLabel.toLowerCase() === sp.label.toLowerCase()
                )
              : undefined;

            return (
              <div
                key={sp.id}
                className="p-3.5 bg-stone-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full border border-black shrink-0" style={{ backgroundColor: sp.color }} />
                    <span className="text-xs font-black uppercase text-stone-900 truncate">
                      {(speakerNames && speakerNames[sp.id]) || sp.customName || sp.label}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-stone-900">{pct}%</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-stone-500 font-bold uppercase">
                  <span>{formatTime(sp.duration)} spoken</span>
                  <span>•</span>
                  <span>{sp.wordCount} words</span>
                </div>

                {insight?.contributionSummary && (
                  <p className="text-[11px] text-stone-700 pt-1 border-t border-black/20 font-medium line-clamp-2">
                    {insight.contributionSummary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Refine / Regenerate Summary Bento Bar */}
      <div className="bg-stone-50 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black uppercase text-stone-900">Perspective Focus:</label>
          <select
            value={focusMode}
            onChange={(e) => setFocusMode(e.target.value)}
            className="text-xs bg-white border-2 border-black px-3 py-1.5 font-black uppercase text-stone-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <option value="general">Executive Overview</option>
            <option value="actions">Action Items & Deliverables</option>
            <option value="technical">Technical Decisions & Architecture</option>
            <option value="brief">Rapid 30-Second Brief</option>
          </select>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={() => {
            if (typeof onRefreshSummary === "function") {
              onRefreshSummary(focusMode);
            }
          }}
          className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white border-2 border-black text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isRefreshing ? (
            <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-white rounded-full animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5 text-orange-400 stroke-[2.5]" />
          )}
          <span>Regenerate Perspective</span>
        </button>
      </div>
    </div>
  );
};

