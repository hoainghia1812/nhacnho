import dotenv from "dotenv";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID ?? process.env.TELEGRAM_CHAT_ID;
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Ho_Chi_Minh";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
}

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  throw new Error("Thiếu TELEGRAM_TOKEN hoặc CHAT_ID.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getLocalDateAndTime() {
  const dateTimeFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
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

function toMinuteValue(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function shiftIsoDate(dateIso, diffDays) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  date.setDate(date.getDate() + diffDays);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

async function sendTelegramMessage(text) {
  const endpoint = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gửi Telegram thất bại: ${body}`);
  }
}

async function wasNotificationSent(scheduleId, workDate, eventType) {
  const { data, error } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("schedule_id", scheduleId)
    .eq("work_date", workDate)
    .eq("event_type", eventType)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể kiểm tra log gửi thông báo: ${error.message}`);
  }

  return Boolean(data);
}

async function markNotificationSent(scheduleId, workDate, eventType) {
  const { error } = await supabase.from("notification_logs").insert({
    schedule_id: scheduleId,
    work_date: workDate,
    event_type: eventType,
  });

  if (error && error.code !== "23505") {
    throw new Error(`Không thể lưu log gửi thông báo: ${error.message}`);
  }
}

async function cleanupExpiredData(currentDate) {
  const { data: deletedWeeks, error: weeksCleanupError } = await supabase
    .from("weeks")
    .delete()
    .lt("end_date", currentDate)
    .select("id");

  if (weeksCleanupError) {
    console.error("Không thể dọn dữ liệu tuần cũ:", weeksCleanupError.message);
  } else if (deletedWeeks && deletedWeeks.length > 0) {
    console.log(`Đã xóa ${deletedWeeks.length} tuần đã kết thúc.`);
  }

  const eventExpiryDate = shiftIsoDate(currentDate, -3);
  const { data: deletedEvents, error: eventsCleanupError } = await supabase
    .from("custom_events")
    .delete()
    .lte("event_date", eventExpiryDate)
    .select("id");

  if (eventsCleanupError) {
    console.error("Không thể dọn sự kiện quá hạn:", eventsCleanupError.message);
  } else if (deletedEvents && deletedEvents.length > 0) {
    console.log(`Đã xóa ${deletedEvents.length} sự kiện quá hạn (trên 3 ngày).`);
  }
}

async function processWorkSchedules(currentDate, currentMinutes) {
  const { data: schedules, error } = await supabase
    .from("day_schedules")
    .select("id, work_date, check_in, check_out, is_day_off")
    .eq("work_date", currentDate);

  if (error) {
    throw new Error(`Không thể truy vấn lịch làm việc: ${error.message}`);
  }

  if (!schedules || schedules.length === 0) {
    return;
  }

  for (const schedule of schedules) {
    if (schedule.is_day_off) {
      continue;
    }

    const checkIn = schedule.check_in?.slice(0, 5);
    const checkOut = schedule.check_out?.slice(0, 5);
    if (!checkIn || !checkOut) {
      continue;
    }

    const events = [
      {
        eventType: "before_check_in",
        atMinute: toMinuteValue(checkIn) - 15,
        message: `⏰ Còn 15 phút nữa đến giờ check-in (${checkIn}).`,
      },
      {
        eventType: "check_in",
        atMinute: toMinuteValue(checkIn),
        message: "⏰ Đến giờ check-in.",
      },
      {
        eventType: "check_out",
        atMinute: toMinuteValue(checkOut),
        message: "⏰ Đến giờ check-out.",
      },
    ];

    for (const event of events) {
      if (currentMinutes !== event.atMinute) {
        continue;
      }

      const alreadySent = await wasNotificationSent(schedule.id, schedule.work_date, event.eventType);
      if (alreadySent) {
        continue;
      }

      await sendTelegramMessage(event.message);
      await markNotificationSent(schedule.id, schedule.work_date, event.eventType);
    }
  }
}

async function processCustomEvents(currentDate, currentMinutes) {
  const { data: events, error } = await supabase
    .from("custom_events")
    .select("title, event_time, message")
    .eq("event_date", currentDate);

  if (error) {
    throw new Error(`Không thể truy vấn sự kiện cá nhân: ${error.message}`);
  }

  if (!events || events.length === 0) {
    return;
  }

  for (const event of events) {
    const eventTime = event.event_time?.slice(0, 5);
    if (!eventTime) {
      continue;
    }

    if (currentMinutes === toMinuteValue(eventTime)) {
      await sendTelegramMessage(`📌 ${event.title}\n${event.message}`);
    }
  }
}

async function processReminders() {
  const { date, time } = getLocalDateAndTime();
  const currentMinutes = toMinuteValue(time);

  await cleanupExpiredData(date);
  await processWorkSchedules(date, currentMinutes);
  await processCustomEvents(date, currentMinutes);
}

async function runSafely() {
  try {
    await processReminders();
  } catch (error) {
    console.error("Chạy nhắc việc thất bại:", error instanceof Error ? error.message : error);
  }
}

console.log(`Worker Telegram đã khởi động. Múi giờ: ${APP_TIMEZONE}`);
await runSafely();
cron.schedule("* * * * *", runSafely);
