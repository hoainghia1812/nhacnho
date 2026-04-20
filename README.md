# Ứng Dụng Nhắc Nhở Chấm Công

Ứng dụng full-stack quản lý lịch chấm công theo tuần với:
- Dashboard Next.js App Router
- Tích hợp Supabase PostgreSQL
- Worker Telegram chạy mỗi phút
- Nhắc việc sự kiện cá nhân theo giờ chính xác
- Tự động dọn dữ liệu cũ theo quy tắc thời gian

## Công Nghệ Sử Dụng

- Next.js (App Router)
- TailwindCSS
- Supabase (`@supabase/supabase-js`)
- Node cron (`node-cron`)
- Telegram Bot API

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
- `SUPABASE_SERVICE_ROLE_KEY` (bắt buộc cho API server và worker)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `APP_TIMEZONE`

> Lưu ý: `SUPABASE_SERVICE_ROLE_KEY` là khóa quyền cao, chỉ dùng ở server/worker, không public ra client.

3. Tạo bảng dữ liệu trong Supabase SQL Editor:

Chạy file `supabase/schema.sql`.

## Chạy Ứng Dụng

Chạy web app:

```bash
npm run dev
```

Chạy worker nhắc Telegram (terminal riêng):

```bash
npm run reminder:worker
```

## Deploy Lên Vercel

1. Đẩy source code lên GitHub.
2. Vào Vercel, chọn **New Project** và import repository.
3. Trong phần **Environment Variables**, thêm:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `APP_TIMEZONE`
   - `CRON_SECRET` (tự đặt chuỗi bí mật mạnh)
4. Deploy project.
5. Vercel sẽ tự chạy cron theo `vercel.json` với endpoint:
   - `/api/cron/reminder` (mỗi phút)

> Khi đã chạy cron trên Vercel, bạn không cần giữ máy cá nhân bật để gửi nhắc việc.

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
- `scripts/telegram-reminder.mjs` - worker cron gửi thông báo Telegram
- `supabase/schema.sql` - schema cơ sở dữ liệu
