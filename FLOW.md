# Flow hệ thống Lark Bot AI

## Mục tiêu

Xây dựng hệ thống cho phép người dùng nhắn prompt qua Lark Bot. Backend chạy trên Vercel sẽ nhận sự kiện từ Lark, lấy dữ liệu trong một folder Lark Drive, đưa prompt và dữ liệu liên quan cho AI xử lý, lưu trạng thái vào Supabase, sau đó trả kết quả về lại chat Lark bằng bot.

## Thành phần chính

1. Lark Bot
   - Nhận tin nhắn từ người dùng trong chat.
   - Gửi event message đến webhook backend.
   - Gửi kết quả xử lý về chat qua API của Lark.

2. Vercel Backend
   - Endpoint webhook nhận event từ Lark.
   - Endpoint job processor xử lý tác vụ AI.
   - Module Lark API để lấy token, đọc Drive, tải file và gửi message.
   - Module AI để đọc context, tạo câu trả lời và format kết quả.

3. Supabase
   - Lưu request/job, user, folder config, file metadata và log xử lý.
   - Có thể lưu cache nội dung file, chunks và embedding nếu cần truy vấn nhiều tài liệu.
   - Dùng service role key ở server only, không đưa vào client.

4. Lark Drive
   - Folder nguồn chứa tài liệu cần AI đọc.
   - Backend dùng quyền của app/bot để list file, download file và cập nhật cache.

5. AI Provider
   - Nhận prompt người dùng và context tài liệu.
   - Trả về kết quả dạng text/markdown phù hợp để gửi lại Lark.

## Backend dùng gì

Backend nên dùng stack sau:

1. Framework
   - Next.js App Router chạy trên Vercel.
   - Dùng Route Handlers trong `app/api/**/route.ts` để tạo các endpoint webhook, processor, sync và health check.
   - Toàn bộ backend viết bằng TypeScript.

2. Runtime
   - Dùng Node.js runtime cho các endpoint chính.
   - Không dùng Edge runtime cho phần xử lý chính vì cần thư viện Node.js để parse file, gọi Supabase, xử lý crypto/encryption của Lark và có thể cần tải file binary.
   - Cấu hình `maxDuration` trên Vercel cho các route xử lý dài nếu cần.

3. Thư viện chính
   - `@supabase/supabase-js` để ghi/đọc dữ liệu Supabase từ server.
   - `openai` hoặc Vercel AI SDK để gọi AI.
   - `zod` để validate env, request body và payload Lark.
   - `pdf-parse`, `mammoth`, `xlsx` hoặc thư viện tương đương để trích xuất nội dung PDF, DOCX, XLSX.
   - Dùng `fetch` native của Node.js để gọi Lark API, bọc lại bằng module riêng `lib/lark`.

4. Kiến trúc code đề xuất
   - `app/api/lark/events/route.ts`: nhận webhook từ Lark.
   - `app/api/jobs/process/route.ts`: xử lý job nội bộ.
   - `app/api/lark/sync-folder/route.ts`: đồng bộ folder Lark Drive.
   - `app/api/health/route.ts`: kiểm tra trạng thái app.
   - `lib/lark.ts`: lấy token, verify event, list folder, tải file, gửi message.
   - `lib/supabase.ts`: tạo Supabase server client.
   - `lib/ai.ts`: gọi model AI, format prompt và parse response.
   - `lib/documents.ts`: parse file, chunk nội dung, tạo hash/cache.
   - `lib/jobs.ts`: tạo job, cập nhật trạng thái, lưu kết quả.
   - `lib/env.ts`: validate biến môi trường.

5. Cách xử lý job
   - MVP có thể xử lý ngay sau khi nhận webhook, nhưng webhook phải phản hồi nhanh cho Lark.
   - Nên lưu job vào Supabase trước, trả ACK/challenge đúng yêu cầu Lark, sau đó gọi processor nội bộ.
   - Nếu xử lý lâu, chuyển sang cron/queue/workflow để tránh timeout.

## Flow xử lý hoàn chỉnh

1. Người dùng gửi prompt cho Lark Bot.
   - Ví dụ: "Tóm tắt folder A", "Tìm chính sách nghỉ phép", "So sánh file X và Y".
   - Message có thể kèm link folder/file Lark Drive hoặc dùng folder mặc định đã cấu hình.

2. Lark gửi event đến Vercel webhook.
   - Backend nhận request tại `POST /api/lark/events`.
   - Nếu Lark gửi challenge để verify endpoint, backend trả challenge ngay.
   - Nếu là message event, backend verify token, signature và encryption theo cấu hình Lark.

3. Backend parse event.
   - Lấy `message_id`, `chat_id`, `sender_id`, `tenant_key`, text prompt và attachment/link nếu có.
   - Kiểm tra event đã xử lý chưa để tránh duplicate.
   - Gửi reply nhanh về Lark nếu tác vụ có thể lâu: "Đã nhận yêu cầu, đang xử lý".

4. Backend tạo job trong Supabase.
   - Lưu prompt, người gửi, chat_id, folder/file target và status `queued`.
   - Lưu raw event hoặc phần cần debug sau khi đã loại bỏ secret.
   - Tạo job id để trace toàn bộ quá trình.

5. Job processor bắt đầu xử lý.
   - Có thể xử lý ngay trong Vercel Function nếu tác vụ ngắn.
   - Nếu tác vụ dài, nên dùng hàng đợi, cron hoặc background workflow để tránh timeout.
   - Cập nhật status `processing`.

6. Lấy access token Lark.
   - Backend dùng `LARK_APP_ID` và `LARK_APP_SECRET` để lấy tenant access token.
   - Cache token theo thời gian hết hạn để giảm số lần gọi API.

7. Đọc folder Lark Drive.
   - Từ folder token/link, list file đệ quy nếu cần.
   - Lọc loại file được hỗ trợ: doc, sheet, pdf, txt, markdown, csv, docx, xlsx.
   - Lưu metadata file vào Supabase: file_token, tên file, loại file, size, updated_time.

8. Tải và trích xuất nội dung file.
   - File Lark native doc/sheet cần dùng API export hoặc doc content từ Lark.
   - File binary như pdf/docx/xlsx cần download rồi parse ở backend.
   - Nếu file lớn, chia chunk theo section/trang/sheet.

9. Chọn context cho AI.
   - Giai đoạn đầu có thể đưa toàn bộ nội dung đã giới hạn token vào prompt.
   - Giai đoạn tốt hơn: tạo embedding cho chunks, lưu Supabase, truy vấn top chunks liên quan prompt.
   - Mỗi response cần lưu source file/chunk để có thể trích dẫn.

10. Gọi AI.
    - System prompt quy định vai trò, cách dùng tài liệu và cách báo lỗi nếu thiếu thông tin.
    - User prompt là nội dung người dùng gửi.
    - Context gồm các đoạn tài liệu liên quan và metadata nguồn.

11. Lưu kết quả vào Supabase.
    - Cập nhật job status `completed` hoặc `failed`.
    - Lưu response, token/cost nếu provider trả về và danh sách source đã dùng.
    - Lưu error stack nội bộ nếu lỗi, không gửi chi tiết nhạy cảm về Lark.

12. Gửi kết quả về Lark.
    - Gửi reply vào đúng `chat_id` hoặc thread/message gốc nếu API hỗ trợ.
    - Nếu kết quả dài, chia thành nhiều message hoặc gửi file markdown.
    - Nếu lỗi, gửi thông báo ngắn gọn và job id để trace.

## Luồng đồng bộ tài liệu

Phương án MVP:

1. Mỗi lần có prompt, backend list folder và tải file cần thiết.
2. Cache metadata/nội dung trong Supabase theo `file_token` và `updated_time`.
3. Nếu file chưa đổi, dùng cache.

Phương án nâng cấp:

1. Có endpoint/schedule đồng bộ folder định kỳ.
2. Lưu chunk và embedding vào Supabase.
3. Khi người dùng prompt, chỉ query chunks liên quan thay vì đọc lại toàn bộ folder.

## Database draft trên Supabase

Bảng dự kiến:

1. `lark_users`
   - `id`
   - `tenant_key`
   - `lark_user_id`
   - `name`
   - `created_at`

2. `lark_folders`
   - `id`
   - `tenant_key`
   - `folder_token`
   - `folder_url`
   - `name`
   - `is_default`
   - `created_at`

3. `lark_files`
   - `id`
   - `folder_id`
   - `file_token`
   - `file_type`
   - `name`
   - `size`
   - `updated_time`
   - `content_hash`
   - `last_synced_at`

4. `document_chunks`
   - `id`
   - `file_id`
   - `chunk_index`
   - `content`
   - `metadata`
   - `embedding`
   - `created_at`

5. `ai_jobs`
   - `id`
   - `tenant_key`
   - `chat_id`
   - `message_id`
   - `sender_id`
   - `prompt`
   - `folder_id`
   - `status`
   - `response`
   - `error_message`
   - `created_at`
   - `updated_at`

6. `job_sources`
   - `id`
   - `job_id`
   - `file_id`
   - `chunk_id`
   - `score`

## Endpoint dự kiến

1. `POST /api/lark/events`
   - Webhook nhận event/challenge từ Lark.

2. `POST /api/jobs/process`
   - Processor nội bộ để xử lý job.
   - Cần bảo vệ bằng secret riêng, không public cho bên ngoài gọi tùy ý.

3. `POST /api/lark/sync-folder`
   - Đồng bộ folder thủ công hoặc qua cron.
   - Cần bảo vệ bằng secret riêng.

4. `GET /api/health`
   - Kiểm tra app sống và env có đủ hay không, không trả secret.

## Biến môi trường cần có

Lark:

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_VERIFICATION_TOKEN`
- `LARK_ENCRYPT_KEY` nếu event encryption được bật
- `LARK_BOT_OPEN_ID` nếu cần
- `LARK_DEFAULT_FOLDER_TOKEN` hoặc folder URL mặc định

Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` nếu có frontend sau này

AI:

- `OPENAI_API_KEY` hoặc key provider AI bạn muốn dùng
- `AI_MODEL`
- `EMBEDDING_MODEL` nếu dùng retrieval/embedding

Vercel/internal:

- `INTERNAL_JOB_SECRET`
- `CRON_SECRET` nếu có cron sync
- `APP_BASE_URL` là URL deployment Vercel

## Những thông tin cần bạn cung cấp

1. Tài liệu API Lark
   - Ví dụ request/response của event bot message.
   - Cách verify webhook, challenge, signature và encryption nếu có.
   - API lấy tenant access token.
   - API đọc/list folder Lark Drive.
   - API download/export file.
   - API gửi message/reply về chat.

2. Thông tin Lark App
   - App ID.
   - App Secret.
   - Verification Token.
   - Encrypt Key nếu bật encryption.
   - Danh sách scopes/permissions đã cấp cho app.
   - Bot có được add vào chat/group nào.
   - Folder URL/token mẫu trong Lark Drive.

3. Mẫu event/message thực tế
   - Một event người dùng nhắn text cho bot.
   - Một event có link folder/file nếu có.
   - Một response mẫu khi Lark yêu cầu challenge webhook.

4. Supabase
   - Project URL.
   - Service role key để backend dùng, không đưa vào client.
   - Nếu đã có schema cũ, cung cấp dump/schema; nếu không có, mình sẽ tạo migration mới.

5. Vercel
   - Project/org muốn deploy.
   - URL domain mong muốn hoặc để Vercel tạo preview.
   - Các env var sẽ set trên Vercel.

6. AI
   - Provider muốn dùng.
   - Model ưu tiên.
   - Yêu cầu về ngôn ngữ trả lời, format và trích dẫn nguồn.
   - Giới hạn chi phí/token nếu có.

7. Tài liệu mẫu trong folder
   - Vài file mẫu hoặc mô tả loại file chính.
   - File có thể chứa dữ liệu nhạy cảm không.
   - Cần trả lời dựa trên toàn bộ folder hay theo từng folder người dùng gửi.

## Luồng bảo mật cần giữ

1. Không commit bất kỳ secret nào vào Git.
2. `SUPABASE_SERVICE_ROLE_KEY`, `LARK_APP_SECRET`, `OPENAI_API_KEY` chỉ nằm trong Vercel env.
3. Endpoint nội bộ phải verify `INTERNAL_JOB_SECRET`.
4. Webhook Lark phải verify request trước khi tạo job.
5. Supabase table ở schema public cần bật RLS nếu expose qua Data API.
6. Log chỉ lưu đủ để debug, tránh lưu raw secret/token.

## MVP để triển khai trước

1. Tạo Next.js app chạy trên Vercel.
2. Tạo webhook Lark `POST /api/lark/events`.
3. Verify challenge và nhận text message.
4. Lưu job vào Supabase.
5. Lấy folder mặc định từ `LARK_DEFAULT_FOLDER_TOKEN`.
6. List và đọc một số file text/pdf/docx mẫu.
7. Gọi AI với context đã lấy được.
8. Gửi kết quả về Lark chat.
9. Lưu response và log job.

## Việc cần quyết định trước khi code

1. Xử lý job ngay trong webhook hay tách processor/background.
2. Có cần embedding/search ngay từ đầu không hay MVP đọc context trực tiếp.
3. Folder nguồn là mặc định theo bot hay người dùng có thể gửi folder mới trong prompt.
4. Kết quả dài sẽ chia message hay tạo file trả về trong Lark Drive.
5. Có cần dashboard quản trị sau này không, hay giai đoạn đầu chỉ vận hành qua log và Supabase.
