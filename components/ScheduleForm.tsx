"use client";

import { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { buildWeekDates, formatDisplayDate, toIsoDate } from "@/lib/date";
import type { DayScheduleInput } from "@/lib/types";

type ScheduleFormProps = {
  onWeekSaved: () => Promise<void> | void;
};

type FormDay = DayScheduleInput;
const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";
const timeInputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400";

function fromIsoDate(dateIso: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function timeToDate(workDateIso: string, time: string | null): Date {
  const [year, month, day] = workDateIso.split("-").map(Number);
  const [hour, minute] = (time ?? "09:00").split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function toTimeLabel(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function defaultDays(startDate: string): FormDay[] {
  return buildWeekDates(startDate).map((date) => ({
    work_date: date,
    check_in: "09:00",
    check_out: "18:00",
    is_day_off: false,
  }));
}

export function ScheduleForm({ onWeekSaved }: ScheduleFormProps) {
  const initialStartDate = useMemo(() => toIsoDate(new Date()), []);
  const [weekName, setWeekName] = useState("");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [days, setDays] = useState<FormDay[]>(() => defaultDays(initialStartDate));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const regenerateDays = (nextStartDate: string) => {
    setStartDate(nextStartDate);
    setDays(defaultDays(nextStartDate));
  };

  const updateDay = (index: number, patch: Partial<FormDay>) => {
    setDays((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/week", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: weekName || `Tuần của ${startDate}`,
          startDate,
          days,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Không thể lưu tuần làm việc.");
      }

      setSuccess("Đã lưu tuần làm việc thành công.");
      setWeekName("");
      await onWeekSaved();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Lưu tuần làm việc thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tạo lịch làm việc theo tuần</h2>
        <p className="text-sm text-slate-500">Chọn ngày bắt đầu và chỉnh lịch cho 7 ngày tiếp theo.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Week Name</span>
          <input
            type="text"
            value={weekName}
            onChange={(event) => setWeekName(event.target.value)}
            placeholder="Tuần 1"
            className={inputClassName}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Ngày bắt đầu</span>
          <DatePicker
            selected={fromIsoDate(startDate)}
            onChange={(selected: Date | null) => {
              if (selected) {
                regenerateDays(toIsoDate(selected));
              }
            }}
            dateFormat="yyyy-MM-dd"
            className={inputClassName}
            calendarClassName="luxury-datepicker"
            wrapperClassName="w-full"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-7">
        {days.map((day, index) => (
          <div
            key={day.work_date}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
          >
            <div className="font-medium text-sm text-slate-800">{formatDisplayDate(day.work_date)}</div>

            <label className="block space-y-1">
              <span className="text-xs text-slate-600">Giờ vào</span>
              <DatePicker
                selected={timeToDate(day.work_date, day.check_in)}
                onChange={(selected: Date | null) =>
                  updateDay(index, { check_in: selected ? toTimeLabel(selected) : null })
                }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={5}
                timeCaption="Giờ"
                dateFormat="HH:mm"
                className={timeInputClassName}
                calendarClassName="luxury-datepicker"
                wrapperClassName="w-full"
                disabled={day.is_day_off}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-600">Giờ ra</span>
              <DatePicker
                selected={timeToDate(day.work_date, day.check_out)}
                onChange={(selected: Date | null) =>
                  updateDay(index, { check_out: selected ? toTimeLabel(selected) : null })
                }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={5}
                timeCaption="Giờ"
                dateFormat="HH:mm"
                className={timeInputClassName}
                calendarClassName="luxury-datepicker"
                wrapperClassName="w-full"
                disabled={day.is_day_off}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={day.is_day_off}
                onChange={(event) =>
                  updateDay(index, {
                    is_day_off: event.target.checked,
                    check_in: event.target.checked ? null : day.check_in ?? "09:00",
                    check_out: event.target.checked ? null : day.check_out ?? "18:00",
                  })
                }
              />
              Nghỉ
            </label>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {isSaving ? "Đang lưu..." : "Lưu tuần"}
      </button>
    </form>
  );
}
