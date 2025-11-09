import { createPlugin } from '@/api/plugin';
import { IconCalendar } from '@tabler/icons-solidjs';
import CalendarViewport from './viewport.jsx';
import CalendarPanel from './panel.jsx';

export default createPlugin({
  id: 'webarcade-calendar-plugin',
  name: 'Calendar',
  version: '1.0.0',
  description: 'Calendar with events and reminders',
  author: 'WebArcade Team',
  icon: IconCalendar,

  async onStart(api) {
    console.log('[Webarcade Calendar Plugin] Starting...');

    api.viewport('webarcade-calendar', {
      label: 'Calendar',
      component: CalendarViewport,
      icon: IconCalendar,
      description: 'View and manage your calendar events'
    });

    api.tab('webarcade-calendar-menu', {
      title: 'Calendar',
      component: CalendarPanel,
      icon: IconCalendar,
      order: 50,
      viewport: 'webarcade-calendar'
    });

    console.log('[Webarcade Calendar Plugin] Started successfully');
  },

  async onStop() {
    console.log('[Webarcade Calendar Plugin] Stopping...');
  }
});
