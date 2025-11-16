//! API Test Suite
//!
//! Comprehensive testing of WebArcade API modules for FFI safety and correctness.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// Test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub name: String,
    pub module: String,
    pub passed: bool,
    pub message: String,
    pub duration_ms: u64,
}

/// Test suite summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSummary {
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
    pub duration_ms: u64,
    pub results: Vec<TestResult>,
}

/// API Test Suite
pub struct ApiTestSuite;

impl ApiTestSuite {
    /// Run all API tests
    pub fn run_all() -> TestSummary {
        let start = std::time::Instant::now();
        let mut results = Vec::new();

        // Run all module tests
        results.extend(Self::test_json());
        results.extend(Self::test_csv());
        results.extend(Self::test_ini());
        results.extend(Self::test_template());
        results.extend(Self::test_query_string());
        results.extend(Self::test_encoding());
        results.extend(Self::test_crypto());
        results.extend(Self::test_validation());
        results.extend(Self::test_text());
        results.extend(Self::test_path());
        results.extend(Self::test_fs());
        results.extend(Self::test_regex());
        results.extend(Self::test_mime());
        results.extend(Self::test_collections());
        results.extend(Self::test_error_handling());

        let passed = results.iter().filter(|r| r.passed).count();
        let failed = results.iter().filter(|r| !r.passed).count();

        TestSummary {
            total: results.len(),
            passed,
            failed,
            duration_ms: start.elapsed().as_millis() as u64,
            results,
        }
    }

    /// Test JSON module
    pub fn test_json() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test JSON parsing
        results.push(Self::run_test("json", "parse_valid_json", || {
            let json_str = r#"{"name": "test", "value": 42}"#;
            let result = crate::json::Json::parse(json_str);
            if result.is_ok() {
                Ok("JSON parsing works".to_string())
            } else {
                Err(format!("Failed: {:?}", result.err()))
            }
        }));

        // Test JSON stringify
        results.push(Self::run_test("json", "stringify_object", || {
            let data = serde_json::json!({"key": "value", "num": 123});
            let result = crate::json::Json::stringify(&data);
            if result.is_ok() && result.as_ref().unwrap().contains("key") {
                Ok("JSON stringify works".to_string())
            } else {
                Err("Failed to stringify JSON".to_string())
            }
        }));

        // Test JSON path navigation
        results.push(Self::run_test("json", "get_path_nested", || {
            let json_str = r#"{"data": {"items": [{"id": 1}, {"id": 2}]}}"#;
            let value = crate::json::Json::parse(json_str).unwrap();
            let nested = crate::json::Json::get_path(&value, "data.items");
            if nested.is_some() && nested.unwrap().is_array() {
                Ok("JSON path navigation works".to_string())
            } else {
                Err("Failed to navigate JSON path".to_string())
            }
        }));

        // Test JSON builder
        results.push(Self::run_test("json", "builder_pattern", || {
            let json = crate::json::JsonBuilder::object()
                .field("name", "test")
                .field("active", true)
                .build();
            if json.get("name").is_some() && json.get("active").is_some() {
                Ok("JSON builder works".to_string())
            } else {
                Err("JSON builder failed".to_string())
            }
        }));

        results
    }

    /// Test CSV module
    pub fn test_csv() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test CSV parsing
        results.push(Self::run_test("csv", "parse_simple", || {
            let csv = "name,age\nAlice,30\nBob,25";
            let rows = crate::csv::Csv::parse(csv)?;
            if rows.len() == 3 && rows[1][0] == "Alice" {
                Ok("CSV parsing works".to_string())
            } else {
                Err(format!("Wrong rows: {:?}", rows))
            }
        }));

        // Test CSV with headers
        results.push(Self::run_test("csv", "parse_with_headers", || {
            let csv = "name,age\nAlice,30";
            let maps = crate::csv::Csv::parse_with_headers(csv)?;
            if maps.len() == 1 && maps[0].get("name") == Some(&"Alice".to_string()) {
                Ok("CSV header parsing works".to_string())
            } else {
                Err("Header parsing failed".to_string())
            }
        }));

        // Test CSV stringify
        results.push(Self::run_test("csv", "stringify", || {
            let rows = vec![
                vec!["a".to_string(), "b".to_string()],
                vec!["1".to_string(), "2".to_string()],
            ];
            let csv = crate::csv::Csv::stringify(&rows);
            if csv.contains("a,b") && csv.contains("1,2") {
                Ok("CSV stringify works".to_string())
            } else {
                Err(format!("Wrong output: {}", csv))
            }
        }));

        // Test quoted fields
        results.push(Self::run_test("csv", "quoted_fields", || {
            let csv = r#"name,desc
"Alice","Has a, comma""#;
            let rows = crate::csv::Csv::parse(csv)?;
            if rows[1][1] == "Has a, comma" {
                Ok("Quoted CSV fields work".to_string())
            } else {
                Err(format!("Wrong value: {}", rows[1][1]))
            }
        }));

        results
    }

    /// Test INI module
    pub fn test_ini() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test INI parsing
        results.push(Self::run_test("ini", "parse_sections", || {
            let ini = r#"
[database]
host = localhost
port = 5432
"#;
            let data = crate::ini::Ini::parse(ini)?;
            let host = crate::ini::Ini::get(&data, "database", "host");
            if host == Some(&"localhost".to_string()) {
                Ok("INI section parsing works".to_string())
            } else {
                Err(format!("Wrong host: {:?}", host))
            }
        }));

        // Test typed getters
        results.push(Self::run_test("ini", "typed_getters", || {
            let ini = "[app]\nport = 8080\ndebug = true";
            let data = crate::ini::Ini::parse(ini)?;
            let port = crate::ini::Ini::get_int(&data, "app", "port");
            let debug = crate::ini::Ini::get_bool(&data, "app", "debug");
            if port == Some(8080) && debug == Some(true) {
                Ok("INI typed getters work".to_string())
            } else {
                Err("Typed getters failed".to_string())
            }
        }));

        // Test INI builder
        results.push(Self::run_test("ini", "builder", || {
            let ini_str = crate::ini::IniBuilder::new()
                .section("test")
                .set("key", "value")
                .to_string();
            if ini_str.contains("[test]") && ini_str.contains("key = value") {
                Ok("INI builder works".to_string())
            } else {
                Err(format!("Wrong output: {}", ini_str))
            }
        }));

        results
    }

    /// Test Template module
    pub fn test_template() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test simple render
        results.push(Self::run_test("template", "simple_render", || {
            let vars = HashMap::from([("name".to_string(), "World".to_string())]);
            let result = crate::template::Template::render("Hello {{name}}!", &vars);
            if result == "Hello World!" {
                Ok("Template rendering works".to_string())
            } else {
                Err(format!("Wrong output: {}", result))
            }
        }));

        // Test defaults
        results.push(Self::run_test("template", "with_defaults", || {
            let vars = HashMap::new();
            let result = crate::template::Template::render_with_defaults(
                "Value: {{missing|default}}",
                &vars
            );
            if result == "Value: default" {
                Ok("Template defaults work".to_string())
            } else {
                Err(format!("Wrong output: {}", result))
            }
        }));

        // Test variable extraction
        results.push(Self::run_test("template", "extract_variables", || {
            let vars = crate::template::Template::extract_variables("{{a}} {{b}} {{c|d}}");
            if vars.contains(&"a".to_string()) && vars.contains(&"b".to_string()) && vars.contains(&"c".to_string()) {
                Ok("Variable extraction works".to_string())
            } else {
                Err(format!("Wrong vars: {:?}", vars))
            }
        }));

        // Test conditionals
        results.push(Self::run_test("template", "conditionals", || {
            let vars = HashMap::from([("show".to_string(), "true".to_string())]);
            let result = crate::template::Template::render_conditionals(
                "{{#if show}}VISIBLE{{/if}}",
                &vars
            );
            if result.contains("VISIBLE") {
                Ok("Template conditionals work".to_string())
            } else {
                Err(format!("Wrong output: {}", result))
            }
        }));

        results
    }

    /// Test Query String module
    pub fn test_query_string() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test parsing
        results.push(Self::run_test("query", "parse", || {
            let params = crate::query::QueryString::parse("name=Alice&age=30");
            if params.get("name") == Some(&"Alice".to_string()) &&
               params.get("age") == Some(&"30".to_string()) {
                Ok("Query string parsing works".to_string())
            } else {
                Err("Parsing failed".to_string())
            }
        }));

        // Test building
        results.push(Self::run_test("query", "build", || {
            let mut params = HashMap::new();
            params.insert("key".to_string(), "value".to_string());
            let query = crate::query::QueryString::build(&params);
            if query == "key=value" {
                Ok("Query string building works".to_string())
            } else {
                Err(format!("Wrong output: {}", query))
            }
        }));

        // Test URL encoding
        results.push(Self::run_test("query", "encode_decode", || {
            let original = "hello world!";
            let encoded = crate::query::QueryString::encode(original);
            let decoded = crate::query::QueryString::decode(&encoded);
            if decoded == original {
                Ok("URL encoding/decoding works".to_string())
            } else {
                Err(format!("Mismatch: {} != {}", decoded, original))
            }
        }));

        // Test builder
        results.push(Self::run_test("query", "builder", || {
            let query = crate::query::QueryBuilder::new()
                .param("a", "1")
                .param_int("b", 2)
                .param_bool("c", true)
                .build();
            if query.contains("a=1") && query.contains("b=2") && query.contains("c=true") {
                Ok("Query builder works".to_string())
            } else {
                Err(format!("Wrong output: {}", query))
            }
        }));

        results
    }

    /// Test Encoding module
    pub fn test_encoding() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test Base64
        results.push(Self::run_test("encoding", "base64_roundtrip", || {
            let original = b"Hello, World!";
            let encoded = crate::encoding::Base64::encode(original);
            let decoded = crate::encoding::Base64::decode(&encoded)?;
            if decoded == original {
                Ok("Base64 roundtrip works".to_string())
            } else {
                Err("Base64 mismatch".to_string())
            }
        }));

        // Test Hex
        results.push(Self::run_test("encoding", "hex_roundtrip", || {
            let original = vec![0xDE, 0xAD, 0xBE, 0xEF];
            let encoded = crate::encoding::Hex::encode(&original);
            let decoded = crate::encoding::Hex::decode(&encoded)?;
            if decoded == original {
                Ok("Hex roundtrip works".to_string())
            } else {
                Err("Hex mismatch".to_string())
            }
        }));

        // Test URL encoding
        results.push(Self::run_test("encoding", "url_encoding", || {
            let original = "hello world&foo=bar";
            let encoded = crate::encoding::UrlEncoding::encode(original);
            let decoded = crate::encoding::UrlEncoding::decode(&encoded)?;
            if decoded == original {
                Ok("URL encoding roundtrip works".to_string())
            } else {
                Err("URL encoding mismatch".to_string())
            }
        }));

        // Test HTML encoding
        results.push(Self::run_test("encoding", "html_encoding", || {
            let original = "<script>alert('XSS')</script>";
            let encoded = crate::encoding::HtmlEncoding::encode(original);
            if !encoded.contains('<') && !encoded.contains('>') {
                Ok("HTML encoding works".to_string())
            } else {
                Err("HTML not properly encoded".to_string())
            }
        }));

        results
    }

    /// Test Crypto module
    pub fn test_crypto() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test hashing
        results.push(Self::run_test("crypto", "hashing", || {
            let data = b"test data";
            let hash1 = crate::crypto::Hashing::simple(data);
            let hash2 = crate::crypto::Hashing::simple(data);
            if hash1 == hash2 && hash1 != 0 {
                Ok("Hashing is deterministic".to_string())
            } else {
                Err("Hashing inconsistent".to_string())
            }
        }));

        // Test random
        results.push(Self::run_test("crypto", "random_bytes", || {
            let bytes1 = crate::crypto::Random::bytes(16);
            let bytes2 = crate::crypto::Random::bytes(16);
            if bytes1.len() == 16 && bytes1 != bytes2 {
                Ok("Random bytes generation works".to_string())
            } else {
                Err("Random not working properly".to_string())
            }
        }));

        // Test UUID
        results.push(Self::run_test("crypto", "uuid_generation", || {
            let uuid = crate::crypto::Uuid::v4();
            if uuid.len() == 36 && uuid.contains('-') && crate::crypto::Uuid::is_valid(&uuid) {
                Ok("UUID generation works".to_string())
            } else {
                Err(format!("Invalid UUID: {}", uuid))
            }
        }));

        // Test token generation
        results.push(Self::run_test("crypto", "token_generation", || {
            let token = crate::crypto::Token::api_key();
            if !token.is_empty() && token.chars().all(|c| c.is_alphanumeric()) {
                Ok("Token generation works".to_string())
            } else {
                Err(format!("Invalid token: {}", token))
            }
        }));

        results
    }

    /// Test Validation module
    pub fn test_validation() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test email validation
        results.push(Self::run_test("validation", "email_valid", || {
            if crate::validate::Email::is_valid("test@example.com") &&
               !crate::validate::Email::is_valid("invalid-email") {
                Ok("Email validation works".to_string())
            } else {
                Err("Email validation incorrect".to_string())
            }
        }));

        // Test URL validation
        results.push(Self::run_test("validation", "url_valid", || {
            if crate::validate::Url::is_valid("https://example.com") &&
               !crate::validate::Url::is_valid("not a url") {
                Ok("URL validation works".to_string())
            } else {
                Err("URL validation incorrect".to_string())
            }
        }));

        // Test password validation
        results.push(Self::run_test("validation", "password_strength", || {
            let weak_result = crate::validate::Password::validate("weak");
            let strong_result = crate::validate::Password::validate("StrongPass123");
            if !weak_result.is_valid() && strong_result.is_valid() {
                Ok("Password validation works".to_string())
            } else {
                Err(format!("Wrong result: weak={:?}, strong={:?}", weak_result, strong_result))
            }
        }));

        results
    }

    /// Test Text module
    pub fn test_text() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test slugify
        results.push(Self::run_test("text", "slugify", || {
            let slug = crate::text::Text::slugify("Hello World! This is a Test");
            if slug == "hello-world-this-is-a-test" {
                Ok("Slugify works".to_string())
            } else {
                Err(format!("Wrong slug: {}", slug))
            }
        }));

        // Test case conversion
        results.push(Self::run_test("text", "to_camel_case", || {
            let camel = crate::text::Text::to_camel_case("hello_world");
            if camel == "helloWorld" {
                Ok("Camel case conversion works".to_string())
            } else {
                Err(format!("Wrong output: {}", camel))
            }
        }));

        // Test truncate
        results.push(Self::run_test("text", "truncate", || {
            let truncated = crate::text::Text::truncate("Hello World", 8);
            if truncated == "Hello..." {
                Ok("Truncate works".to_string())
            } else {
                Err(format!("Wrong output: {}", truncated))
            }
        }));

        results
    }

    /// Test Path module
    pub fn test_path() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test path join
        results.push(Self::run_test("path", "join", || {
            let path = crate::path::Path::join("/home/user", &["documents", "file.txt"]);
            if path.contains("documents") && path.contains("file.txt") {
                Ok("Path join works".to_string())
            } else {
                Err(format!("Wrong path: {}", path))
            }
        }));

        // Test file name extraction
        results.push(Self::run_test("path", "file_name", || {
            let name = crate::path::Path::file_name("/path/to/document.pdf");
            if name == Some("document.pdf".to_string()) {
                Ok("File name extraction works".to_string())
            } else {
                Err(format!("Wrong name: {:?}", name))
            }
        }));

        // Test extension
        results.push(Self::run_test("path", "extension", || {
            let ext = crate::path::Path::extension("/path/to/file.txt");
            if ext == Some("txt".to_string()) {
                Ok("Extension extraction works".to_string())
            } else {
                Err(format!("Wrong ext: {:?}", ext))
            }
        }));

        // Test WebArcade paths
        results.push(Self::run_test("path", "webarcade_data", || {
            let path = crate::path::Path::webarcade_data();
            if path.is_ok() && path.as_ref().unwrap().contains("WebArcade") {
                Ok("WebArcade data path works".to_string())
            } else {
                Err(format!("Wrong path: {:?}", path))
            }
        }));

        results
    }

    /// Test File System module (read-only tests)
    pub fn test_fs() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test temp file creation
        results.push(Self::run_test("fs", "create_temp_file", || {
            let path = crate::fs::Fs::create_temp_file("api_test", b"test content")?;
            let exists = crate::fs::Fs::exists(&path);
            let content = crate::fs::Fs::read_string(&path)?;
            crate::fs::Fs::remove_file(&path)?;

            if exists && content == "test content" {
                Ok("Temp file creation works".to_string())
            } else {
                Err("Temp file test failed".to_string())
            }
        }));

        // Test metadata
        results.push(Self::run_test("fs", "metadata", || {
            let path = crate::fs::Fs::create_temp_file("meta_test", b"data")?;
            let info = crate::fs::Fs::metadata(&path)?;
            crate::fs::Fs::remove_file(&path)?;

            if info.is_file && info.size == 4 {
                Ok("File metadata works".to_string())
            } else {
                Err(format!("Wrong info: {:?}", info))
            }
        }));

        results
    }

    /// Test Regex module
    pub fn test_regex() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test is_match
        results.push(Self::run_test("regex", "is_match", || {
            let matched = crate::regex_utils::Regex::is_match(r"\d+", "test123")?;
            if matched {
                Ok("Regex matching works".to_string())
            } else {
                Err("Should have matched".to_string())
            }
        }));

        // Test find_all
        results.push(Self::run_test("regex", "find_all", || {
            let matches = crate::regex_utils::Regex::find_all(r"\d+", "a1b22c333")?;
            if matches.len() == 3 {
                Ok("Find all works".to_string())
            } else {
                Err(format!("Wrong count: {}", matches.len()))
            }
        }));

        // Test replace
        results.push(Self::run_test("regex", "replace_all", || {
            let result = crate::regex_utils::Regex::replace_all(r"\d", "a1b2c3", "X")?;
            if result == "aXbXcX" {
                Ok("Replace all works".to_string())
            } else {
                Err(format!("Wrong output: {}", result))
            }
        }));

        // Test patterns
        results.push(Self::run_test("regex", "common_patterns", || {
            let email_pattern = crate::regex_utils::Patterns::email();
            let matched = crate::regex_utils::Regex::is_match(email_pattern, "test@example.com")?;
            if matched {
                Ok("Common patterns work".to_string())
            } else {
                Err("Email pattern failed".to_string())
            }
        }));

        results
    }

    /// Test MIME module
    pub fn test_mime() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test from extension
        results.push(Self::run_test("mime", "from_extension", || {
            let mime = crate::mime::Mime::from_extension("jpg");
            if mime == crate::mime::MimeType::ImageJpeg {
                Ok("MIME from extension works".to_string())
            } else {
                Err(format!("Wrong type: {:?}", mime))
            }
        }));

        // Test from filename
        results.push(Self::run_test("mime", "from_filename", || {
            let mime = crate::mime::Mime::from_filename("document.pdf");
            if mime == crate::mime::MimeType::ApplicationPdf {
                Ok("MIME from filename works".to_string())
            } else {
                Err(format!("Wrong type: {:?}", mime))
            }
        }));

        // Test from bytes (magic numbers)
        results.push(Self::run_test("mime", "from_bytes", || {
            let png_header = [0x89, 0x50, 0x4E, 0x47, 0x0D];
            let mime = crate::mime::Mime::from_bytes(&png_header);
            if mime == crate::mime::MimeType::ImagePng {
                Ok("MIME from bytes works".to_string())
            } else {
                Err(format!("Wrong type: {:?}", mime))
            }
        }));

        results
    }

    /// Test Collections module
    pub fn test_collections() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test LRU cache
        results.push(Self::run_test("collections", "lru_cache", || {
            let mut cache = crate::collections::LruCache::new(2);
            cache.insert("a", 1);
            cache.insert("b", 2);
            cache.insert("c", 3); // Should evict "a"

            if cache.get(&"a").is_none() && cache.get(&"c") == Some(&3) {
                Ok("LRU cache works".to_string())
            } else {
                Err("LRU eviction failed".to_string())
            }
        }));

        // Test ring buffer
        results.push(Self::run_test("collections", "ring_buffer", || {
            let mut buffer = crate::collections::RingBuffer::new(3);
            buffer.push(1);
            buffer.push(2);
            buffer.push(3);
            buffer.push(4); // Should overwrite 1

            let values = buffer.to_vec();
            if values == vec![2, 3, 4] {
                Ok("Ring buffer works".to_string())
            } else {
                Err(format!("Wrong values: {:?}", values))
            }
        }));

        // Test counter
        results.push(Self::run_test("collections", "counter", || {
            let mut counter = crate::collections::Counter::new();
            counter.increment("a".to_string());
            counter.increment("a".to_string());
            counter.increment("b".to_string());

            if counter.get(&"a".to_string()) == 2 && counter.get(&"b".to_string()) == 1 {
                Ok("Counter works".to_string())
            } else {
                Err("Counter values wrong".to_string())
            }
        }));

        results
    }

    /// Test Error handling module
    pub fn test_error_handling() -> Vec<TestResult> {
        let mut results = Vec::new();

        // Test error creation
        results.push(Self::run_test("error", "create_error", || {
            let err = crate::error::Error::new(
                crate::error::ErrorCode::NotFound,
                "Resource not found"
            );
            if err.code == crate::error::ErrorCode::NotFound {
                Ok("Error creation works".to_string())
            } else {
                Err("Wrong error code".to_string())
            }
        }));

        // Test Result extension
        results.push(Self::run_test("error", "result_context", || {
            use crate::error::ResultExt;
            let result: Result<(), String> = Err("original error".to_string());
            let contexted = result.context("Additional context");
            if contexted.is_err() {
                let err = contexted.unwrap_err();
                if err.message.contains("context") || err.details.is_some() {
                    Ok("Result context works".to_string())
                } else {
                    Err(format!("Wrong message: {}", err.message))
                }
            } else {
                Err("Should be error".to_string())
            }
        }));

        results
    }

    /// Helper to run a single test
    fn run_test<F>(module: &str, name: &str, test_fn: F) -> TestResult
    where
        F: FnOnce() -> Result<String, String>,
    {
        let start = std::time::Instant::now();

        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(test_fn)) {
            Ok(Ok(message)) => TestResult {
                name: name.to_string(),
                module: module.to_string(),
                passed: true,
                message,
                duration_ms: start.elapsed().as_millis() as u64,
            },
            Ok(Err(error)) => TestResult {
                name: name.to_string(),
                module: module.to_string(),
                passed: false,
                message: error,
                duration_ms: start.elapsed().as_millis() as u64,
            },
            Err(_) => TestResult {
                name: name.to_string(),
                module: module.to_string(),
                passed: false,
                message: "Test panicked".to_string(),
                duration_ms: start.elapsed().as_millis() as u64,
            },
        }
    }

    /// Format test results for console output
    pub fn format_results(summary: &TestSummary) -> String {
        let mut output = String::new();

        output.push_str("\n╔══════════════════════════════════════════════════════════════╗\n");
        output.push_str("║                   WebArcade API Test Suite                   ║\n");
        output.push_str("╚══════════════════════════════════════════════════════════════╝\n\n");

        // Group by module
        let mut modules: HashMap<String, Vec<&TestResult>> = HashMap::new();
        for result in &summary.results {
            modules.entry(result.module.clone()).or_insert_with(Vec::new).push(result);
        }

        for (module, tests) in &modules {
            let passed = tests.iter().filter(|t| t.passed).count();
            let total = tests.len();
            let status = if passed == total { "✓" } else { "✗" };

            output.push_str(&format!("┌─ {} {} ({}/{})\n", status, module.to_uppercase(), passed, total));

            for test in tests {
                let icon = if test.passed { "  ✓" } else { "  ✗" };
                output.push_str(&format!("│ {} {} - {} ({}ms)\n", icon, test.name, test.message, test.duration_ms));
            }
            output.push_str("└\n");
        }

        output.push_str(&format!("\n═══════════════════════════════════════════════════════════════\n"));
        output.push_str(&format!("Total: {} tests | Passed: {} | Failed: {} | Duration: {}ms\n",
            summary.total, summary.passed, summary.failed, summary.duration_ms));

        if summary.failed == 0 {
            output.push_str("Status: ✓ ALL TESTS PASSED\n");
        } else {
            output.push_str(&format!("Status: ✗ {} TESTS FAILED\n", summary.failed));
        }
        output.push_str("═══════════════════════════════════════════════════════════════\n");

        output
    }
}
