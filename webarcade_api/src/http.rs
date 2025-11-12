//! HTTP utilities and helpers

use hyper::{body::Bytes, Request, Response, StatusCode};
use http_body_util::{Full, combinators::BoxBody};
use std::convert::Infallible;
use serde::Serialize;

/// HTTP Response type
pub type HttpResponse = Response<BoxBody<Bytes, Infallible>>;

/// HTTP Request type
pub type HttpRequest = Request<hyper::body::Incoming>;

/// Create a JSON response
///
/// # Example
/// ```
/// # use webarcade_api::prelude::*;
/// async fn handler() -> HttpResponse {
///     json_response(&json!({
///         "message": "Hello!"
///     }))
/// }
/// ```
pub fn json_response<T: Serialize>(data: &T) -> HttpResponse {
    let json = serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string());
    let body = Full::new(Bytes::from(json));

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(BoxBody::new(body))
        .unwrap()
}

/// Create an error response
///
/// # Example
/// ```
/// # use webarcade_api::prelude::*;
/// async fn handler() -> HttpResponse {
///     error_response(StatusCode::NOT_FOUND, "Not found")
/// }
/// ```
pub fn error_response(status: StatusCode, message: &str) -> HttpResponse {
    let body = Full::new(Bytes::from(format!(r#"{{"error":"{}"}}"#, message)));

    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(BoxBody::new(body))
        .unwrap()
}

/// Create a full_body helper
pub fn full_body(content: &str) -> BoxBody<Bytes, Infallible> {
    BoxBody::new(Full::new(Bytes::from(content.to_string())))
}
