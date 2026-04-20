"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import { toIsoDate } from "@/lib/date";
import type { CustomEventRow } from "@/lib/types";

type EventManagerProps = {
  initialEvents: CustomEventRow[];
};

const todayDate = new Date().toISOString().slice(0, 10);
const inputClassName =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";

function fromIsoDate(dateIso: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function timeToDate(dateIso: string, time: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function toTimeLabel(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function EventManager({ initialEvents }: EventManagerProps) {
  const [events, setEvents] = useState<CustomEventRow[]>(initialEvents);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayDate);
  const [eventTime, setEventTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const data = (await response.json()) as CustomEventRow[] | { error: string };
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("error" in data ? data.error : "Không thể tải danh sách sự kiện.");
      }
      setEvents(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          eventDate,
          eventTime,
          message,
        }),
      });

      const payload = (await response.json()) as CustomEventRow | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Không thể tạo sự kiện.");
      }

      setTitle("");
      setMessage("");
      setSuccess("Đã thêm sự kiện nhắc việc.");
      await loadEvents();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể tạo sự kiện.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sự kiện nhắc việc</h2>
        <p className="text-sm text-slate-500">Bot Telegram sẽ gửi đúng thời gian bạn đặt.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tên sự kiện"
          className={inputClassName}
          required
        />
        <DatePicker
          selected={fromIsoDate(eventDate)}
          onChange={(selected: Date | null) => {
            if (selected) {
              setEventDate(toIsoDate(selected));
            }
          }}
          dateFormat="yyyy-MM-dd"
          className={inputClassName}
          calendarClassName="luxury-datepicker"
          wrapperClassName="w-full"
          required
        />
        <DatePicker
          selected={timeToDate(eventDate, eventTime)}
          onChange={(selected: Date | null) => {
            if (selected) {
              setEventTime(toTimeLabel(selected));
            }
          }}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={5}
          timeCaption="Giờ"
          dateFormat="HH:mm"
          className={inputClassName}
          calendarClassName="luxury-datepicker"
          wrapperClassName="w-full"
          required
        />
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Nội dung Telegram"
          className={`${inputClassName} md:col-span-2 xl:col-span-1`}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 md:col-span-2 xl:col-span-4"
        >
          {submitting ? "Đang lưu..." : "Thêm sự kiện"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Danh sách sự kiện</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có sự kiện nào.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-slate-600">
                  {item.event_date} lúc {item.event_time.slice(0, 5)}
                </p>
                <p className="text-slate-700">{item.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
