import React from "react";
import { Mic, Sparkles, AudioWaveform, FileText, Download, RotateCcw, Radio } from "lucide-react";

interface HeaderProps {
  onNewTranscription: () => void;
  onOpenExport?: () => void;
  hasData: boolean;
  fileName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNewTranscription,
  onOpenExport,
  hasData,
  fileName,
}) => {
  return (
    <header className="border-b-2 border-black bg-stone-100 sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-orange-600 border-2 border-black flex items-center justify-center text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <AudioWaveform className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-stone-900 uppercase">
                Vocalize<span className="text-orange-600">.AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase bg-stone-200 text-stone-900 border border-black">
                <Radio className="w-3 h-3 text-orange-600 animate-pulse" />
                Gemini 3.5 Transcribe
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium hidden sm:block">
              Multi-Speaker Diarization • Word Timestamps • Interactions API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasData && (
            <>
              <button
                type="button"
                onClick={onOpenExport}
                className="bg-white text-stone-900 border-2 border-black px-4 sm:px-6 py-2 text-xs sm:text-sm font-black uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                title="Export transcript & subtitles"
              >
                <Download className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={onNewTranscription}
                className="bg-orange-600 hover:bg-orange-500 text-white border-2 border-black px-4 sm:px-6 py-2 text-xs sm:text-sm font-black uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">New Upload</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

