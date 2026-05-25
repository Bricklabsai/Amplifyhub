"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CalendarEvent = {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  date: string;
  status: "PUBLISHED" | "SCHEDULED" | "DRAFT" | "QUEUED";
};

const STATUS_STYLES: Record<
  string,
  { dot: string; chip: string; badge: string; label: string }
> = {
  PUBLISHED: {
    dot: "bg-emerald-500",
    chip: "border-l-emerald-500 bg-emerald-50/90 text-emerald-900",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Published",
  },
  SCHEDULED: {
    dot: "bg-blue-500",
    chip: "border-l-blue-500 bg-blue-50/90 text-blue-900",
    badge: "bg-blue-100 text-blue-700",
    label: "Scheduled",
  },
  DRAFT: {
    dot: "bg-gray-400",
    chip: "border-l-gray-400 bg-gray-50 text-gray-800",
    badge: "bg-gray-100 text-gray-600",
    label: "Draft",
  },
  QUEUED: {
    dot: "bg-amber-500",
    chip: "border-l-amber-500 bg-amber-50/90 text-amber-900",
    badge: "bg-amber-100 text-amber-800",
    label: "Queued",
  },
};

const MAX_VISIBLE_IN_CELL = 2;

export function ContentCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);

  const parsedEvents = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        parsedDate: parseISO(e.date),
        preview: e.excerpt || e.title,
      })),
    [events]
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsForDay = (day: Date) =>
    parsedEvents.filter((e) => isSameDay(e.parsedDate, day));

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  function openEvent(ev: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    setViewingEvent(ev);
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 p-6">
          <div>
            <h3
              className="font-bold text-gray-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Content Calendar
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              See post previews on each day — click any post to read the full content
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Previous month"
            >
              <HiChevronLeft className="text-lg" />
            </button>
            <span
              className="min-w-[140px] text-center text-sm font-bold text-gray-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Next month"
            >
              <HiChevronRight className="text-lg" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 border-b border-gray-50 px-6 py-3">
          {Object.entries(STATUS_STYLES).map(([key, style]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={cn("h-2 w-2 rounded-full", style.dot)} />
              {style.label}
            </div>
          ))}
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const dayEvents = eventsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE_IN_CELL);

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDay(day);
                    }
                  }}
                  className={cn(
                    "flex min-h-[100px] cursor-pointer flex-col rounded-lg border p-1.5 text-left transition-colors md:min-h-[120px]",
                    inMonth ? "border-gray-100 bg-white" : "border-transparent bg-gray-50/50",
                    isSelected && "border-violet-300 ring-2 ring-violet-100",
                    isToday && !isSelected && "border-violet-200"
                  )}
                >
                  <span
                    className={cn(
                      "mb-1 flex-shrink-0 text-xs font-semibold",
                      inMonth ? "text-gray-800" : "text-gray-300",
                      isToday && "text-violet-600"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, MAX_VISIBLE_IN_CELL).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => openEvent(ev, e)}
                        className={cn(
                          "w-full rounded border-l-2 px-1 py-0.5 text-left text-[9px] leading-tight transition-opacity hover:opacity-90 md:text-[10px]",
                          STATUS_STYLES[ev.status]?.chip
                        )}
                        title={ev.preview}
                      >
                        <span className="line-clamp-2 font-medium">{ev.preview}</span>
                      </button>
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(day);
                        }}
                        className="text-left text-[9px] font-medium text-violet-600 hover:underline"
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDay && (
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <h4 className="text-sm font-bold text-gray-900">
                {format(selectedDay, "EEEE, MMM d")}
              </h4>
              {selectedEvents.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">No content on this day</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {selectedEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => setViewingEvent(ev)}
                        className="flex w-full items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-left text-sm transition-colors hover:bg-violet-50"
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                            STATUS_STYLES[ev.status]?.dot
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-medium text-gray-800">
                            {ev.preview}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            {STATUS_STYLES[ev.status]?.label} · Click to view
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!viewingEvent} onOpenChange={(open) => !open && setViewingEvent(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {viewingEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 pr-6">
                  <DialogTitle
                    className="text-left text-lg"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Post details
                  </DialogTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    className={cn(
                      "border-0 text-xs font-medium",
                      STATUS_STYLES[viewingEvent.status]?.badge
                    )}
                  >
                    {STATUS_STYLES[viewingEvent.status]?.label}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(parseISO(viewingEvent.date), "EEEE, MMM d, yyyy · h:mm a")}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {viewingEvent.content || viewingEvent.title}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/posts?status=${
                        viewingEvent.status === "QUEUED"
                          ? "queued"
                          : viewingEvent.status
                      }`}
                    >
                      Open in Posts
                    </Link>
                  </Button>
                  {(viewingEvent.status === "DRAFT" ||
                    viewingEvent.status === "SCHEDULED") && (
                    <Button size="sm" className="brand-gradient-bg border-0 text-white" asChild>
                      <Link href="/compose">Go to Compose</Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
