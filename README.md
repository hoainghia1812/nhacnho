# Ứng Dụng Nhắc Nhở Chấm Công

Ứng dụng full-stack quản lý lịch chấm công theo tuần với:
- Frontend Next.js triển khai trên Vercel
- Database Supabase PostgreSQL
- Worker Node.js chạy liên tục (Railway/Render) mỗi phút
- Gửi thông báo Telegram theo lịch check-in/check-out và sự kiện cá nhân
- Tự động dọn dữ liệu cũ theo quy tắc thời gian

## Công Nghệ Sử Dụng

- Next.js (App Router)
- TailwindCSS
- Supabase (`@supabase/supabase-js`)
- Node cron (`node-cron`)
- Telegram Bot API
- Railway/Render (cho background worker)

## Cài Đặt

1. Cài dependencies:

```bash
npm install
```

2. Cấu hình biến môi trường:

```bash
cp .env.example .env.local
```

Điền giá trị cho:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_TOKEN`
- `CHAT_ID`
- `APP_TIMEZONE`

> Lưu ý bảo mật:
> - `SUPABASE_SERVICE_ROLE_KEY` và `TELEGRAM_TOKEN` chỉ dùng cho server/worker.
> - Không commit `.env.local`.

3. Tạo bảng dữ liệu trong Supabase SQL Editor:

Chạy file `supabase/schema.sql`.

> File schema đã bao gồm bảng `notification_logs` để chống gửi trùng thông báo.

## Chạy Ứng Dụng

Chạy web app:

```bash
npm run dev
```

Chạy worker nhắc Telegram (terminal riêng, dùng cho local):

```bash
npm run reminder:worker
```

## Kiến Trúc Deploy Khuyến Nghị

- Vercel: chạy frontend Next.js
- Railway (hoặc Render): chạy worker `scripts/telegram-reminder.mjs` liên tục mỗi phút
- Supabase: lưu lịch và log thông báo

## Deploy Frontend Lên Vercel

1. Đẩy source code lên GitHub.
2. Import project vào Vercel.
3. Cấu hình biến môi trường cho Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (cho API server)
   - `APP_TIMEZONE`
4. Deploy.

## Deploy Worker Lên Railway (chạy mỗi phút)

1. Vào Railway > **New Project** > **Deploy from GitHub repo**.
2. Chọn cùng repo hiện tại.
3. Trong service settings, đặt Start Command:
   - `npm run reminder:worker`
4. Thêm Environment Variables trên Railway:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_TOKEN`
   - `CHAT_ID`
   - `APP_TIMEZONE`
5. Deploy service, kiểm tra logs thấy dòng:
   - `Worker Telegram đã khởi động. Múi giờ: ...`

> Worker Railway là tiến trình luôn chạy, không phải serverless cron.

## Quy Tắc Tự Động Xóa Dữ Liệu

- Bản ghi tuần trong `weeks` sẽ tự xóa khi đã qua ngày `end_date` (tuần kết thúc).
- Sự kiện trong `custom_events` sẽ tự xóa sau 3 ngày tính từ `event_date`.
- Việc dọn dữ liệu được chạy tự động trong worker `reminder:worker` mỗi phút.

## API Endpoints

- `POST /api/week`
  - Tạo một tuần và 7 lịch ngày tương ứng
  - Kiểm tra ngày trùng và điều kiện `check_out > check_in` nếu không nghỉ
- `GET /api/weeks`
  - Lấy danh sách tuần kèm lịch từng ngày
- `GET /api/schedules?date=YYYY-MM-DD`
  - Lấy lịch của một ngày cụ thể
- `GET /api/events`
  - Lấy danh sách sự kiện nhắc việc cá nhân
- `POST /api/events`
  - Tạo sự kiện cá nhân (tiêu đề + ngày + giờ + nội dung)

## Cấu Trúc Dự Án

- `app/` - trang và API route handlers
- `components/ScheduleForm.tsx` - giao diện tạo/chỉnh lịch tuần
- `components/WeekView.tsx` - giao diện danh sách tuần và chi tiết tuần
- `lib/supabaseClient.ts` - Supabase client phía trình duyệt
- `lib/supabaseServer.ts` - Supabase client phía server
- `scripts/telegram-reminder.mjs` - worker cron chạy mỗi phút
- `supabase/schema.sql` - schema cơ sở dữ liệu
