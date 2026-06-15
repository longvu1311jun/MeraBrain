# MERA Lark AI Bot

Backend tối thiểu để test Lark Bot nhận tin nhắn và reply lại người dùng.

## Endpoint

- `GET /api/health`: kiểm tra service và env.
- `POST /api/lark/events`: webhook cấu hình trong Lark Developer Console.

## Env cần có

Tạo `.env.local` khi chạy local, hoặc set trong Vercel Environment Variables khi deploy:

```bash
LARK_APP_ID=cli_xxx
LARK_APP_SECRET=xxx
LARK_VERIFICATION_TOKEN=xxx
LARK_ENCRYPT_KEY=
```

`LARK_VERIFICATION_TOKEN` nên được set để verify request từ Lark. `LARK_ENCRYPT_KEY` chỉ cần khi bật Encrypt Key trong phần Events & Callbacks.

## Cấu hình Lark để test

1. Bật Bot capability cho app.
2. Bật scope nhận message phù hợp, ví dụ `im:message.p2p_msg:readonly`.
3. Bật scope gửi message, ví dụ `im:message:send_as_bot` hoặc `im:message:send`.
4. Trong Events & Callbacks, cấu hình Request URL:

```text
https://<vercel-domain>/api/lark/events
```

5. Subscribe event `im.message.receive_v1`.
6. Nhắn tin cho bot. Bot sẽ reply: `Mình đã nhận được tin nhắn của bạn: ...`
