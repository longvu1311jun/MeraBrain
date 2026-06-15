# Checklist triển khai hệ thống Lark Bot AI

Quy ước:

- `[x]` Đã hoàn thành
- `[ ]` Chưa hoàn thành

## 1. Chuẩn bị dự án

- [x] Xóa project cũ và giữ lại Git history.
- [x] Commit trạng thái xây lại ban đầu với message `Xây lại`.
- [x] Tạo `FLOW.md` mô tả luồng hệ thống.
- [x] Cập nhật `FLOW.md` sang tiếng Việt có dấu.
- [x] Bổ sung lựa chọn backend stack vào `FLOW.md`.
- [x] Tạo `checklist.md` để theo dõi tiến độ.

## 2. Thông tin cần bạn cung cấp

- [x] Đã đọc `raw/api-1.yaml`.
- [x] Xác định `raw/api-1.yaml` là OpenAPI 3.1.0 cho `Pancake POS Open API`, base URL `https://pos.pages.fm/api/v1`.
- [x] Xác định file có auth bằng query `api_key`, không phải tenant access token của Lark.
- [x] Xác định file có webhook của Pancake POS tại `PUT /shops/{SHOP_ID}` để cấu hình `webhook_url`, `webhook_types`, `webhook_headers`.
- [x] Xác định file không có API Lark Bot message, Lark Drive, tenant access token, challenge, encryption hoặc API gửi message về Lark.
- [x] Đã bổ sung và đọc tài liệu chính thức Lark từ `open.larksuite.com`.
- [x] Đã đọc toàn bộ menu `Develop a Bot App`: Introduction, Preparation, Step 1, Step 2, Step 3, Step 4, Code explanation, Related documents.
- [x] Đã đọc tài liệu API Lark cho event bot message `im.message.receive_v1`.
- [x] Đã đọc tài liệu Lark cho webhook challenge/URL verification.
- [x] Đã đọc tài liệu Lark cho Verification Token.
- [x] Đã đọc tài liệu Lark cho Encrypt Key, signature verification và AES-256-CBC decrypt.
- [x] Đã đọc tài liệu Lark để lấy `tenant_access_token` cho custom app.
- [x] Đã đọc tài liệu Lark để gửi message về chat.
- [x] Đã đọc tài liệu Lark để reply vào message/thread.
- [x] Đã đọc tài liệu Lark về cấu trúc `content` khi gửi text/post/card/file message.
- [x] Đã đọc tài liệu Lark để list folder/file trong Lark Drive.
- [x] Đã đọc tài liệu Lark để lấy metadata file/folder trong Lark Drive.
- [x] Đã đọc tài liệu Lark để download file binary trong Lark Drive.
- [x] Đã đọc tài liệu Lark để export online docs/sheets sang docx/pdf/xlsx/csv.
- [x] Đã đọc tài liệu Lark để query export task và download exported file.
- [x] Xác định quyền Lark tối thiểu cho bot nhận/gửi message: bật Bot capability, subscribe `im.message.receive_v1`, xin quyền nhận message phù hợp và quyền gửi message `im:message` hoặc `im:message:send_as_bot`/`im:message:send`.
- [x] Xác định quyền Lark Drive tối thiểu cần kiểm tra: `drive:drive:readonly` hoặc quyền tương đương cho list/download, `drive:drive.metadata:readonly` cho metadata, `drive:export:readonly` cho export online docs.
- [x] App ID của Lark app đã được cung cấp qua ảnh, không ghi vào file tracked.
- [x] App Secret của Lark app đã được cung cấp qua ảnh, không ghi vào file tracked.
- [ ] Verification Token của Lark webhook.
- [ ] Encrypt Key nếu Lark webhook bật encryption.
- [ ] Danh sách scopes/permissions đã cấp cho Lark app.
- [ ] Một folder URL hoặc folder token mẫu trong Lark Drive.
- [ ] Một event mẫu khi user nhắn text cho bot.
- [ ] Một event mẫu có link folder/file nếu có.
- [ ] Supabase Project URL.
- [ ] Supabase Service Role Key.
- [ ] Vercel project/org muốn deploy.
- [ ] AI provider và model muốn dùng.
- [ ] API key của AI provider.
- [ ] Một vài file tài liệu mẫu hoặc mô tả loại file chính trong folder.

## 2.1. Nguồn tài liệu Lark đã đọc

- [x] Bot quick-start: `https://open.larksuite.com/document/home/develop-a-bot-in-5-minutes/create-an-app`
- [x] Bot overview: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/bot-v3/bot-overview`
- [x] Event subscription overview: `https://open.larksuite.com/document/ukTMukTMukTM/uUTNz4SN1MjL1UzM`
- [x] Send events to developer server: `https://open.larksuite.com/document/ukTMukTMukTM/uYDNxYjL2QTM24iN0EjN/event-subscription-configure-/choose-a-subscription-mode/send-notifications-to-developers-server`
- [x] Receive/decrypt events and verify signature: `https://open.larksuite.com/document/ukTMukTMukTM/uYDNxYjL2QTM24iN0EjN/event-subscription-configure-/encrypt-key-encryption-configuration-case`
- [x] Receive message event: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/events/receive`
- [x] Tenant access token for custom app: `https://open.larksuite.com/document/ukTMukTMukTM/ukDNz4SO0MjL5QzM/auth-v3/auth/tenant_access_token_internal`
- [x] Send message: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/create`
- [x] Reply message: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/reply`
- [x] Message content structure: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/im-v1/message/create_json`
- [x] Drive list folder files: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/file/list`
- [x] Drive metadata batch query: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/meta/batch_query`
- [x] Drive download file: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/file/download`
- [x] Drive create export task: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/export_task/create`
- [x] Drive query export task: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/export_task/get`
- [x] Drive download exported file: `https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/export_task/download`

## 3. Khởi tạo backend

- [x] Tạo Next.js App Router project.
- [x] Cấu hình TypeScript.
- [ ] Cấu hình ESLint/format cơ bản.
- [x] Tạo `.env.example` không chứa secret thật.
- [x] Tạo `.gitignore` để không commit `.env.local`, `.next`, `node_modules`.
- [x] Tạo `lib/env.ts` để validate biến môi trường bằng manual validation.
- [x] Tạo route `GET /api/health`.
- [x] Cấu hình `vercel.json` cho `maxDuration` của webhook route.
- [x] Cài dependencies và tạo `package-lock.json`.
- [x] Build Next.js thành công.
- [x] Typecheck TypeScript thành công.

## 4. Supabase

- [ ] Thiết kế schema chính thức dựa trên database draft.
- [ ] Tạo migration cho `lark_users`.
- [ ] Tạo migration cho `lark_folders`.
- [ ] Tạo migration cho `lark_files`.
- [ ] Tạo migration cho `document_chunks`.
- [ ] Tạo migration cho `ai_jobs`.
- [ ] Tạo migration cho `job_sources`.
- [ ] Bật RLS cho các bảng public nếu expose qua Data API.
- [ ] Tạo policy hoặc quyết định chỉ dùng service role từ backend.
- [ ] Tạo `lib/supabase.ts` cho server client.
- [ ] Tạo helper tạo job, cập nhật status, lưu response và lưu lỗi.
- [ ] Kiểm tra migration chạy được trên Supabase.

## 5. Lark webhook

- [x] Tạo route `POST /api/lark/events`.
- [x] Xử lý Lark challenge request.
- [x] Verify webhook token/signature theo tài liệu Lark.
- [x] Giải mã payload nếu Lark bật encryption.
- [x] Parse text message event.
- [x] Parse `message_id`, `chat_id`, `sender_id`, `tenant_key`.
- [ ] Chống xử lý trùng event/message.
- [ ] Lưu job vào Supabase khi nhận prompt hợp lệ.
- [ ] Gửi ACK nhanh rồi xử lý reply bằng background/processor.
- [ ] Gửi message báo "Đã nhận yêu cầu, đang xử lý" nếu cần.
- [x] Reply echo lại tin nhắn text để test bot nhận/gửi được message.

## 6. Lark API client

- [x] Tạo `lib/lark.ts`.
- [x] Implement lấy tenant access token.
- [x] Cache token theo thời gian hết hạn.
- [x] Implement gửi text message về chat.
- [x] Implement reply theo message/thread nếu API hỗ trợ.
- [ ] Implement parse folder/file token từ Lark URL.
- [ ] Implement list file trong folder.
- [ ] Implement list folder đệ quy nếu cần.
- [ ] Implement download/export file từ Lark Drive.
- [x] Chuẩn hóa lỗi từ Lark API để dễ debug.

## 7. Xử lý tài liệu

- [ ] Tạo `lib/documents.ts`.
- [ ] Hỗ trợ đọc text/markdown/csv.
- [ ] Hỗ trợ trích xuất PDF.
- [ ] Hỗ trợ trích xuất DOCX.
- [ ] Hỗ trợ trích xuất XLSX.
- [ ] Hỗ trợ export/đọc Lark native doc nếu API cho phép.
- [ ] Hỗ trợ export/đọc Lark native sheet nếu API cho phép.
- [ ] Tạo hash nội dung file để cache.
- [ ] Chia nội dung thành chunks theo kích thước token hợp lý.
- [ ] Lưu metadata file vào `lark_files`.
- [ ] Lưu chunks vào `document_chunks`.
- [ ] Dùng cache nếu `file_token` và `updated_time` chưa đổi.

## 8. AI và retrieval

- [ ] Tạo `lib/ai.ts`.
- [ ] Chọn AI provider và model mặc định.
- [ ] Viết system prompt cho bot.
- [ ] Format context tài liệu kèm source metadata.
- [ ] Gọi AI để trả lời prompt người dùng.
- [ ] Lưu response vào `ai_jobs`.
- [ ] Lưu source đã dùng vào `job_sources`.
- [ ] Xử lý lỗi AI provider rõ ràng.
- [ ] Giới hạn token/context để tránh quá tải.
- [ ] Cân nhắc thêm embedding nếu tài liệu nhiều.
- [ ] Nếu dùng embedding, tạo index/vector search trên Supabase.

## 9. Job processor

- [ ] Tạo route `POST /api/jobs/process`.
- [ ] Bảo vệ route bằng `INTERNAL_JOB_SECRET`.
- [ ] Lấy job `queued` từ Supabase.
- [ ] Cập nhật status `processing`.
- [ ] Đọc folder/file target của job.
- [ ] Đồng bộ/cập nhật cache tài liệu.
- [ ] Chọn context phù hợp cho prompt.
- [ ] Gọi AI.
- [ ] Gửi kết quả về Lark.
- [ ] Cập nhật status `completed`.
- [ ] Cập nhật status `failed` và lưu lỗi nếu có exception.

## 10. Đồng bộ folder

- [ ] Tạo route `POST /api/lark/sync-folder`.
- [ ] Bảo vệ route bằng secret.
- [ ] Cho phép sync folder thủ công.
- [ ] Cấu hình cron sync nếu cần.
- [ ] Log số file mới, file đổi, file lỗi.
- [ ] Không tải lại file nếu cache còn hợp lệ.

## 11. Bảo mật

- [ ] Không commit secret vào Git.
- [ ] Đưa secret thật vào Vercel Environment Variables.
- [ ] Không expose `SUPABASE_SERVICE_ROLE_KEY` ra client.
- [ ] Verify request Lark trước khi tạo job.
- [ ] Verify route nội bộ bằng `INTERNAL_JOB_SECRET`.
- [ ] Giới hạn log raw event để tránh lộ token hoặc dữ liệu nhạy cảm.
- [ ] Chuẩn hóa error response không lộ stack trace cho người dùng.
- [ ] Kiểm tra RLS/policy Supabase trước khi deploy production.

## 12. Kiểm thử

- [x] Test build Next.js.
- [x] Test TypeScript typecheck.
- [ ] Test `GET /api/health` với env thật.
- [ ] Test Lark challenge request.
- [ ] Test event user nhắn text cho bot.
- [ ] Test tạo job trong Supabase.
- [ ] Test lấy tenant access token Lark.
- [ ] Test list file trong folder Lark Drive.
- [ ] Test download/export file mẫu.
- [ ] Test parse PDF/DOCX/XLSX nếu có file mẫu.
- [ ] Test gọi AI với context nhỏ.
- [ ] Test gửi message kết quả về Lark.
- [ ] Test retry hoặc xử lý lỗi khi Lark API lỗi.
- [ ] Test duplicate event không tạo job trùng.

## 13. Deploy Vercel

- [ ] Tạo hoặc liên kết Vercel project.
- [ ] Cấu hình environment variables trên Vercel.
- [ ] Deploy preview.
- [ ] Kiểm tra runtime logs.
- [ ] Cấu hình webhook URL trong Lark app.
- [ ] Test end-to-end trên deployment thật.
- [ ] Deploy production.

## 14. Nâng cấp sau MVP

- [ ] Thêm dashboard quản trị job/log nếu cần.
- [ ] Thêm phân quyền theo user/chat/folder.
- [ ] Thêm embedding và semantic search cho folder lớn.
- [ ] Thêm trích dẫn nguồn rõ ràng trong câu trả lời.
- [ ] Thêm cơ chế chia message hoặc gửi file markdown khi kết quả dài.
- [ ] Thêm retry/backoff cho Lark API, Supabase và AI provider.
- [ ] Thêm monitoring chi phí AI/token.
- [ ] Thêm cảnh báo khi sync folder lỗi.
