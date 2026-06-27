export interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isUser?: boolean;
}

export interface Issue {
  title: string;
  severity: "Cao" | "Trung bình" | "Thấp" | string;
  description: string;
}

export interface Proposal {
  issueTitle?: string;
  solution: string;
  reason: string;
}

export interface ActionItem {
  task: string;
  assignee: string;
  deadline: string;
  completed?: boolean;
}

export interface SentimentAnalysis {
  score: number; // 0-100
  status: string; // Tích cực, Căng thẳng, Đồng thuận, bế tắc, v.v.
  explanation: string;
}

export interface MeetingAnalysisResult {
  summary: string;
  issues: Issue[];
  proposals: Proposal[];
  actionItems: ActionItem[];
  sentiment: SentimentAnalysis;
  userSuggestions: string[];
}

export interface MeetingPreset {
  id: string;
  name: string;
  description: string;
  context: string;
  lines: { speaker: string; text: string; isUser?: boolean }[];
}
