import { TranscriptionData, TranscriptSegment, SpeakerInfo, SummaryResult } from "../types";

export function formatTime(seconds: number): string {
  const s = Number(seconds);
  if (isNaN(s) || s < 0 || !isFinite(s)) return "00:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, "0")}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimestampSrt(seconds: number): string {
  const s = Number(seconds);
  const validSec = isNaN(s) || s < 0 || !isFinite(s) ? 0 : s;
  const hrs = Math.floor(validSec / 3600);
  const mins = Math.floor((validSec % 3600) / 60);
  const secs = Math.floor(validSec % 60);
  const ms = Math.floor((validSec % 1) * 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

export function formatTimestampVtt(seconds: number): string {
  const s = Number(seconds);
  const validSec = isNaN(s) || s < 0 || !isFinite(s) ? 0 : s;
  const hrs = Math.floor(validSec / 3600);
  const mins = Math.floor((validSec % 3600) / 60);
  const secs = Math.floor(validSec % 60);
  const ms = Math.floor((validSec % 1) * 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export function exportToSrt(segments: TranscriptSegment[] = [], speakerNames: Record<string, string> = {}): string {
  if (!Array.isArray(segments)) return "";
  return segments
    .map((seg, idx) => {
      const speaker = (speakerNames && speakerNames[seg.speakerId]) || seg.speakerLabel || `Speaker ${idx + 1}`;
      const start = formatTimestampSrt(Number(seg.startTime) || 0);
      const end = formatTimestampSrt(Number(seg.endTime) || 0);
      return `${idx + 1}\n${start} --> ${end}\n[${speaker}]: ${seg.text || ""}\n`;
    })
    .join("\n");
}

export function exportToVtt(segments: TranscriptSegment[] = [], speakerNames: Record<string, string> = {}): string {
  if (!Array.isArray(segments)) return "WEBVTT - Gemini 3.5 Audio Transcriber Export\n\n";
  const cues = segments
    .map((seg, idx) => {
      const speaker = (speakerNames && speakerNames[seg.speakerId]) || seg.speakerLabel || `Speaker ${idx + 1}`;
      const start = formatTimestampVtt(Number(seg.startTime) || 0);
      const end = formatTimestampVtt(Number(seg.endTime) || 0);
      return `${start} --> ${end}\n<v ${speaker}>${seg.text || ""}</v>\n`;
    })
    .join("\n");
  return `WEBVTT - Gemini 3.5 Audio Transcriber Export\n\n${cues}`;
}

export function exportToMarkdown(data: TranscriptionData, speakerNames: Record<string, string> = {}): string {
  if (!data) return "";
  const summary = data.summary;
  let md = `# Audio Transcription & Meeting Summary\n\n`;
  md += `**File Name:** ${data.fileName || "audio_recording"}\n`;
  md += `**Date:** ${data.createdAt ? new Date(data.createdAt).toLocaleString() : new Date().toLocaleString()}\n`;
  md += `**Duration:** ${formatTime(data.durationSeconds || 0)}\n`;
  md += `**Language:** ${(data.language || "en").toUpperCase()}\n\n`;

  if (summary) {
    if (summary.executiveSummary) {
      md += `## Executive Summary\n${summary.executiveSummary}\n\n`;
    }

    if (Array.isArray(summary.keyPoints) && summary.keyPoints.length > 0) {
      md += `## Key Discussion Points\n`;
      summary.keyPoints.forEach((kp) => {
        md += `- ${kp}\n`;
      });
      md += `\n`;
    }

    if (Array.isArray(summary.actionItems) && summary.actionItems.length > 0) {
      md += `## Action Items\n`;
      summary.actionItems.forEach((ai) => {
        md += `- [ ] **${ai.task || ""}** (Owner: ${ai.owner || "Unassigned"}, Priority: ${ai.priority || "medium"})\n`;
      });
      md += `\n`;
    }
  }

  md += `## Diarized Transcript\n\n`;
  if (Array.isArray(data.segments)) {
    data.segments.forEach((seg, idx) => {
      const speaker = (speakerNames && speakerNames[seg.speakerId]) || seg.speakerLabel || `Speaker ${idx + 1}`;
      md += `### ${speaker} (${formatTime(Number(seg.startTime) || 0)} - ${formatTime(Number(seg.endTime) || 0)})\n`;
      md += `${seg.text || ""}\n\n`;
    });
  }

  return md;
}

export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      const res = navigator.clipboard.writeText(text);
      if (res && typeof res.then === "function") {
        await res.catch(() => {});
      }
      return true;
    }
  } catch {}

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export interface DemoSampleDefinition {
  type: "meeting" | "interview" | "standup";
  title: string;
  fileName: string;
  durationSeconds: number;
  speakers: SpeakerInfo[];
  segments: {
    speakerId: string;
    speakerLabel: string;
    text: string;
    words: { word: string; duration: number; pauseAfter?: number }[];
  }[];
  summary: SummaryResult;
}

export const DEMO_SAMPLES: Record<string, DemoSampleDefinition> = {
  meeting: {
    type: "meeting",
    title: "Product Strategy Sync",
    fileName: "Product_Strategy_Sync_3_Speakers.wav",
    durationSeconds: 27.5,
    speakers: [
      { id: "speaker_1", label: "Speaker 1", customName: "Alex (Product)", color: "#ea580c" },
      { id: "speaker_2", label: "Speaker 2", customName: "Elena (Eng Lead)", color: "#2563eb" },
      { id: "speaker_3", label: "Speaker 3", customName: "Marcus (Design)", color: "#16a34a" },
    ],
    segments: [
      {
        speakerId: "speaker_1",
        speakerLabel: "Speaker 1",
        text: "Good morning team, let's review our Q3 enterprise onboarding goals and check our current migration blockers.",
        words: [
          { word: "Good", duration: 0.35 },
          { word: "morning", duration: 0.45 },
          { word: "team,", duration: 0.45, pauseAfter: 0.2 },
          { word: "let's", duration: 0.3 },
          { word: "review", duration: 0.4 },
          { word: "our", duration: 0.25 },
          { word: "Q3", duration: 0.4 },
          { word: "enterprise", duration: 0.55 },
          { word: "onboarding", duration: 0.55 },
          { word: "goals", duration: 0.4 },
          { word: "and", duration: 0.25 },
          { word: "check", duration: 0.35 },
          { word: "our", duration: 0.25 },
          { word: "current", duration: 0.4 },
          { word: "migration", duration: 0.55 },
          { word: "blockers.", duration: 0.55, pauseAfter: 0.4 },
        ],
      },
      {
        speakerId: "speaker_2",
        speakerLabel: "Speaker 2",
        text: "The data pipeline throughput is stable now, but we need updated database credentials before the staging rollout tomorrow.",
        words: [
          { word: "The", duration: 0.25 },
          { word: "data", duration: 0.35 },
          { word: "pipeline", duration: 0.45 },
          { word: "throughput", duration: 0.5 },
          { word: "is", duration: 0.2 },
          { word: "stable", duration: 0.4 },
          { word: "now,", duration: 0.4, pauseAfter: 0.25 },
          { word: "but", duration: 0.25 },
          { word: "we", duration: 0.2 },
          { word: "need", duration: 0.3 },
          { word: "updated", duration: 0.45 },
          { word: "database", duration: 0.5 },
          { word: "credentials", duration: 0.6 },
          { word: "before", duration: 0.4 },
          { word: "the", duration: 0.2 },
          { word: "staging", duration: 0.45 },
          { word: "rollout", duration: 0.45 },
          { word: "tomorrow.", duration: 0.55, pauseAfter: 0.4 },
        ],
      },
      {
        speakerId: "speaker_3",
        speakerLabel: "Speaker 3",
        text: "On the UI side, the responsive bento layouts and permission settings are approved and ready for frontend integration.",
        words: [
          { word: "On", duration: 0.25 },
          { word: "the", duration: 0.2 },
          { word: "UI", duration: 0.35 },
          { word: "side,", duration: 0.4, pauseAfter: 0.2 },
          { word: "the", duration: 0.2 },
          { word: "responsive", duration: 0.55 },
          { word: "bento", duration: 0.4 },
          { word: "layouts", duration: 0.45 },
          { word: "and", duration: 0.25 },
          { word: "permission", duration: 0.5 },
          { word: "settings", duration: 0.45 },
          { word: "are", duration: 0.2 },
          { word: "approved", duration: 0.5 },
          { word: "and", duration: 0.25 },
          { word: "ready", duration: 0.35 },
          { word: "for", duration: 0.2 },
          { word: "frontend", duration: 0.5 },
          { word: "integration.", duration: 0.6, pauseAfter: 0.3 },
        ],
      },
      {
        speakerId: "speaker_1",
        speakerLabel: "Speaker 1",
        text: "Perfect. Elena, please coordinate the secret rotation, and Marcus, let's sync on usability telemetry at two PM.",
        words: [
          { word: "Perfect.", duration: 0.55, pauseAfter: 0.3 },
          { word: "Elena,", duration: 0.45, pauseAfter: 0.2 },
          { word: "please", duration: 0.35 },
          { word: "coordinate", duration: 0.6 },
          { word: "the", duration: 0.2 },
          { word: "secret", duration: 0.4 },
          { word: "rotation,", duration: 0.5, pauseAfter: 0.25 },
          { word: "and", duration: 0.25 },
          { word: "Marcus,", duration: 0.45, pauseAfter: 0.2 },
          { word: "let's", duration: 0.3 },
          { word: "sync", duration: 0.35 },
          { word: "on", duration: 0.2 },
          { word: "usability", duration: 0.55 },
          { word: "telemetry", duration: 0.55 },
          { word: "at", duration: 0.2 },
          { word: "two", duration: 0.3 },
          { word: "PM.", duration: 0.5 },
        ],
      },
    ],
    summary: {
      executiveSummary:
        "The team confirmed readiness for the Q3 enterprise onboarding release. Pipeline throughput is stabilized, design mockups are finalized, and final security credentials rotation is underway prior to tomorrow's staging rollout.",
      keyPoints: [
        "Data pipeline throughput bottleneck resolved and verified stable for staging.",
        "Database credentials require formal rotation before tomorrow's deployment.",
        "Responsive bento UI components and role-based permissions received design sign-off.",
        "Cross-functional usability telemetry check scheduled for 2:00 PM today.",
      ],
      actionItems: [
        { task: "Coordinate database credential rotation for staging deployment", owner: "Elena (Eng Lead)", priority: "high" },
        { task: "Handoff responsive bento UI layout assets to frontend developers", owner: "Marcus (Design)", priority: "medium" },
        { task: "Host usability telemetry check-in at 2:00 PM", owner: "Alex (Product)", priority: "medium" },
      ],
      topics: ["Enterprise Onboarding", "Staging Rollout", "Bento UI", "Credential Rotation"],
      sentiment: "Collaborative and on schedule",
      speakerInsights: [
        { speakerLabel: "Alex (Product)", contributionSummary: "Facilitated agenda and assigned action owners", talkTimePercentage: 42 },
        { speakerLabel: "Elena (Eng Lead)", contributionSummary: "Reported data pipeline stability and flagged credentials requirement", talkTimePercentage: 31 },
        { speakerLabel: "Marcus (Design)", contributionSummary: "Confirmed design approvals for layout and permissions", talkTimePercentage: 27 },
      ],
    },
  },

  interview: {
    type: "interview",
    title: "System Design Interview",
    fileName: "System_Design_Interview_2_Speakers.wav",
    durationSeconds: 22.0,
    speakers: [
      { id: "speaker_1", label: "Speaker 1", customName: "Sarah (Interviewer)", color: "#2563eb" },
      { id: "speaker_2", label: "Speaker 2", customName: "David (Candidate)", color: "#16a34a" },
    ],
    segments: [
      {
        speakerId: "speaker_1",
        speakerLabel: "Speaker 1",
        text: "David, how would you design the cache invalidation strategy for our real-time notification service?",
        words: [
          { word: "David,", duration: 0.45, pauseAfter: 0.2 },
          { word: "how", duration: 0.25 },
          { word: "would", duration: 0.25 },
          { word: "you", duration: 0.2 },
          { word: "design", duration: 0.4 },
          { word: "the", duration: 0.2 },
          { word: "cache", duration: 0.35 },
          { word: "invalidation", duration: 0.65 },
          { word: "strategy", duration: 0.5 },
          { word: "for", duration: 0.2 },
          { word: "our", duration: 0.2 },
          { word: "real-time", duration: 0.45 },
          { word: "notification", duration: 0.65 },
          { word: "service?", duration: 0.55, pauseAfter: 0.4 },
        ],
      },
      {
        speakerId: "speaker_2",
        speakerLabel: "Speaker 2",
        text: "I would use write-through caching with Redis clusters paired with a publish-subscribe event bus for active subscription fanout.",
        words: [
          { word: "I", duration: 0.2 },
          { word: "would", duration: 0.25 },
          { word: "use", duration: 0.3 },
          { word: "write-through", duration: 0.55 },
          { word: "caching", duration: 0.45 },
          { word: "with", duration: 0.2 },
          { word: "Redis", duration: 0.35 },
          { word: "clusters", duration: 0.5 },
          { word: "paired", duration: 0.35 },
          { word: "with", duration: 0.2 },
          { word: "a", duration: 0.15 },
          { word: "publish-subscribe", duration: 0.7 },
          { word: "event", duration: 0.35 },
          { word: "bus", duration: 0.3 },
          { word: "for", duration: 0.2 },
          { word: "active", duration: 0.35 },
          { word: "subscription", duration: 0.6 },
          { word: "fanout.", duration: 0.55, pauseAfter: 0.35 },
        ],
      },
      {
        speakerId: "speaker_1",
        speakerLabel: "Speaker 1",
        text: "That makes sense. What trade-offs do you see during high partition recovery events?",
        words: [
          { word: "That", duration: 0.3 },
          { word: "makes", duration: 0.35 },
          { word: "sense.", duration: 0.45, pauseAfter: 0.3 },
          { word: "What", duration: 0.25 },
          { word: "trade-offs", duration: 0.5 },
          { word: "do", duration: 0.2 },
          { word: "you", duration: 0.2 },
          { word: "see", duration: 0.25 },
          { word: "during", duration: 0.35 },
          { word: "high", duration: 0.3 },
          { word: "partition", duration: 0.5 },
          { word: "recovery", duration: 0.5 },
          { word: "events?", duration: 0.55, pauseAfter: 0.3 },
        ],
      },
    ],
    summary: {
      executiveSummary:
        "Technical interview segment addressing caching architectures and partition handling for real-time notification streams. Candidate proposed a Redis write-through cache backed by an event bus.",
      keyPoints: [
        "Candidate proposed write-through caching pattern on Redis cluster.",
        "Discussed event bus pub/sub integration for push notification fanout.",
        "Evaluated partition tolerance trade-offs during network degradation.",
      ],
      actionItems: [
        { task: "Complete technical scorecard for distributed systems evaluation", owner: "Sarah (Interviewer)", priority: "medium" },
      ],
      topics: ["System Design", "Caching", "Redis Pub/Sub", "Distributed Systems"],
      sentiment: "Analytical and technical",
      speakerInsights: [
        { speakerLabel: "Sarah (Interviewer)", contributionSummary: "Posed scenario prompts on caching and fault tolerance", talkTimePercentage: 45 },
        { speakerLabel: "David (Candidate)", contributionSummary: "Articulated architectural diagrams and component decoupling", talkTimePercentage: 55 },
      ],
    },
  },

  standup: {
    type: "standup",
    title: "Sprint Standup Sync",
    fileName: "Sprint_Standup_Sync_3_Speakers.wav",
    durationSeconds: 21.0,
    speakers: [
      { id: "speaker_1", label: "Speaker 1", customName: "Liam (Scrum Master)", color: "#ea580c" },
      { id: "speaker_2", label: "Speaker 2", customName: "Chloe (Backend)", color: "#7c3aed" },
      { id: "speaker_3", label: "Speaker 3", customName: "Noah (Frontend)", color: "#0891b2" },
    ],
    segments: [
      {
        speakerId: "speaker_1",
        speakerLabel: "Speaker 1",
        text: "Standup time everyone. Chloe, what's your focus today?",
        words: [
          { word: "Standup", duration: 0.45 },
          { word: "time", duration: 0.3 },
          { word: "everyone.", duration: 0.5, pauseAfter: 0.25 },
          { word: "Chloe,", duration: 0.4, pauseAfter: 0.2 },
          { word: "what's", duration: 0.3 },
          { word: "your", duration: 0.2 },
          { word: "focus", duration: 0.4 },
          { word: "today?", duration: 0.45, pauseAfter: 0.35 },
        ],
      },
      {
        speakerId: "speaker_2",
        speakerLabel: "Speaker 2",
        text: "Yesterday I completed the rate-limiter middleware. Today I'm migrating the token endpoint to OAuth two point one.",
        words: [
          { word: "Yesterday", duration: 0.5 },
          { word: "I", duration: 0.2 },
          { word: "completed", duration: 0.5 },
          { word: "the", duration: 0.2 },
          { word: "rate-limiter", duration: 0.6 },
          { word: "middleware.", duration: 0.55, pauseAfter: 0.3 },
          { word: "Today", duration: 0.4 },
          { word: "I'm", duration: 0.25 },
          { word: "migrating", duration: 0.5 },
          { word: "the", duration: 0.2 },
          { word: "token", duration: 0.35 },
          { word: "endpoint", duration: 0.45 },
          { word: "to", duration: 0.2 },
          { word: "OAuth", duration: 0.4 },
          { word: "two", duration: 0.25 },
          { word: "point", duration: 0.3 },
          { word: "one.", duration: 0.45, pauseAfter: 0.35 },
        ],
      },
      {
        speakerId: "speaker_3",
        speakerLabel: "Speaker 3",
        text: "I finished the export modal formats and I have zero blockers for today's release candidate.",
        words: [
          { word: "I", duration: 0.2 },
          { word: "finished", duration: 0.45 },
          { word: "the", duration: 0.2 },
          { word: "export", duration: 0.4 },
          { word: "modal", duration: 0.4 },
          { word: "formats", duration: 0.45 },
          { word: "and", duration: 0.25 },
          { word: "I", duration: 0.2 },
          { word: "have", duration: 0.25 },
          { word: "zero", duration: 0.35 },
          { word: "blockers", duration: 0.45 },
          { word: "for", duration: 0.2 },
          { word: "today's", duration: 0.4 },
          { word: "release", duration: 0.4 },
          { word: "candidate.", duration: 0.55, pauseAfter: 0.3 },
        ],
      },
    ],
    summary: {
      executiveSummary:
        "Daily standup report. Backend rate-limiter middleware delivered; OAuth 2.1 upgrade in progress. Frontend completed export formats with zero current blockers.",
      keyPoints: [
        "Backend rate-limiter middleware merged to main branch.",
        "OAuth 2.1 token endpoint migration actively underway.",
        "Frontend export modal formats verified with zero release blockers.",
      ],
      actionItems: [
        { task: "Deploy and smoke test OAuth 2.1 token service", owner: "Chloe (Backend)", priority: "high" },
        { task: "Verify release candidate bundle before 5 PM", owner: "Noah (Frontend)", priority: "medium" },
      ],
      topics: ["Daily Standup", "Rate Limiter", "OAuth 2.1", "Release Candidate"],
      sentiment: "Efficient and unblocked",
      speakerInsights: [
        { speakerLabel: "Liam (Scrum Master)", contributionSummary: "Facilitated standup transitions", talkTimePercentage: 25 },
        { speakerLabel: "Chloe (Backend)", contributionSummary: "Shared status on middleware and OAuth 2.1", talkTimePercentage: 45 },
        { speakerLabel: "Noah (Frontend)", contributionSummary: "Reported export modal delivery and zero blockers", talkTimePercentage: 30 },
      ],
    },
  },
};

/**
 * Generates accurately synchronized multi-speaker speech audio and calibrated transcription data
 */
export function generateCalibratedDemo(type: "meeting" | "interview" | "standup"): {
  blob: Blob;
  base64: string;
  data: TranscriptionData;
} {
  const sampleDef = DEMO_SAMPLES[type] || DEMO_SAMPLES.meeting;
  const sampleRate = 16000;

  // Build accurately timed segments and words
  let currentTimestamp = 0.5;
  const builtSegments: TranscriptSegment[] = [];

  sampleDef.segments.forEach((segDef, sIdx) => {
    const segStartTime = Number(currentTimestamp.toFixed(2));
    const wordsWithTimes: { word: string; startTime: number; endTime: number }[] = [];

    segDef.words.forEach((w) => {
      const wStart = Number(currentTimestamp.toFixed(2));
      currentTimestamp += w.duration;
      const wEnd = Number(currentTimestamp.toFixed(2));
      wordsWithTimes.push({ word: w.word, startTime: wStart, endTime: wEnd });
      if (w.pauseAfter) {
        currentTimestamp += w.pauseAfter;
      }
    });

    const segEndTime = Number(currentTimestamp.toFixed(2));
    builtSegments.push({
      id: `seg-${sIdx + 1}`,
      speakerId: segDef.speakerId,
      speakerLabel: segDef.speakerLabel,
      startTime: segStartTime,
      endTime: segEndTime,
      text: segDef.text,
      words: wordsWithTimes,
    });

    currentTimestamp += 0.4; // Inter-segment breath pause
  });

  const totalDuration = Number((currentTimestamp + 0.5).toFixed(2));
  const numSamples = Math.floor(sampleRate * totalDuration);
  const buffer = new Float32Array(numSamples);

  // Synthesize acoustic voice formants for each speaker aligned to exact word timestamps
  const speakerPitches: Record<string, { f0: number; f1: number; f2: number }> = {
    speaker_1: { f0: 165, f1: 720, f2: 1750 }, // Warm baritone (Speaker 1)
    speaker_2: { f0: 275, f1: 880, f2: 2400 }, // Clear soprano (Speaker 2)
    speaker_3: { f0: 215, f1: 580, f2: 1520 }, // Rich tenor (Speaker 3)
  };

  builtSegments.forEach((seg) => {
    const pitch = speakerPitches[seg.speakerId] || speakerPitches.speaker_1;

    seg.words.forEach((word) => {
      const startSample = Math.floor(word.startTime * sampleRate);
      const endSample = Math.min(numSamples, Math.floor(word.endTime * sampleRate));
      const wordSampleCount = endSample - startSample;

      for (let i = 0; i < wordSampleCount; i++) {
        const sampleIdx = startSample + i;
        if (sampleIdx >= numSamples) break;

        const t = sampleIdx / sampleRate;
        const normalizedWordTime = i / wordSampleCount; // 0 to 1

        // Syllabic amplitude envelope (rise, hold, gentle fall)
        const envelope = Math.sin(normalizedWordTime * Math.PI) * (0.35 + 0.15 * Math.sin(t * 12));

        // Formant vocal harmonics
        const harmonic1 = Math.sin(2 * Math.PI * pitch.f0 * t);
        const harmonic2 = 0.5 * Math.sin(2 * Math.PI * pitch.f1 * t);
        const harmonic3 = 0.25 * Math.sin(2 * Math.PI * pitch.f2 * t);
        const voiceSignal = (harmonic1 + harmonic2 + harmonic3) * envelope * 0.4;

        buffer[sampleIdx] += voiceSignal;
      }
    });
  });

  // Convert Float32Array to 16-bit PCM WAV DataView
  const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const blob = new Blob([view], { type: "audio/wav" });

  // Convert view to base64 synchronously
  let binary = "";
  const bytes = new Uint8Array(wavBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const data: TranscriptionData = {
    id: `demo_${type}_${Date.now()}`,
    fileName: sampleDef.fileName,
    fileSize: blob.size,
    mimeType: "audio/wav",
    durationSeconds: totalDuration,
    language: "en",
    speakers: sampleDef.speakers,
    segments: builtSegments,
    fullTranscript: builtSegments.map((s) => `${s.speakerLabel}: ${s.text}`).join("\n\n"),
    summary: sampleDef.summary,
    createdAt: new Date().toISOString(),
  };

  return { blob, base64, data };
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
