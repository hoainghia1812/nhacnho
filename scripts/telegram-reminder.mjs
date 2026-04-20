import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  APP_TIMEZONE = "Asia/Ho_Chi_Minh",
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
}

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("Thiếu biến môi trường Telegram.");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const sentNotifications = new Set();

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
  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gửi Telegram thất bại: ${body}`);
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

async function processReminders() {
  const { date, time } = getLocalDateAndTime();
  const currentMinutes = toMinuteValue(time);

  await cleanupExpiredData(date);

  for (const key of sentNotifications) {
    if (!key.startsWith(date)) {
      sentNotifications.delete(key);
    }
  }

  const { data, error } = await supabase
    .from("day_schedules")
    .select("id, work_date, check_in, check_out, is_day_off")
    .eq("work_date", date)
    .eq("is_day_off", false);

  if (error) {
    console.error("Không thể truy vấn lịch làm việc:", error.message);
    return;
  }

  if (data && data.length > 0) {
    for (const schedule of data) {
      const checkIn = schedule.check_in?.slice(0, 5);
      const checkOut = schedule.check_out?.slice(0, 5);

      if (!checkIn || !checkOut) {
        continue;
      }

      const checkInMinutes = toMinuteValue(checkIn);
      const checkOutMinutes = toMinuteValue(checkOut);
      const beforeCheckInMinutes = checkInMinutes - 15;

      const beforeKey = `${date}:${schedule.id}:before_check_in`;
      const inKey = `${date}:${schedule.id}:check_in`;
      const outKey = `${date}:${schedule.id}:check_out`;

      if (currentMinutes === beforeCheckInMinutes && !sentNotifications.has(beforeKey)) {
        await sendTelegramMessage(`⏰ Còn 15 phút nữa đến giờ check-in (${checkIn}).`);
        sentNotifications.add(beforeKey);
      }

      if (currentMinutes === checkInMinutes && !sentNotifications.has(inKey)) {
        await sendTelegramMessage("⏰ Đến giờ check-in.");
        sentNotifications.add(inKey);
      }

      if (currentMinutes === checkOutMinutes && !sentNotifications.has(outKey)) {
        await sendTelegramMessage("⏰ Đến giờ check-out.");
        sentNotifications.add(outKey);
      }
    }
  }

  const { data: events, error: eventsError } = await supabase
    .from("custom_events")
    .select("id, title, event_date, event_time, message")
    .eq("event_date", date);

  if (eventsError) {
    console.error("Không thể truy vấn sự kiện cá nhân:", eventsError.message);
    return;
  }

  if (!events || events.length === 0) {
    return;
  }

  for (const event of events) {
    const eventTime = event.event_time?.slice(0, 5);
    if (!eventTime) {
      continue;
    }

    const eventMinutes = toMinuteValue(eventTime);
    const eventKey = `${date}:${event.id}:custom_event`;

    if (currentMinutes === eventMinutes && !sentNotifications.has(eventKey)) {
      await sendTelegramMessage(`📌 ${event.title}\n${event.message}`);
      sentNotifications.add(eventKey);
    }
  }
}

console.log(`Worker nhắc việc Telegram đã khởi động. Múi giờ: ${APP_TIMEZONE}`);
void processReminders();

cron.schedule("* * * * *", async () => {
  try {
    await processReminders();
  } catch (error) {
    console.error("Chạy nhắc việc thất bại:", error);
  }
});
