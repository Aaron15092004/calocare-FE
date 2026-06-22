import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

const EFFECTIVE_DATE = "22 tháng 6, 2026";

const SECTIONS = [
  {
    title: "1. Dữ liệu CaloVie có thể xử lý",
    items: [
      "Thông tin tài khoản: email, tên hiển thị và ảnh đại diện nếu bạn chọn tải lên hoặc đăng nhập bằng nhà cung cấp tương ứng.",
      "Hồ sơ dinh dưỡng: độ tuổi, giới tính, chiều cao, cân nặng, mục tiêu, mức độ hoạt động và các lựa chọn ăn uống bạn tự cung cấp.",
      "Dữ liệu sử dụng tính năng: nhật ký món ăn, kế hoạch bữa ăn, công thức, yêu thích, lịch sử trò chuyện với trợ lý và thông tin quán ăn bạn xem hoặc lưu.",
      "Ảnh món ăn hoặc mã vạch chỉ khi bạn chủ động chọn quét; vị trí chỉ khi bạn yêu cầu tìm quán ăn gần bạn.",
      "Trạng thái gói thành viên và giao dịch cần thiết để cung cấp quyền lợi Premium hoặc Family. CaloVie không lưu thông tin thẻ thanh toán của bạn.",
    ],
  },
  {
    title: "2. Mục đích sử dụng",
    items: [
      "Cá nhân hóa mục tiêu calo, nhật ký, thực đơn, báo cáo và gợi ý quán ăn phù hợp hơn với bạn.",
      "Cung cấp, bảo vệ, sửa lỗi và cải thiện các tính năng bạn yêu cầu.",
      "Xác minh gói thành viên, hỗ trợ khách hàng, ngăn chặn gian lận và tuân thủ nghĩa vụ pháp lý khi cần thiết.",
    ],
  },
  {
    title: "3. Camera, ảnh và vị trí",
    items: [
      "CaloVie chỉ yêu cầu quyền camera hoặc thư viện ảnh khi bạn chọn quét món ăn, mã vạch hay tải ảnh đại diện.",
      "Quyền vị trí chỉ được yêu cầu khi bạn chọn tìm quán ăn gần đây. Bạn có thể từ chối hoặc tắt từng quyền trong Cài đặt thiết bị.",
      "Bạn nên kiểm tra khẩu phần và thông tin dinh dưỡng trước khi lưu; kết quả AI là hỗ trợ theo dõi, không phải chẩn đoán y khoa.",
    ],
  },
  {
    title: "4. AI, đối tác và chia sẻ dữ liệu",
    items: [
      "Khi bạn dùng AI scan, tạo thực đơn hoặc trò chuyện với trợ lý, nội dung cần thiết cho yêu cầu đó có thể được gửi tới nhà cung cấp hạ tầng và AI để tạo kết quả.",
      "CaloVie chỉ chia sẻ dữ liệu với nhà cung cấp dịch vụ cần thiết để vận hành sản phẩm, xử lý thanh toán trong App Store hoặc Google Play, lưu trữ ảnh, phân tích hoặc hiển thị quảng cáo theo lựa chọn của bạn.",
      "Chúng tôi không bán thông tin cá nhân của bạn. Dữ liệu được chia sẻ trong phạm vi cần thiết để cung cấp tính năng hoặc khi pháp luật yêu cầu.",
    ],
  },
  {
    title: "5. Lưu trữ, kiểm soát và xóa dữ liệu",
    items: [
      "Bạn có thể chỉnh sửa hồ sơ, mục tiêu và các quyền thiết bị trong ứng dụng hoặc trong phần Cài đặt của thiết bị.",
      "Bạn có thể yêu cầu xóa tài khoản và dữ liệu liên quan trực tiếp tại trang Xóa tài khoản. Đây là thao tác vĩnh viễn sau khi xác minh tài khoản.",
      "Một số dữ liệu tối thiểu có thể được giữ trong thời gian cần thiết để giải quyết giao dịch, tranh chấp, phòng chống gian lận hoặc theo yêu cầu pháp luật.",
    ],
  },
  {
    title: "6. Bảo mật và cập nhật chính sách",
    items: [
      "CaloVie áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu. Không có phương thức truyền tải hoặc lưu trữ điện tử nào an toàn tuyệt đối.",
      "Chính sách này có thể được cập nhật khi tính năng hoặc quy định thay đổi. Phiên bản mới sẽ được công bố tại trang này cùng ngày hiệu lực.",
    ],
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Chính sách quyền riêng tư | CaloVie";
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-14">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-ios-sm">
        <header className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-emerald-50/60 px-6 py-8 sm:px-10 sm:py-11">
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-75">
            <ArrowLeft className="h-4 w-4" /> Về trang đăng nhập
          </Link>
          <div className="mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">CaloVie Privacy</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Chính sách quyền riêng tư</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Chính sách này giải thích cách CaloVie xử lý dữ liệu khi bạn dùng ứng dụng và các dịch vụ liên quan.
          </p>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">Có hiệu lực từ: {EFFECTIVE_DATE}</p>
        </header>

        <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
          <section className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
            <p className="text-sm font-semibold leading-6 text-foreground">
              CaloVie là công cụ hỗ trợ theo dõi dinh dưỡng và xây dựng thói quen. Chúng tôi chỉ xử lý dữ liệu cần thiết để cung cấp tính năng bạn chọn sử dụng.
            </p>
          </section>

          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{section.title}</h2>
              <ul className="mt-3 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="rounded-2xl bg-muted/45 px-5 py-5">
            <h2 className="flex items-center gap-2 text-base font-bold"><Mail className="h-4 w-4 text-primary" /> Liên hệ về quyền riêng tư</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nếu có câu hỏi về dữ liệu hoặc cần hỗ trợ xóa tài khoản, hãy gửi yêu cầu qua trang hỗ trợ của CaloVie. Không gửi mật khẩu, mã xác thực hay thông tin thanh toán nhạy cảm trong nội dung hỗ trợ.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <Link to="/support" className="text-primary underline underline-offset-4">Trợ giúp & hỗ trợ</Link>
              <Link to="/delete-account" className="text-destructive underline underline-offset-4">Xóa tài khoản</Link>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
