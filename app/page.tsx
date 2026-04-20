import { Dashboard } from "@/components/Dashboard";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { CustomEventRow, WeekWithSchedules } from "@/lib/types";

export default async function Home() {
  let weeks: WeekWithSchedules[] = [];
  let events: CustomEventRow[] = [];
  let initialError: string | null = null;

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
      initialError = error.message;
    } else {
      weeks = (data as WeekWithSchedules[]) ?? [];
    }

    const { data: eventsData, error: eventsError } = await supabaseServer
      .from("custom_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

    if (eventsError) {
      initialError = eventsError.message;
    } else {
      events = (eventsData as CustomEventRow[]) ?? [];
    }
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Thiếu cấu hình máy chủ.";
  }

  return <Dashboard initialWeeks={weeks} initialEvents={events} initialError={initialError} />;
}
