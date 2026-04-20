"use client";

import { useMemo, useState } from "react";
import { formatDisplayDate, isToday } from "@/lib/date";
import type { WeekWithSchedules } from "@/lib/types";

type WeekViewProps = {
  weeks: WeekWithSchedules[];
  selectedWeekId: string | null;
  onSelectWeek: (weekId: string) => void;
};

function timeLabel(value: string | null): string {
  if (!value) {
    return "-";
  }
  return value.slice(0, 5);
}

export function WeekView({ weeks, selectedWeekId, onSelectWeek }: WeekViewProps) {
  const selectedWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId) ?? weeks[0] ?? null,
    [selectedWeekId, weeks],
  );
  const [checkedInMap, setCheckedInMap] = useState<Record<string, boolean>>({});

  if (weeks.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500">
        Chưa có lịch nào. Hãy tạo tuần đầu tiên ở phía trên.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Các tuần đã lưu</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => {
            const isActive = selectedWeek?.id === week.id;
            return (
              <button
                key={week.id}
                type="button"
                onClick={() => onSelectWeek(week.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                }`}
              >
                <p className="text-sm font-semibold">{week.name}</p>
                <p className={`text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                  {week.start_date} đến {week.end_date}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {selectedWeek ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{selectedWeek.name}</h3>
            <span className="text-xs text-slate-500">
              {selectedWeek.start_date} đến {selectedWeek.end_date}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {selectedWeek.day_schedules.map((day) => {
              const isChecked = checkedInMap[day.id] ?? false;
              return (
                <div
                  key={day.id}
                  className={`rounded-xl border p-3 ${
                    isToday(day.work_date)
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{formatDisplayDate(day.work_date)}</p>
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <p>Giờ vào: {day.is_day_off ? "Nghỉ" : timeLabel(day.check_in)}</p>
                    <p>Giờ ra: {day.is_day_off ? "Nghỉ" : timeLabel(day.check_out)}</p>
                  </div>
                  {!day.is_day_off ? (
                    <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) =>
                          setCheckedInMap((current) => ({
                            ...current,
                            [day.id]: event.target.checked,
                          }))
                        }
                      />
                      Đã check-in
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
