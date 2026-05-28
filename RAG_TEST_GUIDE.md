# CaloCare RAG — Hướng dẫn Test Thủ Công

## Chuẩn bị

- Backend đang chạy (`npm run dev` trong `calocare-BE`)
- Frontend đang chạy (`npm run dev` trong `calocare-FE`)
- Đã đăng nhập tài khoản (bất kỳ tier nào)
- Tài khoản **premium/pro** để test Chat và Meal Plan

---

## 1. Smart Search Bar

**Vị trí:** Trang Food Diary hoặc bất kỳ trang nào có `<SmartSearchBar />`

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 1.1 | Gõ `"pho"` vào ô search | Dropdown hiện sau 350ms với danh sách món, có badge `Thực phẩm` / `Công thức` / `USDA` |
| 1.2 | Gõ `"chicken breast"` | Kết quả tiếng Anh từ USDA, badge màu vàng `USDA` |
| 1.3 | Gõ `"rau muong"` | Hiện `kcal/100g`, tag `🌿 Chay` nếu là rau |
| 1.4 | Gõ 1 ký tự (vd `"a"`) | Không có dropdown (cần ≥ 2 ký tự) |
| 1.5 | Đang gõ (chưa có kết quả) | Hiện **4 skeleton rows** loading |
| 1.6 | Nhấn `X` | Xoá query, đóng dropdown |
| 1.7 | Click ngoài dropdown | Dropdown đóng |

---

## 2. RAG Scanner (FoodDiary)

**Vị trí:** Trang `/diary` — nút camera màu xanh `bottom-right`

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 2.1 | Nhấn nút camera (FAB xanh lá, góc dưới phải) | Modal `RAG Food Scanner` mở |
| 2.2 | Nhấn "Chụp ảnh" hoặc "Thư viện" | File picker mở |
| 2.3 | Chọn ảnh **cơm trắng** | Hiện spinner "Đang phân tích..." → Card xanh lá với tên món + kcal/100g |
| 2.4 | Chọn ảnh **gà nướng** | Card xanh: tên EN/VI, % khớp, P/C/F nutrition |
| 2.5 | Chọn ảnh **món lạ / không rõ** | Card vàng "AI Estimate" với kcal ước tính |
| 2.6 | Nhấn "Thêm vào nhật ký" | Toast "Đã thêm vào nhật ký", modal đóng, entry xuất hiện trong diary |
| 2.7 | Nhấn "Scan lại" | Xoá ảnh, về màn hình upload |
| 2.8 | Vào `/diary?action=scan` | Modal scanner tự mở |

---

## 3. Chatbot Widget

**Vị trí:** Nút tròn gradient góc dưới phải (chỉ hiện khi đã đăng nhập)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 3.1 | Nhấn nút chat | Panel 340×480px mở lên |
| 3.2 | Thấy Quick Prompts | 4 nút gợi ý hiện khi chưa có tin nhắn |
| 3.3 | Click "Gợi ý bữa sáng lành mạnh" | AI trả lời stream (từng chữ hiện ra) |
| 3.4 | Gõ `"100g ức gà bao nhiêu calo?"` | Trả lời chính xác (~165 kcal) — **FAQ mode** |
| 3.5 | Gõ `"Hôm nay tôi ăn bao nhiêu calo?"` | AI đọc food diary của user — **Personal mode** |
| 3.6 | Gõ `"Thêm 200g cơm trắng vào bữa trưa"` | AI gọi function, thêm entry — **Action mode** |
| 3.7 | Nhấn nút ⬛ Stop khi AI đang trả lời | Stream dừng, không có error toast |
| 3.8 | Nhấn 🗑️ Trash | Xoá toàn bộ hội thoại |
| 3.9 | Tắt mạng → gõ tin nhắn | Sau 30s: toast đỏ "CaloCare AI không phản hồi — Kiểm tra kết nối mạng" |

---

## 4. Dietary Preferences (Settings)

**Vị trí:** `/settings` → phần "Tuỳ chọn ăn uống (AI)"

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 4.1 | Chọn "Thuần chay" | Radio chuyển sang Vegan |
| 4.2 | Click "Sữa" trong danh sách dị ứng | Tag đổi màu đỏ, có dấu X |
| 4.3 | Gõ dị ứng tự do + Enter | Tag mới xuất hiện trong danh sách |
| 4.4 | Click "Vietnamese", "Japanese" | Tag cuisine bật/tắt màu primary |
| 4.5 | Nhấn "Lưu tuỳ chọn" | Toast "Đã lưu tuỳ chọn ăn uống" |
| 4.6 | Reload trang | Preferences vẫn được giữ nguyên |

---

## 5. Generate Meal Plan

**Vị trí:** `/meal-plan` → tab "Tạo mới"

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 5.1 | Chọn "Giảm cân", 7 ngày → Tạo | Progress bar chạy, từng ngày hiện ra lần lượt |
| 5.2 | Đang generate → thấy Day cards | Mỗi card hiện tên món + kcal + P/C/F |
| 5.3 | Generate xong | Nút "Áp dụng kế hoạch" xuất hiện |
| 5.4 | Nhấn "Áp dụng" | POST lên server, chuyển sang tab "Kế hoạch hiện tại" |
| 5.5 | **Free account** → nhấn Tạo | Toast hoặc lỗi "feature_locked" (0 lượt/ngày) |

---

## 6. Admin — RAG Foods

**Vị trí:** `/admin/rag-foods` (cần role admin)

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 6.1 | Mở trang | Bảng USDA foods chờ duyệt, badge đỏ trên nav |
| 6.2 | Nhấn ✅ Approve | Dòng biến mất, badge count giảm 1 |
| 6.3 | Nhấn 🗑️ Reject | Dòng biến mất |
| 6.4 | Filter "USDA" | Chỉ hiện foods từ USDA |

---

## 7. Admin — Enrichment Queue

**Vị trí:** `/admin/enrichment-queue`

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 7.1 | Mở trang | Danh sách jobs với status chips |
| 7.2 | Filter "pending" | Chỉ hiện jobs chưa chạy |
| 7.3 | Filter "failed" | Hiện jobs lỗi với icon ❌ |

---

## 8. Rate Limiting

| # | Thao tác | Kết quả mong đợi |
|---|----------|-----------------|
| 8.1 | **Free** — search >20 lần/ngày | HTTP 429, message giới hạn |
| 8.2 | **Free** — mở chatbot → gửi 6 tin nhắn | Lần thứ 6 bị block (5 lượt/ngày) |
| 8.3 | **Free** — nhấn Tạo Meal Plan | Block ngay (0 lượt/ngày free) |

---

## Ghi chú

- Log RAG được ghi vào `calocare-BE/logs/rag.log` — xem để debug latency
- Chạy backend test: `TOKEN=<jwt> bash scripts/test-rag.sh`
- Lấy JWT token: F12 → Application → localStorage → `access_token`
