# Flow he thong Lark Bot AI

## Muc tieu

Xay dung he thong cho phep nguoi dung nhan prompt qua Lark Bot. Backend tren Vercel nhan su kien tu Lark, lay data trong mot folder Lark Drive, dua prompt va data lien quan cho AI xu ly, luu trang thai vao Supabase, sau do tra ket qua ve lai chat Lark bang bot.

## Thanh phan chinh

1. Lark Bot
   - Nhan tin nhan tu nguoi dung trong chat.
   - Gui event message den webhook backend.
   - Gui ket qua xu ly ve chat qua API cua Lark.

2. Vercel Backend
   - Endpoint webhook nhan event tu Lark.
   - Endpoint job processor xu ly tac vu AI.
   - Module Lark API de lay token, doc Drive, tai file va gui message.
   - Module AI de doc context, tao cau tra loi va format ket qua.

3. Supabase
   - Luu request/job, user, folder config, file metadata, log xu ly.
   - Co the luu cache noi dung file/chunks/embedding neu can truy van nhieu tai lieu.
   - Dung service role key o server only, khong dua vao client.

4. Lark Drive
   - Folder nguon chua tai lieu can AI doc.
   - Backend dung quyen cua app/bot de list file, download file va cap nhat cache.

5. AI Provider
   - Nhan prompt nguoi dung va context tai lieu.
   - Tra ve ket qua dang text/markdown phu hop de gui lai Lark.

## Flow xu ly hoan chinh

1. Nguoi dung gui prompt cho Lark Bot.
   - Vi du: "Tom tat folder A", "Tim chinh sach nghi phep", "So sanh file X va Y".
   - Message co the kem link folder/file Lark Drive hoac dung folder mac dinh da cau hinh.

2. Lark gui event den Vercel webhook.
   - Backend nhan request tai `POST /api/lark/events`.
   - Neu Lark gui challenge de verify endpoint, backend tra challenge ngay.
   - Neu la message event, backend verify token/signature/encrypt theo cau hinh Lark.

3. Backend parse event.
   - Lay `message_id`, `chat_id`, `sender_id`, `tenant_key`, text prompt va attachment/link neu co.
   - Kiem tra event da xu ly chua de tranh duplicate.
   - Gui reply nhanh ve Lark neu tac vu co the lau: "Da nhan yeu cau, dang xu ly".

4. Backend tao job trong Supabase.
   - Luu prompt, nguoi gui, chat_id, folder/file target, status `queued`.
   - Luu raw event hoac phan can debug sau khi da loai bo secret.
   - Tao job id de trace toan bo qua trinh.

5. Job processor bat dau xu ly.
   - Co the xu ly ngay trong Vercel Function neu tac vu ngan.
   - Neu tac vu dai, nen dung hang doi/cron/background workflow de tranh timeout.
   - Cap nhat status `processing`.

6. Lay access token Lark.
   - Backend dung `LARK_APP_ID` va `LARK_APP_SECRET` de lay tenant access token.
   - Cache token theo thoi gian het han de giam so lan goi API.

7. Doc folder Lark Drive.
   - Tu folder token/link, list file de quy neu can.
   - Loc loai file duoc ho tro: doc, sheet, pdf, txt, markdown, csv, docx, xlsx.
   - Luu metadata file vao Supabase: file_token, ten file, loai file, size, updated_time.

8. Tai va trich xuat noi dung file.
   - File Lark native doc/sheet can dung API export/doc content tu Lark.
   - File binary nhu pdf/docx/xlsx can download roi parse o backend.
   - Neu file lon, chia chunk theo section/trang/sheet.

9. Chon context cho AI.
   - Giai doan dau co the dua toan bo noi dung da gioi han token vao prompt.
   - Giai doan tot hon: tao embedding cho chunks, luu Supabase, truy van top chunks lien quan prompt.
   - Moi response can luu source file/chunk de co the trich dan.

10. Goi AI.
    - System prompt quy dinh vai tro, cach dung tai lieu, cach bao loi neu thieu thong tin.
    - User prompt la noi dung nguoi dung gui.
    - Context gom cac doan tai lieu lien quan va metadata nguon.

11. Luu ket qua vao Supabase.
    - Cap nhat job status `completed` hoac `failed`.
    - Luu response, token/cost neu provider tra ve, danh sach source da dung.
    - Luu error stack noi bo neu loi, khong gui chi tiet nhay cam ve Lark.

12. Gui ket qua ve Lark.
    - Gui reply vao dung `chat_id` hoac thread/message goc neu API ho tro.
    - Neu ket qua dai, chia thanh nhieu message hoac gui file markdown.
    - Neu loi, gui thong bao ngan gon va job id de trace.

## Luong dong bo tai lieu

Phuong an MVP:

1. Moi lan co prompt, backend list folder va tai file can thiet.
2. Cache metadata/noi dung trong Supabase theo `file_token` va `updated_time`.
3. Neu file chua doi, dung cache.

Phuong an nang cap:

1. Co endpoint/schedule dong bo folder dinh ky.
2. Luu chunk va embedding vao Supabase.
3. Khi nguoi dung prompt, chi query chunks lien quan thay vi doc lai toan bo folder.

## Database draft tren Supabase

Bang du kien:

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

## Endpoint du kien

1. `POST /api/lark/events`
   - Webhook nhan event/challenge tu Lark.

2. `POST /api/jobs/process`
   - Processor noi bo de xu ly job.
   - Can bao ve bang secret rieng, khong public.

3. `POST /api/lark/sync-folder`
   - Dong bo folder thu cong hoac qua cron.
   - Can bao ve bang secret rieng.

4. `GET /api/health`
   - Kiem tra app song va env co du hay khong, khong tra secret.

## Bien moi truong can co

Lark:

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_VERIFICATION_TOKEN`
- `LARK_ENCRYPT_KEY` neu event encryption duoc bat
- `LARK_BOT_OPEN_ID` neu can
- `LARK_DEFAULT_FOLDER_TOKEN` hoac folder URL mac dinh

Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` neu co frontend sau nay

AI:

- `OPENAI_API_KEY` hoac key provider AI ban muon dung
- `AI_MODEL`
- `EMBEDDING_MODEL` neu dung retrieval/embedding

Vercel/internal:

- `INTERNAL_JOB_SECRET`
- `CRON_SECRET` neu co cron sync
- `APP_BASE_URL` la URL deployment Vercel

## Nhung thong tin can ban cung cap

1. Tai lieu API Lark
   - Vi du request/response cua event bot message.
   - Cach verify webhook, challenge, signature va encryption neu co.
   - API lay tenant access token.
   - API doc/list folder Lark Drive.
   - API download/export file.
   - API gui message/reply ve chat.

2. Thong tin Lark App
   - App ID.
   - App Secret.
   - Verification Token.
   - Encrypt Key neu bat encryption.
   - Danh sach scopes/permissions da cap cho app.
   - Bot co duoc add vao chat/group nao.
   - Folder URL/token mau trong Lark Drive.

3. Mau event/message thuc te
   - 1 event nguoi dung nhan text cho bot.
   - 1 event co link folder/file neu co.
   - 1 response mau khi Lark yeu cau challenge webhook.

4. Supabase
   - Project URL.
   - Service role key de backend dung, khong dua vao client.
   - Neu da co schema cu, cung cap dump/schema; neu khong co, minh se tao migration moi.

5. Vercel
   - Project/org muon deploy.
   - URL domain mong muon hoac de Vercel tao preview.
   - Cac env var se set tren Vercel.

6. AI
   - Provider muon dung.
   - Model uu tien.
   - Yeu cau ve ngon ngu tra loi, format, trich dan nguon.
   - Gioi han chi phi/token neu co.

7. Tai lieu mau trong folder
   - Vai file mau hoac mo ta loai file chinh.
   - File co the chua du lieu nhay cam khong.
   - Can tra loi dua tren toan bo folder hay theo tung folder nguoi dung gui.

## Luong bao mat can giu

1. Khong commit bat ky secret nao vao Git.
2. `SUPABASE_SERVICE_ROLE_KEY`, `LARK_APP_SECRET`, `OPENAI_API_KEY` chi nam trong Vercel env.
3. Endpoint noi bo phai verify `INTERNAL_JOB_SECRET`.
4. Webhook Lark phai verify request truoc khi tao job.
5. Supabase table o schema public can bat RLS neu expose qua Data API.
6. Log chi luu du de debug, tranh luu raw secret/token.

## MVP de trien khai truoc

1. Tao Next.js app chay tren Vercel.
2. Tao webhook Lark `POST /api/lark/events`.
3. Verify challenge va nhan text message.
4. Luu job vao Supabase.
5. Lay folder mac dinh tu `LARK_DEFAULT_FOLDER_TOKEN`.
6. List va doc mot so file text/pdf/docx mau.
7. Goi AI voi context da lay duoc.
8. Gui ket qua ve Lark chat.
9. Luu response va log job.

## Viec can quyet dinh truoc khi code

1. Dung Next.js API routes hay mot framework server nhe hon tren Vercel.
2. Xu ly job ngay trong webhook hay tach processor/background.
3. Co can embedding/search ngay tu dau khong hay MVP doc context truc tiep.
4. Folder nguon la mac dinh theo bot hay nguoi dung co the gui folder moi trong prompt.
5. Ket qua dai se chia message hay tao file tra ve trong Lark Drive.
