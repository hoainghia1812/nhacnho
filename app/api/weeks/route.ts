import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from("weeks")
      .select(
        `
        id,
        name,
        start_date,
        end_date,
        created_at,
        day_schedules (
          id,
          week_id,
          work_date,
          check_in,
          check_out,
          is_day_off,
          created_at
        )
      `,
      )
      .order("start_date", { ascending: false })
      .order("work_date", { referencedTable: "day_schedules", ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data ?? []);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể tải danh sách tuần." },
      { status: 500 },
    );
  }
}
