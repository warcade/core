import { createSignal, For, Show } from 'solid-js';
import { IconTarget, IconPlus, IconTrash, IconEdit, IconCheck, IconTrendingUp } from '@tabler/icons-solidjs';

export default function GoalTrackerWidget() {
  const [goals, setGoals] = createSignal([]);
  const [showAddGoal, setShowAddGoal] = createSignal(false);
  const [newGoalTitle, setNewGoalTitle] = createSignal('');
  const [newGoalTarget, setNewGoalTarget] = createSignal('100');
  const [editingId, setEditingId] = createSignal(null);
  const [editProgress, setEditProgress] = createSignal('');

  const loadGoals = () => {
    const saved = localStorage.getItem('goal_tracker_goals');
    if (saved) {
      try {
        setGoals(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load goals:', e);
      }
    }
  };

  const saveGoals = (updatedGoals) => {
    setGoals(updatedGoals);
    localStorage.setItem('goal_tracker_goals', JSON.stringify(updatedGoals));
  };

  loadGoals();

  const addGoal = () => {
    const title = newGoalTitle().trim();
    const target = parseInt(newGoalTarget());

    if (!title || !target || target <= 0) return;

    const newGoal = {
      id: Date.now(),
      title,
      current: 0,
      target,
      createdAt: new Date().toISOString()
    };

    saveGoals([...goals(), newGoal]);
    setNewGoalTitle('');
    setNewGoalTarget('100');
    setShowAddGoal(false);
  };

  const deleteGoal = (id) => {
    saveGoals(goals().filter(goal => goal.id !== id));
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setEditProgress(goal.current.toString());
  };

  const saveEdit = (goalId) => {
    const newProgress = parseInt(editProgress());
    if (isNaN(newProgress) || newProgress < 0) {
      cancelEdit();
      return;
    }

    const goal = goals().find(g => g.id === goalId);
    if (!goal) return;

    saveGoals(
      goals().map(g =>
        g.id === goalId
          ? { ...g, current: Math.min(newProgress, g.target) }
          : g
      )
    );
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditProgress('');
  };

  const incrementProgress = (goalId, amount = 1) => {
    saveGoals(
      goals().map(goal =>
        goal.id === goalId
          ? { ...goal, current: Math.min(goal.current + amount, goal.target) }
          : goal
      )
    );
  };

  const getProgress = (goal) => {
    return (goal.current / goal.target) * 100;
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'progress-success';
    if (progress >= 75) return 'progress-info';
    if (progress >= 50) return 'progress-warning';
    return 'progress-error';
  };

  return (
    <div class="card bg-gradient-to-br from-success/20 to-success/5 bg-base-100 shadow-lg h-full flex flex-col p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconTarget size={16} class="text-success opacity-80" />
          <span class="text-xs font-medium opacity-70">Goals</span>
        </div>
        <button
          class="btn btn-xs btn-success"
          onClick={() => setShowAddGoal(!showAddGoal())}
        >
          <IconPlus size={12} />
        </button>
      </div>

      {/* Add Goal Form */}
      <Show when={showAddGoal()}>
        <div class="bg-base-200/50 rounded p-2 mb-2 space-y-1.5">
          <input
            type="text"
            placeholder="Goal title..."
            class="input input-xs input-bordered w-full bg-base-100 text-xs"
            value={newGoalTitle()}
            onInput={(e) => setNewGoalTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addGoal()}
          />
          <div class="flex gap-1.5">
            <input
              type="number"
              placeholder="Target"
              class="input input-xs input-bordered flex-1 bg-base-100 text-xs"
              value={newGoalTarget()}
              onInput={(e) => setNewGoalTarget(e.target.value)}
              min="1"
            />
            <button
              class="btn btn-xs btn-success"
              onClick={addGoal}
              disabled={!newGoalTitle().trim() || !newGoalTarget()}
            >
              Add
            </button>
            <button
              class="btn btn-xs btn-ghost"
              onClick={() => setShowAddGoal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Show>

      {/* Goals List */}
      <div class="flex-1 overflow-y-auto space-y-2" style="scrollbar-width: thin;">
        <For each={goals()}>
          {(goal) => {
            const progress = getProgress(goal);
            const isComplete = progress >= 100;

            return (
              <div class="bg-base-200/50 rounded p-2">
                {/* Goal Header */}
                <div class="flex items-start justify-between mb-1.5">
                  <div class="flex-1 min-w-0">
                    <div class={`text-xs font-medium truncate ${isComplete ? 'line-through opacity-60' : ''}`}>
                      {goal.title}
                    </div>
                    {isComplete && (
                      <div class="text-xs text-success flex items-center gap-1 mt-0.5">
                        <IconCheck size={10} />
                        Completed!
                      </div>
                    )}
                  </div>
                  <div class="flex gap-0.5 ml-1">
                    <button
                      class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0 w-5"
                      onClick={() => startEdit(goal)}
                      title="Edit progress"
                    >
                      <IconEdit size={12} />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0 w-5 text-error"
                      onClick={() => deleteGoal(goal.id)}
                      title="Delete"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                </div>

                {/* Progress Edit */}
                <Show when={editingId() === goal.id}>
                  <div class="flex gap-1 mb-1.5">
                    <input
                      type="number"
                      class="input input-xs input-bordered flex-1 bg-base-100 text-xs"
                      value={editProgress()}
                      onInput={(e) => setEditProgress(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit(goal.id)}
                      min="0"
                      max={goal.target}
                      autofocus
                    />
                    <button
                      class="btn btn-xs btn-success"
                      onClick={() => saveEdit(goal.id)}
                    >
                      Save
                    </button>
                  </div>
                </Show>

                {/* Progress Display */}
                <div class="flex items-center justify-between text-xs mb-1">
                  <div class="font-mono">
                    {goal.current} / {goal.target}
                  </div>
                  <div class="font-medium">{progress.toFixed(0)}%</div>
                </div>

                {/* Progress Bar */}
                <progress
                  class={`progress ${getProgressColor(progress)} w-full h-1.5`}
                  value={progress}
                  max="100"
                />

                {/* Quick Increment */}
                <Show when={!isComplete && editingId() !== goal.id}>
                  <div class="flex gap-1 mt-1.5">
                    <button
                      class="btn btn-xs btn-ghost flex-1"
                      onClick={() => incrementProgress(goal.id, 1)}
                    >
                      +1
                    </button>
                    <button
                      class="btn btn-xs btn-ghost flex-1"
                      onClick={() => incrementProgress(goal.id, 5)}
                    >
                      +5
                    </button>
                    <button
                      class="btn btn-xs btn-ghost flex-1"
                      onClick={() => incrementProgress(goal.id, 10)}
                    >
                      +10
                    </button>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>

        <Show when={goals().length === 0}>
          <div class="text-center py-8 opacity-40 text-xs">
            No goals yet. Click + to add one!
          </div>
        </Show>
      </div>

      {/* Summary */}
      <Show when={goals().length > 0}>
        <div class="border-t border-base-content/10 pt-2 mt-2 text-xs opacity-60 text-center">
          {goals().filter(g => getProgress(g) >= 100).length} of {goals().length} completed
        </div>
      </Show>
    </div>
  );
}
