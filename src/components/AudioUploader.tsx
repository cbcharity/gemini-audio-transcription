import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Mic,
  Square,
  Play,
  Pause,
  Sparkles,
  Users,
  Clock,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileCheck,
  Zap,
  Layers,
} from "lucide-react";
import { fileToBase64, generateCalibratedDemo } from "../utils/audioUtils";
import { TranscriptionData } from "../types";

interface AudioUploaderProps {
  onStartTranscription: (params: {
    audioBase64: string;
    mimeType: string;
    fileName: string;
    fileSize: number;
    audioBlobUrl: string;
    maxSpeakers: number;
    audioDurationSeconds?: number;
    preloadData?: TranscriptionData;
  }) => Promise<void>;
  isLoading: boolean;
  loadingStep: string;
  externalError?: string | null;
}

const measureAudioDuration = async (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      resolve(dur && !isNaN(dur) && isFinite(dur) ? dur : 0);
    };
    audio.onerror = () => resolve(0);
    audio.src = url;
  });
};

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onStartTranscription,
  isLoading,
  loadingStep,
  externalError,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [maxSpeakers, setMaxSpeakers] = useState<number>(3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i)) {
      setErrorMsg("Please select a valid audio file (MP3, WAV, M4A, WEBM, OGG, AAC, or FLAC).");
      return;
    }
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setAudioUrl(url);
    setRecordingBlob(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Recording Handlers
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        setErrorMsg("Microphone access is not supported in this browser environment.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setSelectedFile(null);
        try {
          if (stream && typeof stream.getTracks === "function") {
            stream.getTracks().forEach((track) => {
              if (track && typeof track.stop === "function") {
                track.stop();
              }
            });
          }
        } catch (e) {
          console.warn("Track cleanup error:", e);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic access error:", err);
      setErrorMsg("Microphone permission denied or unavailable. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleProcessSubmit = async () => {
    try {
      setErrorMsg(null);
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        const duration = await measureAudioDuration(audioUrl || "");
        await onStartTranscription({
          audioBase64: base64,
          mimeType: selectedFile.type || "audio/mp3",
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          audioBlobUrl: audioUrl || "",
          maxSpeakers,
          audioDurationSeconds: duration,
        });
      } else if (recordingBlob) {
        const base64 = await fileToBase64(recordingBlob);
        const duration = recordingSeconds > 0 ? recordingSeconds : await measureAudioDuration(audioUrl || "");
        await onStartTranscription({
          audioBase64: base64,
          mimeType: recordingBlob.type || "audio/webm",
          fileName: `Voice_Recording_${new Date().toISOString().substring(0, 19).replace(/[:T]/g, "-")}.webm`,
          fileSize: recordingBlob.size,
          audioBlobUrl: audioUrl || "",
          maxSpeakers,
          audioDurationSeconds: duration,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process audio.");
    }
  };

  // Pre-configured Sample Demonstrations
  const loadDemoSample = async (type: "meeting" | "interview" | "standup") => {
    try {
      setErrorMsg(null);
      const { blob, base64, data } = generateCalibratedDemo(type);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setSelectedFile(null);
      setRecordingBlob(blob);

      await onStartTranscription({
        audioBase64: base64,
        mimeType: "audio/wav",
        fileName: data.fileName,
        fileSize: blob.size,
        audioBlobUrl: url,
        maxSpeakers: data.speakers.length,
        preloadData: data,
      });
    } catch (err: any) {
      setErrorMsg("Failed to generate demo sample: " + err.message);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Bento Grid Header / Feature Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Bento Hero Card */}
        <div className="md:col-span-8 bg-white border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-orange-600 text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-1 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Gemini 3.5 Transcribe
              </span>
              <span className="bg-stone-200 text-stone-900 text-[11px] font-mono font-bold uppercase px-2.5 py-1 border border-black">
                Interactions API
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-stone-900 leading-none mb-3">
              Speech-to-Text <span className="text-orange-600">& Diarization</span>
            </h2>

            <p className="text-sm sm:text-base text-stone-700 font-medium leading-relaxed max-w-2xl">
              Process audio recordings up to 1 hour in a single call. Gemini automatically identifies distinct speaker turns (up to 3 speakers), word-level millisecond timestamps, and extracts key action items.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-black border-dashed grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-stone-500 font-black uppercase">Max Length</p>
              <p className="text-lg sm:text-xl font-mono font-black text-stone-900">1 Hour</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-black uppercase">Diarization</p>
              <p className="text-lg sm:text-xl font-mono font-black text-orange-600">3 Speakers</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-black uppercase">Timestamps</p>
              <p className="text-lg sm:text-xl font-mono font-black text-stone-900">Word-Level</p>
            </div>
          </div>
        </div>

        {/* Side Bento Hero Stat Card */}
        <div className="md:col-span-4 bg-black text-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(234,88,12,1)] border-2 border-black flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase bg-orange-600 text-white px-2 py-0.5 font-bold">
                API ARCHITECTURE
              </span>
              <Radio className="w-4 h-4 text-orange-500 animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">
              Deep Speech Analysis
            </h3>
            <p className="text-xs text-stone-400 font-medium leading-relaxed">
              Powered by native audio understanding with timestamp alignment and semantic summarization.
            </p>
          </div>

          <div className="mt-6 border-2 border-stone-700 bg-stone-900/90 p-4">
            <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Model Target</p>
            <p className="text-sm font-mono font-bold text-orange-400">gemini-3.5-transcribe</p>
          </div>
        </div>
      </div>

      {/* Main Upload & Recording Bento Section */}
      <div className="bg-white border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {(errorMsg || externalError) && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-red-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5 stroke-[2.5]" />
            <div>
              <p className="font-black uppercase text-xs">Transcription Notice</p>
              <p className="text-xs font-medium mt-0.5">{errorMsg || externalError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dropzone Bento Card */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-black p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
              dragOver
                ? "bg-orange-50 translate-x-[2px] translate-y-[2px]"
                : selectedFile
                ? "bg-orange-50/60 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-stone-50 hover:bg-stone-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="w-14 h-14 bg-orange-100 border-2 border-black flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <UploadCloud className="w-7 h-7 text-orange-600 stroke-[2.5]" />
            </div>
            <p className="text-base font-black uppercase text-stone-900">
              {selectedFile ? selectedFile.name : "Select or Drag Audio File"}
            </p>
            <p className="text-xs text-stone-500 font-mono uppercase mt-1">
              MP3, WAV, M4A, WEBM, FLAC (UP TO 1 HOUR)
            </p>
          </div>

          {/* Voice Recorder Bento Card */}
          <div className="border-2 border-black bg-stone-50 p-6 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-14 h-14 bg-stone-200 border-2 border-black flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Mic className="w-7 h-7 text-stone-900 stroke-[2.5]" />
            </div>
            <p className="text-base font-black uppercase text-stone-900">
              Live Mic Recorder
            </p>
            <p className="text-xs text-stone-500 font-mono uppercase mt-1 mb-4">
              Capture meeting dialogue or voice memo
            </p>

            {isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border-2 border-black text-red-900 text-xs font-mono font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                  <span className="w-2.5 h-2.5 bg-red-600 border border-black rounded-full" />
                  REC: {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:
                  {(recordingSeconds % 60).toString().padStart(2, "0")}
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white border-2 border-black text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  Stop Recording
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white border-2 border-black text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-2 cursor-pointer transition-all"
              >
                <Mic className="w-4 h-4 text-orange-400 stroke-[2.5]" />
                Start Recording
              </button>
            )}
          </div>
        </div>

        {/* Selected Audio Preview */}
        {(selectedFile || recordingBlob) && (
          <div className="mt-6 p-4 bg-stone-100 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-orange-600 border-2 border-black text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <FileAudio className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black uppercase text-stone-900 truncate">
                  {selectedFile ? selectedFile.name : "Voice Recording (Ready to Transcribe)"}
                </p>
                <p className="text-xs font-mono text-stone-500 font-bold uppercase">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • READY`
                    : recordingBlob
                    ? `${(recordingBlob.size / 1024).toFixed(1)} KB • MIC CAPTURE`
                    : ""}
                </p>
              </div>
            </div>

            {audioUrl && (
              <div className="w-full sm:w-auto">
                <audio controls src={audioUrl} className="h-10 w-full sm:w-64" />
              </div>
            )}
          </div>
        )}

        {/* Diarization Settings & Launch Button */}
        <div className="mt-6 pt-6 border-t-2 border-black border-dashed flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-black uppercase tracking-tight text-stone-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange-600 stroke-[2.5]" />
              Diarization Speakers:
            </label>
            <select
              value={maxSpeakers}
              onChange={(e) => setMaxSpeakers(Number(e.target.value))}
              className="text-xs bg-stone-100 border-2 border-black px-3 py-2 font-black uppercase text-stone-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <option value={1}>1 Speaker (Monologue / Memo)</option>
              <option value={2}>2 Speakers (Interview / 1-on-1)</option>
              <option value={3}>3 Speakers (Multi-Speaker Sync)</option>
            </select>
          </div>

          <button
            type="button"
            disabled={(!selectedFile && !recordingBlob) || isLoading}
            onClick={handleProcessSubmit}
            className={`px-8 py-3 border-2 border-black text-sm font-black uppercase tracking-tight flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              selectedFile || recordingBlob
                ? "bg-orange-600 hover:bg-orange-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                : "bg-stone-200 text-stone-400 cursor-not-allowed border-stone-400"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Processing with Gemini 3.5...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Transcribe & Diarize Audio</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Progress State */}
        {isLoading && (
          <div className="mt-6 p-6 bg-black text-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(234,88,12,1)] space-y-4">
            <div className="flex items-center justify-between text-xs font-mono uppercase">
              <span className="flex items-center gap-2 font-bold text-orange-500">
                <Radio className="w-4 h-4 animate-pulse" />
                Gemini Interactions API Executing
              </span>
              <span className="text-stone-400">gemini-3.5-transcribe</span>
            </div>
            <div className="w-full bg-stone-900 border border-stone-700 h-3 overflow-hidden">
              <div className="bg-orange-600 h-full animate-pulse w-3/4" />
            </div>
            <p className="text-sm font-bold font-mono text-stone-200 uppercase">
              {loadingStep || "Processing audio with multi-speaker diarization and word timestamps..."}
            </p>
          </div>
        )}
      </div>

      {/* Instant Demo Audio Selector Bento Section */}
      <div className="bg-stone-50 border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-4">
          <h3 className="text-lg font-black uppercase tracking-tight text-stone-900">
            Or Test Immediately with Demo Samples
          </h3>
          <p className="text-xs font-medium text-stone-500 mt-0.5">
            Click any test recording below with multi-speaker conversation to test diarization instantly
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => loadDemoSample("meeting")}
            className="p-4 text-left bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase text-stone-900 group-hover:text-orange-600">
                Product Strategy Sync
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-orange-100 text-orange-800 border border-black">
                3 Speakers
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium leading-normal line-clamp-2">
              Cross-functional sync on quarterly targets, user acquisition lag, and beta testing.
            </p>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => loadDemoSample("interview")}
            className="p-4 text-left bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase text-stone-900 group-hover:text-blue-600">
                System Design Interview
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-black">
                2 Speakers
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium leading-normal line-clamp-2">
              Distributed consensus, caching layers, and latency trade-offs discussion.
            </p>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => loadDemoSample("standup")}
            className="p-4 text-left bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase text-stone-900 group-hover:text-purple-600">
                Sprint Standup Sync
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-black">
                Multi-Turn
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium leading-normal line-clamp-2">
              Rapid status updates on blocker resolutions, API handshakes, and deployment.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

