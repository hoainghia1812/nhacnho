"use client";

import { useState } from "react";
import { EventManager } from "@/components/EventManager";
import { ScheduleForm } from "@/components/ScheduleForm";
import { WeekView } from "@/components/WeekView";
import type { CustomEventRow, WeekWithSchedules } from "@/lib/types";

type DashboardProps = {
  initialWeeks: WeekWithSchedules[];
  initialEvents: CustomEventRow[];
  initialError?: string | null;
};

export function Dashboard({ initialWeeks, initialEvents, initialError = null }: DashboardProps) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(initialWeeks[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const loadWeeks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/weeks", { cache: "no-store" });
      const data = (await response.json()) as WeekWithSchedules[] | { error: string };

      if (!response.ok || !Array.isArray(data)) {
        throw new Error("error" in data ? data.error : "Không thể tải danh sách tuần.");
      }

      setWeeks(data);
      setSelectedWeekId((current) => {
        if (current && data.some((week) => week.id === current)) {
          return current;
        }
        return data[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch làm việc.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-sm">
          <h1 className="text-2xl font-bold">Bảng điều khiển nhắc chấm công</h1>
          <p className="mt-1 text-sm text-slate-200">
            Tạo lịch làm việc theo tuần và nhận nhắc nhở chấm công qua Telegram.
          </p>
        </header>

        <ScheduleForm onWeekSaved={loadWeeks} />
        <EventManager initialEvents={initialEvents} />

        {loading ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">Đang tải lịch...</p>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm">{error}</p>
        ) : (
          <WeekView weeks={weeks} selectedWeekId={selectedWeekId} onSelectWeek={setSelectedWeekId} />
        )}
      </div>
    </main>
  );
}
