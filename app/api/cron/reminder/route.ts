import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getLocalDateAndTime(timeZone: string) {
  const dateTimeFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dateTimeFormat.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function toMinuteValue(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function shiftIsoDate(dateIso: string, diffDays: number) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  date.setDate(date.getDate() + diffDays);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gửi Telegram thất bại: ${body}`);
  }
}

async function cleanupExpiredData(currentDate: string) {
  const supabase = getSupabaseServer();

  const { error: weeksCleanupError } = await supabase
    .from("weeks")
    .delete()
    .lt("end_date", currentDate);

  if (weeksCleanupError) {
    throw new Error(`Không thể dọn dữ liệu tuần cũ: ${weeksCleanupError.message}`);
  }

  const eventExpiryDate = shiftIsoDate(currentDate, -3);
  const { error: eventsCleanupError } = await supabase
    .from("custom_events")
    .delete()
    .lte("event_date", eventExpiryDate);

  if (eventsCleanupError) {
    throw new Error(`Không thể dọn sự kiện quá hạn: ${eventsCleanupError.message}`);
  }
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Không có quyền truy cập cron endpoint." }, { status: 401 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const timeZone = process.env.APP_TIMEZONE ?? "Asia/Ho_Chi_Minh";

    if (!token || !chatId) {
      return Response.json(
        { error: "Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID." },
        { status: 500 },
      );
    }

    const { date, time } = getLocalDateAndTime(timeZone);
    const currentMinutes = toMinuteValue(time);
    const supabase = getSupabaseServer();

    await cleanupExpiredData(date);

    const { data: schedules, error: schedulesError } = await supabase
      .from("day_schedules")
      .select("id, check_in, check_out, is_day_off")
      .eq("work_date", date)
      .eq("is_day_off", false);

    if (schedulesError) {
      throw new Error(`Không thể truy vấn lịch làm việc: ${schedulesError.message}`);
    }

    const sentMessages: string[] = [];

    if (schedules && schedules.length > 0) {
      for (const schedule of schedules) {
        const checkIn = schedule.check_in?.slice(0, 5);
        const checkOut = schedule.check_out?.slice(0, 5);

        if (!checkIn || !checkOut) {
          continue;
        }

        const checkInMinutes = toMinuteValue(checkIn);
        const checkOutMinutes = toMinuteValue(checkOut);
        const beforeCheckInMinutes = checkInMinutes - 15;

        if (currentMinutes === beforeCheckInMinutes) {
          await sendTelegramMessage(token, chatId, `⏰ Còn 15 phút nữa đến giờ check-in (${checkIn}).`);
          sentMessages.push("before_check_in");
        }

        if (currentMinutes === checkInMinutes) {
          await sendTelegramMessage(token, chatId, "⏰ Đến giờ check-in.");
          sentMessages.push("check_in");
        }

        if (currentMinutes === checkOutMinutes) {
          await sendTelegramMessage(token, chatId, "⏰ Đến giờ check-out.");
          sentMessages.push("check_out");
        }
      }
    }

    const { data: events, error: eventsError } = await supabase
      .from("custom_events")
      .select("id, title, event_time, message")
      .eq("event_date", date);

    if (eventsError) {
      throw new Error(`Không thể truy vấn sự kiện cá nhân: ${eventsError.message}`);
    }

    if (events && events.length > 0) {
      for (const event of events) {
        const eventTime = event.event_time?.slice(0, 5);
        if (!eventTime) {
          continue;
        }

        const eventMinutes = toMinuteValue(eventTime);
        if (currentMinutes === eventMinutes) {
          await sendTelegramMessage(token, chatId, `📌 ${event.title}\n${event.message}`);
          sentMessages.push(`event:${event.id}`);
        }
      }
    }

    return Response.json({
      ok: true,
      processedAt: `${date} ${time}`,
      sentCount: sentMessages.length,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Cron xử lý nhắc việc thất bại.",
      },
      { status: 500 },
    );
  }
}
