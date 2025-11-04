use hyper::{Method, Request, Response, StatusCode, body::Incoming};
use hyper::body::{Bytes, Body as _};
use http_body_util::{Full, BodyExt, combinators::BoxBody};
use std::convert::Infallible;
use std::sync::Arc;
use anyhow::Result;
use serde_json::Value;

use super::{ServiceRegistry, EventBus};

pub struct HttpRouter {
    service_registry: Arc<ServiceRegistry>,
    event_bus: Arc<EventBus>,
}

impl HttpRouter {
    pub fn new(service_registry: Arc<ServiceRegistry>, event_bus: Arc<EventBus>) -> Self {
        Self {
            service_registry,
            event_bus,
        }
    }

    pub async fn route(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        let method = req.method();
        let path = req.uri().path();
        let query = req.uri().query().unwrap_or("");

        log::debug!("HTTP {} {}", method, path);

        // CORS preflight
        if method == Method::OPTIONS {
            return cors_response(StatusCode::OK, "");
        }

        // Route matching
        match (method, path) {
            // Currency plugin routes
            (&Method::GET, "/api/currency/balance") => {
                self.handle_get_balance(query).await
            }
            (&Method::POST, "/api/currency/add") => {
                self.handle_add_currency(req).await
            }
            (&Method::POST, "/api/currency/deduct") => {
                self.handle_deduct_currency(req).await
            }
            (&Method::POST, "/api/currency/transfer") => {
                self.handle_transfer_currency(req).await
            }
            (&Method::GET, "/api/currency/leaderboard") => {
                self.handle_currency_leaderboard(query).await
            }

            // Auction plugin routes
            (&Method::POST, "/api/auction/create") => {
                self.handle_create_auction(req).await
            }
            (&Method::POST, "/api/auction/bid") => {
                self.handle_place_bid(req).await
            }
            (&Method::GET, "/api/auction/active") => {
                self.handle_get_active_auctions().await
            }

            // Roulette plugin routes
            (&Method::POST, "/api/roulette/bet") => {
                self.handle_roulette_bet(req).await
            }
            (&Method::POST, "/api/roulette/spin") => {
                self.handle_roulette_spin(req).await
            }
            (&Method::GET, "/api/roulette/history") => {
                self.handle_roulette_history(query).await
            }

            // Packs plugin routes
            (&Method::GET, "/api/packs/available") => {
                self.handle_get_packs().await
            }
            (&Method::POST, "/api/packs/purchase") => {
                self.handle_purchase_pack(req).await
            }
            (&Method::GET, "/api/packs/inventory") => {
                self.handle_get_inventory(query).await
            }

            // Levels plugin routes
            (&Method::GET, "/api/levels/user") => {
                self.handle_get_level(query).await
            }
            (&Method::POST, "/api/levels/add-xp") => {
                self.handle_add_xp(req).await
            }
            (&Method::GET, "/api/levels/leaderboard") => {
                self.handle_levels_leaderboard().await
            }

            // Goals plugin routes
            (&Method::POST, "/api/goals/create") => {
                self.handle_create_goal(req).await
            }
            (&Method::GET, "/api/goals/list") => {
                self.handle_get_goals().await
            }
            (&Method::POST, "/api/goals/update-progress") => {
                self.handle_update_goal_progress(req).await
            }
            (&Method::DELETE, path) if path.starts_with("/api/goals/") => {
                self.handle_delete_goal(path).await
            }

            // Todos plugin routes
            (&Method::POST, "/api/todos/create") => {
                self.handle_create_todo(req).await
            }
            (&Method::GET, "/api/todos/list") => {
                self.handle_get_todos(query).await
            }
            (&Method::POST, "/api/todos/toggle") => {
                self.handle_toggle_todo(req).await
            }
            (&Method::DELETE, path) if path.starts_with("/api/todos/") => {
                self.handle_delete_todo(path).await
            }

            // Ticker plugin routes
            (&Method::GET, "/api/ticker/messages") => {
                self.handle_get_ticker_messages().await
            }
            (&Method::POST, "/api/ticker/message") => {
                self.handle_add_ticker_message(req).await
            }
            (&Method::DELETE, path) if path.starts_with("/api/ticker/message/") => {
                self.handle_delete_ticker_message(path).await
            }

            // Confessions plugin routes
            (&Method::POST, "/api/confessions/submit") => {
                self.handle_submit_confession(req).await
            }
            (&Method::GET, "/api/confessions/pending") => {
                self.handle_get_pending_confessions().await
            }
            (&Method::GET, "/api/confessions/random") => {
                self.handle_get_random_confession().await
            }
            (&Method::POST, "/api/confessions/approve") => {
                self.handle_approve_confession(req).await
            }
            (&Method::POST, "/api/confessions/reject") => {
                self.handle_reject_confession(req).await
            }

            // Twitch plugin routes
            (&Method::POST, "/api/twitch/send-message") => {
                self.handle_twitch_send_message(req).await
            }
            (&Method::GET, "/api/twitch/channel-info") => {
                self.handle_get_channel_info(query).await
            }

            // User Profiles plugin routes
            (&Method::POST, "/api/profiles/update") => {
                self.handle_update_profile(req).await
            }
            (&Method::GET, "/api/profiles/get") => {
                self.handle_get_profile(query).await
            }
            (&Method::GET, "/api/profiles/birthdays") => {
                self.handle_get_birthdays().await
            }

            // TTS plugin routes
            (&Method::POST, "/api/tts/speak") => {
                self.handle_tts_speak(req).await
            }
            (&Method::GET, "/api/tts/queue") => {
                self.handle_get_tts_queue().await
            }
            (&Method::GET, "/api/tts/voices") => {
                self.handle_get_tts_voices().await
            }

            // Hue plugin routes
            (&Method::POST, "/api/hue/light/state") => {
                self.handle_set_light_state(req).await
            }
            (&Method::GET, "/api/hue/lights") => {
                self.handle_get_lights().await
            }
            (&Method::POST, "/api/hue/scene/activate") => {
                self.handle_activate_scene(req).await
            }

            // System plugin routes
            (&Method::GET, "/api/system/stats") => {
                self.handle_get_system_stats().await
            }

            // Wheel plugin routes
            (&Method::POST, "/api/wheel/spin") => {
                self.handle_wheel_spin(req).await
            }
            (&Method::GET, "/api/wheel/options") => {
                self.handle_get_wheel_options().await
            }

            // Packs management routes (CRUD for admin)
            (&Method::GET, "/api/packs") => {
                self.handle_get_all_packs().await
            }
            (&Method::POST, "/api/packs") if !path.ends_with("/purchase") => {
                self.handle_create_pack(req).await
            }
            (&Method::PUT, "/api/packs") => {
                self.handle_update_pack(req).await
            }
            (&Method::DELETE, "/api/packs") => {
                self.handle_delete_pack(req).await
            }
            (&Method::POST, "/api/packs/toggle") => {
                self.handle_toggle_pack(req).await
            }
            (&Method::GET, "/api/packs/items") => {
                self.handle_get_all_items().await
            }
            (&Method::POST, "/api/packs/items") => {
                self.handle_create_item(req).await
            }
            (&Method::PUT, "/api/packs/items") => {
                self.handle_update_item(req).await
            }
            (&Method::DELETE, "/api/packs/items") => {
                self.handle_delete_item(req).await
            }
            (&Method::POST, "/api/packs/items/toggle") => {
                self.handle_toggle_item(req).await
            }
            (&Method::POST, "/api/packs/seed") => {
                self.handle_seed_packs().await
            }
            (&Method::DELETE, "/api/packs/clear") => {
                self.handle_clear_packs().await
            }

            // Roulette game management routes
            (&Method::GET, "/api/roulette/game") => {
                self.handle_get_roulette_game(query).await
            }
            (&Method::POST, "/api/roulette/start") => {
                self.handle_start_roulette(query).await
            }
            (&Method::POST, "/api/roulette/result") => {
                self.handle_roulette_result(req).await
            }

            // Ticker management routes
            (&Method::GET, "/api/ticker/messages") => {
                self.handle_get_ticker_messages().await
            }
            (&Method::GET, "/api/ticker/segments") => {
                self.handle_get_ticker_segments().await
            }
            (&Method::GET, "/api/ticker/events/config") => {
                self.handle_get_ticker_events_config().await
            }
            (&Method::POST, "/api/ticker/segments") => {
                self.handle_create_ticker_segment(req).await
            }
            (&Method::PUT, _) if path.starts_with("/api/ticker/segments/") => {
                self.handle_update_ticker_segment(req).await
            }
            (&Method::DELETE, _) if path.starts_with("/api/ticker/segments/") => {
                self.handle_delete_ticker_segment(path).await
            }
            (&Method::POST, "/api/ticker/segments/reorder") => {
                self.handle_reorder_ticker_segments(req).await
            }
            (&Method::POST, "/api/ticker/messages") => {
                self.handle_create_ticker_message(req).await
            }
            (&Method::PUT, "/api/ticker/messages") => {
                self.handle_update_ticker_message(req).await
            }
            (&Method::POST, "/api/ticker/messages/toggle") => {
                self.handle_toggle_ticker_message(req).await
            }
            (&Method::POST, "/api/ticker/messages/toggle-sticky") => {
                self.handle_toggle_ticker_message_sticky(req).await
            }
            (&Method::DELETE, path) if path.starts_with("/api/ticker/message/") => {
                self.handle_delete_ticker_message(path).await
            }
            (&Method::POST, "/api/ticker/events/config") => {
                self.handle_update_ticker_events_config(req).await
            }

            // Settings/Status routes
            (&Method::GET, "/api/settings") => {
                self.handle_get_setting(query).await
            }
            (&Method::GET, "/api/status/config") => {
                self.handle_get_status_config().await
            }
            (&Method::POST, "/api/status/segment-duration") => {
                self.handle_set_segment_duration(req).await
            }
            (&Method::POST, "/api/status/start-date") => {
                self.handle_set_start_date(req).await
            }
            (&Method::POST, "/api/status/ticker-speed") => {
                self.handle_set_ticker_speed(req).await
            }
            (&Method::POST, "/api/status/max-ticker-items") => {
                self.handle_set_max_ticker_items(req).await
            }
            (&Method::POST, "/api/status/breaking-news") => {
                self.handle_set_breaking_news(req).await
            }

            // Utility routes
            (&Method::POST, "/api/timer/broadcast") => {
                self.handle_timer_broadcast(req).await
            }
            (&Method::POST, "/api/broadcast") => {
                self.handle_generic_broadcast(req).await
            }

            // Confessions routes
            (&Method::GET, "/api/confessions") => {
                self.handle_get_confessions().await
            }
            (&Method::DELETE, _) if path.starts_with("/api/confessions/") => {
                self.handle_delete_confession(path).await
            }

            // Text commands routes
            (&Method::GET, "/api/twitch/config") => {
                self.handle_get_twitch_config().await
            }
            (&Method::GET, "/api/twitch/text-commands") => {
                self.handle_get_text_commands(query).await
            }
            (&Method::POST, "/api/twitch/text-commands/add") => {
                self.handle_add_text_command(req).await
            }
            (&Method::POST, "/api/twitch/text-commands/edit") => {
                self.handle_edit_text_command(req).await
            }
            (&Method::DELETE, "/api/twitch/text-commands") => {
                self.handle_delete_text_command(req).await
            }

            // Health check
            (&Method::GET, "/api/health") => {
                json_response(&serde_json::json!({"status": "ok", "system": "plugin-based"}))
            }

            // 404 for unknown routes
            _ => error_response(StatusCode::NOT_FOUND, "Route not found"),
        }
    }

    // Currency handlers
    async fn handle_get_balance(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let user_id = parse_query_param(query, "user_id");
        match user_id {
            Some(uid) => {
                match self.service_registry.call("currency:get_balance", serde_json::json!({
                    "user_id": uid
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            None => error_response(StatusCode::BAD_REQUEST, "Missing user_id parameter"),
        }
    }

    async fn handle_add_currency(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("currency:add_currency", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_deduct_currency(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("currency:deduct_currency", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_transfer_currency(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("currency:transfer", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_currency_leaderboard(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let limit = parse_query_param(query, "limit")
            .and_then(|l| l.parse::<i64>().ok())
            .unwrap_or(10);

        match self.service_registry.call("currency:get_leaderboard", serde_json::json!({
            "limit": limit
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Auction handlers
    async fn handle_create_auction(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("auction:create_auction", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_place_bid(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("auction:place_bid", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_active_auctions(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("auction:get_active_auctions", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Roulette handlers
    async fn handle_roulette_bet(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("roulette:place_bet", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_roulette_spin(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("roulette:spin_wheel", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_roulette_history(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let user_id = parse_query_param(query, "user_id");
        let limit = parse_query_param(query, "limit")
            .and_then(|l| l.parse::<i64>().ok())
            .unwrap_or(20);

        match user_id {
            Some(uid) => {
                match self.service_registry.call("roulette:get_game_history", serde_json::json!({
                    "user_id": uid,
                    "limit": limit
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            None => error_response(StatusCode::BAD_REQUEST, "Missing user_id parameter"),
        }
    }

    // Packs handlers
    async fn handle_get_packs(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("packs:get_packs", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_purchase_pack(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                // Emit purchase request event that the packs plugin listens to
                self.event_bus.publish_typed("http_router", "packs.purchase_request", &body);
                json_response(&serde_json::json!({"status": "processing"}))
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_inventory(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let user_id = parse_query_param(query, "user_id");
        match user_id {
            Some(uid) => {
                match self.service_registry.call("packs:get_inventory", serde_json::json!({
                    "user_id": uid
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            None => error_response(StatusCode::BAD_REQUEST, "Missing user_id parameter"),
        }
    }

    // Levels handlers
    async fn handle_get_level(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let user_id = parse_query_param(query, "user_id");
        match user_id {
            Some(uid) => {
                match self.service_registry.call("levels:get_level", serde_json::json!({
                    "user_id": uid
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            None => error_response(StatusCode::BAD_REQUEST, "Missing user_id parameter"),
        }
    }

    async fn handle_add_xp(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("levels:add_xp", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_levels_leaderboard(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("levels:get_leaderboard", serde_json::json!({
            "limit": 10
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Goals handlers
    async fn handle_create_goal(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("goals:create_goal", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_goals(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("goals:get_goals", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_update_goal_progress(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("goals:update_progress", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_goal(&self, path: &str) -> Response<BoxBody<Bytes, Infallible>> {
        if let Some(id_str) = path.strip_prefix("/api/goals/") {
            if let Ok(id) = id_str.parse::<i64>() {
                match self.service_registry.call("goals:delete_goal", serde_json::json!({
                    "id": id
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            } else {
                error_response(StatusCode::BAD_REQUEST, "Invalid goal ID")
            }
        } else {
            error_response(StatusCode::BAD_REQUEST, "Invalid path")
        }
    }

    // Todos handlers
    async fn handle_create_todo(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("todos:create_todo", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_todos(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let completed = parse_query_param(query, "completed")
            .and_then(|c| c.parse::<bool>().ok());

        match self.service_registry.call("todos:get_todos", serde_json::json!({
            "completed": completed
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_toggle_todo(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("todos:toggle_todo", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_todo(&self, path: &str) -> Response<BoxBody<Bytes, Infallible>> {
        if let Some(id_str) = path.strip_prefix("/api/todos/") {
            if let Ok(id) = id_str.parse::<i64>() {
                match self.service_registry.call("todos:delete_todo", serde_json::json!({
                    "id": id
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            } else {
                error_response(StatusCode::BAD_REQUEST, "Invalid todo ID")
            }
        } else {
            error_response(StatusCode::BAD_REQUEST, "Invalid path")
        }
    }

    // Ticker handlers
    async fn handle_get_ticker_messages(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("ticker:get_messages", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_add_ticker_message(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:add_message", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_ticker_message(&self, path: &str) -> Response<BoxBody<Bytes, Infallible>> {
        if let Some(id_str) = path.strip_prefix("/api/ticker/message/") {
            if let Ok(id) = id_str.parse::<i64>() {
                match self.service_registry.call("ticker:delete_message", serde_json::json!({
                    "id": id
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            } else {
                error_response(StatusCode::BAD_REQUEST, "Invalid message ID")
            }
        } else {
            error_response(StatusCode::BAD_REQUEST, "Invalid path")
        }
    }

    // Confessions handlers
    async fn handle_submit_confession(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("confessions:submit_confession", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_pending_confessions(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("confessions:get_pending_confessions", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_get_random_confession(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("confessions:get_random_confession", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_approve_confession(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("confessions:approve_confession", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_reject_confession(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("confessions:reject_confession", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    // Twitch handlers
    async fn handle_twitch_send_message(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("twitch:send_message", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_channel_info(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let channel_name = parse_query_param(query, "channel");
        match channel_name {
            Some(name) => {
                match self.service_registry.call("twitch:get_channel_info", serde_json::json!({
                    "channel_name": name
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            None => error_response(StatusCode::BAD_REQUEST, "Missing channel parameter"),
        }
    }

    // User Profiles handlers
    async fn handle_update_profile(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("user_profiles:update_profile", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_profile(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let user_id = parse_query_param(query, "user_id");
        match user_id {
            Some(uid) => {
                match self.service_registry.call("user_profiles:get_profile", serde_json::json!({
                    "user_id": uid
                })).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            None => error_response(StatusCode::BAD_REQUEST, "Missing user_id parameter"),
        }
    }

    async fn handle_get_birthdays(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("user_profiles:get_todays_birthdays", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // TTS handlers
    async fn handle_tts_speak(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("tts:speak", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_tts_queue(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("tts:get_queue_status", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_get_tts_voices(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("tts:get_voices", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Hue handlers
    async fn handle_set_light_state(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("hue:set_light_state", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_lights(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("hue:get_lights", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_activate_scene(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("hue:activate_scene", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    // System handlers
    async fn handle_get_system_stats(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("system:get_stats", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Wheel handlers
    async fn handle_wheel_spin(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("wheel:spin_wheel", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_wheel_options(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("wheel:get_options", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Packs management handlers
    async fn handle_get_all_packs(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("packs:get_all_packs", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_create_pack(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:create_pack", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_update_pack(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:update_pack", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_pack(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:delete_pack", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_toggle_pack(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:toggle_pack", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_get_all_items(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("packs:get_all_items", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_create_item(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:create_item", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_update_item(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:update_item", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_item(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:delete_item", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_toggle_item(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("packs:toggle_item", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_seed_packs(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("packs:seed_data", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_clear_packs(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("packs:clear_all", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Roulette game management handlers
    async fn handle_get_roulette_game(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let channel = parse_query_param(query, "channel");
        match self.service_registry.call("roulette:get_game_state", serde_json::json!({
            "channel": channel.unwrap_or_default()
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_start_roulette(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let channel = parse_query_param(query, "channel");
        match self.service_registry.call("roulette:start_game", serde_json::json!({
            "channel": channel.unwrap_or_default()
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_roulette_result(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("roulette:set_result", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    // Additional ticker handlers (segments, events config, etc.)
    async fn handle_get_ticker_segments(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("ticker:get_segments", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_get_ticker_events_config(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("ticker:get_events_config", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_create_ticker_segment(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:create_segment", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_update_ticker_segment(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        let path = req.uri().path();
        let id = path.trim_start_matches("/api/ticker/segments/").to_string();
        match read_json_body(req).await {
            Ok(mut body) => {
                if let Some(obj) = body.as_object_mut() {
                    obj.insert("id".to_string(), serde_json::json!(id));
                }
                match self.service_registry.call("ticker:update_segment", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_ticker_segment(&self, path: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let id = path.trim_start_matches("/api/ticker/segments/");
        match self.service_registry.call("ticker:delete_segment", serde_json::json!({"id": id})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_reorder_ticker_segments(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:reorder_segments", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_create_ticker_message(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:create_message", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_update_ticker_message(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:update_message", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_toggle_ticker_message(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:toggle_message", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_toggle_ticker_message_sticky(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:toggle_sticky", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_update_ticker_events_config(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("ticker:update_events_config", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    // Settings/Status handlers
    async fn handle_get_setting(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let key = parse_query_param(query, "key");
        match self.service_registry.call("system:get_setting", serde_json::json!({
            "key": key.unwrap_or_default()
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_get_status_config(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("system:get_status_config", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_set_segment_duration(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("system:set_segment_duration", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_set_start_date(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("system:set_start_date", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_set_ticker_speed(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("system:set_ticker_speed", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_set_max_ticker_items(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("system:set_max_ticker_items", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_set_breaking_news(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("system:set_breaking_news", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    // Utility handlers
    async fn handle_timer_broadcast(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                // Broadcast timer event via EventBus
                self.event_bus.publish_typed("http_router", "timer.broadcast", &body);
                json_response(&serde_json::json!({"success": true}))
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_generic_broadcast(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                // Broadcast generic event via EventBus
                self.event_bus.publish_typed("http_router", "generic.broadcast", &body);
                json_response(&serde_json::json!({"success": true}))
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    // Confessions handlers
    async fn handle_get_confessions(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("confessions:get_all", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_delete_confession(&self, path: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let id = path.trim_start_matches("/api/confessions/");
        match self.service_registry.call("confessions:delete", serde_json::json!({"id": id})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    // Text commands handlers
    async fn handle_get_twitch_config(&self) -> Response<BoxBody<Bytes, Infallible>> {
        match self.service_registry.call("twitch:get_config", serde_json::json!({})).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_get_text_commands(&self, query: &str) -> Response<BoxBody<Bytes, Infallible>> {
        let channel = parse_query_param(query, "channel");
        match self.service_registry.call("text_commands:get_all", serde_json::json!({
            "channel": channel.unwrap_or_default()
        })).await {
            Ok(result) => json_response(&result),
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
        }
    }

    async fn handle_add_text_command(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("text_commands:add_command", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_edit_text_command(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("text_commands:edit_command", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }

    async fn handle_delete_text_command(&self, req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
        match read_json_body(req).await {
            Ok(body) => {
                match self.service_registry.call("text_commands:delete_command", body).await {
                    Ok(result) => json_response(&result),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
                }
            }
            Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
        }
    }
}

// Helper functions
async fn read_json_body(req: Request<Incoming>) -> std::result::Result<Value, String> {
    let whole_body = req.collect().await
        .map_err(|e| format!("Failed to read body: {}", e))?
        .to_bytes();

    serde_json::from_slice(&whole_body)
        .map_err(|e| format!("Invalid JSON: {}", e))
}

fn parse_query_param(query: &str, key: &str) -> Option<String> {
    query.split('&')
        .find_map(|pair| {
            let mut parts = pair.split('=');
            if parts.next()? == key {
                Some(urlencoding::decode(parts.next()?).ok()?.into_owned())
            } else {
                None
            }
        })
}

fn cors_response(status: StatusCode, body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    Response::builder()
        .status(status)
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .body(full_body(body))
        .unwrap()
}

fn json_response<T: serde::Serialize>(data: &T) -> Response<BoxBody<Bytes, Infallible>> {
    let json = serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string());
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(full_body(&json))
        .unwrap()
}

fn error_response(status: StatusCode, message: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let json = serde_json::json!({"error": message}).to_string();
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(full_body(&json))
        .unwrap()
}

fn full_body(s: &str) -> BoxBody<Bytes, Infallible> {
    BoxBody::new(Full::new(Bytes::from(s.to_string())).map_err(|never| match never {}))
}
