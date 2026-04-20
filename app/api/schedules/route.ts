import { getSupabaseServer } from "@/lib/supabaseServer";

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const supabaseServer = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !isDateString(date)) {
      return Response.json({ error: "Thiếu ngày hoặc định dạng ngày không hợp lệ." }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("day_schedules")
      .select(
        `
        id,
        week_id,
        work_date,
        check_in,
        check_out,
        is_day_off,
        created_at,
        weeks (
          id,
          name,
          start_date,
          end_date
        )
      `,
      )
      .eq("work_date", date)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể tải lịch theo ngày." },
      { status: 500 },
    );
  }
}
