import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  HelpCircle,
  Send,
  Plus,
  Trash2,
  Volume2,
  Activity,
  Check,
  Copy,
  ChevronRight,
  Info,
  Users,
  Target,
  Compass,
  ArrowRight,
  Pin,
  Edit3
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { MEETING_PRESETS } from "./presets";
import { TranscriptLine, MeetingAnalysisResult, Issue, Proposal, ActionItem } from "./types";

export default function App() {
  // Meeting core state
  const [selectedPresetId, setSelectedPresetId] = useState<string>("software-delay");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [analysisResult, setAnalysisResult] = useState<MeetingAnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<{ time: string; score: number }[]>([]);
  const [customContext, setCustomContext] = useState<string>("");

  // Input states
  const [manualSpeaker, setManualSpeaker] = useState<string>("Tôi");
  const [manualText, setManualText] = useState<string>("");

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [autoAnalyze, setAutoAnalyze] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "chart" | "help">("insights");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Highlights and Personal Notes state
  const [lineNotes, setLineNotes] = useState<Record<string, { highlighted: boolean; note: string }>>({});
  const [editingNoteLineId, setEditingNoteLineId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>("");

  // Simulation controls
  const [isPlayingSim, setIsPlayingSim] = useState<boolean>(false);
  const [nextSimLineIdx, setNextSimLineIdx] = useState<number>(0);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  // Refs
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "vi-VN"; // Default to Vietnamese speech input

      rec.onstart = () => {
        setIsRecording(true);
        setRecognitionError(null);
      };

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const text = event.results[resultIndex][0].transcript;
        if (text.trim()) {
          addNewTranscriptLine("Người nói (Ghi âm)", text.trim());
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("Không có quyền truy cập micro. Hãy mở khóa micro trên trình duyệt.");
        } else {
          setRecognitionError(`Lỗi ghi âm: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionError("Trình duyệt này không hỗ trợ API ghi âm giọng nói Web Speech.");
    }

    // Cleanup
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Scroll transcript to bottom on change
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Auto-analyze when transcript reaches certain milestones
    if (autoAnalyze && transcript.length > 0) {
      const lastLine = transcript[transcript.length - 1];
      // Only auto-analyze if the line is not from simulation auto-play to avoid heavy rate limits,
      // OR if we are just manually typing/speaking.
      // Let's debounce or analyze every 3 lines, or every new user addition.
      const shouldTrigger = transcript.length % 2 === 0 || lastLine.isUser;
      if (shouldTrigger && !isLoading) {
        const timer = setTimeout(() => {
          triggerAnalysis();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [transcript]);

  // Handle Preset Simulation Timer
  useEffect(() => {
    if (isPlayingSim) {
      const selectedPreset = MEETING_PRESETS.find(p => p.id === selectedPresetId);
      if (!selectedPreset) return;

      // Reset if we reached the end
      if (nextSimLineIdx >= selectedPreset.lines.length) {
        setIsPlayingSim(false);
        return;
      }

      simTimerRef.current = setInterval(() => {
        const currentLine = selectedPreset.lines[nextSimLineIdx];
        addNewTranscriptLine(currentLine.speaker, currentLine.text, currentLine.isUser);
        setNextSimLineIdx(prev => prev + 1);

        if (nextSimLineIdx + 1 >= selectedPreset.lines.length) {
          setIsPlayingSim(false);
          if (simTimerRef.current) clearInterval(simTimerRef.current);
        }
      }, 4500); // Add a line every 4.5 seconds
    } else {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isPlayingSim, nextSimLineIdx, selectedPresetId]);

  // Start/Stop mic recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Ghi âm không được hỗ trợ trên trình duyệt này. Hãy dùng Google Chrome hoặc Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsPlayingSim(false); // Pause simulation when talking
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Start recording failed", e);
      }
    }
  };

  // Add a new line manually or from simulation
  const addNewTranscriptLine = (speaker: string, text: string, isUser = false) => {
    const timestamp = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const newLine: TranscriptLine = {
      id: Math.random().toString(36).substring(2, 9),
      speaker,
      text,
      timestamp,
      isUser
    };
    setTranscript(prev => [...prev, newLine]);
    setApiError(null);
  };

  // Submit custom text dialog
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    addNewTranscriptLine(manualSpeaker, manualText.trim(), manualSpeaker === "Tôi");
    setManualText("");
  };

  // Trigger preset change
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    setTranscript([]);
    setNextSimLineIdx(0);
    setIsPlayingSim(false);
    setAnalysisResult(null);
    setAnalysisHistory([]);
    setLineNotes({});
    setEditingNoteLineId(null);
  };

  // Run next step of preset manually
  const stepPreset = () => {
    const selectedPreset = MEETING_PRESETS.find(p => p.id === selectedPresetId);
    if (!selectedPreset) return;

    if (nextSimLineIdx < selectedPreset.lines.length) {
      const currentLine = selectedPreset.lines[nextSimLineIdx];
      addNewTranscriptLine(currentLine.speaker, currentLine.text, currentLine.isUser);
      setNextSimLineIdx(prev => prev + 1);
    } else {
      alert("Đã thêm hết toàn bộ hội thoại của kịch bản mô phỏng.");
    }
  };

  // Clear everything
  const handleClear = () => {
    setTranscript([]);
    setNextSimLineIdx(0);
    setIsPlayingSim(false);
    setAnalysisResult(null);
    setAnalysisHistory([]);
    setApiError(null);
    setLineNotes({});
    setEditingNoteLineId(null);
  };

  // Call Gemini Backend API for Analysis
  const triggerAnalysis = async () => {
    if (transcript.length === 0) return;

    setIsLoading(true);
    setApiError(null);

    const steps = [
      "AI đang lắng nghe cuộc đối thoại...",
      "Đang nhận diện các điểm thắt nút & rủi ro phát sinh...",
      "Đang tính toán đề xuất xử lý phù hợp...",
      "Đang biên soạn tóm tắt & gợi ý phát biểu..."
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);

    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setLoadingStep(steps[stepIndex]);
    }, 1200);

    try {
      const response = await fetch("/api/meeting/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          customContext: customContext || undefined,
          previousAnalysis: analysisResult || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data: MeetingAnalysisResult = await response.json();
      setAnalysisResult(data);

      // Add sentiment score to history for the Recharts graph
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setAnalysisHistory(prev => [
        ...prev,
        { time: timeStr, score: data.sentiment.score }
      ]);

    } catch (error: any) {
      console.error(error);
      setApiError(error.message || "Không thể kết nối đến máy chủ phân tích.");
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  // Handle speaking recommendation click (adds to transcript as user voice)
  const useSuggestionLine = (suggestion: string) => {
    addNewTranscriptLine("Tôi (Phát biểu ý kiến)", suggestion, true);
    // Switch tab to insights so they can see update
    setActiveTab("insights");
  };

  // Copy text to clipboard helper
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper colors for Severity
  const getSeverityBadge = (severity: string) => {
    const lower = severity.toLowerCase();
    if (lower.includes("cao") || lower.includes("high") || lower.includes("nghiêm trọng")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          Cao
        </span>
      );
    }
    if (lower.includes("trung bình") || lower.includes("medium") || lower.includes("vừa")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Trung bình
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Thấp
      </span>
    );
  };

  // Helper color for Sentiment status
  const getSentimentColor = (score: number) => {
    if (score >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 45) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getSentimentBarColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 45) return "bg-blue-500";
    return "bg-red-500";
  };

  const selectedPreset = MEETING_PRESETS.find(p => p.id === selectedPresetId);

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* Upper Navigation / Premium Header */}
      <header id="header" className="sticky top-0 z-50 glass-panel border-b border-slate-200 shadow-sm py-3 px-4 md:py-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-2">
              Live Meeting Assistant
              <span className="text-[9px] md:text-[10px] font-medium tracking-widest uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                AI Trực Tiếp
              </span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500">
              Trợ lý ghi nhận cuộc họp, phát hiện rủi ro và đề xuất giải pháp xử lý tức thời
            </p>
          </div>
        </div>

        {/* Action Status indicators */}
        <div className="flex items-center gap-4 text-[11px] md:text-xs font-medium">
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-ring"></span>
              <span>Đang thu giọng nói...</span>
            </div>
          )}

          {isPlayingSim && (
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
              <span>Đang chạy mô phỏng cuộc họp...</span>
            </div>
          )}

          {!isRecording && !isPlayingSim && (
            <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Chờ dữ liệu</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main id="main-workspace" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Meeting Inputs and Real-time dialogue feed */}
        <section id="left-workspace" className="lg:col-span-5 flex flex-col gap-5 lg:h-[calc(100vh-140px)] h-[550px] lg:min-h-[550px]">
          
          {/* Panel 1: Settings & Simulation Control */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-500" />
                Thiết lập kịch bản cuộc họp
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Tự động phân tích</span>
                <button
                  onClick={() => setAutoAnalyze(!autoAnalyze)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    autoAnalyze ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${
                      autoAnalyze ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Select simulator preset */}
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              {MEETING_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
              {selectedPreset?.description}
            </p>

            {/* Simulation controls */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 justify-between items-center">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsPlayingSim(!isPlayingSim)}
                  disabled={nextSimLineIdx >= (selectedPreset?.lines.length || 0)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isPlayingSim
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-400"
                  }`}
                  title={isPlayingSim ? "Tạm dừng phát" : "Tự động phát từng lời thoại thoại sau mỗi 4.5s"}
                >
                  {isPlayingSim ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Mô phỏng tự động
                    </>
                  )}
                </button>

                <button
                  onClick={stepPreset}
                  disabled={isPlayingSim || nextSimLineIdx >= (selectedPreset?.lines.length || 0)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-50 disabled:hover:bg-slate-100 flex items-center gap-1.5"
                  title="Thêm thủ công câu thoại tiếp theo của kịch bản mô phỏng"
                >
                  <ChevronRight className="w-3.5 h-3.5" /> Bước tiếp
                </button>
              </div>

              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Xóa sạch dữ liệu cuộc họp để làm lại từ đầu"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Background context */}
            <div className="pt-2 border-t border-slate-100">
              <details className="group">
                <summary className="text-[11px] font-semibold text-slate-600 cursor-pointer select-none group-open:text-indigo-600 flex items-center justify-between">
                  <span>+ Thiết lập bối cảnh cuộc họp bổ sung (Tùy chọn)</span>
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="mt-2">
                  <textarea
                    placeholder="Ví dụ: Công ty đối tác là ABC. Chúng ta đang có ngân sách 200tr. sếp Mai rất khó tính..."
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none h-16"
                  />
                </div>
              </details>
            </div>
          </div>

          {/* Panel 2: Live Dialog / Transcript Flow */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 flex-1 flex flex-col overflow-hidden">
            
            {/* Box Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Hội thoại cuộc họp ({transcript.length})
                </h2>
              </div>

              {/* Progress counter of current simulation */}
              {selectedPreset && (
                <div className="text-[11px] text-slate-500 font-medium">
                  Kịch bản: {nextSimLineIdx}/{selectedPreset.lines.length} dòng
                </div>
              )}
            </div>

            {/* Transcript scroll pane */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[150px]">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Volume2 className="w-10 h-10 mb-2.5 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-600">
                    Chưa có âm thanh hoặc văn bản nào
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[280px]">
                    Hãy bật <b>Ghi âm bằng Micro</b>, nhấn <b>Mô phỏng tự động</b>, hoặc gõ văn bản bên dưới để bắt đầu cuộc họp.
                  </p>
                </div>
              ) : (
                transcript.map((line, index) => {
                  const isHighlighted = lineNotes[line.id]?.highlighted;
                  const hasNote = lineNotes[line.id]?.note;

                  return (
                    <div
                      key={line.id}
                      className={`flex flex-col max-w-[90%] transition-all ${
                        line.isUser ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] font-medium text-slate-500">
                        {isHighlighted && <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500 animate-bounce" />}
                        <span className={line.isUser ? "text-indigo-600" : "text-slate-700"}>
                          {line.speaker}
                        </span>
                        <span>•</span>
                        <span>{line.timestamp}</span>
                      </div>
                      <div
                        onClick={() => {
                          setLineNotes(prev => {
                            const existing = prev[line.id] || { highlighted: false, note: "" };
                            return {
                              ...prev,
                              [line.id]: {
                                ...existing,
                                highlighted: !existing.highlighted
                              }
                            };
                          });
                        }}
                        className={`text-xs px-3.5 py-2 rounded-2xl shadow-xs leading-relaxed whitespace-pre-wrap cursor-pointer transition-all ${
                          isHighlighted
                            ? "bg-amber-100/90 text-amber-950 border-2 border-amber-400 rounded-lg scale-[1.01]"
                            : line.isUser
                              ? "bg-indigo-600 text-white rounded-tr-none hover:bg-indigo-700"
                              : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50 hover:bg-slate-200/70"
                        }`}
                        title="Bấm để đánh dấu (Highlight) hoặc gỡ câu thoại này"
                      >
                        {line.text}
                      </div>

                      {/* Small floating actions for Highlight and Note */}
                      <div className="flex items-center gap-2 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLineNotes(prev => {
                              const existing = prev[line.id] || { highlighted: false, note: "" };
                              return {
                                ...prev,
                                [line.id]: {
                                  ...existing,
                                  highlighted: !existing.highlighted
                                }
                              };
                            });
                          }}
                          className={`text-[10px] flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded transition-all ${
                            isHighlighted
                              ? "text-amber-700 bg-amber-100 hover:bg-amber-200"
                              : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                          }`}
                        >
                          <Pin className="w-2.5 h-2.5" />
                          {isHighlighted ? "Bỏ đánh dấu" : "Đánh dấu"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNoteLineId(line.id);
                            setTempNoteText(lineNotes[line.id]?.note || "");
                          }}
                          className="text-[10px] text-slate-500 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded transition-all"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          {hasNote ? "Sửa ghi chú" : "Thêm ghi chú"}
                        </button>
                      </div>

                      {/* Inline Note Input */}
                      {editingNoteLineId === line.id && (
                        <div
                          className="mt-2 w-full max-w-sm bg-white p-2.5 rounded-xl border border-indigo-200 shadow-md flex flex-col gap-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Ghi chú cá nhân của bạn
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Nhập ghi chú nhanh..."
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              className="flex-1 text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-800 font-medium"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setLineNotes(prev => {
                                    const existing = prev[line.id] || { highlighted: false, note: "" };
                                    return {
                                      ...prev,
                                      [line.id]: {
                                        ...existing,
                                        note: tempNoteText,
                                        highlighted: tempNoteText.trim() ? true : existing.highlighted
                                      }
                                    };
                                  });
                                  setEditingNoteLineId(null);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                setLineNotes(prev => {
                                  const existing = prev[line.id] || { highlighted: false, note: "" };
                                  return {
                                    ...prev,
                                    [line.id]: {
                                      ...existing,
                                      note: tempNoteText,
                                      highlighted: tempNoteText.trim() ? true : existing.highlighted
                                    }
                                  };
                                });
                                setEditingNoteLineId(null);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingNoteLineId(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display Personal Note if exists */}
                      {hasNote && (
                        <div className="mt-1 flex items-start gap-1.5 bg-amber-50/80 border border-amber-200/60 text-amber-900 text-[11px] px-2.5 py-1.5 rounded-xl max-w-md shadow-3xs font-medium">
                          <span className="shrink-0 text-amber-600 mt-0.5">📌 Ghi chú:</span>
                          <span className="italic break-words flex-1 text-amber-950">{lineNotes[line.id].note}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLineNotes(prev => {
                                const existing = prev[line.id] || { highlighted: false, note: "" };
                                return {
                                  ...prev,
                                  [line.id]: {
                                    ...existing,
                                    note: ""
                                  }
                                };
                              });
                            }}
                            className="text-amber-400 hover:text-red-500 font-bold transition-colors shrink-0 ml-1.5 px-0.5 text-xs"
                            title="Xóa ghi chú"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Microphone action bar */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecording}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border shadow-xs transition-all ${
                    isRecording
                      ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                      : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4 animate-bounce" />
                      Tắt Ghi Âm Giọng Nói
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-red-500" />
                      Ghi Âm Micro (Bằng Tiếng Việt)
                    </>
                  )}
                </button>

                <button
                  onClick={triggerAnalysis}
                  disabled={transcript.length === 0 || isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 font-semibold text-xs rounded-xl flex items-center gap-1.5 border border-indigo-600 disabled:border-slate-200 transition-all shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Yêu cầu phân tích AI
                </button>
              </div>

              {recognitionError && (
                <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{recognitionError}</span>
                </div>
              )}
            </div>

            {/* Manual Text input sender */}
            <form onSubmit={handleManualSubmit} className="p-3 border-t border-slate-100 flex gap-1.5 items-center bg-white">
              <input
                type="text"
                placeholder="Tên người nói..."
                value={manualSpeaker}
                onChange={(e) => setManualSpeaker(e.target.value)}
                className="w-1/3 text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium"
              />
              <input
                type="text"
                placeholder="Nhập nội dung hội thoại hoặc ghi chú nhanh..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>

        {/* Right Side: AI Live Insights and Suggested Speeches */}
        <section id="right-workspace" className="lg:col-span-7 flex flex-col lg:h-[calc(100vh-140px)] h-[600px] lg:min-h-[550px]">
          
          {/* Header of analysis with tabs */}
          <div className="bg-white rounded-t-2xl border-t border-x border-slate-200 p-2 flex items-center justify-between gap-1 flex-wrap">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("insights")}
                className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-1.5 transition-all ${
                  activeTab === "insights"
                    ? "bg-indigo-50 text-indigo-700 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Live Insights
              </button>
              <button
                onClick={() => setActiveTab("chart")}
                className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-1.5 transition-all ${
                  activeTab === "chart"
                    ? "bg-indigo-50 text-indigo-700 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Biểu đồ tâm lý ({analysisHistory.length})
              </button>
              <button
                onClick={() => setActiveTab("help")}
                className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-1.5 transition-all ${
                  activeTab === "help"
                    ? "bg-indigo-50 text-indigo-700 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Hướng dẫn
              </button>
            </div>

            {/* Quick status button */}
            {isLoading && (
              <span className="text-[11px] font-medium text-indigo-600 flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                Đang phân tích...
              </span>
            )}
          </div>

          {/* Tab pane content container */}
          <div className="bg-white rounded-b-2xl border-b border-x border-slate-200 flex-1 overflow-y-auto p-5 space-y-5 relative">
            
            {/* Warning banner if Gemini key missing */}
            {apiError && (
              <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Lỗi kết nối phân tích AI
                </div>
                <p className="text-xs">{apiError}</p>
                <p className="text-[11px] text-red-600">
                  Hãy chắc chắn rằng API Key đã được cài đặt đúng cách trong mục <b>Settings &gt; Secrets</b> của AI Studio.
                </p>
              </div>
            )}

            {/* If analyzing / Loading state overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-center p-6">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl animate-spin mb-4 border border-indigo-100">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  Gemini AI đang liên tục tính toán...
                </h4>
                <p className="text-xs text-indigo-600 animate-pulse font-medium">
                  {loadingStep}
                </p>
                <div className="mt-6 w-48 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full w-2/3 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
                </div>
              </div>
            )}

            {/* TAB 1: HELP / HUONG DAN */}
            {activeTab === "help" && (
              <div className="space-y-4 text-slate-700 text-xs">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-indigo-600">
                    <Info className="w-4 h-4" /> Live Meeting Assistant là gì?
                  </h3>
                  <p className="leading-relaxed">
                    Đây là ứng dụng mô phỏng trợ lý thông minh theo thời gian thực sử dụng trí tuệ nhân tạo Gemini. Khi bạn đi họp, trợ lý sẽ lắng nghe trực tiếp luồng hội thoại của các thành viên, liên tục phân tích và trích xuất thông tin hành động để giúp bạn nắm bắt cốt lõi vấn đề và chủ động đề xuất giải pháp xử lý.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-red-500" /> Cách dùng 1: Thử giọng nói thực tế
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      1. Nhấn nút <b>Ghi Âm Micro</b>.<br />
                      2. Cho phép trình duyệt truy cập micro của bạn.<br />
                      3. Hãy nói một số ý kiến bằng tiếng Việt (Ví dụ: <i>&quot;Tôi lo lắng dự án sẽ trễ hạn vì đối tác thiết kế giao diện quá lâu, chúng ta cần tìm bên thứ hai&quot;</i>).<br />
                      4. Đoạn thoại sẽ tự nhảy vào cuộc họp và AI tự động phân tích tức thì.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
                      <Play className="w-3.5 h-3.5 text-indigo-600" /> Cách dùng 2: Sử dụng bộ Mô phỏng cuộc họp
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      1. Chọn 1 trong 3 kịch bản họp khẩn cấp ở thanh bên trái.<br />
                      2. Nhấn <b>Mô phỏng tự động</b> để luồng hội thoại bắt đầu tự động đổ về màn hình giống như các thành viên khác đang họp thực tế.<br />
                      3. AI Gemini sẽ lập tức bắt đầu tóm tắt, phát hiện các điểm xung đột và gợi ý cho bạn phương án cứu cánh.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Tính năng siêu việt: Gợi ý phát biểu nhanh (Speak suggestions)
                  </h4>
                  <p className="text-indigo-800 leading-relaxed text-[11px]">
                    Tại phần kết quả phân tích, AI sẽ đề xuất cụ thể những câu phát biểu đắt giá để giải quyết bế tắc. Bạn chỉ cần bấm nút <b>&quot;Phát biểu câu này&quot;</b>, nội dung đề xuất đó sẽ ngay lập tức được gửi vào luồng cuộc họp dưới dạng ý kiến của bạn, tái cấu trúc lại diễn biến tâm lý cuộc họp một cách kỳ diệu!
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: SENTIMENT ANALYSIS GRAPH */}
            {activeTab === "chart" && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Biểu đồ diễn biến tâm lý cuộc họp</h3>
                  <p className="text-[11px] text-slate-500">
                    Theo dõi biểu đồ đường để phân tích không khí cuộc họp tăng hay giảm căng thẳng qua từng lần phát biểu.
                  </p>
                </div>

                {analysisHistory.length < 2 ? (
                  <div className="h-60 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <Activity className="w-8 h-8 mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">Chưa đủ dữ liệu vẽ biểu đồ</p>
                    <p className="text-[10px] text-slate-400 max-w-[280px] mt-1">
                      Biểu đồ sẽ vẽ tự động khi có ít nhất 2 phiên phân tích cuộc họp được thực hiện thành công.
                    </p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analysisHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                          formatter={(value) => [`${value} điểm`, "Chỉ số tâm lý"]}
                          labelFormatter={(label) => `Thời gian: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorScore)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between text-[10px] text-slate-400 px-4 mt-1">
                      <span>← Bắt đầu cuộc họp</span>
                      <span>Họp trực tiếp diễn ra →</span>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Giải thích chỉ số: </span>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5 text-[11px]">
                      <li><b>75 - 100 điểm:</b> Đồng thuận cao, thảo luận hiệu quả và mang tính xây dựng.</li>
                      <li><b>45 - 74 điểm:</b> Trung lập, đang tranh luận cân bằng hoặc chưa tìm ra hướng đi chính.</li>
                      <li><b>Dưới 45 điểm:</b> Không khí căng thẳng, có bế tắc lớn hoặc mâu thuẫn cần gỡ rối ngay lập tức.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INSIGHTS & RESULTS / PHAN TICH TRUC TIEP */}
            {activeTab === "insights" && (
              <div className="space-y-6">
                {/* PERSONAL HIGHLIGHTS & NOTES BOARD */}
                <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Pin className="w-4 h-4 text-amber-600 fill-amber-500 animate-pulse" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Ghi chú & Điểm đánh dấu cá nhân ({Object.keys(lineNotes).filter(key => lineNotes[key]?.highlighted || lineNotes[key]?.note).length})
                      </h3>
                    </div>
                    {Object.keys(lineNotes).filter(key => lineNotes[key]?.highlighted || lineNotes[key]?.note).length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm("Xóa toàn bộ các điểm đánh dấu và ghi chú?")) {
                            setLineNotes({});
                          }
                        }}
                        className="text-[10px] text-red-600 hover:text-red-700 font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {Object.keys(lineNotes).filter(key => lineNotes[key]?.highlighted || lineNotes[key]?.note).length === 0 ? (
                    <div className="py-5 text-center text-slate-500 text-[11px] leading-relaxed">
                      <Info className="w-4.5 h-4.5 text-amber-500 mx-auto mb-1 stroke-[2.5]" />
                      Chưa có điểm đánh dấu nào. <br />
                      <span className="text-slate-400">Hãy nhấn trực tiếp vào bất kỳ câu thoại nào trong luồng họp bên trái hoặc nhấn nút <b>&quot;Đánh dấu&quot;</b> / <b>&quot;Thêm ghi chú&quot;</b> để ghim thông tin quan trọng.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {transcript
                        .filter(line => lineNotes[line.id]?.highlighted || lineNotes[line.id]?.note)
                        .map(line => {
                          const noteData = lineNotes[line.id];
                          return (
                            <div key={line.id} className="p-3 bg-white border border-amber-200/60 rounded-xl space-y-2 hover:shadow-2xs transition-all relative group">
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                <span className="text-amber-800 bg-amber-100/50 px-1.5 py-0.5 rounded uppercase font-semibold">
                                  {line.speaker}
                                </span>
                                <span>{line.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-700 italic border-l-2 border-amber-300 pl-2 leading-relaxed">
                                &quot;{line.text}&quot;
                              </p>
                              {noteData?.note && (
                                <div className="bg-amber-50/50 p-2 rounded-lg text-[11px] text-amber-950 font-medium border border-amber-100 flex items-start gap-1">
                                  <span className="shrink-0">📌</span>
                                  <span className="break-words flex-1">{noteData.note}</span>
                                </div>
                              )}
                              
                              {/* Quick actions inside card */}
                              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingNoteLineId(line.id);
                                    setTempNoteText(noteData?.note || "");
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                                  title="Sửa ghi chú"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setLineNotes(prev => {
                                      const copy = { ...prev };
                                      delete copy[line.id];
                                      return copy;
                                    });
                                  }}
                                  className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                  title="Xóa điểm đánh dấu"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* AUTOMATIC AI ANALYSIS SECTIONS */}
                {!analysisResult ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3 border border-indigo-100">
                      <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Chờ kết quả xử lý từ Gemini AI</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[340px]">
                      Cuộc họp cần ít nhất một dòng hội thoại. Hãy thêm thoại hoặc chạy mô phỏng rồi bấm nút <b>&quot;Yêu cầu phân tích AI&quot;</b> để kích hoạt trí tuệ nhân tạo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* BENTO BLOCK 1: MEETING SUMMARY & SENTIMENT SCORE */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      
                      {/* Summary card (8 cols) */}
                      <div className="md:col-span-8 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                              Tóm tắt tình hình cuộc họp
                            </h3>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                            &quot;{analysisResult.summary}&quot;
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-indigo-100/40 flex items-center justify-between">
                          <span>Phân tích bởi Gemini 3.5 Flash</span>
                          <span>Đã đồng bộ</span>
                        </div>
                      </div>

                      {/* Sentiment meter (4 cols) */}
                      <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Không khí cuộc họp
                          </h3>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                              {analysisResult.sentiment.score}
                            </span>
                            <span className="text-slate-400 text-xs font-semibold">/100</span>
                          </div>
                          
                          {/* Quality Badge */}
                          <div className={`mt-2 text-[11px] font-bold px-2 py-0.5 rounded border inline-block ${getSentimentColor(analysisResult.sentiment.score)}`}>
                            {analysisResult.sentiment.status}
                          </div>
                        </div>

                        {/* mini bar graph */}
                        <div className="mt-4">
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getSentimentBarColor(analysisResult.sentiment.score)}`}
                              style={{ width: `${analysisResult.sentiment.score}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                            {analysisResult.sentiment.explanation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* BENTO BLOCK 2: GOLDEN PANEL - SPEAKING SUGGESTIONS FOR YOU */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
                      {/* background ambient decoration */}
                      <div className="absolute right-0 bottom-0 text-amber-200/20 pointer-events-none transform translate-y-4 translate-x-4">
                        <Volume2 className="w-32 h-32" />
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                          <Volume2 className="w-4.5 h-4.5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            Gợi ý phát biểu của bạn (Ghi điểm trong họp)
                          </h3>
                          <p className="text-[10px] text-amber-700">
                            Các câu phản hồi nhanh súc tích giúp bạn chủ động đưa ra giải pháp ngay lúc này
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 relative z-10">
                        {analysisResult.userSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="bg-white/80 hover:bg-white rounded-xl p-3 border border-amber-200/50 flex items-start gap-2.5 justify-between transition-all shadow-2xs group"
                          >
                            <div className="flex gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                                {suggestion}
                              </p>
                            </div>

                            <div className="flex gap-1.5 shrink-0 self-center">
                              <button
                                onClick={() => copyToClipboard(suggestion, idx)}
                                className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-100/50 rounded-lg transition-all cursor-pointer"
                                title="Sao chép câu phát biểu"
                              >
                                {copiedIndex === idx ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 animate-scale" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => useSuggestionLine(suggestion)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Mô phỏng phát biểu câu này ngay trong cuộc họp"
                              >
                                Phát biểu ý này
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BENTO BLOCK 3: PROBLEMS & SOLUTIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Issues card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3">
                        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Các vấn đề & rủi ro phát hiện
                          </h3>
                        </div>

                        {analysisResult.issues.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-[11px]">
                            Chưa phát hiện vấn đề nghiêm trọng nào.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                            {analysisResult.issues.map((issue, idx) => (
                              <div key={idx} className="p-3 bg-red-50/20 border border-slate-100 rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-900">
                                    {idx + 1}. {issue.title}
                                  </h4>
                                  {getSeverityBadge(issue.severity)}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {issue.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Proposals card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3">
                        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <Target className="w-4 h-4 text-indigo-500" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Giải pháp & Đề xuất cụ thể
                          </h3>
                        </div>

                        {analysisResult.proposals.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-[11px]">
                            Chưa có đề xuất cụ thể từ AI.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                            {analysisResult.proposals.map((prop, idx) => (
                              <div key={idx} className="p-3 bg-indigo-50/20 border border-indigo-100/20 rounded-xl space-y-1">
                                {prop.issueTitle && (
                                  <span className="text-[9px] uppercase font-bold text-slate-400">
                                    Giải pháp cho: {prop.issueTitle}
                                  </span>
                                )}
                                <h4 className="text-xs font-bold text-slate-900">
                                  {prop.solution}
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                  Lý do: {prop.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BENTO BLOCK 4: ACTION ITEMS TO-DO */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Danh sách việc cần làm (To-Do / Action Items)
                        </h3>
                      </div>

                      {analysisResult.actionItems.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-[11px]">
                          Chưa có công việc nào được thống nhất.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {analysisResult.actionItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-start gap-2.5 justify-between group"
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 shrink-0 mt-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                  ✓
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                                    {item.task}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400 font-semibold">
                                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                      Ai làm: {item.assignee}
                                    </span>
                                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                      Hạn: {item.deadline}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Humble Footer */}
      <footer id="footer" className="mt-auto border-t border-slate-200/60 bg-white py-3.5 px-6 flex justify-between items-center text-[11px] text-slate-400 font-medium">
        <div>Trợ Lý Phân Tích Cuộc Họp Trực Tiếp © 2026 • Live Meeting Assistant</div>
        <div className="flex items-center gap-1 text-slate-500">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Powered by Gemini 3.5 Flash & Antigravity
        </div>
      </footer>
    </div>
  );
}
