import { createSignal, onCleanup, createEffect } from 'solid-js';
import { IconClock, IconPlayerPlay, IconPlayerPause, IconRefresh } from '@tabler/icons-solidjs';

export default function PomodoroWidget() {
  const WORK_TIME = 25 * 60; // 25 minutes
  const SHORT_BREAK = 5 * 60; // 5 minutes
  const LONG_BREAK = 15 * 60; // 15 minutes

  const [timeLeft, setTimeLeft] = createSignal(WORK_TIME);
  const [isRunning, setIsRunning] = createSignal(false);
  const [mode, setMode] = createSignal('work'); // 'work', 'short', 'long'
  const [sessionCount, setSessionCount] = createSignal(0);

  let interval;

  createEffect(() => {
    if (isRunning()) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }

    onCleanup(() => {
      if (interval) clearInterval(interval);
    });
  });

  const handleTimerComplete = () => {
    setIsRunning(false);

    // Play notification sound (browser beep)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZVA0PVKno8LJoHwY/ldz0xXYqBSl+zPLaizsIGGS57OihUhELTqXh8bllHgU2kNXzzn0vBSh6yvDckTsJFV+16+mjVBILTKPh8bllHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHgU3kdX0z34wBSl7yvDdkTsJFWC27OqjUxEKTKPh8rhlHg==');
      audio.play().catch(() => {});
    } catch (e) {}

    if (mode() === 'work') {
      const newCount = sessionCount() + 1;
      setSessionCount(newCount);

      if (newCount % 4 === 0) {
        switchMode('long');
      } else {
        switchMode('short');
      }
    } else {
      switchMode('work');
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    switch (newMode) {
      case 'work':
        setTimeLeft(WORK_TIME);
        break;
      case 'short':
        setTimeLeft(SHORT_BREAK);
        break;
      case 'long':
        setTimeLeft(LONG_BREAK);
        break;
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning());
  };

  const resetTimer = () => {
    setIsRunning(false);
    switchMode('work');
    setSessionCount(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const total = mode() === 'work' ? WORK_TIME : mode() === 'short' ? SHORT_BREAK : LONG_BREAK;
    return ((total - timeLeft()) / total) * 100;
  };

  const getModeColor = () => {
    switch (mode()) {
      case 'work':
        return 'text-error';
      case 'short':
        return 'text-success';
      case 'long':
        return 'text-info';
      default:
        return '';
    }
  };

  const getModeLabel = () => {
    switch (mode()) {
      case 'work':
        return 'Focus Time';
      case 'short':
        return 'Short Break';
      case 'long':
        return 'Long Break';
      default:
        return '';
    }
  };

  return (
    <div class="card bg-gradient-to-br from-error/20 to-error/5 bg-base-100 shadow-lg h-full flex flex-col justify-between p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconClock size={16} class="text-error opacity-80" />
          <span class="text-xs font-medium opacity-70">Pomodoro</span>
        </div>
        <div class="text-xs opacity-50">#{sessionCount()}</div>
      </div>

      {/* Mode Indicator */}
      <div class={`text-center text-xs font-medium mb-2 ${getModeColor()}`}>
        {getModeLabel()}
      </div>

      {/* Timer Display */}
      <div class="flex-1 flex items-center justify-center">
        <div class={`text-5xl font-bold tabular-nums ${getModeColor()}`}>
          {formatTime(timeLeft())}
        </div>
      </div>

      {/* Progress Bar */}
      <div class="mb-3">
        <progress
          class={`progress w-full h-2 ${
            mode() === 'work' ? 'progress-error' : mode() === 'short' ? 'progress-success' : 'progress-info'
          }`}
          value={getProgress()}
          max="100"
        />
      </div>

      {/* Controls */}
      <div class="flex gap-2">
        <button
          class={`btn btn-sm flex-1 ${
            isRunning() ? 'btn-warning' : 'btn-success'
          }`}
          onClick={toggleTimer}
        >
          {isRunning() ? (
            <>
              <IconPlayerPause size={14} />
              Pause
            </>
          ) : (
            <>
              <IconPlayerPlay size={14} />
              Start
            </>
          )}
        </button>
        <button
          class="btn btn-sm btn-ghost"
          onClick={resetTimer}
          title="Reset"
        >
          <IconRefresh size={14} />
        </button>
      </div>

      {/* Mode Selector */}
      <div class="grid grid-cols-3 gap-1 mt-2">
        <button
          class={`btn btn-xs ${mode() === 'work' ? 'btn-error' : 'btn-ghost'}`}
          onClick={() => !isRunning() && switchMode('work')}
          disabled={isRunning()}
        >
          Work
        </button>
        <button
          class={`btn btn-xs ${mode() === 'short' ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => !isRunning() && switchMode('short')}
          disabled={isRunning()}
        >
          Short
        </button>
        <button
          class={`btn btn-xs ${mode() === 'long' ? 'btn-info' : 'btn-ghost'}`}
          onClick={() => !isRunning() && switchMode('long')}
          disabled={isRunning()}
        >
          Long
        </button>
      </div>
    </div>
  );
}
