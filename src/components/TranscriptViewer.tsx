import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Users,
  Copy,
  Check,
  Edit2,
  Clock,
  Filter,
  Play,
  Volume2,
  Sparkles,
  AlignLeft,
  ListOrdered,
} from "lucide-react";
import { TranscriptSegment, SpeakerInfo, WordTimestamp } from "../types";
import { formatTime, copyToClipboard } from "../utils/audioUtils";

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  speakers: SpeakerInfo[];
  currentTime: number;
  onSeek: (time: number) => void;
  speakerNames: Record<string, string>;
  onRenameSpeaker: (speakerId: string, newName: string) => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments,
  speakers,
  currentTime,
  onSeek,
  speakerNames = {},
  onRenameSpeaker,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpeakerId, setFilterSpeakerId] = useState<string>("all");
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [viewMode, setViewMode] = useState<"words" | "paragraph">("words");
  const [showWordTimes, setShowWordTimes] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState("");

  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeSpeakers = Array.isArray(speakers) ? speakers : [];

  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active segment if enabled
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && typeof activeSegmentRef.current.scrollIntoView === "function") {
      try {
        activeSegmentRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      } catch (e) {
        console.warn("Scroll error:", e);
      }
    }
  }, [currentTime, autoScroll]);

  const safeSeek = (time: number) => {
    if (typeof onSeek === "function") {
      onSeek(time);
    }
  };

  // Filter segments
  const filteredSegments = safeSegments.filter((seg) => {
    if (!seg) return false;
    const matchesSpeaker = filterSpeakerId === "all" || seg.speakerId === filterSpeakerId;
    const speakerDisplayName = (speakerNames && speakerNames[seg.speakerId]) || seg.speakerLabel || "";
    const segText = seg.text || "";
    const matchesSearch =
      !searchQuery ||
      segText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speakerDisplayName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpeaker && matchesSearch;
  });

  const handleCopySegment = async (segId: string, text: string) => {
    await copyToClipboard(text || "");
    setCopiedSegmentId(segId);
    setTimeout(() => setCopiedSegmentId(null), 2000);
  };

  const handleCopyAll = async () => {
    const fullText = safeSegments
      .map(
        (s) =>
          `[${(speakerNames && speakerNames[s.speakerId]) || s.speakerLabel} (${formatTime(
            Number(s.startTime) || 0
          )})]: ${s.text || ""}`
      )
      .join("\n\n");
    await copyToClipboard(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const startRenameSpeaker = (speakerId: string, currentLabel: string) => {
    setEditingSpeakerId(speakerId);
    setEditNameInput((speakerNames && speakerNames[speakerId]) || currentLabel);
  };

  const saveRenameSpeaker = (speakerId: string) => {
    if (editNameInput.trim() && typeof onRenameSpeaker === "function") {
      onRenameSpeaker(speakerId, editNameInput.trim());
    }
    setEditingSpeakerId(null);
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & View Controls Bento Card */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 stroke-[2.5]" />
          <input
            type="text"
            placeholder="Search dialogue, keywords or speakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-12 py-2 bg-stone-50 border-2 border-black text-xs sm:text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-stone-500 hover:text-stone-900 uppercase"
            >
              Clear
            </button>
          )}
        </div>

        {/* Speaker filter and view switcher */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-stone-100 border-2 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Filter className="w-3.5 h-3.5 text-stone-700 stroke-[2.5]" />
            <select
              value={filterSpeakerId}
              onChange={(e) => setFilterSpeakerId(e.target.value)}
              className="bg-transparent font-black uppercase text-stone-900 focus:outline-none cursor-pointer"
            >
              <option value="all">All Speakers ({safeSpeakers.length})</option>
              {safeSpeakers.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {(speakerNames && speakerNames[sp.id]) || sp.customName || sp.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-stone-100 p-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              type="button"
              onClick={() => setViewMode("words")}
              className={`px-3 py-1 text-xs font-black uppercase tracking-tight flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "words"
                  ? "bg-stone-900 text-white"
                  : "text-stone-700 hover:text-stone-950"
              }`}
              title="Word-level interactive timestamps"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Word Timestamps</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("paragraph")}
              className={`px-3 py-1 text-xs font-black uppercase tracking-tight flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "paragraph"
                  ? "bg-stone-900 text-white"
                  : "text-stone-700 hover:text-stone-950"
              }`}
              title="Paragraph text flow"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paragraph</span>
            </button>
          </div>

          {viewMode === "words" && (
            <button
              type="button"
              onClick={() => setShowWordTimes(!showWordTimes)}
              className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-1.5 transition-all cursor-pointer ${
                showWordTimes ? "bg-stone-900 text-white" : "bg-white text-stone-700"
              }`}
              title="Toggle precise timestamp labels on every word"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{showWordTimes ? "Hide Time Tags" : "Show Time Tags"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-1.5 transition-all cursor-pointer ${
              autoScroll ? "bg-orange-600 text-white" : "bg-white text-stone-700"
            }`}
            title="Automatically scroll to follow playback"
          >
            <span className={`w-2 h-2 rounded-full border border-black ${autoScroll ? "bg-white animate-ping" : "bg-stone-400"}`} />
            <span>{autoScroll ? "Auto-Follow ON" : "Auto-Follow OFF"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className="px-3.5 py-1.5 text-xs font-black uppercase bg-white hover:bg-stone-100 text-stone-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{copiedAll ? "Copied" : "Copy All"}</span>
          </button>
        </div>
      </div>

      {/* Speaker Badges Legend / Inline Rename Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1">
        <span className="text-xs font-black uppercase tracking-tight text-stone-700 mr-1">
          Diarized Speakers:
        </span>
        {safeSpeakers.map((sp) => {
          const isEditing = editingSpeakerId === sp.id;
          const currentDisplayName = (speakerNames && speakerNames[sp.id]) || sp.customName || sp.label;

          return (
            <div
              key={sp.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full border border-black shrink-0" style={{ backgroundColor: sp.color }} />
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editNameInput}
                    autoFocus
                    onChange={(e) => setEditNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRenameSpeaker(sp.id);
                      if (e.key === "Escape") setEditingSpeakerId(null);
                    }}
                    className="w-28 px-1.5 py-0.5 text-xs bg-stone-100 text-stone-900 border border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => saveRenameSpeaker(sp.id)}
                    className="text-stone-900 hover:text-orange-600 font-black px-1"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-stone-900">{currentDisplayName}</span>
                  <button
                    type="button"
                    onClick={() => startRenameSpeaker(sp.id, currentDisplayName)}
                    className="text-stone-400 hover:text-stone-900 transition-colors p-0.5"
                    title="Rename speaker"
                  >
                    <Edit2 className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Segments Bento Card List */}
      <div className="space-y-4">
        {filteredSegments.length === 0 ? (
          <div className="p-8 text-center bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-stone-500 font-mono uppercase text-xs">
            No dialogue matching your filter or search query.
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isSegmentActive = currentTime >= seg.startTime && currentTime <= seg.endTime;
            const speakerObj = safeSpeakers.find((s) => s.id === seg.speakerId) || {
              id: seg.speakerId,
              label: seg.speakerLabel,
              color: "#ea580c",
            };
            const speakerName = (speakerNames && speakerNames[seg.speakerId]) || seg.speakerLabel;

            return (
              <div
                key={seg.id}
                ref={isSegmentActive ? activeSegmentRef : null}
                className={`p-5 sm:p-6 border-2 border-black transition-all duration-150 ${
                  isSegmentActive
                    ? "bg-orange-50/80 shadow-[6px_6px_0px_0px_rgba(234,88,12,1)]"
                    : "bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
                }`}
              >
                {/* Header: Speaker info, timestamps, quick actions */}
                <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b-2 border-black border-dashed">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full border border-black shrink-0"
                      style={{ backgroundColor: speakerObj.color }}
                    />
                    <span
                      className="text-xs sm:text-sm font-black uppercase tracking-tight"
                      style={{ color: speakerObj.color }}
                    >
                      {speakerName}
                    </span>

                    <button
                      type="button"
                      onClick={() => safeSeek(Number(seg.startTime) || 0)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-900 border border-black font-mono text-[11px] font-bold uppercase transition-colors cursor-pointer"
                      title="Seek audio to segment start"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{formatTime(Number(seg.startTime) || 0)}</span>
                      <span>-</span>
                      <span>{formatTime(Number(seg.endTime) || 0)}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopySegment(seg.id, seg.text || "")}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-transparent hover:border-black transition-all cursor-pointer"
                      title="Copy segment text"
                    >
                      {copiedSegmentId === seg.id ? (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Body: Word tokens or paragraph */}
                {viewMode === "words" && Array.isArray(seg.words) && seg.words.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2 gap-y-2 text-sm sm:text-base leading-relaxed text-stone-800">
                    {seg.words.map((wordItem, wIdx) => {
                      const wStart = Number(wordItem.startTime) || 0;
                      const wEnd = Number(wordItem.endTime) || (wStart + 0.1);
                      const isWordActive =
                        currentTime >= wStart &&
                        (currentTime < wEnd || (wIdx === seg.words.length - 1 && currentTime <= Number(seg.endTime) + 0.15));
                      const isWordPast = currentTime >= wEnd;

                      return (
                        <button
                          key={wIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            safeSeek(wStart);
                          }}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-left transition-all cursor-pointer rounded-xs ${
                            isWordActive
                              ? "bg-orange-600 text-white font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105"
                              : isWordPast && isSegmentActive
                              ? "text-stone-950 font-bold bg-orange-100/60"
                              : "text-stone-800 hover:bg-stone-200 hover:text-stone-950 border border-transparent hover:border-black"
                          }`}
                          title={`[${formatTime(wStart)} - ${formatTime(wEnd)}] Click to jump & play`}
                        >
                          <span>{wordItem.word}</span>
                          {showWordTimes && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1 py-0.2 border ${
                                isWordActive
                                  ? "bg-white text-orange-700 border-black"
                                  : "bg-stone-200/80 text-stone-600 border-stone-400"
                              }`}
                            >
                              {formatTime(wStart)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    onClick={() => safeSeek(Number(seg.startTime) || 0)}
                    className="text-sm sm:text-base text-stone-800 leading-relaxed cursor-pointer hover:text-stone-950 italic"
                  >
                    "{seg.text}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

