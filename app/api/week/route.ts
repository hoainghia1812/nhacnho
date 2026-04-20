import { buildWeekDates, toMinutes } from "@/lib/date";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { DayScheduleInput, WeekPayload } from "@/lib/types";

function validateDay(day: DayScheduleInput): string | null {
  if (day.is_day_off) {
    return null;
  }

  if (!day.check_in || !day.check_out) {
    return `Thiếu khung giờ làm việc cho ngày ${day.work_date}.`;
  }

  if (toMinutes(day.check_out) <= toMinutes(day.check_in)) {
    return `Giờ ra phải lớn hơn giờ vào cho ngày ${day.work_date}.`;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const supabaseServer = getSupabaseServer();
    const payload = (await request.json()) as WeekPayload;
    const { name, startDate, days } = payload;

    if (!name?.trim() || !startDate || !Array.isArray(days)) {
      return Response.json({ error: "Dữ liệu tuần không hợp lệ." }, { status: 400 });
    }

    const expectedDates = buildWeekDates(startDate);
    const submittedDates = days.map((day) => day.work_date);
    const uniqueDates = new Set(submittedDates);

    if (uniqueDates.size !== days.length) {
      return Response.json({ error: "Không được phép trùng ngày làm việc." }, { status: 400 });
    }

    if (days.length !== expectedDates.length) {
      return Response.json({ error: "Một tuần phải có đúng 7 ngày." }, { status: 400 });
    }

    const hasUnexpectedDate = submittedDates.some((date) => !expectedDates.includes(date));
    if (hasUnexpectedDate) {
      return Response.json({ error: "Các ngày gửi lên phải khớp với tuần đã chọn." }, { status: 400 });
    }

    for (const day of days) {
      const validationError = validateDay(day);
      if (validationError) {
        return Response.json({ error: validationError }, { status: 400 });
      }
    }

    const endDate = expectedDates[expectedDates.length - 1];

    const { data: week, error: weekError } = await supabaseServer
      .from("weeks")
      .insert({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      })
      .select("*")
      .single();

    if (weekError || !week) {
      return Response.json(
        { error: weekError?.message ?? "Không thể tạo tuần mới." },
        { status: 500 },
      );
    }

    const dayPayload = days.map((day) => ({
      week_id: week.id,
      work_date: day.work_date,
      check_in: day.is_day_off ? null : day.check_in,
      check_out: day.is_day_off ? null : day.check_out,
      is_day_off: day.is_day_off,
    }));

    const { error: daysError } = await supabaseServer.from("day_schedules").insert(dayPayload);

    if (daysError) {
      await supabaseServer.from("weeks").delete().eq("id", week.id);
      return Response.json(
        {
          error:
            daysError.code === "23505"
              ? "Ngày làm việc đã tồn tại trong lịch."
              : daysError.message,
        },
        { status: 400 },
      );
    }

    return Response.json({ weekId: week.id }, { status: 201 });
  } catch {
    return Response.json({ error: "Đã xảy ra lỗi khi tạo tuần." }, { status: 500 });
  }
}
