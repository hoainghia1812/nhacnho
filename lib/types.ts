export type DayScheduleInput = {
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  is_day_off: boolean;
};

export type WeekPayload = {
  name: string;
  startDate: string;
  days: DayScheduleInput[];
};

export type WeekRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type DayScheduleRow = {
  id: string;
  week_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  is_day_off: boolean;
  created_at: string;
};

export type WeekWithSchedules = WeekRow & {
  day_schedules: DayScheduleRow[];
};

export type CustomEventRow = {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  message: string;
  created_at: string;
};
