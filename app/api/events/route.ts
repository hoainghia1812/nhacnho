import { getSupabaseServer } from "@/lib/supabaseServer";

type EventPayload = {
  title: string;
  eventDate: string;
  eventTime: string;
  message: string;
};

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeString(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export async function GET() {
  try {
    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from("custom_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data ?? []);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể tải danh sách sự kiện." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EventPayload;
    const { title, eventDate, eventTime, message } = payload;

    if (!title?.trim() || !message?.trim() || !isDateString(eventDate) || !isTimeString(eventTime)) {
      return Response.json({ error: "Dữ liệu sự kiện không hợp lệ." }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from("custom_events")
      .insert({
        title: title.trim(),
        event_date: eventDate,
        event_time: eventTime,
        message: message.trim(),
      })
      .select("*")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo sự kiện." },
      { status: 500 },
    );
  }
}
