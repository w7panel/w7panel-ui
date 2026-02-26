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

export function unregisterWujieEvent(event: string, handler: Function) {
  if (!handler) {
    return;
  }
  bus.$off(event, handler);
  const index = registeredEvents.findIndex(
    (item) => item.event === event && item.handler === handler
  );
  if (index > -1) {
    registeredEvents.splice(index, 1);
  }
}

export function clearAllWujieEvents() {
  registeredEvents.forEach(({ event, handler }) => {
    if (handler) {
      bus.$off(event, handler);
    }
  });
  registeredEvents.length = 0;
}

export function useWujieEvents() {
  return {
    registerEvent: registerWujieEvent,
    unregisterEvent: unregisterWujieEvent,
    clearAllEvents: clearAllWujieEvents,
  };
}
