//! Collection utilities
//!
//! Provides FFI-safe collection types and utilities.

use serde::{Serialize, Deserialize};
use std::collections::{HashMap, VecDeque};

/// LRU Cache implementation
#[derive(Debug)]
pub struct LruCache<K, V> {
    capacity: usize,
    map: HashMap<K, V>,
    order: VecDeque<K>,
}

impl<K: Eq + std::hash::Hash + Clone, V> LruCache<K, V> {
    /// Create a new LRU cache with given capacity
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity: capacity.max(1),
            map: HashMap::with_capacity(capacity),
            order: VecDeque::with_capacity(capacity),
        }
    }

    /// Get a value from the cache (updates access order)
    pub fn get(&mut self, key: &K) -> Option<&V> {
        if self.map.contains_key(key) {
            // Move to front (most recently used)
            self.order.retain(|k| k != key);
            self.order.push_front(key.clone());
            self.map.get(key)
        } else {
            None
        }
    }

    /// Insert a value into the cache
    pub fn insert(&mut self, key: K, value: V) -> Option<V> {
        let old = if self.map.contains_key(&key) {
            self.order.retain(|k| k != &key);
            self.map.remove(&key)
        } else {
            None
        };

        // Evict if at capacity
        if self.map.len() >= self.capacity {
            if let Some(oldest) = self.order.pop_back() {
                self.map.remove(&oldest);
            }
        }

        self.order.push_front(key.clone());
        self.map.insert(key, value);
        old
    }

    /// Remove a value from the cache
    pub fn remove(&mut self, key: &K) -> Option<V> {
        self.order.retain(|k| k != key);
        self.map.remove(key)
    }

    /// Check if key exists
    pub fn contains(&self, key: &K) -> bool {
        self.map.contains_key(key)
    }

    /// Get cache size
    pub fn len(&self) -> usize {
        self.map.len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }

    /// Clear the cache
    pub fn clear(&mut self) {
        self.map.clear();
        self.order.clear();
    }

    /// Get capacity
    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

/// Ring buffer (circular buffer)
#[derive(Debug, Clone)]
pub struct RingBuffer<T> {
    buffer: Vec<Option<T>>,
    head: usize,
    tail: usize,
    size: usize,
}

impl<T: Clone> RingBuffer<T> {
    /// Create a new ring buffer with given capacity
    pub fn new(capacity: usize) -> Self {
        let capacity = capacity.max(1);
        Self {
            buffer: vec![None; capacity],
            head: 0,
            tail: 0,
            size: 0,
        }
    }

    /// Push a value to the buffer (overwrites oldest if full)
    pub fn push(&mut self, value: T) {
        self.buffer[self.head] = Some(value);
        self.head = (self.head + 1) % self.buffer.len();

        if self.size < self.buffer.len() {
            self.size += 1;
        } else {
            self.tail = (self.tail + 1) % self.buffer.len();
        }
    }

    /// Pop the oldest value
    pub fn pop(&mut self) -> Option<T> {
        if self.size == 0 {
            return None;
        }

        let value = self.buffer[self.tail].take();
        self.tail = (self.tail + 1) % self.buffer.len();
        self.size -= 1;
        value
    }

    /// Peek at the oldest value
    pub fn peek(&self) -> Option<&T> {
        if self.size == 0 {
            None
        } else {
            self.buffer[self.tail].as_ref()
        }
    }

    /// Get size
    pub fn len(&self) -> usize {
        self.size
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.size == 0
    }

    /// Check if full
    pub fn is_full(&self) -> bool {
        self.size == self.buffer.len()
    }

    /// Get capacity
    pub fn capacity(&self) -> usize {
        self.buffer.len()
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.buffer.iter_mut().for_each(|x| *x = None);
        self.head = 0;
        self.tail = 0;
        self.size = 0;
    }

    /// Convert to vector (in order from oldest to newest)
    pub fn to_vec(&self) -> Vec<T> {
        let mut result = Vec::with_capacity(self.size);
        let mut idx = self.tail;
        for _ in 0..self.size {
            if let Some(value) = &self.buffer[idx] {
                result.push(value.clone());
            }
            idx = (idx + 1) % self.buffer.len();
        }
        result
    }
}

/// Counter for tracking occurrences
#[derive(Debug, Clone)]
pub struct Counter<K> {
    counts: HashMap<K, usize>,
}

impl<K: Eq + std::hash::Hash + Clone> Counter<K> {
    /// Create a new counter
    pub fn new() -> Self {
        Self {
            counts: HashMap::new(),
        }
    }

    /// Increment count for key
    pub fn increment(&mut self, key: K) -> usize {
        let count = self.counts.entry(key).or_insert(0);
        *count += 1;
        *count
    }

    /// Add multiple to count
    pub fn add(&mut self, key: K, amount: usize) -> usize {
        let count = self.counts.entry(key).or_insert(0);
        *count += amount;
        *count
    }

    /// Get count for key
    pub fn get(&self, key: &K) -> usize {
        *self.counts.get(key).unwrap_or(&0)
    }

    /// Get most common items
    pub fn most_common(&self, n: usize) -> Vec<(K, usize)> {
        let mut items: Vec<(K, usize)> = self
            .counts
            .iter()
            .map(|(k, v)| (k.clone(), *v))
            .collect();
        items.sort_by(|a, b| b.1.cmp(&a.1));
        items.truncate(n);
        items
    }

    /// Get total count
    pub fn total(&self) -> usize {
        self.counts.values().sum()
    }

    /// Get number of unique keys
    pub fn unique_count(&self) -> usize {
        self.counts.len()
    }

    /// Reset counter
    pub fn clear(&mut self) {
        self.counts.clear();
    }
}

impl<K: Eq + std::hash::Hash + Clone> Default for Counter<K> {
    fn default() -> Self {
        Self::new()
    }
}

/// Batch processor for collecting items and processing in batches
#[derive(Debug)]
pub struct BatchProcessor<T> {
    items: Vec<T>,
    batch_size: usize,
}

impl<T> BatchProcessor<T> {
    /// Create a new batch processor
    pub fn new(batch_size: usize) -> Self {
        Self {
            items: Vec::with_capacity(batch_size),
            batch_size: batch_size.max(1),
        }
    }

    /// Add an item, returns true if batch is full
    pub fn add(&mut self, item: T) -> bool {
        self.items.push(item);
        self.items.len() >= self.batch_size
    }

    /// Take the current batch (empties the processor)
    pub fn take_batch(&mut self) -> Vec<T> {
        std::mem::take(&mut self.items)
    }

    /// Get current batch without clearing
    pub fn current_batch(&self) -> &Vec<T> {
        &self.items
    }

    /// Get number of items in current batch
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Check if current batch is empty
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Check if current batch is full
    pub fn is_full(&self) -> bool {
        self.items.len() >= self.batch_size
    }

    /// Clear without returning items
    pub fn clear(&mut self) {
        self.items.clear();
    }

    /// Get batch size
    pub fn batch_size(&self) -> usize {
        self.batch_size
    }
}

/// Vector utilities
pub struct VecUtils;

impl VecUtils {
    /// Chunk a vector into smaller vectors
    pub fn chunk<T: Clone>(vec: &[T], size: usize) -> Vec<Vec<T>> {
        vec.chunks(size).map(|c| c.to_vec()).collect()
    }

    /// Flatten nested vectors
    pub fn flatten<T: Clone>(nested: &[Vec<T>]) -> Vec<T> {
        nested.iter().flat_map(|v| v.clone()).collect()
    }

    /// Unique values (preserves order)
    pub fn unique<T: Eq + std::hash::Hash + Clone>(vec: &[T]) -> Vec<T> {
        let mut seen = std::collections::HashSet::new();
        vec.iter()
            .filter(|x| seen.insert((*x).clone()))
            .cloned()
            .collect()
    }

    /// Group by a key function
    pub fn group_by<T: Clone, K: Eq + std::hash::Hash, F>(
        vec: &[T],
        key_fn: F,
    ) -> HashMap<K, Vec<T>>
    where
        F: Fn(&T) -> K,
    {
        let mut groups: HashMap<K, Vec<T>> = HashMap::new();
        for item in vec {
            let key = key_fn(item);
            groups.entry(key).or_insert_with(Vec::new).push(item.clone());
        }
        groups
    }

    /// Partition into two vectors based on predicate
    pub fn partition<T, F>(vec: Vec<T>, predicate: F) -> (Vec<T>, Vec<T>)
    where
        F: Fn(&T) -> bool,
    {
        let mut left = Vec::new();
        let mut right = Vec::new();
        for item in vec {
            if predicate(&item) {
                left.push(item);
            } else {
                right.push(item);
            }
        }
        (left, right)
    }

    /// Zip two vectors together
    pub fn zip<A: Clone, B: Clone>(a: &[A], b: &[B]) -> Vec<(A, B)> {
        a.iter().zip(b.iter()).map(|(x, y)| (x.clone(), y.clone())).collect()
    }

    /// Interleave two vectors
    pub fn interleave<T: Clone>(a: &[T], b: &[T]) -> Vec<T> {
        let mut result = Vec::with_capacity(a.len() + b.len());
        let mut a_iter = a.iter();
        let mut b_iter = b.iter();

        loop {
            match (a_iter.next(), b_iter.next()) {
                (Some(x), Some(y)) => {
                    result.push(x.clone());
                    result.push(y.clone());
                }
                (Some(x), None) => {
                    result.push(x.clone());
                    result.extend(a_iter.cloned());
                    break;
                }
                (None, Some(y)) => {
                    result.push(y.clone());
                    result.extend(b_iter.cloned());
                    break;
                }
                (None, None) => break,
            }
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lru_cache() {
        let mut cache = LruCache::new(2);
        cache.insert("a", 1);
        cache.insert("b", 2);
        assert_eq!(cache.get(&"a"), Some(&1));

        cache.insert("c", 3); // Should evict "b"
        assert_eq!(cache.get(&"b"), None);
        assert_eq!(cache.get(&"c"), Some(&3));
    }

    #[test]
    fn test_ring_buffer() {
        let mut rb = RingBuffer::new(3);
        rb.push(1);
        rb.push(2);
        rb.push(3);
        assert!(rb.is_full());

        rb.push(4); // Overwrites 1
        assert_eq!(rb.pop(), Some(2));
        assert_eq!(rb.to_vec(), vec![3, 4]);
    }

    #[test]
    fn test_counter() {
        let mut counter = Counter::new();
        counter.increment("a");
        counter.increment("b");
        counter.increment("a");

        assert_eq!(counter.get(&"a"), 2);
        assert_eq!(counter.get(&"b"), 1);
        assert_eq!(counter.total(), 3);
    }

    #[test]
    fn test_batch_processor() {
        let mut bp = BatchProcessor::new(3);
        assert!(!bp.add(1));
        assert!(!bp.add(2));
        assert!(bp.add(3)); // Full!

        let batch = bp.take_batch();
        assert_eq!(batch, vec![1, 2, 3]);
        assert!(bp.is_empty());
    }

    #[test]
    fn test_vec_utils() {
        let vec = vec![1, 2, 3, 4, 5];
        let chunks = VecUtils::chunk(&vec, 2);
        assert_eq!(chunks, vec![vec![1, 2], vec![3, 4], vec![5]]);

        let with_dups = vec![1, 2, 2, 3, 1, 4];
        let unique = VecUtils::unique(&with_dups);
        assert_eq!(unique, vec![1, 2, 3, 4]);
    }
}
