import { MeetingPreset } from "./types";

export const MEETING_PRESETS: MeetingPreset[] = [
  {
    id: "software-delay",
    name: "Dự án chậm tiến độ (API lỗi)",
    description: "Cuộc họp khẩn của đội ngũ kỹ thuật khi tích hợp cổng thanh toán thất bại làm trễ tiến độ toàn bộ dự án.",
    context: "Họp khẩn cấp dự án tích hợp cổng thanh toán thương mại điện tử, bị trễ 2 tuần, đứng trước rủi ro đền bù hợp đồng.",
    lines: [
      {
        speaker: "Nam (Project Manager)",
        text: "Chào mọi người, hiện tại dự án của chúng ta đang bị chậm 2 tuần so với kế hoạch ban đầu vì phần tích hợp API thanh toán gặp lỗi liên tục."
      },
      {
        speaker: "Vân (Lead Dev)",
        text: "Đúng thế, đối tác phía cổng thanh toán vừa cập nhật tài liệu API mới mà không báo trước, làm hỏng toàn bộ cấu trúc định dạng webhook của chúng ta."
      },
      {
        speaker: "Hoàng (QA Lead)",
        text: "Tôi đã kiểm thử và thấy tỷ lệ phản hồi lỗi lên tới 70%. Nếu không giải quyết trước thứ Sáu, chúng ta sẽ lỡ đợt kiểm thử của khách hàng. Họ có thể phạt hợp đồng."
      },
      {
        speaker: "Mai (BA)",
        text: "Tôi đã cố liên hệ với bộ phận kỹ thuật của đối tác qua email và hotline suốt 2 ngày qua nhưng họ chỉ trả lời tự động rằng đang xử lý."
      },
      {
        speaker: "Nam (Project Manager)",
        text: "Thật sự bế tắc. Nếu không có giải pháp ngay lập tức, tuần sau ban giám đốc sẽ kiểm tra tiến độ và chúng ta sẽ chịu trách nhiệm hoàn toàn."
      },
      {
        speaker: "Vân (Lead Dev)",
        text: "Tôi có một phương án dự phòng là đổi sang cổng thanh toán thứ hai đã tích hợp sẵn từ dự án cũ, mất khoảng 3 ngày để cấu hình lại."
      },
      {
        speaker: "Hoàng (QA Lead)",
        text: "Đổi cổng thanh toán đồng nghĩa phải viết lại kịch bản kiểm thử, nhưng tôi nghĩ vẫn khả thi hơn là ngồi đợi đối tác hiện tại phản hồi."
      },
      {
        speaker: "Mai (BA)",
        text: "Đúng thế, tôi sẽ làm việc với bên Pháp lý để xem điều khoản phạt hợp đồng đối với bên đối tác chậm trễ hỗ trợ này."
      }
    ]
  },
  {
    id: "marketing-budget",
    name: "Cắt giảm 30% ngân sách Marketing",
    description: "Ban giám đốc cắt giảm đột ngột ngân sách, khiến chiến dịch ra mắt sản phẩm mới phải thay đổi toàn bộ kế hoạch truyền thông.",
    context: "Họp chiến dịch Marketing ra mắt sản phẩm mới trong điều kiện ngân sách bị cắt giảm đột ngột 30%, cần chiến lược thay thế KOLs lớn bằng KOC nhỏ.",
    lines: [
      {
        speaker: "Chi (Marketing Lead)",
        text: "Mọi người ơi, tin khẩn: ban giám đốc vừa phê duyệt ngân sách mới cho chiến dịch ra mắt sản phẩm vào tháng tới, nhưng bị cắt giảm 30% so với dự tính."
      },
      {
        speaker: "Minh (Creative Designer)",
        text: "Cắt giảm 30%? Thế thì toàn bộ kế hoạch thuê KOL hạng A để quay TVC quảng cáo coi như đổ bể. Chúng ta không đủ tiền trả chi phí bản quyền hình ảnh."
      },
      {
        speaker: "Thảo (Content Creator)",
        text: "Em nghĩ trong cái khó ló cái khôn. Thay vì dồn tiền cho 1 KOL lớn, mình có thể chia nhỏ ngân sách thuê 20-30 bạn KOC nhỏ (Micro-influencer) trên TikTok và Reels để phủ diện rộng."
      },
      {
        speaker: "Phong (Sales Lead)",
        text: "Bộ phận Kinh doanh cần lượng leads (khách hàng tiềm năng) đổ về ngay trong tuần đầu tiên khai trương. Liệu các KOC nhỏ có đủ sức tạo hiệu ứng bùng nổ doanh số không?"
      },
      {
        speaker: "Chi (Marketing Lead)",
        text: "KOC nhỏ thì chuyển đổi mua hàng thực tế rất tốt, nhưng độ nhận diện thương hiệu ban đầu sẽ thấp hơn. Đây là bài toán khó."
      },
      {
        speaker: "Thảo (Content Creator)",
        text: "Chúng ta có thể làm chương trình 'Trải nghiệm miễn phí' cho người dùng tự sáng tạo nội dung, tặng quà cho video lên xu hướng. Điều này kích thích lan tỏa tự nhiên mà chi phí rẻ."
      },
      {
        speaker: "Minh (Creative Designer)",
        text: "Nếu đi theo hướng KOC, tôi sẽ điều chỉnh các ấn phẩm thiết kế tập trung vào tính chân thực, đời thường thay vì bóng bẩy, sang chảnh như trước."
      }
    ]
  },
  {
    id: "security-gap",
    name: "Lỗ hổng bảo mật nghiêm trọng",
    description: "Quét bảo mật định kỳ phát hiện lỗ hổng nghiêm trọng ở lõi hệ thống ngân hàng số, đe dọa rò rỉ thông tin khách hàng.",
    context: "Họp khẩn của phòng vận hành hệ thống và an ninh mạng để vá lỗ hổng zero-day trong thư viện mã nguồn mở, nguy cơ rò rỉ dữ liệu.",
    lines: [
      {
        speaker: "Đức (Security Lead)",
        text: "Đội bảo mật vừa quét định kỳ tối qua và phát hiện một lỗ hổng thực thi mã từ xa (RCE) cực kỳ nghiêm trọng trong thư viện mã nguồn mở của cổng quản lý người dùng."
      },
      {
        speaker: "Tâm (Sysadmin)",
        text: "Thư viện đó nằm sâu trong core hệ thống. Nếu nâng cấp phiên bản mới để vá lỗi ngay bây giờ, có nguy cơ rất cao gây xung đột với module thanh toán và làm sập app."
      },
      {
        speaker: "Lan (Director)",
        text: "Hậu quả tồi tệ nhất là gì nếu chúng ta không vá ngay lập tức?"
      },
      {
        speaker: "Đức (Security Lead)",
        text: "Tin tặc có thể chiếm quyền kiểm soát máy chủ dữ liệu và tải về toàn bộ danh sách, thông tin số dư của hơn 100.000 khách hàng hoạt động."
      },
      {
        speaker: "Lan (Director)",
        text: "Trời đất! Điều đó là tuyệt đối không được phép xảy ra. Uy tín ngân hàng số của chúng ta sẽ bị hủy hoại hoàn toàn."
      },
      {
        speaker: "Tâm (Sysadmin)",
        text: "Chúng ta cần ít nhất 2 ngày để dựng môi trường thử nghiệm (Staging) để test xem bản vá có làm lỗi thanh toán hay không. Không thể nâng cấp bừa bãi trực tiếp lên môi trường Production."
      },
      {
        speaker: "Đức (Security Lead)",
        text: "Để tạm thời giảm thiểu rủi ro trong 2 ngày đó, tôi đề xuất chặn tạm thời dải IP lạ và kích hoạt tường lửa ứng dụng web (WAF) ở mức nghiêm ngặt nhất."
      },
      {
        speaker: "Lan (Director)",
        text: "Đồng ý. Hãy triển khai giải pháp tạm thời của Đức ngay lập tức, đồng thời Tâm cho chạy test không ngừng nghỉ trên Staging để vá lỗi triệt để."
      }
    ]
  }
];
