import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { AudioUploader } from "./components/AudioUploader";
import { AudioPlayer } from "./components/AudioPlayer";
import { TranscriptViewer } from "./components/TranscriptViewer";
import { SummaryViewer } from "./components/SummaryViewer";
import { ExportModal } from "./components/ExportModal";
import { TranscriptionData, SpeakerInfo } from "./types";
import {
  FileText,
  Sparkles,
  CheckCircle,
  Clock,
  Users,
  Layers,
  Radio,
  FileAudio,
} from "lucide-react";
import { formatTime } from "./utils/audioUtils";

export default function App() {
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("transcript");
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [isRefreshingSummary, setIsRefreshingSummary] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStartTranscription = async (params: {
    audioBase64: string;
    mimeType: string;
    fileName: string;
    fileSize: number;
    audioBlobUrl: string;
    maxSpeakers: number;
    audioDurationSeconds?: number;
    preloadData?: TranscriptionData;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep("Uploading audio to Gemini 3.5 Transcribe engine...");

    try {
      setAudioUrl(params.audioBlobUrl);

      let result: TranscriptionData;
      if (params.preloadData) {
        setLoadingStep("Loading diarized speech and calibrated timestamps...");
        result = params.preloadData;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        setLoadingStep("Diarizing speakers and generating word-level timestamps with Gemini...");
        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: params.audioBase64,
            mimeType: params.mimeType,
            fileName: params.fileName,
            maxSpeakers: params.maxSpeakers,
            audioDurationSeconds: params.audioDurationSeconds,
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `Transcription failed with status ${response.status}`);
        }

        setLoadingStep("Finalizing transcript and computing alignment...");
        result = await response.json();
      }

      if (!result || !result.segments || result.segments.length === 0) {
        throw new Error("No speech segments were detected in this audio file. Please try another recording with clearer speech.");
      }

      setData(result);
      setDuration(result.durationSeconds || 60);

      // Initialize speaker custom names
      const initialNames: Record<string, string> = {};
      result.speakers.forEach((s) => {
        initialNames[s.id] = s.customName || s.label;
      });
      setSpeakerNames(initialNames);
    } catch (err: any) {
      console.error("Transcription error:", err);
      setErrorMessage(err.message || "Failed to transcribe audio. Please check your audio file format or try again.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // High-precision 60fps audio position synchronization for smooth word timestamps
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    let animId: number;
    const syncAudioTime = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        animId = requestAnimationFrame(syncAudioTime);
      }
    };

    animId = requestAnimationFrame(syncAudioTime);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  const handleSeek = (time: number, autoPlay: boolean = true) => {
    const validTime = Math.max(0, Number(time) || 0);
    setCurrentTime(validTime);
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = validTime;
      } catch (e) {
        console.warn("Seek error:", e);
      }
      if (autoPlay && audioRef.current.paused) {
        try {
          const playPromise = audioRef.current.play();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise.catch((err) => {
              console.log("Audio autoplay prevented or error:", err);
            });
          }
        } catch (err) {
          console.log("Audio play exception:", err);
        }
      }
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        try {
          audioRef.current.pause();
        } catch (err) {
          console.log("Audio pause error:", err);
        }
      } else {
        try {
          const playPromise = audioRef.current.play();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise.catch((err) => {
              console.log("Audio play error:", err);
            });
          }
        } catch (err) {
          console.log("Audio play exception:", err);
        }
      }
    }
  };

  const handleRenameSpeaker = (speakerId: string, newName: string) => {
    setSpeakerNames((prev) => ({ ...prev, [speakerId]: newName }));
  };

  const handleRefreshSummary = async (focus: string) => {
    if (!data) return;
    setIsRefreshingSummary(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: data.fullTranscript || data.segments.map((s) => `${s.speakerLabel}: ${s.text}`).join("\n"),
          focus,
        }),
      });
      if (!response.ok) throw new Error("Failed to regenerate summary.");
      const resJson = await response.json();
      if (resJson.summary) {
        setData((prev) => (prev ? { ...prev, summary: resJson.summary } : null));
      }
    } catch (err: any) {
      alert("Summary refresh error: " + err.message);
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  // Find active speaker based on current timestamp
  const activeSegment = data?.segments.find(
    (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
  );
  const activeSpeaker = activeSegment
    ? data?.speakers.find((s) => s.id === activeSegment.speakerId)
    : undefined;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-orange-600 selection:text-white">
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          id="main-audio-element"
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onDurationChange={(e) => {
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (audioRef.current) {
              setCurrentTime(audioRef.current.duration || 0);
            }
          }}
        />
      )}

      {/* Header */}
      <Header
        onNewTranscription={() => {
          setData(null);
          setAudioUrl(null);
          setCurrentTime(0);
          setIsPlaying(false);
        }}
        onOpenExport={() => setShowExportModal(true)}
        hasData={Boolean(data)}
        fileName={data?.fileName}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!data ? (
          <AudioUploader
            onStartTranscription={handleStartTranscription}
            isLoading={isLoading}
            loadingStep={loadingStep}
            externalError={errorMessage}
          />
        ) : (
          <div className="space-y-6">
            {/* Audio Metadata Summary Header Bento Bar */}
            <div className="bg-white border-2 border-black p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-orange-600 text-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <FileAudio className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-stone-900 truncate">
                    {data.fileName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono font-bold text-stone-600 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-700 stroke-[2.5]" />
                      {formatTime(duration || data.durationSeconds)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-700 stroke-[2.5]" />
                      {data.speakers.length} Speaker{data.speakers.length > 1 ? "s" : ""} Diarized
                    </span>
                    <span>•</span>
                    <span className="uppercase text-stone-900 bg-stone-200 border border-black px-1.5 py-0.5 text-[10px]">
                      {data.language}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-stone-100 p-1 border-2 border-black shrink-0 self-start sm:self-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <button
                  type="button"
                  onClick={() => setActiveTab("transcript")}
                  className={`px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "transcript"
                      ? "bg-white text-stone-900 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <FileText className="w-4 h-4 text-orange-600 stroke-[2.5]" />
                  <span>Diarized Transcript</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "summary"
                      ? "bg-white text-stone-900 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-orange-600 stroke-[2.5]" />
                  <span>Executive Insights</span>
                </button>
              </div>
            </div>

            {/* Tab Views */}
            {activeTab === "transcript" ? (
              <TranscriptViewer
                segments={data.segments}
                speakers={data.speakers}
                currentTime={currentTime}
                onSeek={handleSeek}
                speakerNames={speakerNames}
                onRenameSpeaker={handleRenameSpeaker}
              />
            ) : (
              <SummaryViewer
                summary={data.summary}
                speakers={data.speakers}
                segments={data.segments}
                speakerNames={speakerNames}
                fullTranscript={data.fullTranscript}
                onRefreshSummary={handleRefreshSummary}
                isRefreshing={isRefreshingSummary}
              />
            )}

            {/* Sticky Audio Control Bar */}
            <AudioPlayer
              audioUrl={audioUrl || undefined}
              currentTime={currentTime}
              duration={duration || data.durationSeconds}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              activeSpeaker={activeSpeaker}
              speakerNames={speakerNames}
            />
          </div>
        )}
      </main>

      {/* Export Modal */}
      {data && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={data}
          speakerNames={speakerNames}
        />
      )}
    </div>
  );
}
