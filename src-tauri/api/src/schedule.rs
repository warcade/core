//! Scheduling and timing utilities
//!
//! Provides FFI-safe scheduling operations.

use serde::{Serialize, Deserialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Interval definition
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Interval {
    Milliseconds(u64),
    Seconds(u64),
    Minutes(u64),
    Hours(u64),
    Days(u64),
}

impl Interval {
    /// Convert to milliseconds
    pub fn to_millis(&self) -> u64 {
        match self {
            Interval::Milliseconds(ms) => *ms,
            Interval::Seconds(s) => s * 1000,
            Interval::Minutes(m) => m * 60 * 1000,
            Interval::Hours(h) => h * 60 * 60 * 1000,
            Interval::Days(d) => d * 24 * 60 * 60 * 1000,
        }
    }

    /// Convert to Duration
    pub fn to_duration(&self) -> Duration {
        Duration::from_millis(self.to_millis())
    }
}

/// Scheduled task definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub interval: Interval,
    pub next_run: u64, // Unix timestamp in milliseconds
    pub last_run: Option<u64>,
    pub run_count: u64,
    pub enabled: bool,
}

impl ScheduledTask {
    /// Create a new scheduled task
    pub fn new(id: &str, name: &str, interval: Interval) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Self {
            id: id.to_string(),
            name: name.to_string(),
            interval,
            next_run: now + interval.to_millis(),
            last_run: None,
            run_count: 0,
            enabled: true,
        }
    }

    /// Check if task is due to run
    pub fn is_due(&self) -> bool {
        if !self.enabled {
            return false;
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        now >= self.next_run
    }

    /// Mark task as run and schedule next
    pub fn mark_run(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.last_run = Some(now);
        self.next_run = now + self.interval.to_millis();
        self.run_count += 1;
    }

    /// Get time until next run in milliseconds
    pub fn time_until_next(&self) -> u64 {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if now >= self.next_run {
            0
        } else {
            self.next_run - now
        }
    }

    /// Enable the task
    pub fn enable(&mut self) {
        self.enabled = true;
    }

    /// Disable the task
    pub fn disable(&mut self) {
        self.enabled = false;
    }

    /// Reset the task (clear history, reschedule)
    pub fn reset(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.next_run = now + self.interval.to_millis();
        self.last_run = None;
        self.run_count = 0;
    }
}

/// Simple scheduler
#[derive(Debug)]
pub struct Scheduler {
    tasks: Vec<ScheduledTask>,
}

impl Scheduler {
    /// Create a new scheduler
    pub fn new() -> Self {
        Self { tasks: Vec::new() }
    }

    /// Add a task
    pub fn add_task(&mut self, task: ScheduledTask) {
        self.tasks.push(task);
    }

    /// Create and add a new task
    pub fn schedule(&mut self, id: &str, name: &str, interval: Interval) -> &mut ScheduledTask {
        let task = ScheduledTask::new(id, name, interval);
        self.tasks.push(task);
        self.tasks.last_mut().unwrap()
    }

    /// Remove a task by ID
    pub fn remove_task(&mut self, id: &str) -> bool {
        if let Some(pos) = self.tasks.iter().position(|t| t.id == id) {
            self.tasks.remove(pos);
            true
        } else {
            false
        }
    }

    /// Get a task by ID
    pub fn get_task(&self, id: &str) -> Option<&ScheduledTask> {
        self.tasks.iter().find(|t| t.id == id)
    }

    /// Get a mutable task by ID
    pub fn get_task_mut(&mut self, id: &str) -> Option<&mut ScheduledTask> {
        self.tasks.iter_mut().find(|t| t.id == id)
    }

    /// Get all due tasks
    pub fn due_tasks(&self) -> Vec<&ScheduledTask> {
        self.tasks.iter().filter(|t| t.is_due()).collect()
    }

    /// Get IDs of all due tasks
    pub fn due_task_ids(&self) -> Vec<String> {
        self.tasks
            .iter()
            .filter(|t| t.is_due())
            .map(|t| t.id.clone())
            .collect()
    }

    /// Mark a task as run
    pub fn mark_task_run(&mut self, id: &str) -> bool {
        if let Some(task) = self.get_task_mut(id) {
            task.mark_run();
            true
        } else {
            false
        }
    }

    /// Get all tasks
    pub fn all_tasks(&self) -> &[ScheduledTask] {
        &self.tasks
    }

    /// Get number of tasks
    pub fn task_count(&self) -> usize {
        self.tasks.len()
    }

    /// Clear all tasks
    pub fn clear(&mut self) {
        self.tasks.clear();
    }

    /// Get time until next task is due
    pub fn time_until_next_due(&self) -> Option<u64> {
        self.tasks
            .iter()
            .filter(|t| t.enabled)
            .map(|t| t.time_until_next())
            .min()
    }
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}

/// Debouncer - delay execution until no more calls for a period
pub struct Debouncer {
    delay_ms: u64,
    last_call: Option<u64>,
}

impl Debouncer {
    /// Create a new debouncer with delay in milliseconds
    pub fn new(delay_ms: u64) -> Self {
        Self {
            delay_ms,
            last_call: None,
        }
    }

    /// Create a new debouncer with delay in seconds
    pub fn with_secs(delay_secs: u64) -> Self {
        Self::new(delay_secs * 1000)
    }

    /// Call the debouncer, returns true if should execute
    pub fn call(&mut self) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.last_call = Some(now);
        false // Never immediately execute
    }

    /// Check if enough time has passed since last call
    pub fn should_execute(&self) -> bool {
        if let Some(last) = self.last_call {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            now - last >= self.delay_ms
        } else {
            false
        }
    }

    /// Reset the debouncer
    pub fn reset(&mut self) {
        self.last_call = None;
    }

    /// Get time remaining before execution (0 if ready)
    pub fn time_remaining(&self) -> u64 {
        if let Some(last) = self.last_call {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            let elapsed = now - last;
            if elapsed >= self.delay_ms {
                0
            } else {
                self.delay_ms - elapsed
            }
        } else {
            self.delay_ms
        }
    }
}

/// Throttler - limit execution rate
pub struct Throttler {
    interval_ms: u64,
    last_execute: Option<u64>,
}

impl Throttler {
    /// Create a new throttler with interval in milliseconds
    pub fn new(interval_ms: u64) -> Self {
        Self {
            interval_ms,
            last_execute: None,
        }
    }

    /// Create a new throttler with interval in seconds
    pub fn with_secs(interval_secs: u64) -> Self {
        Self::new(interval_secs * 1000)
    }

    /// Try to execute, returns true if allowed
    pub fn try_execute(&mut self) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if let Some(last) = self.last_execute {
            if now - last >= self.interval_ms {
                self.last_execute = Some(now);
                true
            } else {
                false
            }
        } else {
            self.last_execute = Some(now);
            true
        }
    }

    /// Check if execution is allowed without recording
    pub fn can_execute(&self) -> bool {
        if let Some(last) = self.last_execute {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            now - last >= self.interval_ms
        } else {
            true
        }
    }

    /// Reset the throttler
    pub fn reset(&mut self) {
        self.last_execute = None;
    }

    /// Get time remaining before next execution allowed
    pub fn time_until_allowed(&self) -> u64 {
        if let Some(last) = self.last_execute {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            let elapsed = now - last;
            if elapsed >= self.interval_ms {
                0
            } else {
                self.interval_ms - elapsed
            }
        } else {
            0
        }
    }
}

/// Retry with backoff
pub struct Retry {
    max_attempts: u32,
    initial_delay_ms: u64,
    max_delay_ms: u64,
    backoff_multiplier: f64,
    current_attempt: u32,
    current_delay_ms: u64,
}

impl Retry {
    /// Create a new retry with default exponential backoff
    pub fn new(max_attempts: u32) -> Self {
        Self {
            max_attempts,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
            current_attempt: 0,
            current_delay_ms: 1000,
        }
    }

    /// Set initial delay
    pub fn initial_delay(mut self, ms: u64) -> Self {
        self.initial_delay_ms = ms;
        self.current_delay_ms = ms;
        self
    }

    /// Set maximum delay
    pub fn max_delay(mut self, ms: u64) -> Self {
        self.max_delay_ms = ms;
        self
    }

    /// Set backoff multiplier
    pub fn multiplier(mut self, mult: f64) -> Self {
        self.backoff_multiplier = mult;
        self
    }

    /// Check if should retry
    pub fn should_retry(&self) -> bool {
        self.current_attempt < self.max_attempts
    }

    /// Get delay for next retry
    pub fn next_delay(&mut self) -> Option<u64> {
        if !self.should_retry() {
            return None;
        }

        let delay = self.current_delay_ms;
        self.current_attempt += 1;
        self.current_delay_ms = ((self.current_delay_ms as f64 * self.backoff_multiplier) as u64)
            .min(self.max_delay_ms);

        Some(delay)
    }

    /// Get current attempt number
    pub fn attempt(&self) -> u32 {
        self.current_attempt
    }

    /// Reset retry state
    pub fn reset(&mut self) {
        self.current_attempt = 0;
        self.current_delay_ms = self.initial_delay_ms;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_interval() {
        assert_eq!(Interval::Seconds(5).to_millis(), 5000);
        assert_eq!(Interval::Minutes(2).to_millis(), 120000);
        assert_eq!(Interval::Hours(1).to_millis(), 3600000);
    }

    #[test]
    fn test_scheduled_task() {
        let mut task = ScheduledTask::new("test", "Test Task", Interval::Seconds(1));
        assert!(!task.is_due());
        assert!(task.time_until_next() > 0);

        task.mark_run();
        assert_eq!(task.run_count, 1);
        assert!(task.last_run.is_some());
    }

    #[test]
    fn test_scheduler() {
        let mut scheduler = Scheduler::new();
        scheduler.schedule("task1", "Task 1", Interval::Seconds(10));
        scheduler.schedule("task2", "Task 2", Interval::Minutes(1));

        assert_eq!(scheduler.task_count(), 2);
        assert!(scheduler.get_task("task1").is_some());
        assert!(scheduler.get_task("missing").is_none());
    }

    #[test]
    fn test_throttler() {
        let mut throttler = Throttler::new(100); // 100ms interval
        assert!(throttler.try_execute()); // First call allowed
        assert!(!throttler.try_execute()); // Second call blocked
    }

    #[test]
    fn test_retry() {
        let mut retry = Retry::new(3).initial_delay(100).multiplier(2.0);

        let delay1 = retry.next_delay();
        assert_eq!(delay1, Some(100));

        let delay2 = retry.next_delay();
        assert_eq!(delay2, Some(200));

        let delay3 = retry.next_delay();
        assert_eq!(delay3, Some(400));

        let delay4 = retry.next_delay();
        assert_eq!(delay4, None); // Max attempts reached
    }
}
