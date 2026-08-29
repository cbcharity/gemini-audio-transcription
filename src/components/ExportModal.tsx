import React, { useState } from "react";
import { X, Download, Copy, Check, FileJson, FileText, Subtitles, FileCode } from "lucide-react";
import { TranscriptionData, ExportFormat } from "../types";
import {
  exportToSrt,
  exportToVtt,
  exportToMarkdown,
  copyToClipboard,
} from "../utils/audioUtils";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TranscriptionData;
  speakerNames?: Record<string, string>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
  speakerNames = {},
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("srt");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const getContent = (format: ExportFormat): string => {
    const safeSpeakers = Array.isArray(data.speakers) ? data.speakers : [];
    const safeSegments = Array.isArray(data.segments) ? data.segments : [];

    switch (format) {
      case "json":
        return JSON.stringify(
          {
            ...data,
            speakers: safeSpeakers.map((s) => ({
              ...s,
              customName: (speakerNames && speakerNames[s.id]) || s.label,
            })),
          },
          null,
          2
        );
      case "srt":
        return exportToSrt(safeSegments, speakerNames);
      case "vtt":
        return exportToVtt(safeSegments, speakerNames);
      case "md":
        return exportToMarkdown(data, speakerNames);
      case "txt":
      default:
        return safeSegments
          .map((s) => `[${(speakerNames && speakerNames[s.speakerId]) || s.speakerLabel}]: ${s.text}`)
          .join("\n\n");
    }
  };

  const currentContent = getContent(selectedFormat);

  const handleDownload = () => {
    try {
      const blob = new Blob([currentContent], {
        type: selectedFormat === "json" ? "application/json" : "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = (data.fileName || "audio").replace(/\.[^/.]+$/, "");
      a.href = url;
      a.download = `${baseName}_transcript.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Download error:", e);
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black max-w-2xl w-full p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black border-dashed">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-stone-900">
              Export Transcript & Data
            </h3>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Select your format with multi-speaker diarization and word timestamps
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-2 border-black text-stone-900 hover:bg-stone-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="grid grid-cols-5 gap-2 py-4">
          <button
            type="button"
            onClick={() => setSelectedFormat("srt")}
            className={`p-2.5 border-2 border-black text-center transition-all cursor-pointer ${
              selectedFormat === "srt"
                ? "bg-orange-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black"
                : "bg-stone-50 hover:bg-stone-100 text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
            }`}
          >
            <Subtitles className="w-4 h-4 mx-auto mb-1 stroke-[2.5]" />
            <div className="text-xs uppercase">.SRT</div>
            <div className="text-[10px] uppercase opacity-80">Subtitles</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat("vtt")}
            className={`p-2.5 border-2 border-black text-center transition-all cursor-pointer ${
              selectedFormat === "vtt"
                ? "bg-orange-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black"
                : "bg-stone-50 hover:bg-stone-100 text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
            }`}
          >
            <Subtitles className="w-4 h-4 mx-auto mb-1 stroke-[2.5]" />
            <div className="text-xs uppercase">.VTT</div>
            <div className="text-[10px] uppercase opacity-80">WebVTT</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat("json")}
            className={`p-2.5 border-2 border-black text-center transition-all cursor-pointer ${
              selectedFormat === "json"
                ? "bg-orange-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black"
                : "bg-stone-50 hover:bg-stone-100 text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
            }`}
          >
            <FileJson className="w-4 h-4 mx-auto mb-1 stroke-[2.5]" />
            <div className="text-xs uppercase">.JSON</div>
            <div className="text-[10px] uppercase opacity-80">Full Data</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat("md")}
            className={`p-2.5 border-2 border-black text-center transition-all cursor-pointer ${
              selectedFormat === "md"
                ? "bg-orange-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black"
                : "bg-stone-50 hover:bg-stone-100 text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
            }`}
          >
            <FileCode className="w-4 h-4 mx-auto mb-1 stroke-[2.5]" />
            <div className="text-xs uppercase">.MD</div>
            <div className="text-[10px] uppercase opacity-80">Markdown</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat("txt")}
            className={`p-2.5 border-2 border-black text-center transition-all cursor-pointer ${
              selectedFormat === "txt"
                ? "bg-orange-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black"
                : "bg-stone-50 hover:bg-stone-100 text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
            }`}
          >
            <FileText className="w-4 h-4 mx-auto mb-1 stroke-[2.5]" />
            <div className="text-xs uppercase">.TXT</div>
            <div className="text-[10px] uppercase opacity-80">Plain Text</div>
          </button>
        </div>

        {/* Preview box */}
        <div className="flex-1 min-h-[200px] bg-stone-900 text-stone-100 p-4 font-mono text-xs overflow-auto border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] select-all">
          <pre className="whitespace-pre-wrap">{currentContent}</pre>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-black border-dashed">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 text-xs font-black uppercase text-stone-900 bg-white hover:bg-stone-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
            <span>{copied ? "Copied" : "Copy to Clipboard"}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase text-stone-700 hover:text-stone-950 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-6 py-2 text-xs font-black uppercase tracking-tight text-white bg-orange-600 hover:bg-orange-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

