import { createSignal, For } from 'solid-js';
import { IconCalendarEvent } from '@tabler/icons-solidjs';

export default function CalendarPanel() {
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

  const upcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events()
      .filter(e => new Date(e.date + 'T00:00:00') >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

  return (
    <div class="p-4">
      <div class="flex items-center gap-2 mb-4">
        <IconCalendarEvent size={20} />
        <h2 class="text-lg font-bold">Upcoming Events</h2>
      </div>

      <div class="space-y-2">
        <For each={upcomingEvents()}>
          {(event) => (
            <div class="bg-base-200 rounded-lg p-3">
              <div class="font-medium text-sm">{event.title}</div>
              <div class="text-xs opacity-60 mt-1">
                {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
                {event.time && ` • ${event.time}`}
              </div>
            </div>
          )}
        </For>

        {upcomingEvents().length === 0 && (
          <div class="text-center py-8 opacity-50 text-sm">
            No upcoming events
          </div>
        )}
      </div>
    </div>
  );
}
