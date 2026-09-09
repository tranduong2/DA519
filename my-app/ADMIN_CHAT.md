# Chat nội bộ Admin

Vào **Admin Dashboard → Chat nội bộ Admin**, hoặc menu tài khoản admin → **Chat nội bộ Admin**.

## Chức năng

- Phòng Nhóm Admin và hội thoại riêng từng cặp admin đang hoạt động.
- Tạo nhóm tùy chọn: bấm biểu tượng nhóm cạnh “Tin nhắn”, nhập tên và chọn admin. Người tạo tự tham gia và là trưởng nhóm.
- Trưởng nhóm có thể mở **Thông tin hội thoại → Thêm thành viên**. Admin mới được xem lịch sử và gửi tin bình thường; admin ngoài nhóm không thể đọc tin hoặc ảnh của nhóm.
- Gửi/nhận tin nhắn, emoji và ảnh JPEG/PNG/GIF/WebP tối đa 2 MB mỗi tin.
- Xem ảnh lớn, trả lời, thả/bỏ cảm xúc, thu hồi tin của chính mình.
- Lịch sử lưu PostgreSQL, tải thêm 40 tin mỗi trang, số chưa đọc và trạng thái đã xem.
- Tìm thành viên; tìm nội dung trong các tin đã tải.
- Lưu bản nháp khi chuyển hội thoại trong cùng lần mở màn hình; giữ nội dung khi gửi lỗi.
- Web: Enter gửi, Shift+Enter xuống dòng. Mobile: nút gửi và chọn ảnh từ thư viện.
- Ba cột ở màn hình lớn; danh sách/chat/thông tin tách màn hình trên điện thoại.

## Chạy và triển khai

1. Cài dependency ở `my-app` và `my-app/dalat-api` bằng `npm install`.
2. Backend: giữ cấu hình `DATABASE_URL` hiện có, chạy `npm run build` và `npm start` trong `dalat-api`. Khi khởi động, API tự tạo bảng `admin_chat_groups`, `admin_chat_messages`, `admin_chat_reads`, `admin_chat_reactions` và chỉ mục. Không cần chạy SQL thủ công.
3. Frontend: `npx expo start` để chạy local, hoặc `npx expo export --platform web` để build web. `EXPO_PUBLIC_API_URL` phải trỏ tới API đã cập nhật. Với điện thoại thật chạy local, dùng địa chỉ LAN của máy chạy API thay vì localhost.
4. Nếu dùng app native đóng gói, build lại app sau khi thêm `expo-image-picker`. Cấu hình `FRONTEND_URL` phía API theo origin web đang sử dụng.

## Kiểm chứng

- `node node_modules/typescript/bin/tsc --noEmit` tại `my-app`.
- `npm run test:chat` tại `dalat-api`: dùng PostgreSQL chạy trong PGlite độc lập; không đọc hay sửa dữ liệu thật. Kiểm tra phân quyền, ảnh, chống tin trùng, trả lời, cảm xúc, đã đọc, thu hồi và phân trang.
- Kiểm tra giao diện cục bộ: build web/backend rồi chạy `node tests/chatPreview.cjs` tại `dalat-api`; mở `http://localhost:3039/DA519/`. Script này dùng tài khoản giả, dữ liệu tạm trong bộ nhớ và chỉ lắng nghe loopback. Không dùng script preview để triển khai.

## Phạm vi hiện tại

Tin nhắn tự đồng bộ mỗi 3 giây khi trang chat đang mở và ứng dụng đang hoạt động. Chưa có push notification khi đóng app, gọi thoại/video, ghi âm hoặc gửi tài liệu. Trạng thái đã xem ghi nhận khi hội thoại được mở và tải tin thành công.

Nếu `/admin/chat/rooms` trả 404: frontend đang gọi backend phiên bản cũ. Cần để Render deploy commit mới từ nhánh `master`, root directory `my-app/dalat-api`, build `npm ci --include=dev && npm run build`, start `npm start`. Sau khi triển khai đúng, gọi endpoint không có token sẽ trả 401 thay vì 404.

Ảnh được lưu trong PostgreSQL để tồn tại qua lần khởi động lại API; chỉ admin thuộc hội thoại mới tải được ảnh. Với lượng ảnh lớn, nên chuyển sang object storage riêng tư. Web đã kiểm tra trực tiếp ở 1280px và 390px; cần kiểm tra bộ chọn ảnh/bàn phím trên thiết bị Android/iOS thật trước khi phát hành native.

Bốn bảng chat đều tự bật RLS khi backend khởi động và thu hồi quyền của `PUBLIC`, `anon`, `authenticated`. Dự án không tạo policy Supabase Auth cho các bảng này vì frontend không truy cập Supabase trực tiếp; toàn bộ quyền admin và thành viên nhóm được kiểm tra ở Express. `DATABASE_URL` phải tiếp tục dùng tài khoản `postgres` của Supabase như file `.env.example` để backend có thể truy cập sau khi bật RLS.

## Chatbot AI tổng quát

Ứng dụng có nút **AI** nổi trên web và mobile. Chatbot giữ lịch sử trong lần mở ứng dụng, có nút tạo cuộc trò chuyện mới và không lưu nội dung vào PostgreSQL.

Trên Render, thêm biến bí mật `ANTHROPIC_API_KEY`; có thể đặt `ANTHROPIC_MODEL=claude-sonnet-4-6`. Không đặt khóa API trong biến bắt đầu bằng `EXPO_PUBLIC_`. Sau khi backend được triển khai lại, endpoint `/api/ai-chat` sẽ hoạt động. Chạy `npm run test:ai` trong `dalat-api` để kiểm tra phần tích hợp mà không gọi API thật.

Để dùng gói miễn phí, thêm `GROQ_API_KEY` và `GROQ_MODEL=openai/gpt-oss-20b` trên Render. Backend ưu tiên Groq khi có khóa; nếu không có khóa Groq thì mới dùng Anthropic. Không đặt khóa Groq trong frontend hoặc biến bắt đầu bằng `EXPO_PUBLIC_`.

Kiến thức kinh doanh hiện được cấu hình cho chatbot: FreshVeggies chỉ bán rau và chỉ giao trong khu vực Đà Lạt để bảo đảm rau còn tươi. Chatbot sẽ từ chối lịch sự các yêu cầu giao ngoài Đà Lạt hoặc mua mặt hàng không phải rau, đồng thời không tự bịa giá và tồn kho.
