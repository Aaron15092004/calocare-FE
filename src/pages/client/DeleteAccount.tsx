import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShieldCheck, Trash2 } from "lucide-react";

export default function DeleteAccount() {
  return (
    <main className="min-h-screen px-5 py-10 sm:py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-border/70 bg-card p-7 shadow-ios-sm sm:p-10">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <Trash2 className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold text-primary">CaloVie</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">Xóa tài khoản</h1>
        <p className="mt-3 leading-6 text-muted-foreground">
          Bạn có thể xóa tài khoản CaloVie và dữ liệu liên quan bất cứ lúc nào. Đây là thao tác vĩnh viễn.
        </p>

        <div className="mt-7 space-y-4 rounded-2xl bg-muted/45 p-5 text-sm text-muted-foreground">
          <p><strong className="text-foreground">1. Đăng nhập</strong> bằng tài khoản bạn muốn xóa.</p>
          <p><strong className="text-foreground">2. Mở Hồ sơ</strong> và chọn “Xóa tài khoản” trong mục Tài khoản & quyền riêng tư.</p>
          <p><strong className="text-foreground">3. Xác nhận</strong> để xóa nhật ký, kế hoạch, báo cáo và dữ liệu tài khoản.</p>
        </div>

        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Subscription đã mua cần được hủy riêng trong App Store hoặc Google Play để tránh gia hạn tiếp.</p>
        </div>

        <Link to="/auth" className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-destructive px-5 font-bold text-destructive-foreground transition-opacity hover:opacity-90">
          Đăng nhập để xóa tài khoản <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />CaloVie chỉ xử lý yêu cầu xóa sau khi xác minh đúng tài khoản.</div>
      </section>
    </main>
  );
}
