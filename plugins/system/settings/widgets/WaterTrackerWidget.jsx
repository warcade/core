import { createSignal, onMount, For } from 'solid-js';
import { IconDroplet, IconDropletFilled, IconRefresh, IconPlus, IconMinus } from '@tabler/icons-solidjs';

export default function WaterTrackerWidget() {
  const [glasses, setGlasses] = createSignal(0);
  const [dailyGoal, setDailyGoal] = createSignal(8); // Default 8 glasses
  const [lastResetDate, setLastResetDate] = createSignal('');

  onMount(() => {
    loadData();
    checkAndResetDaily();
  });

  const loadData = () => {
    const savedGlasses = localStorage.getItem('water_glasses');
    const savedGoal = localStorage.getItem('water_goal');
    const savedDate = localStorage.getItem('water_date');

    if (savedGlasses) setGlasses(parseInt(savedGlasses));
    if (savedGoal) setDailyGoal(parseInt(savedGoal));
    if (savedDate) setLastResetDate(savedDate);
  };

  const saveData = () => {
    localStorage.setItem('water_glasses', glasses().toString());
    localStorage.setItem('water_goal', dailyGoal().toString());
    localStorage.setItem('water_date', lastResetDate());
  };

  const checkAndResetDaily = () => {
    const today = new Date().toDateString();
    if (lastResetDate() !== today) {
      setGlasses(0);
      setLastResetDate(today);
      saveData();
    }
  };

  const addGlass = () => {
    setGlasses(glasses() + 1);
    saveData();
  };

  const removeGlass = () => {
    if (glasses() > 0) {
      setGlasses(glasses() - 1);
      saveData();
    }
  };

  const reset = () => {
    setGlasses(0);
    saveData();
  };

  const increaseGoal = () => {
    setDailyGoal(dailyGoal() + 1);
    saveData();
  };

  const decreaseGoal = () => {
    if (dailyGoal() > 1) {
      setDailyGoal(dailyGoal() - 1);
      saveData();
    }
  };

  const getProgress = () => {
    return Math.min((glasses() / dailyGoal()) * 100, 100);
  };

  const getProgressColor = () => {
    const progress = getProgress();
    if (progress >= 100) return 'progress-success';
    if (progress >= 50) return 'progress-info';
    return 'progress-warning';
  };

  const getDropletColor = (index) => {
    if (index < glasses()) return 'text-info';
    return 'text-base-content/10';
  };

  return (
    <div class="card bg-gradient-to-br from-info/20 to-info/5 bg-base-100 shadow-lg h-full flex flex-col p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconDroplet size={16} class="text-info opacity-80" />
          <span class="text-xs font-medium opacity-70">Water Intake</span>
        </div>
        <button
          class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0"
          onClick={reset}
          title="Reset today"
        >
          <IconRefresh size={12} />
        </button>
      </div>

      {/* Progress Circle */}
      <div class="flex-1 flex flex-col items-center justify-center mb-3">
        <div class="relative">
          {/* Circular Progress */}
          <div
            class="radial-progress text-info"
            style={`--value: ${getProgress()}; --size: 7rem; --thickness: 0.5rem;`}
            role="progressbar"
          >
            <div class="text-center">
              <div class="text-3xl font-bold text-info">{glasses()}</div>
              <div class="text-xs opacity-50">of {dailyGoal()}</div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div class="text-center mt-3">
          {getProgress() >= 100 ? (
            <div class="text-xs text-success font-medium">Goal reached!</div>
          ) : (
            <div class="text-xs opacity-60">
              {dailyGoal() - glasses()} more to go
            </div>
          )}
        </div>
      </div>

      {/* Glass Visualization */}
      <div class="mb-3">
        <div class="grid grid-cols-8 gap-1 justify-items-center">
          <For each={Array.from({ length: Math.min(dailyGoal(), 16) })}>
            {(_, i) => (
              <IconDropletFilled
                size={16}
                class={`${getDropletColor(i())} transition-colors`}
              />
            )}
          </For>
        </div>
      </div>

      {/* Controls */}
      <div class="space-y-2">
        {/* Add/Remove Glass */}
        <div class="flex gap-2">
          <button
            class="btn btn-sm btn-error flex-1"
            onClick={removeGlass}
            disabled={glasses() === 0}
          >
            <IconMinus size={14} />
            Remove
          </button>
          <button
            class="btn btn-sm btn-info flex-1"
            onClick={addGlass}
          >
            <IconPlus size={14} />
            Add Glass
          </button>
        </div>

        {/* Goal Adjustment */}
        <div class="flex items-center justify-between bg-base-200/50 rounded p-2">
          <span class="text-xs opacity-70">Daily Goal</span>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-xs btn-ghost btn-square"
              onClick={decreaseGoal}
              disabled={dailyGoal() <= 1}
            >
              <IconMinus size={12} />
            </button>
            <span class="text-sm font-bold w-6 text-center">{dailyGoal()}</span>
            <button
              class="btn btn-xs btn-ghost btn-square"
              onClick={increaseGoal}
            >
              <IconPlus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div class="mt-2">
        <progress
          class={`progress ${getProgressColor()} w-full h-2`}
          value={getProgress()}
          max="100"
        />
      </div>
    </div>
  );
}
