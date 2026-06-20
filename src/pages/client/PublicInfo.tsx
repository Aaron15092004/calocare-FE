import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, HeartHandshake, ShieldCheck, FileText } from "lucide-react";

const CONTENT = {
  "/privacy": {
    icon: ShieldCheck,
    eyebrow: "CaloVie Privacy",
    title: "Chính sách quyền riêng tư",
    intro: "CaloVie dùng dữ liệu bạn cung cấp để cá nhân hóa nhật ký ăn uống, kế hoạch bữa ăn và gợi ý sức khỏe.",
    points: [
      "Thông tin hồ sơ, nhật ký ăn uống và mục tiêu dinh dưỡng được lưu để cung cấp các tính năng của CaloVie.",
      "Camera, ảnh và vị trí chỉ được yêu cầu khi bạn chủ động dùng quét món ăn hoặc tìm quán gần đây.",
      "Dữ liệu gửi cho dịch vụ AI chỉ nhằm tạo câu trả lời hoặc phân tích bạn yêu cầu; CaloVie không dùng AI để chẩn đoán bệnh.",
      "Bạn có thể chỉnh sửa hoặc xóa tài khoản và dữ liệu liên quan trong phần Hồ sơ.",
    ],
  },
  "/terms": {
    icon: FileText,
    eyebrow: "CaloVie Terms",
    title: "Điều khoản sử dụng",
    intro: "CaloVie là công cụ hỗ trợ theo dõi dinh dưỡng và xây dựng thói quen sức khỏe cá nhân.",
    points: [
      "Nội dung AI và số liệu dinh dưỡng mang tính hỗ trợ, không thay thế chẩn đoán hay tư vấn của bác sĩ.",
      "Bạn chịu trách nhiệm kiểm tra dị ứng, thành phần món ăn và quyết định liên quan đến sức khỏe của mình.",
      "Subscription được quản lý theo điều khoản của App Store, Google Play hoặc phương thức thanh toán trên web tương ứng.",
      "Bạn có thể ngừng sử dụng hoặc xóa tài khoản bất cứ lúc nào.",
    ],
  },
  "/support": {
    icon: HeartHandshake,
    eyebrow: "CaloVie Support",
    title: "Trợ giúp và hỗ trợ",
    intro: "Nếu cần hỗ trợ về tài khoản, subscription hoặc dữ liệu, hãy gửi yêu cầu từ ứng dụng hoặc liên hệ đội ngũ CaloVie.",
    points: [
      "Trong app: Hồ sơ > Trợ giúp & hỗ trợ.",
      "Khi gửi yêu cầu, không chia sẻ mật khẩu, mã xác thực hoặc thông tin thanh toán nhạy cảm.",
      "Với vấn đề sức khỏe khẩn cấp, hãy liên hệ cơ sở y tế gần nhất thay vì chờ phản hồi từ CaloVie.",
    ],
  },
} as const;

export default function PublicInfo() {
  const location = useLocation();
  const content = CONTENT[location.pathname as keyof typeof CONTENT] || CONTENT["/privacy"];
  const Icon = content.icon;
  return (
    <main className="min-h-screen px-5 py-10 sm:py-16">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-card p-7 shadow-ios-sm sm:p-10">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />CaloVie</Link>
        <div className="mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-7 w-7" /></div>
        <p className="mt-5 text-sm font-semibold text-primary">{content.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">{content.title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{content.intro}</p>
        <div className="mt-7 space-y-3">
          {content.points.map((point) => <p key={point} className="rounded-xl bg-muted/45 px-4 py-3 text-sm leading-6 text-muted-foreground">{point}</p>)}
        </div>
        <Link to="/delete-account" className="mt-8 inline-flex text-sm font-semibold text-destructive underline underline-offset-4">Xóa tài khoản CaloVie</Link>
      </section>
    </main>
  );
}
