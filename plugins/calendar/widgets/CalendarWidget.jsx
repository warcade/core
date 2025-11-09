import { createSignal, For, Show } from 'solid-js';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconCircleFilled } from '@tabler/icons-solidjs';

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = createSignal(new Date());
  const [events, setEvents] = createSignal([]);

  const loadEvents = () => {
    const saved = localStorage.getItem('calendar_events');
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load events:', e);
      }
    }
  };

  loadEvents();

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    const date = currentDate();
    setCurrentDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const date = currentDate();
    setCurrentDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  const getEventsForDate = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events().filter(e => e.date === dateStr);
  };

  const formatMonthYear = () => {
    const date = currentDate();
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
  };

  const renderCalendar = () => {
    const date = currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);

    const days = [];
    const totalCells = 35; // 5 rows x 7 days

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDay + 1;
      if (day > 0 && day <= daysInMonth) {
        const dayEvents = getEventsForDate(year, month, day);
        const today = isToday(year, month, day);

        days.push({
          day,
          hasEvents: dayEvents.length > 0,
          isToday: today,
          isCurrentMonth: true
        });
      } else {
        days.push({
          day: null,
          hasEvents: false,
          isToday: false,
          isCurrentMonth: false
        });
      }
    }

    return days;
  };

  const upcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events()
      .filter(e => new Date(e.date + 'T00:00:00') >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  };

  return (
    <div class="card bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 bg-base-100 shadow-lg h-full flex flex-col p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconCalendar size={16} class="text-indigo-500 opacity-80" />
          <span class="text-xs font-medium opacity-70">Calendar</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="btn btn-xs btn-ghost p-0 h-auto min-h-0 w-5"
            onClick={previousMonth}
          >
            <IconChevronLeft size={12} />
          </button>
          <div class="text-xs font-medium min-w-20 text-center">
            {formatMonthYear()}
          </div>
          <button
            class="btn btn-xs btn-ghost p-0 h-auto min-h-0 w-5"
            onClick={nextMonth}
          >
            <IconChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Mini Calendar */}
      <div class="mb-2">
        <div class="grid grid-cols-7 gap-0.5 mb-1">
          <For each={['S', 'M', 'T', 'W', 'T', 'F', 'S']}>
            {(day) => (
              <div class="text-center text-xs opacity-40 font-medium">
                {day}
              </div>
            )}
          </For>
        </div>

        <div class="grid grid-cols-7 gap-0.5">
          <For each={renderCalendar()}>
            {(cell) => (
              <div
                class={`aspect-square flex items-center justify-center text-xs rounded relative ${
                  cell.isCurrentMonth
                    ? cell.isToday
                      ? 'bg-indigo-500 text-indigo-50 font-bold'
                      : 'hover:bg-base-200'
                    : 'opacity-20'
                }`}
              >
                {cell.day}
                {cell.hasEvents && (
                  <div class="absolute bottom-0 left-1/2 -translate-x-1/2">
                    <IconCircleFilled size={3} class="text-info" />
                  </div>
                )}
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Upcoming Events */}
      <div class="flex-1 overflow-y-auto border-t border-base-content/10 pt-2" style="scrollbar-width: thin;">
        <div class="text-xs font-medium opacity-50 mb-1.5">Upcoming</div>
        <Show
          when={upcomingEvents().length > 0}
          fallback={
            <div class="text-xs opacity-40 text-center py-2">
              No events
            </div>
          }
        >
          <div class="space-y-1.5">
            <For each={upcomingEvents()}>
              {(event) => (
                <div class="bg-base-200/50 rounded p-1.5">
                  <div class="text-xs font-medium truncate" title={event.title}>
                    {event.title}
                  </div>
                  <div class="text-xs opacity-50 mt-0.5">
                    {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                    {event.time && (
                      <span class="ml-1">{event.time}</span>
                    )}
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
