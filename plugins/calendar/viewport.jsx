import { createSignal, For, Show } from 'solid-js';
import { IconPlus, IconTrash, IconEdit, IconChevronLeft, IconChevronRight } from '@tabler/icons-solidjs';

export default function CalendarViewport() {
  const [currentDate, setCurrentDate] = createSignal(new Date());
  const [events, setEvents] = createSignal([]);
  const [showAddEvent, setShowAddEvent] = createSignal(false);
  const [eventTitle, setEventTitle] = createSignal('');
  const [eventDate, setEventDate] = createSignal('');
  const [eventTime, setEventTime] = createSignal('');
  const [eventDescription, setEventDescription] = createSignal('');

  // Load events from localStorage
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

  const saveEvents = (updatedEvents) => {
    setEvents(updatedEvents);
    localStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
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

  const addEvent = () => {
    if (!eventTitle() || !eventDate()) return;

    const newEvent = {
      id: Date.now(),
      title: eventTitle(),
      date: eventDate(),
      time: eventTime(),
      description: eventDescription()
    };

    saveEvents([...events(), newEvent]);
    setEventTitle('');
    setEventDate('');
    setEventTime('');
    setEventDescription('');
    setShowAddEvent(false);
  };

  const deleteEvent = (id) => {
    saveEvents(events().filter(e => e.id !== id));
  };

  const getEventsForDate = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events().filter(e => e.date === dateStr);
  };

  const formatMonthYear = () => {
    const date = currentDate();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDay + 1;
      if (day > 0 && day <= daysInMonth) {
        const dayEvents = getEventsForDate(year, month, day);
        const today = isToday(year, month, day);

        days.push({
          day,
          events: dayEvents,
          isToday: today,
          isCurrentMonth: true
        });
      } else {
        days.push({
          day: null,
          events: [],
          isToday: false,
          isCurrentMonth: false
        });
      }
    }

    return days;
  };

  return (
    <div class="h-full bg-base-200 p-4 overflow-y-auto">
      <div class="max-w-7xl mx-auto">
        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold">Calendar</h1>
          <button
            class="btn btn-primary"
            onClick={() => setShowAddEvent(!showAddEvent())}
          >
            <IconPlus size={20} />
            Add Event
          </button>
        </div>

        {/* Add Event Form */}
        <Show when={showAddEvent()}>
          <div class="card bg-base-100 shadow-lg mb-6 p-4">
            <h2 class="text-xl font-bold mb-4">New Event</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Title</span>
                </label>
                <input
                  type="text"
                  placeholder="Event title"
                  class="input input-bordered"
                  value={eventTitle()}
                  onInput={(e) => setEventTitle(e.target.value)}
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Date</span>
                </label>
                <input
                  type="date"
                  class="input input-bordered"
                  value={eventDate()}
                  onInput={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Time (optional)</span>
                </label>
                <input
                  type="time"
                  class="input input-bordered"
                  value={eventTime()}
                  onInput={(e) => setEventTime(e.target.value)}
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Description (optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Event description"
                  class="input input-bordered"
                  value={eventDescription()}
                  onInput={(e) => setEventDescription(e.target.value)}
                />
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button class="btn btn-primary" onClick={addEvent}>
                Add Event
              </button>
              <button class="btn btn-ghost" onClick={() => setShowAddEvent(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Show>

        {/* Calendar Navigation */}
        <div class="card bg-base-100 shadow-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <button class="btn btn-ghost btn-sm" onClick={previousMonth}>
              <IconChevronLeft size={20} />
            </button>
            <h2 class="text-2xl font-bold">{formatMonthYear()}</h2>
            <button class="btn btn-ghost btn-sm" onClick={nextMonth}>
              <IconChevronRight size={20} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div class="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}>
              {(day) => (
                <div class="text-center font-bold text-sm opacity-60 py-2">
                  {day}
                </div>
              )}
            </For>

            {/* Calendar Days */}
            <For each={renderCalendar()}>
              {(cell) => (
                <div
                  class={`min-h-24 p-2 rounded-lg border-2 ${
                    cell.isCurrentMonth
                      ? cell.isToday
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 bg-base-100'
                      : 'border-transparent bg-base-300/30'
                  }`}
                >
                  {cell.day && (
                    <>
                      <div class={`text-sm font-bold mb-1 ${cell.isToday ? 'text-primary' : ''}`}>
                        {cell.day}
                      </div>
                      <div class="space-y-1">
                        <For each={cell.events}>
                          {(event) => (
                            <div class="bg-info/20 text-info rounded px-1 py-0.5 text-xs truncate group relative">
                              {event.time && <span class="font-medium">{event.time} </span>}
                              {event.title}
                            </div>
                          )}
                        </For>
                      </div>
                    </>
                  )}
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Upcoming Events */}
        <div class="card bg-base-100 shadow-lg mt-6 p-4">
          <h2 class="text-xl font-bold mb-4">Upcoming Events</h2>
          <div class="space-y-2">
            <For each={events().sort((a, b) => new Date(a.date) - new Date(b.date))}>
              {(event) => (
                <div class="bg-base-200 rounded-lg p-3 flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="font-bold">{event.title}</div>
                    <div class="text-sm opacity-60">
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {event.time && ` at ${event.time}`}
                    </div>
                    {event.description && (
                      <div class="text-sm mt-1">{event.description}</div>
                    )}
                  </div>
                  <button
                    class="btn btn-ghost btn-sm text-error"
                    onClick={() => deleteEvent(event.id)}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              )}
            </For>
            {events().length === 0 && (
              <div class="text-center py-8 opacity-50">
                No events scheduled
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
