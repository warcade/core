//! HTTP client for making external requests
//!
//! Provides FFI-safe HTTP client operations.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::time::Duration;

/// HTTP methods
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HttpMethod {
    GET,
    POST,
    PUT,
    DELETE,
    PATCH,
    HEAD,
    OPTIONS,
}

impl HttpMethod {
    pub fn as_str(&self) -> &str {
        match self {
            HttpMethod::GET => "GET",
            HttpMethod::POST => "POST",
            HttpMethod::PUT => "PUT",
            HttpMethod::DELETE => "DELETE",
            HttpMethod::PATCH => "PATCH",
            HttpMethod::HEAD => "HEAD",
            HttpMethod::OPTIONS => "OPTIONS",
        }
    }
}

/// HTTP client response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

impl FetchResponse {
    /// Check if response is successful (2xx)
    pub fn is_success(&self) -> bool {
        self.status >= 200 && self.status < 300
    }

    /// Check if response is redirect (3xx)
    pub fn is_redirect(&self) -> bool {
        self.status >= 300 && self.status < 400
    }

    /// Check if response is client error (4xx)
    pub fn is_client_error(&self) -> bool {
        self.status >= 400 && self.status < 500
    }

    /// Check if response is server error (5xx)
    pub fn is_server_error(&self) -> bool {
        self.status >= 500
    }

    /// Get body as string
    pub fn text(&self) -> Result<String, String> {
        String::from_utf8(self.body.clone())
            .map_err(|e| format!("Body is not valid UTF-8: {}", e))
    }

    /// Get body as JSON
    pub fn json<T: serde::de::DeserializeOwned>(&self) -> Result<T, String> {
        let text = self.text()?;
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    /// Get a header value
    pub fn header(&self, name: &str) -> Option<&String> {
        let lower = name.to_lowercase();
        self.headers
            .iter()
            .find(|(k, _)| k.to_lowercase() == lower)
            .map(|(_, v)| v)
    }

    /// Get content type
    pub fn content_type(&self) -> Option<&String> {
        self.header("content-type")
    }

    /// Get content length
    pub fn content_length(&self) -> Option<usize> {
        self.header("content-length")
            .and_then(|v| v.parse().ok())
    }
}

/// HTTP request builder
#[derive(Debug, Clone)]
pub struct FetchRequest {
    pub method: HttpMethod,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<Vec<u8>>,
    pub timeout_ms: u64,
    pub follow_redirects: bool,
    pub max_redirects: u32,
}

impl FetchRequest {
    /// Create a new GET request
    pub fn get(url: &str) -> Self {
        Self {
            method: HttpMethod::GET,
            url: url.to_string(),
            headers: HashMap::new(),
            body: None,
            timeout_ms: 30000,
            follow_redirects: true,
            max_redirects: 10,
        }
    }

    /// Create a new POST request
    pub fn post(url: &str) -> Self {
        Self {
            method: HttpMethod::POST,
            url: url.to_string(),
            headers: HashMap::new(),
            body: None,
            timeout_ms: 30000,
            follow_redirects: true,
            max_redirects: 10,
        }
    }

    /// Create a new PUT request
    pub fn put(url: &str) -> Self {
        Self {
            method: HttpMethod::PUT,
            url: url.to_string(),
            headers: HashMap::new(),
            body: None,
            timeout_ms: 30000,
            follow_redirects: true,
            max_redirects: 10,
        }
    }

    /// Create a new DELETE request
    pub fn delete(url: &str) -> Self {
        Self {
            method: HttpMethod::DELETE,
            url: url.to_string(),
            headers: HashMap::new(),
            body: None,
            timeout_ms: 30000,
            follow_redirects: true,
            max_redirects: 10,
        }
    }

    /// Create a new PATCH request
    pub fn patch(url: &str) -> Self {
        Self {
            method: HttpMethod::PATCH,
            url: url.to_string(),
            headers: HashMap::new(),
            body: None,
            timeout_ms: 30000,
            follow_redirects: true,
            max_redirects: 10,
        }
    }

    /// Set a header
    pub fn header(mut self, name: &str, value: &str) -> Self {
        self.headers.insert(name.to_string(), value.to_string());
        self
    }

    /// Set Content-Type header
    pub fn content_type(self, content_type: &str) -> Self {
        self.header("Content-Type", content_type)
    }

    /// Set Authorization header
    pub fn auth(self, value: &str) -> Self {
        self.header("Authorization", value)
    }

    /// Set Bearer token authorization
    pub fn bearer_token(self, token: &str) -> Self {
        self.auth(&format!("Bearer {}", token))
    }

    /// Set Basic auth
    pub fn basic_auth(self, username: &str, password: &str) -> Self {
        use crate::encoding::Base64;
        let credentials = format!("{}:{}", username, password);
        let encoded = Base64::encode(credentials.as_bytes());
        self.auth(&format!("Basic {}", encoded))
    }

    /// Set User-Agent header
    pub fn user_agent(self, agent: &str) -> Self {
        self.header("User-Agent", agent)
    }

    /// Set raw body
    pub fn body_bytes(mut self, data: Vec<u8>) -> Self {
        self.body = Some(data);
        self
    }

    /// Set string body
    pub fn body_string(mut self, data: &str) -> Self {
        self.body = Some(data.as_bytes().to_vec());
        self
    }

    /// Set JSON body
    pub fn body_json<T: Serialize>(mut self, data: &T) -> Result<Self, String> {
        let json = serde_json::to_vec(data)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
        self.body = Some(json);
        self.headers
            .insert("Content-Type".to_string(), "application/json".to_string());
        Ok(self)
    }

    /// Set form URL-encoded body
    pub fn body_form(mut self, data: &HashMap<String, String>) -> Self {
        let encoded: String = data
            .iter()
            .map(|(k, v)| {
                format!(
                    "{}={}",
                    crate::encoding::UrlEncoding::encode(k),
                    crate::encoding::UrlEncoding::encode(v)
                )
            })
            .collect::<Vec<_>>()
            .join("&");
        self.body = Some(encoded.into_bytes());
        self.headers.insert(
            "Content-Type".to_string(),
            "application/x-www-form-urlencoded".to_string(),
        );
        self
    }

    /// Set timeout in milliseconds
    pub fn timeout(mut self, ms: u64) -> Self {
        self.timeout_ms = ms;
        self
    }

    /// Set timeout in seconds
    pub fn timeout_secs(mut self, secs: u64) -> Self {
        self.timeout_ms = secs * 1000;
        self
    }

    /// Disable following redirects
    pub fn no_redirects(mut self) -> Self {
        self.follow_redirects = false;
        self
    }

    /// Set maximum number of redirects
    pub fn max_redirects(mut self, max: u32) -> Self {
        self.max_redirects = max;
        self
    }

    /// Execute the request asynchronously
    pub async fn send(&self) -> Result<FetchResponse, String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(self.timeout_ms))
            .redirect(if self.follow_redirects {
                reqwest::redirect::Policy::limited(self.max_redirects as usize)
            } else {
                reqwest::redirect::Policy::none()
            })
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let method = match self.method {
            HttpMethod::GET => reqwest::Method::GET,
            HttpMethod::POST => reqwest::Method::POST,
            HttpMethod::PUT => reqwest::Method::PUT,
            HttpMethod::DELETE => reqwest::Method::DELETE,
            HttpMethod::PATCH => reqwest::Method::PATCH,
            HttpMethod::HEAD => reqwest::Method::HEAD,
            HttpMethod::OPTIONS => reqwest::Method::OPTIONS,
        };

        let mut request = client.request(method, &self.url);

        for (key, value) in &self.headers {
            request = request.header(key, value);
        }

        if let Some(body) = &self.body {
            request = request.body(body.clone());
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status().as_u16();
        let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

        let mut headers = HashMap::new();
        for (key, value) in response.headers() {
            if let Ok(v) = value.to_str() {
                headers.insert(key.to_string(), v.to_string());
            }
        }

        let body = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?
            .to_vec();

        Ok(FetchResponse {
            status,
            status_text,
            headers,
            body,
        })
    }

    /// Execute the request synchronously (blocking)
    pub fn send_blocking(&self) -> Result<FetchResponse, String> {
        tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())
            .and_then(|handle| {
                handle.block_on(self.send())
            })
            .or_else(|_| {
                // Create a new runtime if none exists
                tokio::runtime::Runtime::new()
                    .map_err(|e| format!("Failed to create runtime: {}", e))
                    .and_then(|rt| rt.block_on(self.send()))
            })
    }
}

/// Quick fetch functions
pub struct Fetch;

impl Fetch {
    /// Quick GET request
    pub fn get(url: &str) -> FetchRequest {
        FetchRequest::get(url)
    }

    /// Quick POST request
    pub fn post(url: &str) -> FetchRequest {
        FetchRequest::post(url)
    }

    /// Quick PUT request
    pub fn put(url: &str) -> FetchRequest {
        FetchRequest::put(url)
    }

    /// Quick DELETE request
    pub fn delete(url: &str) -> FetchRequest {
        FetchRequest::delete(url)
    }

    /// Quick PATCH request
    pub fn patch(url: &str) -> FetchRequest {
        FetchRequest::patch(url)
    }

    /// Build URL with query parameters
    pub fn build_url(base: &str, params: &HashMap<String, String>) -> String {
        if params.is_empty() {
            return base.to_string();
        }

        let query: String = params
            .iter()
            .map(|(k, v)| {
                format!(
                    "{}={}",
                    crate::encoding::UrlEncoding::encode(k),
                    crate::encoding::UrlEncoding::encode(v)
                )
            })
            .collect::<Vec<_>>()
            .join("&");

        if base.contains('?') {
            format!("{}&{}", base, query)
        } else {
            format!("{}?{}", base, query)
        }
    }

    /// Parse URL into parts
    pub fn parse_url(url: &str) -> UrlParts {
        let mut parts = UrlParts::default();

        // Extract scheme
        if let Some(pos) = url.find("://") {
            parts.scheme = url[..pos].to_string();
            let rest = &url[pos + 3..];

            // Extract host and path
            if let Some(path_start) = rest.find('/') {
                let host_port = &rest[..path_start];
                let path_query = &rest[path_start..];

                // Parse host:port
                if let Some(port_pos) = host_port.rfind(':') {
                    parts.host = host_port[..port_pos].to_string();
                    parts.port = host_port[port_pos + 1..].parse().ok();
                } else {
                    parts.host = host_port.to_string();
                }

                // Parse path?query#fragment
                if let Some(fragment_pos) = path_query.find('#') {
                    parts.fragment = Some(path_query[fragment_pos + 1..].to_string());
                    let path_query = &path_query[..fragment_pos];

                    if let Some(query_pos) = path_query.find('?') {
                        parts.path = path_query[..query_pos].to_string();
                        parts.query = Some(path_query[query_pos + 1..].to_string());
                    } else {
                        parts.path = path_query.to_string();
                    }
                } else if let Some(query_pos) = path_query.find('?') {
                    parts.path = path_query[..query_pos].to_string();
                    parts.query = Some(path_query[query_pos + 1..].to_string());
                } else {
                    parts.path = path_query.to_string();
                }
            } else {
                // No path, just host
                if let Some(port_pos) = rest.rfind(':') {
                    parts.host = rest[..port_pos].to_string();
                    parts.port = rest[port_pos + 1..].parse().ok();
                } else {
                    parts.host = rest.to_string();
                }
                parts.path = "/".to_string();
            }
        }

        parts
    }
}

/// Parsed URL parts
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UrlParts {
    pub scheme: String,
    pub host: String,
    pub port: Option<u16>,
    pub path: String,
    pub query: Option<String>,
    pub fragment: Option<String>,
}

impl UrlParts {
    /// Reconstruct the URL
    pub fn to_string(&self) -> String {
        let mut url = format!("{}://{}", self.scheme, self.host);

        if let Some(port) = self.port {
            url.push_str(&format!(":{}", port));
        }

        url.push_str(&self.path);

        if let Some(query) = &self.query {
            url.push('?');
            url.push_str(query);
        }

        if let Some(fragment) = &self.fragment {
            url.push('#');
            url.push_str(fragment);
        }

        url
    }

    /// Parse query string into map
    pub fn query_params(&self) -> HashMap<String, String> {
        self.query
            .as_ref()
            .map(|q| {
                crate::form::UrlEncodedForm::parse(q)
                    .map(|f| f.to_map())
                    .unwrap_or_default()
            })
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fetch_request_builder() {
        let req = FetchRequest::get("https://api.example.com")
            .header("X-Custom", "value")
            .bearer_token("my-token")
            .timeout_secs(10);

        assert_eq!(req.method, HttpMethod::GET);
        assert_eq!(req.timeout_ms, 10000);
        assert!(req.headers.contains_key("Authorization"));
    }

    #[test]
    fn test_build_url() {
        let mut params = HashMap::new();
        params.insert("key".to_string(), "value".to_string());
        params.insert("name".to_string(), "John Doe".to_string());

        let url = Fetch::build_url("https://api.example.com/search", &params);
        assert!(url.contains("key=value"));
        assert!(url.contains("name=John%20Doe"));
    }

    #[test]
    fn test_parse_url() {
        let parts = Fetch::parse_url("https://example.com:8080/path?query=value#section");
        assert_eq!(parts.scheme, "https");
        assert_eq!(parts.host, "example.com");
        assert_eq!(parts.port, Some(8080));
        assert_eq!(parts.path, "/path");
        assert_eq!(parts.query, Some("query=value".to_string()));
        assert_eq!(parts.fragment, Some("section".to_string()));
    }
}
