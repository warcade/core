//! CSV parsing and writing utilities
//!
//! Pure Rust implementation with no external dependencies.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// CSV parser options
#[derive(Debug, Clone)]
pub struct CsvOptions {
    pub delimiter: char,
    pub quote: char,
    pub escape: char,
    pub has_headers: bool,
    pub trim_whitespace: bool,
}

impl Default for CsvOptions {
    fn default() -> Self {
        Self {
            delimiter: ',',
            quote: '"',
            escape: '"',
            has_headers: true,
            trim_whitespace: true,
        }
    }
}

/// CSV utilities
pub struct Csv;

impl Csv {
    /// Parse CSV string into rows of strings
    pub fn parse(text: &str) -> Result<Vec<Vec<String>>, String> {
        Self::parse_with_options(text, CsvOptions::default())
    }

    /// Parse CSV with custom options
    pub fn parse_with_options(text: &str, options: CsvOptions) -> Result<Vec<Vec<String>>, String> {
        let mut rows = Vec::new();
        let mut current_row = Vec::new();
        let mut current_field = String::new();
        let mut in_quotes = false;
        let mut chars = text.chars().peekable();

        while let Some(ch) = chars.next() {
            if in_quotes {
                if ch == options.quote {
                    // Check for escaped quote
                    if chars.peek() == Some(&options.escape) && options.escape == options.quote {
                        chars.next();
                        current_field.push(options.quote);
                    } else {
                        in_quotes = false;
                    }
                } else {
                    current_field.push(ch);
                }
            } else {
                if ch == options.quote {
                    in_quotes = true;
                } else if ch == options.delimiter {
                    let field = if options.trim_whitespace {
                        current_field.trim().to_string()
                    } else {
                        current_field.clone()
                    };
                    current_row.push(field);
                    current_field.clear();
                } else if ch == '\n' {
                    let field = if options.trim_whitespace {
                        current_field.trim().to_string()
                    } else {
                        current_field.clone()
                    };
                    current_row.push(field);
                    if !current_row.is_empty() && !(current_row.len() == 1 && current_row[0].is_empty()) {
                        rows.push(current_row);
                    }
                    current_row = Vec::new();
                    current_field.clear();
                } else if ch == '\r' {
                    // Skip carriage return
                    continue;
                } else {
                    current_field.push(ch);
                }
            }
        }

        // Handle last field and row
        if !current_field.is_empty() || !current_row.is_empty() {
            let field = if options.trim_whitespace {
                current_field.trim().to_string()
            } else {
                current_field
            };
            current_row.push(field);
            if !current_row.is_empty() {
                rows.push(current_row);
            }
        }

        Ok(rows)
    }

    /// Parse CSV with headers into maps
    pub fn parse_with_headers(text: &str) -> Result<Vec<HashMap<String, String>>, String> {
        Self::parse_with_headers_options(text, CsvOptions::default())
    }

    /// Parse CSV with headers and custom options
    pub fn parse_with_headers_options(text: &str, mut options: CsvOptions) -> Result<Vec<HashMap<String, String>>, String> {
        options.has_headers = true;
        let rows = Self::parse_with_options(text, options)?;

        if rows.is_empty() {
            return Ok(Vec::new());
        }

        let headers = &rows[0];
        let mut result = Vec::new();

        for row in rows.iter().skip(1) {
            let mut map = HashMap::new();
            for (i, header) in headers.iter().enumerate() {
                let value = row.get(i).cloned().unwrap_or_default();
                map.insert(header.clone(), value);
            }
            result.push(map);
        }

        Ok(result)
    }

    /// Convert rows to CSV string
    pub fn stringify(rows: &[Vec<String>]) -> String {
        Self::stringify_with_options(rows, CsvOptions::default())
    }

    /// Convert rows to CSV with custom options
    pub fn stringify_with_options(rows: &[Vec<String>], options: CsvOptions) -> String {
        let mut result = String::new();

        for row in rows {
            let fields: Vec<String> = row.iter().map(|field| {
                Self::escape_field(field, &options)
            }).collect();
            result.push_str(&fields.join(&options.delimiter.to_string()));
            result.push('\n');
        }

        result
    }

    /// Convert maps to CSV with headers
    pub fn stringify_maps(data: &[HashMap<String, String>], headers: &[String]) -> String {
        let mut rows = vec![headers.to_vec()];

        for map in data {
            let row: Vec<String> = headers.iter().map(|h| {
                map.get(h).cloned().unwrap_or_default()
            }).collect();
            rows.push(row);
        }

        Self::stringify(&rows)
    }

    /// Escape a single field for CSV
    fn escape_field(field: &str, options: &CsvOptions) -> String {
        let needs_quotes = field.contains(options.delimiter)
            || field.contains(options.quote)
            || field.contains('\n')
            || field.contains('\r');

        if needs_quotes {
            let escaped = field.replace(
                options.quote,
                &format!("{}{}", options.escape, options.quote)
            );
            format!("{}{}{}", options.quote, escaped, options.quote)
        } else {
            field.to_string()
        }
    }

    /// Get column by index from parsed rows
    pub fn column(rows: &[Vec<String>], index: usize) -> Vec<String> {
        rows.iter()
            .filter_map(|row| row.get(index).cloned())
            .collect()
    }

    /// Get column by header name from parsed maps
    pub fn column_by_name(rows: &[HashMap<String, String>], name: &str) -> Vec<String> {
        rows.iter()
            .filter_map(|row| row.get(name).cloned())
            .collect()
    }

    /// Filter rows by condition
    pub fn filter<F>(rows: &[Vec<String>], predicate: F) -> Vec<Vec<String>>
    where
        F: Fn(&Vec<String>) -> bool,
    {
        rows.iter().filter(|row| predicate(row)).cloned().collect()
    }

    /// Count rows (excluding header if present)
    pub fn count(rows: &[Vec<String>]) -> usize {
        rows.len()
    }

    /// Check if CSV is empty
    pub fn is_empty(rows: &[Vec<String>]) -> bool {
        rows.is_empty()
    }

    /// Get dimensions (rows, columns)
    pub fn dimensions(rows: &[Vec<String>]) -> (usize, usize) {
        let row_count = rows.len();
        let col_count = rows.first().map(|r| r.len()).unwrap_or(0);
        (row_count, col_count)
    }
}

/// CSV builder for creating CSV data programmatically
pub struct CsvBuilder {
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

impl CsvBuilder {
    pub fn new() -> Self {
        Self {
            headers: Vec::new(),
            rows: Vec::new(),
        }
    }

    /// Set headers
    pub fn headers(mut self, headers: Vec<String>) -> Self {
        self.headers = headers;
        self
    }

    /// Add a row
    pub fn add_row(mut self, row: Vec<String>) -> Self {
        self.rows.push(row);
        self
    }

    /// Add multiple rows
    pub fn add_rows(mut self, rows: Vec<Vec<String>>) -> Self {
        self.rows.extend(rows);
        self
    }

    /// Build CSV string
    pub fn build(self) -> String {
        let mut all_rows = Vec::new();
        if !self.headers.is_empty() {
            all_rows.push(self.headers);
        }
        all_rows.extend(self.rows);
        Csv::stringify(&all_rows)
    }

    /// Get rows count
    pub fn len(&self) -> usize {
        self.rows.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }
}

impl Default for CsvBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple() {
        let csv = "name,age,city\nAlice,30,NYC\nBob,25,LA";
        let rows = Csv::parse(csv).unwrap();
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0], vec!["name", "age", "city"]);
        assert_eq!(rows[1], vec!["Alice", "30", "NYC"]);
        assert_eq!(rows[2], vec!["Bob", "25", "LA"]);
    }

    #[test]
    fn test_parse_quoted() {
        let csv = r#"name,description
"Alice","Has a, comma"
"Bob","Has ""quotes"""#;
        let rows = Csv::parse(csv).unwrap();
        assert_eq!(rows[1][1], "Has a, comma");
        assert_eq!(rows[2][1], r#"Has "quotes""#);
    }

    #[test]
    fn test_parse_with_headers() {
        let csv = "name,age\nAlice,30\nBob,25";
        let maps = Csv::parse_with_headers(csv).unwrap();
        assert_eq!(maps.len(), 2);
        assert_eq!(maps[0].get("name").unwrap(), "Alice");
        assert_eq!(maps[0].get("age").unwrap(), "30");
    }

    #[test]
    fn test_stringify() {
        let rows = vec![
            vec!["name".to_string(), "age".to_string()],
            vec!["Alice".to_string(), "30".to_string()],
        ];
        let csv = Csv::stringify(&rows);
        assert!(csv.contains("name,age"));
        assert!(csv.contains("Alice,30"));
    }

    #[test]
    fn test_builder() {
        let csv = CsvBuilder::new()
            .headers(vec!["name".to_string(), "age".to_string()])
            .add_row(vec!["Alice".to_string(), "30".to_string()])
            .build();
        assert!(csv.contains("name,age"));
        assert!(csv.contains("Alice,30"));
    }
}
