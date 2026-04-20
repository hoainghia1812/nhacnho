create extension if not exists "pgcrypto";

create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.day_schedules (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  work_date date not null unique,
  check_in time,
  check_out time,
  is_day_off boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint valid_time_range check (
    is_day_off = true or (check_in is not null and check_out is not null and check_out > check_in)
  )
);

create index if not exists day_schedules_week_id_idx on public.day_schedules(week_id);
create index if not exists day_schedules_work_date_idx on public.day_schedules(work_date);

create table if not exists public.custom_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time not null,
  message text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists custom_events_event_date_idx on public.custom_events(event_date);
create index if not exists custom_events_event_time_idx on public.custom_events(event_time);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.day_schedules(id) on delete cascade,
  work_date date not null,
  event_type text not null,
  sent_at timestamp with time zone not null default now(),
  unique (schedule_id, work_date, event_type)
);

create index if not exists notification_logs_work_date_idx on public.notification_logs(work_date);
