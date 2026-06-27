# TÀI LIỆU PHÂN TÍCH VÀ PHÁT TRIỂN HỆ THỐNG: LIVE MEETING ASSISTANT
*(Báo cáo Tổng hợp Kiến trúc Full-Stack, Cơ chế Lưu vết Ngữ cảnh & Tối ưu hóa Trải nghiệm)*

---

## CHƯƠNG I: TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

**Live Meeting Assistant** là một ứng dụng trợ lý trực tiếp thời gian thực (Real-time Full-Stack Assistant) được thiết kế đặc thù nhằm giải quyết các khủng hoảng, mâu thuẫn và theo dõi hành động trong các cuộc họp doanh nghiệp. 

Hệ thống đóng vai trò một **"Chuyên gia tư vấn quản trị vô hình"** tham dự cuộc họp, tự động lắng nghe hội thoại thông qua giọng nói trực tiếp hoặc các kịch bản mô phỏng khủng hoảng, phân tích không khí tâm lý, nhận diện rủi ro và lập tức đề xuất các câu nói cứu cánh giải nguy (Speak Suggestions) giúp cuộc họp đi đúng hướng.

### 1. Ý nghĩa thực tiễn & Giá trị cốt lõi:
*   **Hòa giải mâu thuẫn thời gian thực:** Nhờ thuật toán phân tích nhanh từ Gemini AI, hệ thống phát hiện xung đột ngay khi nó vừa nhen nhóm và đề xuất các giải pháp trung lập xoa dịu các bên.
*   **Tối đa hóa hiệu suất làm việc:** Thay thế việc ghi chép biên bản thủ công bằng hệ thống tự động ghi nhận, tóm tắt bento trực quan và lập danh sách To-Do hành động chi tiết.
*   **Đồng hành cùng người dùng:** Giúp cá nhân tham gia cuộc họp luôn đưa ra các phát biểu sắc bén, mang tính xây dựng cao đúng thời điểm thông qua nút bấm "Phát biểu ý này".

---

## CHƯƠNG II: KIẾN TRÚC TÁCH BIỆT FRONT-END & BACK-END (FE/BE SEPARATION)

Để đảm bảo tính linh hoạt, khả năng mở rộng (Scalability) và bảo mật tuyệt đối, ứng dụng được xây dựng theo mô hình **Tách biệt Front-end & Back-end độc lập** giao tiếp qua giao thức API RESTful.

```
┌────────────────────────────────────────────────────────────────┐
│                   FRONT-END (CLIENT BROWSER)                   │
├────────────────────────────────────────────────────────────────┤
│  - React 18 / Tailwind CSS (Giao diện người dùng)             │
│  - Web Speech API (Ghi âm giọng nói tiếng Việt trực tiếp)      │
│  - Recharts (Biểu đồ diễn biến tâm lý trực quan)               │
│  - State Management (Quản lý hội thoại & Ghi chú cá nhân)      │
└───────────────────────────────┬────────────────────────────────┘
                                │
                 HTTP POST /api/meeting/analyze
                 (Dữ liệu cuộc họp hội thoại dạng JSON)
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                   BACK-END (EXPRESS APP SERVER)                │
├────────────────────────────────────────────────────────────────┤
│  - Port: 3000 (0.0.0.0)                                        │
│  - API Router (/api/meeting/analyze)                           │
│  - Google Gen AI SDK (@google/genai)                           │
│  - Security Layer (Giữ kín GEMINI_API_KEY ở môi trường máy chủ)│
└───────────────────────────────┬────────────────────────────────┘
                                │
               SDK Call & Structured Output Prompt
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                     GOOGLE GEMINI AI ENGINE                    │
├────────────────────────────────────────────────────────────────┤
│  - Model: gemini-3.5-flash                                     │
│  - Định dạng phản hồi: JSON Schema ép buộc (Structured Output) │
└────────────────────────────────────────────────────────────────┘
```

### 1. Kiến trúc lớp Front-end (Client-Side)
Nằm trong thư mục `/src`, được xây dựng bằng **React 18, Vite và Tailwind CSS**:
*   **Trách nhiệm chính:**
    *   **User Interface (UI):** Hiển thị giao diện điều khiển, danh sách hội thoại, và bảng kết quả phân tích Bento Grid.
    *   **Audio Ingestion (Ghi âm giọng nói):** Giao tiếp với phần cứng micro thông qua trình duyệt (Web Speech API) để thu âm tiếng Việt trực tiếp và đẩy vào danh sách hội thoại (`transcript`).
    *   **Trực quan hóa chỉ số (Data Visualization):** Sử dụng thư viện `recharts` để vẽ biểu đồ diễn biến tâm lý cuộc họp dựa trên chuỗi lịch sử phân tích.
    *   **Tương tác Cá nhân hóa:** Cho phép người dùng trực tiếp nhấn chọn câu thoại để Đánh dấu (Highlight) hoặc Thêm ghi chú cá nhân nhanh (Personal Notes) để phục vụ cho mục đích lưu giữ thông tin cá nhân.

### 2. Kiến trúc lớp Back-end (Server-Side)
Tập tin nguồn `/server.ts` chạy trên môi trường **Node.js/Express**:
*   **Trách nhiệm chính:**
    *   **API Gateway & Proxy:** Tiếp nhận dữ liệu cuộc họp từ Front-end gửi lên, chuyển tiếp yêu cầu xử lý sang máy chủ AI của Google thông qua bộ SDK mới nhất `@google/genai`.
    *   **Bảo mật tuyệt đối (Secret Security):** Khóa `GEMINI_API_KEY` được cấu hình an toàn trên môi trường Server (`process.env.GEMINI_API_KEY`), tuyệt đối không bao giờ bị rò rỉ ra trình duyệt phía người dùng.
    *   **Phục vụ file tĩnh (Static Serving):** Trong môi trường production, máy chủ tự động phục vụ các tệp tin đã build sẵn của React từ thư mục `/dist`. Trong môi trường phát triển (development), máy chủ tích hợp Vite Middleware để hỗ trợ quá trình cập nhật mã nguồn trực tiếp (Live Refresh).

---

## CHƯƠNG III: GIAO THỨC TRUYỀN TẢI DỮ LIỆU (API CONTRACT)

Để Front-end và Back-end hoạt động độc lập và dễ dàng thay đổi công nghệ ở bất kỳ lớp nào (ví dụ chuyển đổi FE sang Mobile App Flutter, hoặc BE sang Go/Python) trong tương lai, hai lớp giao tiếp thông qua một API Contract chuẩn hóa:

### 1. Endpoint: `POST /api/meeting/analyze`

#### a. Request Payload (Client gửi lên Server)
```json
{
  "transcript": [
    {
      "id": "line-1711200000000",
      "speaker": "Nam (Project Manager)",
      "text": "Chúng ta chỉ còn đúng 2 ngày để bàn giao nhưng hệ thống thanh toán vẫn gặp lỗi nghiêm trọng.",
      "timestamp": "10:15:30",
      "isUser": false
    }
  ],
  "customContext": "Dự án phát triển web thương mại điện tử, sếp cực kỳ khó tính...",
  "previousAnalysis": {
    "summary": "Tóm tắt phân tích trước đó...",
    "sentiment": { "score": 75, "status": "Căng thẳng", "explanation": "..." },
    "issues": [],
    "actionItems": []
  }
}
```

#### b. Response Payload (Server trả về cho Client)
```json
{
  "summary": "Tóm tắt súc tích (2-3 câu) về tiến trình cuộc họp hiện tại...",
  "sentimentScore": 75,
  "sentimentAnalysis": "Giải thích chi tiết về điểm không khí cuộc họp...",
  "issues": [
    {
      "title": "Mâu thuẫn tiến độ bàn giao và lỗi hệ thống",
      "description": "Chi tiết cuộc tranh luận gay gắt giữa PM và kỹ thuật...",
      "severity": "High"
    }
  ],
  "proposals": [
    {
      "issueTitle": "Mâu thuẫn tiến độ bàn giao và lỗi hệ thống",
      "solution": "Khoanh vùng lỗi bảo mật, phát hành bản vá phụ và đàm phán kéo dài...",
      "reason": "Đảm bảo tính ổn định và giữ uy tín với đối tác khách hàng."
    }
  ],
  "actionItems": [
    {
      "task": "Rà soát toàn bộ mã nguồn thanh toán",
      "assignee": "Đức (Lead Dev)",
      "deadline": "Trước 12h00 trưa mai"
    }
  ],
  "speakSuggestions": [
    "Tôi đề xuất chúng ta tạm thời cô lập các tính năng chưa hoàn thiện..."
  ]
}
```

---

## CHƯƠNG IV: CƠ CHẾ LƯU VẾT NGỮ CẢNH LIÊN TỤC (CONTEXTUAL MEMORY FLOW)

Một trong những thách thức lớn nhất của các ứng dụng trợ lý hội thoại thời gian thực là hiện tượng **"mất trí nhớ ngắn hạn của AI"** mỗi lần người dùng gửi phân tích mới. AI thường chỉ phân tích dữ liệu cục bộ tại thời điểm gửi, làm mất đi tiến trình thảo luận trước đó, khiến chỉ số tâm lý bị biến động giật cục và rủi ro/đầu việc cũ bị lãng quên.

Ứng dụng này giải quyết triệt để vấn đề trên bằng **Cơ chế lưu vết ngữ cảnh dồn tích (Contextual Memory Flow)**:

1.  **Dòng hội thoại tích lũy (Cumulative Transcript Feed):** Mỗi lần thực hiện phân tích, Client luôn gửi toàn bộ mảng `transcript` từ đầu cuộc họp cho tới thời điểm hiện tại, giúp AI nắm bắt đầy đủ diễn tiến câu chuyện.
2.  **Cung cấp kết quả phân tích cũ (`previousAnalysis`):** Client đính kèm toàn bộ khối phân tích phân tích của lần trước đó gửi lên Server làm bối cảnh so sánh.
3.  **Tư duy thông minh của Gemini AI trên Server:**
    *   **Làm mượt biểu đồ xu hướng (Sentiment Smoothing):** AI đối chiếu điểm số tâm lý cũ để đưa ra điểm số mới có mức độ chuyển biến mượt mà, tự nhiên, trừ khi cuộc họp xảy ra xung đột cực độ hoặc có đột phá giải vây lớn.
    *   **Bám sát Rủi ro & Đầu việc (Issue & Task Tracking):** AI chủ động đối chiếu các vấn đề (`issues`) và việc cần làm (`actionItems`) đã phát hiện trước đây. Nếu cuộc đối thoại mới chưa có dấu hiệu giải quyết các vấn đề đó, AI sẽ tiếp tục kế thừa, giữ nguyên và cập nhật tiến độ cho chúng thay vì xóa sạch khỏi danh sách.

---

## CHƯƠNG V: GIẢI PHÁP THU ÂM TRỰC TIẾP & SPEECH-TO-TEXT FALLBACKS

### 1. Tích hợp Web Speech API
Hệ thống tận dụng bộ công cụ ghi giọng nói tích hợp sẵn trong trình duyệt để xử lý:
*   Sử dụng đối tượng `window.webkitSpeechRecognition` hoặc `window.SpeechRecognition`.
*   Cấu hình liên tục (`recognition.continuous = true`) giúp ứng dụng không tự động ngắt kết nối khi người dùng tạm ngừng nói.
*   Cố định ngôn ngữ đầu vào là tiếng Việt (`recognition.lang = "vi-VN"`).

### 2. Chiến lược xử lý lỗi & Khôi phục (Graceful Degradation):
*   **Trình duyệt không hỗ trợ:** Hệ thống tự động phát hiện trình duyệt không tương thích, ẩn nút Micro ghi âm và hiển thị cảnh báo thân thiện, đồng thời khuyến khích người dùng chuyển sang chế độ nhập hội thoại thủ công siêu nhanh.
*   **Chặn quyền truy cập Micro:** Khi người dùng từ chối cấp quyền, hệ thống hiển thị hướng dẫn chi tiết cách mở lại quyền truy cập thiết bị phần cứng ở góc trên bối cảnh.
*   **Cơ chế Tự động khôi phục:** Khi bị mất kết nối đột ngột hoặc nhiễu âm, hệ thống ghi nhận mã lỗi cụ thể (`blocked`, `no-speech`, `network`) và sẵn sàng phục hồi kết nối thu âm chỉ bằng một lượt chạm.

---

## CHƯƠNG VI: THIẾT KẾ TRẢI NGHIỆM BENTO GRID & TỐI ƯU HÓA DI ĐỘNG (MOBILE-FIRST POLISH)

Ứng dụng được thiết kế giao diện theo cấu trúc **Bento Grid** hiện đại, phân tách rõ ràng các nhóm thông tin. Đặc biệt, giao diện được tinh chỉnh chuyên sâu để mang lại trải nghiệm hoàn hảo trên điện thoại di động:

1.  **Responsive Header thích ứng:**
    *   *Trên Desktop:* Thanh tiêu đề trải ngang thanh lịch cùng bối cảnh điều khiển.
    *   *Trên Mobile:* Tiêu đề tự động chuyển đổi sang dạng dọc (`flex-col`), thu hẹp khoảng cách padding, tinh giản kích thước icon, đảm bảo không xảy ra hiện tượng tràn viền hay biến dạng.
2.  **Độ cao linh hoạt (Adaptive Heights):**
    *   Thay thế các giá trị cố định cứng chiều cao làm vỡ khung hiển thị trên màn hình nhỏ.
    *   Thiết lập cột hội thoại bên trái (`lg:h-[calc(100vh-140px)] h-[550px]`) và cột kết quả bên phải (`lg:h-[calc(100vh-140px)] h-[600px]`) xếp chồng lên nhau một cách gọn gàng, mượt mà khi người dùng cuộn vuốt trên màn hình cảm ứng di động.
3.  **Tối ưu hóa các Tab kết quả:**
    *   Các nhãn Tab điều hướng (`Live Insights`, `Biểu đồ tâm lý`, `Hướng dẫn`) được tinh gọn kích cỡ chữ (`text-[10px] md:text-xs px-2 md:px-3`) để chống gãy dòng hoặc đẩy chữ xuống hàng khi mở trên các màn hình có bề rộng hẹp (như iPhone SE).
4.  **Kích thước điểm chạm lớn (Touch Target):**
    *   Toàn bộ các nút bấm tương tác nhanh như: "Đánh dấu", "Thêm ghi chú", "Xóa ghi chú", "Phát biểu ý này" đều được căn chỉnh kích thước vùng bấm tối thiểu 44px, hỗ trợ thao tác chạm bằng ngón tay vô cùng chính xác.

---

## CHƯƠNG VII: HƯỚNG PHÁT TRIỂN & MỞ RỘNG HỆ THỐNG TRONG TƯƠNG LAI

Nhờ nền tảng tách biệt Front-end / Back-end vững chắc, việc phát triển các tính năng nâng cao trong tương lai cực kỳ đơn giản và dễ dàng:

### 1. Tích hợp Cơ sở dữ liệu bền vững (Durable Cloud Persistence)
*   **Giải pháp:** Tích hợp **Firebase Firestore** hoặc cơ sở dữ liệu quan hệ **PostgreSQL (Cloud SQL)** thông qua Drizzle ORM.
*   **Mở rộng:**
    *   Tạo bảng lưu trữ các cuộc họp: `meetings` (id, title, created_at, owner_id).
    *   Lưu trữ biên bản hội thoại: `transcripts` (id, meeting_id, speaker, text, timestamp).
    *   Lưu trữ báo cáo phân tích tương ứng của cuộc họp để người dùng có thể xem lại bất kỳ lúc nào.

### 2. Đồng bộ hóa đa người dùng (Real-time Collaboration WebSockets)
*   **Giải pháp:** Tích hợp **Socket.io** vào Express Server ở Back-end.
*   **Mở rộng:**
    *   Mỗi cuộc họp sẽ có một mã phòng duy nhất (`Room ID`).
    *   Nhiều thành viên tham gia cuộc họp có thể mở ứng dụng trên điện thoại di động/máy tính của họ.
    *   Mọi câu thoại do bất kỳ ai nói hoặc gõ sẽ được đồng bộ ngay lập tức tới màn hình của toàn bộ thành viên trong phòng theo thời gian thực.

### 3. Đăng nhập & Quản lý người dùng (Authentication & Access Control)
*   **Giải pháp:** Tích hợp **Firebase Authentication** hoặc JWT.
*   **Mở rộng:**
    *   Quản lý hồ sơ cá nhân của người tham dự cuộc họp.
    *   Phân quyền truy cập cuộc họp (Ví dụ: Chỉ những người có tên trong danh sách ban giám đốc mới được quyền xem phân tích rủi ro High-level của cuộc họp đó).

---
*Báo cáo phân tích kỹ thuật và phát triển hệ thống được biên soạn và tối ưu hóa hoàn chỉnh. Hệ thống đã sẵn sàng cho các giai đoạn nâng cấp tiếp theo.*
