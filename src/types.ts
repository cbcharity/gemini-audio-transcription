export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerLabel: string;
  startTime: number;
  endTime: number;
  text: string;
  words: WordTimestamp[];
}

export interface SpeakerInfo {
  id: string;
  label: string;
  customName?: string;
  color: string;
  totalSpeakingTime?: number;
  wordCount?: number;
  turnCount?: number;
}

export interface ActionItem {
  task: string;
  owner?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface SpeakerInsight {
  speakerLabel: string;
  contributionSummary: string;
  talkTimePercentage: number;
}

export interface SummaryResult {
  executiveSummary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  topics: string[];
  sentiment?: string;
  speakerInsights?: SpeakerInsight[];
}

export interface TranscriptionData {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
  language: string;
  speakers: SpeakerInfo[];
  segments: TranscriptSegment[];
  fullTranscript: string;
  summary: SummaryResult;
  createdAt: string;
}

export type ExportFormat = 'txt' | 'json' | 'srt' | 'vtt' | 'md';
