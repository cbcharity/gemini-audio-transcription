import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  User,
} from "lucide-react";
import { formatTime } from "../utils/audioUtils";
import { SpeakerInfo } from "../types";

interface AudioPlayerProps {
  audioUrl?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  activeSpeaker?: SpeakerInfo;
  speakerNames: Record<string, string>;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  activeSpeaker,
  speakerNames = {},
}) => {
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(0);

  const progressBarRef = useRef<HTMLDivElement>(null);

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    if (typeof onSeek === "function") {
      onSeek(targetTime);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIndex];
    setPlaybackRate(nextRate);
    const audioEl = document.getElementById("main-audio-element") as HTMLAudioElement;
    if (audioEl) audioEl.playbackRate = nextRate;
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const audioEl = document.getElementById("main-audio-element") as HTMLAudioElement;
    if (audioEl) audioEl.muted = nextMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    const audioEl = document.getElementById("main-audio-element") as HTMLAudioElement;
    if (audioEl) {
      audioEl.volume = newVol;
      audioEl.muted = newVol === 0;
    }
  };

  const skipTime = (offset: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + offset));
    if (typeof onSeek === "function") {
      onSeek(newTime);
    }
  };

  const displayName = activeSpeaker
    ? (speakerNames && speakerNames[activeSpeaker.id]) || activeSpeaker.customName || activeSpeaker.label
    : null;

  return (
    <div className="bg-stone-900 text-white border-2 border-black p-4 sm:p-5 shadow-[6px_6px_0px_0px_rgba(234,88,12,1)] transition-all sticky bottom-4 z-20">
      <div className="flex flex-col gap-3">
        {/* Progress scrub bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="group relative w-full h-3 bg-stone-800 border-2 border-black cursor-pointer overflow-hidden flex items-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        >
          <div
            className="h-full bg-orange-600 border-r border-black transition-all duration-75 relative group-hover:bg-orange-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Active speaker & timestamps */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {displayName && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 text-xs font-mono font-bold uppercase text-stone-200 border border-stone-600 truncate shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black shrink-0"
                  style={{ backgroundColor: activeSpeaker?.color || "#ea580c" }}
                />
                <span className="truncate max-w-[100px] sm:max-w-[150px]">{displayName}</span>
              </div>
            )}
            <div className="text-xs font-mono text-stone-400 shrink-0 font-bold">
              <span className="text-white">{formatTime(displayTime)}</span>
              <span className="text-stone-600 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Center: Playback buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => skipTime(-5)}
              className="p-2 bg-stone-800 text-stone-300 hover:text-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
              title="Rewind 5s"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              className="w-11 h-11 bg-orange-600 hover:bg-orange-500 text-white border-2 border-black flex items-center justify-center transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:scale-95 cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white stroke-[2.5]" /> : <Play className="w-5 h-5 ml-0.5 fill-white stroke-[2.5]" />}
            </button>

            <button
              type="button"
              onClick={() => skipTime(5)}
              className="p-2 bg-stone-800 text-stone-300 hover:text-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
              title="Forward 5s"
            >
              <RotateCw className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Right: Speed & Volume */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSpeedChange}
              className="px-2.5 py-1 text-xs font-mono font-bold uppercase bg-stone-800 hover:bg-stone-700 text-stone-200 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1 cursor-pointer"
              title="Change playback speed"
            >
              <Gauge className="w-3.5 h-3.5 text-orange-400 stroke-[2.5]" />
              <span>{playbackRate}x</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400 stroke-[2.5]" />
                ) : (
                  <Volume2 className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-stone-700 appearance-none cursor-pointer accent-orange-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

