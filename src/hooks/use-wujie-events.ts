import { bus } from 'wujie';

interface EventHandler {
  event: string;
  handler: Function;
}

const registeredEvents: EventHandler[] = [];

export function registerWujieEvent(event: string, handler: Function) {
  if (!handler) {
    console.warn(`[wujie] handler is undefined for event: ${event}, skip registration`);
    return;
  }
  bus.$on(event, handler);
  registeredEvents.push({ event, handler });
}

export function clearAllWujieEvents() {
  registeredEvents.forEach(({ event, handler }) => {
    if (handler) {
      bus.$off(event, handler);
    }
  });
  registeredEvents.length = 0;
}
