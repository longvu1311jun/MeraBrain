# Lark AI Wiki Bot - Vercel + Supabase

Bot nhận câu hỏi từ Lark, tìm dữ liệu trong Supabase pgvector, dùng OpenAI để trả lời, rồi gửi lại Lark.

## 1. Setup Supabase

Vào Supabase SQL Editor, chạy file:

```sql
supabase/schema.sql
```

## 2. Setup Vercel env

Copy `.env.example` thành env vars trên Vercel.

Bắt buộc:

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_VERIFICATION_TOKEN`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. Deploy

```bash
npm install
npm run build
vercel --prod
```

## 4. Cấu hình Lark Events & Callbacks

Request URL:

```text
https://YOUR_DOMAIN.vercel.app/api/lark/events
```

Add event nhận message của bot, ví dụ `im.message.receive_v1`.

## 5. Sync Wiki

Gọi manual:

```bash
curl -X POST https://YOUR_DOMAIN.vercel.app/api/lark/sync-wiki \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: YOUR_SYNC_SECRET" \
  -d '{"folderToken":"YOUR_LARK_FOLDER_TOKEN"}'
```

Lưu ý: `lib/lark.ts` có 2 hàm cần chỉnh theo đúng loại tài liệu trong Wiki của bạn:

- `listFolderChildren`
- `getDocxRawContent`

Vì Lark Drive/Wiki có nhiều loại object: folder, docx, sheet, bitable, file upload. Sau khi biết Wiki của bạn đang dùng loại nào, chỉ cần thay endpoint đọc text ở đây.

## 6. Test AI không qua Lark

```bash
curl -X POST https://YOUR_DOMAIN.vercel.app/api/lark/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Quy trình triển khai website là gì?"}'
```
