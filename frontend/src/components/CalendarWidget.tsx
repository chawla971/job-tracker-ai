import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface CalendarEvent {
  date: string; // "YYYY-MM-DD"
  type: "interview" | "coffee_chat" | "activity";
  label: string;
}

const DOT_COLORS: Record<CalendarEvent["type"], string> = {
  interview:   "bg-blue-500",
  coffee_chat: "bg-green-500",
  activity:    "bg-gray-400",
};

const LABEL_COLORS: Record<CalendarEvent["type"], string> = {
  interview:   "text-blue-500",
  coffee_chat: "text-green-500",
  activity:    "text-gray-400",
};

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarWidget({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [year,  setYear]    = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [popover, setPopover] = useState<{ date: string; events: CalendarEvent[] } | null>(null);

  const eventMap = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    const list = eventMap.get(e.date) ?? [];
    list.push(e);
    eventMap.set(e.date, list);
  });

  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const todayStr     = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="rounded-xl bg-secondary border select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <button onClick={prev}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-semibold text-base">{MONTHS[month]} {year}</h3>
        <button onClick={next}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-16" />;

            const dateStr   = isoDate(year, month, day);
            const dayEvents = eventMap.get(dateStr) ?? [];
            const isToday   = dateStr === todayStr;
            const hasEvents = dayEvents.length > 0;
            const isOpen    = popover?.date === dateStr;
            const types     = [...new Set(dayEvents.map((e) => e.type))];

            return (
              <button
                key={i}
                onClick={() => hasEvents
                  ? setPopover(isOpen ? null : { date: dateStr, events: dayEvents })
                  : setPopover(null)
                }
                className={`
                  relative h-16 flex flex-col items-center justify-start pt-2 rounded-lg
                  transition-colors duration-150
                  ${isToday
                    ? "bg-primary text-primary-foreground"
                    : hasEvents
                    ? "hover:bg-accent cursor-pointer"
                    : "hover:bg-accent/50 cursor-default"}
                  ${isOpen && !isToday ? "bg-accent ring-1 ring-border" : ""}
                `}
              >
                <span className={`text-sm font-medium leading-none ${isToday ? "text-primary-foreground" : ""}`}>
                  {day}
                </span>

                {/* Event dots */}
                {types.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {types.map((t) => (
                      <span
                        key={t}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isToday ? "bg-primary-foreground/70" : DOT_COLORS[t]
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-4 pt-3 border-t">
          {([["interview", "Interview"], ["coffee_chat", "Coffee Chat"]] as [CalendarEvent["type"], string][]).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${DOT_COLORS[type]}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Popover — rendered below the grid, not overlapping */}
      {popover && (
        <div className="border-t px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">
              {new Date(popover.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </p>
            <button onClick={() => setPopover(null)}
              className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-2">
            {popover.events.map((e, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg bg-background px-3 py-2.5">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${DOT_COLORS[e.type]}`} />
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${LABEL_COLORS[e.type]}`}>
                    {e.type === "coffee_chat" ? "Coffee Chat" : "Interview"}
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{e.label}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
