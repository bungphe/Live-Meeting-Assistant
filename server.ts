import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Lazy-loaded Gemini helper
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please add it to your Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// 1. API: Analyze current meeting transcript
app.post("/api/meeting/analyze", async (req, res) => {
  try {
    const { transcript, customContext, previousAnalysis } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({
        error: "Transcript is empty. Please provide some meeting dialogs or notes."
      });
    }

    // Format the transcript for Gemini
    const formattedTranscript = transcript
      .map((item: any, idx: number) => {
        const time = item.timestamp ? `[${item.timestamp}] ` : "";
        const speaker = item.speaker ? `${item.speaker}: ` : "Người phát biểu: ";
        return `${time}${speaker}${item.text}`;
      })
      .join("\n");

    let previousAnalysisBlock = "";
    if (previousAnalysis && typeof previousAnalysis === "object") {
      previousAnalysisBlock = `
--- KẾT QUẢ PHÂN TÍCH TRƯỚC ĐÓ (NGỮ CẢNH CŨ) ---
- Tóm tắt cũ: ${previousAnalysis.summary || "Chưa có"}
- Điểm không khí cũ: ${previousAnalysis.sentiment?.score !== undefined ? previousAnalysis.sentiment.score : "Chưa có"} (${previousAnalysis.sentiment?.status || "Chưa có"})
- Các vấn đề cũ: ${JSON.stringify(previousAnalysis.issues || [])}
- Các đầu việc cũ: ${JSON.stringify(previousAnalysis.actionItems || [])}
-----------------------------------------------
Hãy duy trì tính liên tục và chiều sâu của ngữ cảnh cuộc họp (Contextual Continuity):
1. Không thay đổi điểm số tâm lý (sentiment score) quá đột ngột so với điểm số cũ (${previousAnalysis.sentiment?.score || "Chưa có"}), hãy tạo ra sự chuyển biến mượt mà trừ khi có diễn biến căng thẳng mới hoặc giải tỏa xung đột rõ rệt trong các câu thoại gần nhất.
2. Hãy kế thừa, theo dõi và cập nhật các rủi ro/vấn đề (issues) từ kết quả cũ. Nếu vấn đề cũ chưa được giải quyết trong các câu thoại mới, hãy giữ lại và cập nhật mô tả của chúng thay vì bỏ quên chúng.
3. Hãy cập nhật hoặc kế thừa danh sách Action Items (việc cần làm) từ phân tích cũ để đảm bảo danh sách công việc không bị mất mát hay thiếu sót khi cuộc họp diễn tiến liên tục.
`;
    }

    const prompt = `
Bạn là một trợ lý ảo phân tích cuộc họp trực tiếp siêu cấp (Live Meeting Assistant).
Dưới đây là diễn biến cuộc họp hiện tại dạng hội thoại hoặc ghi chú ghi âm:

--- DIỄN BIẾN CUỘC HỌP ---
${formattedTranscript}
-------------------------

${customContext ? `Bối cảnh cuộc họp bổ sung do người dùng cung cấp: ${customContext}\n` : ""}
${previousAnalysisBlock}

Nhiệm vụ của bạn là liên tục phân tích dữ liệu trên và đưa ra kết quả dưới dạng JSON có cấu trúc chính xác theo đúng ngôn ngữ cuộc họp (Ưu tiên tiếng Việt):
1. summary: Tóm tắt cực kỳ ngắn gọn (2-3 câu) diễn biến cuộc họp hiện tại.
2. issues: Các vấn đề phát sinh, rủi ro, mâu thuẫn, bế tắc hoặc khó khăn được đề cập trong cuộc họp cần giải quyết. Với mỗi vấn đề, xác định độ nghiêm trọng (Cao/Trung bình/Thấp) và mô tả.
3. proposals: Đề xuất xử lý/Giải pháp cho từng vấn đề hoặc ý tưởng chung từ diễn biến cuộc họp để giúp người dùng đề xuất phát biểu ngay. Có lý do đề xuất.
4. actionItems: Việc cần làm phát sinh trong cuộc họp (nhiệm vụ, người nhận việc, hạn chót nếu có).
5. sentiment: Trạng thái tâm lý cuộc họp (điểm số 0-100 với 0 là cực kỳ căng thẳng/bế tắc, 100 là cực kỳ tích cực/hiệu quả; trạng thái chữ ngắn gọn; và giải thích lý do ngắn gọn).
6. userSuggestions: CỰC KỲ QUAN TRỌNG - Các gợi ý phản hồi nhanh hoặc câu phát biểu trực tiếp súc tích (bằng tiếng Việt) để người dùng có thể "nhấn nút" phát biểu ngay nhằm giải quyết bế tắc, phản bác rủi ro, hoặc làm rõ thông tin trong cuộc họp.
`;

    // Initialize Gemini
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Tóm tắt súc tích, chuyên nghiệp bằng tiếng Việt về cuộc họp hiện tại."
            },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Tên ngắn gọn của vấn đề/rủi ro" },
                  severity: { type: Type.STRING, description: "Độ nghiêm trọng: 'Cao', 'Trung bình', 'Thấp'" },
                  description: { type: Type.STRING, description: "Chi tiết tác động và rủi ro nếu không xử lý" }
                },
                required: ["title", "severity", "description"]
              },
              description: "Mối đe dọa, rủi ro hoặc điểm bế tắc hiện tại trong cuộc họp."
            },
            proposals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issueTitle: { type: Type.STRING, description: "Vấn đề liên quan" },
                  solution: { type: Type.STRING, description: "Ý tưởng đề xuất giải pháp, hành động để gỡ rối" },
                  reason: { type: Type.STRING, description: "Lý do vì sao nên áp dụng giải pháp này" }
                },
                required: ["solution", "reason"]
              },
              description: "Các giải pháp hoặc ý tưởng đề xuất hành động cụ thể."
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING, description: "Nhiệm vụ cần làm" },
                  assignee: { type: Type.STRING, description: "Người chịu trách nhiệm chính" },
                  deadline: { type: Type.STRING, description: "Thời hạn hoàn thành" }
                },
                required: ["task", "assignee", "deadline"]
              },
              description: "Việc cần làm của các thành viên được chốt hoặc gợi ý bổ sung."
            },
            sentiment: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER, description: "Điểm từ 0 đến 100 biểu thị mức độ đồng thuận và không khí làm việc hiệu quả" },
                status: { type: Type.STRING, description: "Ví dụ: 'Tích cực', 'Căng thẳng', 'Đồng thuận', 'Bế tắc', 'Trung lập'" },
                explanation: { type: Type.STRING, description: "Lý do ngắn gọn đánh giá điểm số này" }
              },
              required: ["score", "status", "explanation"]
            },
            userSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "Câu phát biểu đề xuất cụ thể, súc tích bằng tiếng Việt, ví dụ: 'Tôi đề xuất chúng ta kiểm tra lại phương án B...'"
              },
              description: "Các gợi ý phát biểu nhanh giúp người dùng ghi điểm trong cuộc họp."
            }
          },
          required: ["summary", "issues", "proposals", "actionItems", "sentiment", "userSuggestions"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const resultData = JSON.parse(resultText);
    res.json(resultData);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({
      error: error.message || "Đã xảy ra lỗi khi phân tích bằng AI."
    });
  }
});

// 2. Setup static/dev serving
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Live Meeting Assistant is running on http://localhost:${PORT}`);
  });
}

bootstrap();
