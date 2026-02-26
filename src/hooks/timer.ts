import { onUnmounted, onActivated, onDeactivated } from 'vue';

type TimerType = 'setTimeout' | 'setInterval';

interface TimerItem {
  id: string;
  type: TimerType;
  timerId: number | NodeJS.Timeout;
}

const timers: Map<string, TimerItem> = new Map();

export function useTimer() {
  const setTimer = (
    id: string,
    callback: () => void,
    delay: number,
    type: TimerType = 'setTimeout'
  ): number | NodeJS.Timeout => {
    clearTimer(id);
    
    let timerId: number | NodeJS.Timeout;
    
    if (type === 'setInterval') {
      timerId = setInterval(callback, delay);
    } else {
      timerId = setTimeout(callback, delay);
    }
    
    timers.set(id, { id, type, timerId });
    
    return timerId;
  };

  const setTimeout = (id: string, callback: () => void, delay: number): number => {
    return setTimer(id, callback, delay, 'setTimeout') as number;
  };

  const setInterval = (id: string, callback: () => void, delay: number): NodeJS.Timeout => {
    return setTimer(id, callback, delay, 'setInterval') as NodeJS.Timeout;
  };

  const clearTimer = (id: string) => {
    const item = timers.get(id);
    if (item) {
      if (item.type === 'setInterval') {
        clearInterval(item.timerId as NodeJS.Timeout);
      } else {
        clearTimeout(item.timerId as number);
      }
      timers.delete(id);
    }
  };

  const clearAllTimers = () => {
    timers.forEach((item) => {
      if (item.type === 'setInterval') {
        clearInterval(item.timerId as NodeJS.Timeout);
      } else {
        clearTimeout(item.timerId as number);
      }
    });
    timers.clear();
  };

  onUnmounted(() => {
    clearAllTimers();
  });

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers,
  };
}

export function usePolling(callback: () => void | Promise<void>, delay: number = 5000) {
  const pollingId = `polling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let isPolling = false;
  let timerId: NodeJS.Timeout | null = null;

  const startPolling = () => {
    if (isPolling) return;
    isPolling = true;
    
    const run = async () => {
      if (!isPolling) return;
      try {
        await callback();
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        if (isPolling) {
          timerId = setTimeout(run, delay);
        }
      }
    };
    
    run();
  };

  const stopPolling = () => {
    isPolling = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const restartPolling = () => {
    stopPolling();
    startPolling();
  };

  onUnmounted(() => {
    stopPolling();
  });

  onDeactivated(() => {
    stopPolling();
  });

  onActivated(() => {
    startPolling();
  });

  return {
    startPolling,
    stopPolling,
    restartPolling,
    isPolling: () => isPolling,
  };
}

export default useTimer;
