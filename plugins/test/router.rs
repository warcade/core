use api::{HttpRequest, HttpResponse, json, json_response};

pub async fn handle_hello(_req: HttpRequest) -> HttpResponse {
    json_response(&json!({
        "message": "Hello from test!"
    }))
}
