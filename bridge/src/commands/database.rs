use rusqlite::{Connection, Result, OptionalExtension, params};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

/// Wheel option data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WheelOptionData {
    pub id: i64,
    pub option_text: String,
    pub color: String,
    pub weight: i64,
    pub enabled: i64,
}

/// Discord configuration
#[derive(Debug, Clone)]
pub struct DiscordConfig {
    pub bot_token: Option<String>,
    pub channel_id: Option<String>,
    pub enabled: bool,
    pub command_prefix: String,
    pub max_song_length: i64,
    pub max_queue_size: i64,
}

/// Discord custom command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscordCustomCommand {
    pub id: i64,
    pub name: String,
    pub aliases: Vec<String>,
    pub response: String,
    pub description: String,
    pub permission: String,
    pub cooldown: i64,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Song request data
#[derive(Debug, Clone, Serialize)]
pub struct SongRequest {
    pub id: i64,
    pub song_query: String,
    pub song_title: Option<String>,
    pub song_url: Option<String>,
    pub requester_id: String,
    pub requester_name: String,
    pub status: String,
    pub requested_at: i64,
    pub played_at: Option<i64>,
    pub skipped_at: Option<i64>,
    pub error: Option<String>,
}

/// Ticker message data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickerMessage {
    pub id: i64,
    pub message: String,
    pub enabled: bool,
    pub is_sticky: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Ticker segment data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickerSegment {
    pub id: i64,
    #[serde(rename = "type")]
    pub segment_type: String, // "messages", "schedule", "commands", "custom"
    pub enabled: bool,
    pub content: serde_json::Value, // JSON content specific to segment type
    pub position: i64, // Display order
    pub created_at: i64,
    pub updated_at: i64,
}

/// Status configuration data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusConfig {
    pub stream_start_date: Option<String>, // ISO 8601 date string (YYYY-MM-DD)
    pub ticker_speed: i64, // Animation duration in seconds (default 30)
    pub max_ticker_items: i64, // Maximum items in ticker (messages + events, default 20)
    pub segment_duration: i64, // Segment display duration in seconds (default 15)
    pub updated_at: i64,
}

/// Ticker event data (stored event notifications)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickerEvent {
    pub id: i64,
    pub event_type: String,
    pub event_data: String, // JSON string of the original event
    pub display_text: String,
    pub is_sticky: bool,
    pub created_at: i64,
}

/// Ticker events configuration data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickerEventsConfig {
    pub show_followers: bool,
    pub show_subscribers: bool,
    pub show_raids: bool,
    pub show_donations: bool,
    pub show_gifted_subs: bool,
    pub show_cheers: bool,
    pub updated_at: i64,
}

/// Mood ticker data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoodTickerData {
    pub mood: i64, // 1-10 scale
    pub weight: Option<f64>,
    pub sleep: Option<f64>,
    pub water: i64,
    pub show_background: bool,
    pub updated_at: i64,
}

/// Twitch account data (for multi-account support)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwitchAccount {
    pub id: i64,
    pub account_type: String, // "bot" or "broadcaster"
    pub user_id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub access_token: String, // Encrypted
    pub refresh_token: String, // Encrypted
    pub scopes: Vec<String>,
    pub token_expires_at: i64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Roulette game session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouletteGame {
    pub id: i64,
    pub channel: String,
    pub status: String, // "betting", "spinning", "completed"
    pub winning_number: Option<i64>,
    pub spin_started_at: Option<i64>,
    pub created_at: i64,
    pub completed_at: Option<i64>,
}

/// Roulette bet
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouletteBet {
    pub id: i64,
    pub game_id: i64,
    pub user_id: String,
    pub username: String,
    pub bet_type: String, // "number", "red", "black", "odd", "even", "low", "high", "dozen1", "dozen2", "dozen3"
    pub bet_value: String, // The number or type they bet on
    pub amount: i64,
    pub payout: Option<i64>,
    pub created_at: i64,
}

/// Goal data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    pub id: i64,
    pub channel: String,
    pub title: String,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub goal_type: String,
    pub target: i64,
    pub current: i64,
    pub is_sub_goal: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Pack data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pack {
    pub id: i64,
    pub channel: String,
    pub name: String,
    pub price: i64,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Pack item data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackItem {
    pub id: i64,
    pub channel: String,
    pub name: String,
    pub rarity: String,
    pub value: i64,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Thread-safe database connection pool
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    /// Create or open the database
    pub fn new() -> Result<Self> {
        let mut db_path = PathBuf::from("data");
        std::fs::create_dir_all(&db_path).ok();
        db_path.push("counters.db");

        let conn = Connection::open(db_path)?;

        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS counters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                task TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                last_updated INTEGER NOT NULL,
                UNIQUE(channel, task)
            )",
            [],
        )?;

        // Create index for faster lookups
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_channel_task ON counters(channel, task)",
            [],
        )?;

        // Create todos table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                task TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                completed_at INTEGER
            )",
            [],
        )?;

        // Create index for todos
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(channel, username, completed)",
            [],
        )?;

        // Migrate todos table to add rewarded column
        let rewarded_exists = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('todos') WHERE name='rewarded'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = rewarded_exists {
            conn.execute(
                "ALTER TABLE todos ADD COLUMN rewarded INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
            log::info!("✅ Migrated todos table to add rewarded column");
        }

        // Create TTS settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tts_settings (
                channel TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;

        // Migrate existing tts_settings table to add mode column
        // Check if mode column exists, if not add it
        let mode_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('tts_settings') WHERE name='mode'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = mode_exists {
            conn.execute(
                "ALTER TABLE tts_settings ADD COLUMN mode TEXT NOT NULL DEFAULT 'broadcaster'",
                [],
            )?;
            log::info!("✅ Migrated tts_settings table to add mode column");
        }

        // Create TTS users whitelist table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tts_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                UNIQUE(channel, username)
            )",
            [],
        )?;

        // Create index for TTS users
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tts_users ON tts_users(channel, username)",
            [],
        )?;

        // Migrate tts_users table to add voice column
        let voice_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('tts_users') WHERE name='voice'",
            [],
            |row| row.get(0)
        );

        if voice_exists.unwrap_or(0) == 0 {
            log::info!("Adding voice column to tts_users table");
            conn.execute(
                "ALTER TABLE tts_users ADD COLUMN voice TEXT NOT NULL DEFAULT 'Brian'",
                [],
            )?;
        }

        // Create Hue configuration table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS hue_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                bridge_ip TEXT,
                username TEXT,
                last_updated INTEGER
            )",
            [],
        )?;

        // Create Hue custom scenes table (for backward compatibility - simple color presets)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS hue_scenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                red INTEGER NOT NULL,
                green INTEGER NOT NULL,
                blue INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create Hue animated scenes table (multi-color sequences)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS hue_animated_scenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                tag TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create scene steps table (color sequence for animated scenes)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS hue_scene_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scene_id INTEGER NOT NULL,
                step_order INTEGER NOT NULL,
                red INTEGER NOT NULL,
                green INTEGER NOT NULL,
                blue INTEGER NOT NULL,
                transition_time INTEGER NOT NULL,
                duration_time INTEGER NOT NULL,
                FOREIGN KEY (scene_id) REFERENCES hue_animated_scenes(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scene_steps ON hue_scene_steps(scene_id, step_order)",
            [],
        )?;

        // Create users table (centralized user data)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                birthday TEXT,
                location TEXT,
                followed_at TEXT,
                total_minutes INTEGER NOT NULL DEFAULT 0,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                total_messages INTEGER NOT NULL DEFAULT 0,
                last_xp_gain INTEGER NOT NULL DEFAULT 0,
                last_seen INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                UNIQUE(channel, username)
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users ON users(channel, username)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON users(channel, level DESC, xp DESC)",
            [],
        )?;

        // Migrate users table to add followed_at column if it doesn't exist
        let followed_at_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='followed_at'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = followed_at_exists {
            conn.execute(
                "ALTER TABLE users ADD COLUMN followed_at TEXT",
                [],
            )?;
            log::info!("✅ Migrated users table to add followed_at column");
        }

        // Create stream uptime table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS stream_uptime (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL UNIQUE,
                stream_started_at INTEGER,
                last_updated INTEGER NOT NULL
            )",
            [],
        )?;

        // Create custom text commands table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS text_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                command TEXT NOT NULL,
                response TEXT NOT NULL,
                auto_post INTEGER NOT NULL DEFAULT 0,
                interval_minutes INTEGER NOT NULL DEFAULT 10,
                last_posted_at INTEGER,
                created_at INTEGER NOT NULL,
                UNIQUE(channel, command)
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_text_commands ON text_commands(channel, command)",
            [],
        )?;

        // Create overlays table (HTML stored in filesystem)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS overlays (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                width INTEGER DEFAULT 1920,
                height INTEGER DEFAULT 1080,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create app settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create Withings weight measurements table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS withings_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date INTEGER NOT NULL UNIQUE,
                weight REAL NOT NULL,
                fat_mass REAL,
                muscle_mass REAL,
                bone_mass REAL,
                hydration REAL,
                synced_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_withings_date ON withings_measurements(date DESC)",
            [],
        )?;

        // Create Withings config table (for storing OAuth token)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS withings_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                client_id TEXT,
                client_secret TEXT,
                access_token TEXT,
                refresh_token TEXT,
                expires_at INTEGER,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Add client_id and client_secret columns if they don't exist
        let _ = conn.execute("ALTER TABLE withings_config ADD COLUMN client_id TEXT", []);
        let _ = conn.execute("ALTER TABLE withings_config ADD COLUMN client_secret TEXT", []);

        // Create user levels table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                total_messages INTEGER NOT NULL DEFAULT 0,
                last_xp_gain INTEGER NOT NULL DEFAULT 0,
                UNIQUE(channel, username)
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_levels ON user_levels(channel, username)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_levels_leaderboard ON user_levels(channel, level DESC, xp DESC)",
            [],
        )?;

        // Create wheel options table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS wheel_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                option_text TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#9146FF',
                weight INTEGER NOT NULL DEFAULT 1,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_wheel_options ON wheel_options(channel, enabled)",
            [],
        )?;

        // Create wheel spin history table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS wheel_spins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                winner_text TEXT NOT NULL,
                triggered_by TEXT,
                timestamp INTEGER NOT NULL
            )",
            [],
        )?;

        // Create Discord configuration table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS discord_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                bot_token TEXT,
                channel_id TEXT,
                enabled BOOLEAN DEFAULT 0,
                command_prefix TEXT DEFAULT '!sr',
                max_song_length INTEGER DEFAULT 600,
                max_queue_size INTEGER DEFAULT 50,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create song requests table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS song_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_query TEXT NOT NULL,
                song_title TEXT,
                song_url TEXT,
                requester_id TEXT NOT NULL,
                requester_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                requested_at INTEGER NOT NULL,
                played_at INTEGER,
                skipped_at INTEGER,
                error TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_song_requests_requested_at ON song_requests(requested_at)",
            [],
        )?;

        // Create discord custom commands table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS discord_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                aliases TEXT,
                response TEXT NOT NULL,
                description TEXT,
                permission TEXT DEFAULT 'Everyone',
                cooldown INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_discord_commands_enabled ON discord_commands(enabled)",
            [],
        )?;

        // Create Pear Desktop configuration table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS pear_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                websocket_port INTEGER DEFAULT 9999,
                enabled BOOLEAN DEFAULT 0,
                auto_play BOOLEAN DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create confessions table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS confessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create alexa_commands table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS alexa_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                intent_name TEXT NOT NULL UNIQUE,
                action_type TEXT NOT NULL,
                action_value TEXT NOT NULL,
                response_text TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create alexa_config table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS alexa_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                obs_host TEXT DEFAULT 'localhost',
                obs_port INTEGER DEFAULT 4455,
                obs_password TEXT,
                skill_id TEXT,
                enabled INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;

        // Create twitch_config table (for Twitch bot configuration)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS twitch_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_token TEXT,
                refresh_token TEXT,
                client_id TEXT,
                client_secret TEXT,
                bot_username TEXT,
                channels TEXT,
                token_expires_at INTEGER,
                encryption_key TEXT,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create twitch_accounts table (for multiple authenticated accounts)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS twitch_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_type TEXT NOT NULL CHECK (account_type IN ('bot', 'broadcaster')),
                user_id TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                display_name TEXT,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                scopes TEXT NOT NULL,
                token_expires_at INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create ticker_messages table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ticker_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                is_sticky INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Add is_sticky column if it doesn't exist (migration)
        let ticker_messages_columns: Vec<String> = conn
            .prepare("PRAGMA table_info(ticker_messages)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;

        if !ticker_messages_columns.contains(&"is_sticky".to_string()) {
            conn.execute("ALTER TABLE ticker_messages ADD COLUMN is_sticky INTEGER NOT NULL DEFAULT 0", [])?;
        }

        // Create status_config table (for stream status display)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS status_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                stream_start_date TEXT,
                ticker_speed INTEGER NOT NULL DEFAULT 30,
                max_ticker_items INTEGER NOT NULL DEFAULT 20,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Migrate old columns if they exist
        let columns: Vec<String> = conn
            .prepare("PRAGMA table_info(status_config)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;

        // If old column exists, migrate data and update schema
        if columns.contains(&"stream_start_days".to_string()) {
            // Add new columns if they don't exist
            if !columns.contains(&"stream_start_date".to_string()) {
                conn.execute("ALTER TABLE status_config ADD COLUMN stream_start_date TEXT", [])?;
            }
            if !columns.contains(&"ticker_speed".to_string()) {
                conn.execute("ALTER TABLE status_config ADD COLUMN ticker_speed INTEGER NOT NULL DEFAULT 30", [])?;
            }
        }

        // Add max_ticker_items column if it doesn't exist
        if !columns.contains(&"max_ticker_items".to_string()) {
            conn.execute("ALTER TABLE status_config ADD COLUMN max_ticker_items INTEGER NOT NULL DEFAULT 20", [])?;
        }

        // Add segment_duration column if it doesn't exist
        if !columns.contains(&"segment_duration".to_string()) {
            conn.execute("ALTER TABLE status_config ADD COLUMN segment_duration INTEGER NOT NULL DEFAULT 15", [])?;
        }

        // Create ticker_segments table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ticker_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                content TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Add position column if it doesn't exist (migration)
        let ticker_segments_columns: Vec<String> = conn
            .prepare("PRAGMA table_info(ticker_segments)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;

        if !ticker_segments_columns.contains(&"position".to_string()) {
            conn.execute("ALTER TABLE ticker_segments ADD COLUMN position INTEGER NOT NULL DEFAULT 0", [])?;
        }

        // Create ticker_events_config table (for enabling/disabling event types in ticker)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ticker_events_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                show_followers INTEGER NOT NULL DEFAULT 1,
                show_subscribers INTEGER NOT NULL DEFAULT 1,
                show_raids INTEGER NOT NULL DEFAULT 1,
                show_donations INTEGER NOT NULL DEFAULT 1,
                show_gifted_subs INTEGER NOT NULL DEFAULT 1,
                show_cheers INTEGER NOT NULL DEFAULT 1,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create ticker_events table (for storing event notifications)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ticker_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_data TEXT NOT NULL,
                display_text TEXT NOT NULL,
                is_sticky INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create index for ticker_events (for sorting by creation time)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ticker_events_created_at ON ticker_events(created_at DESC)",
            [],
        )?;

        // Add is_sticky column to ticker_events if it doesn't exist (migration)
        let ticker_events_columns: Vec<String> = conn
            .prepare("PRAGMA table_info(ticker_events)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;

        if !ticker_events_columns.contains(&"is_sticky".to_string()) {
            conn.execute("ALTER TABLE ticker_events ADD COLUMN is_sticky INTEGER NOT NULL DEFAULT 0", [])?;
        }

        // Create mood_ticker_data table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS mood_ticker_data (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                mood INTEGER NOT NULL DEFAULT 5,
                weight REAL,
                sleep REAL,
                water INTEGER NOT NULL DEFAULT 0,
                show_background INTEGER NOT NULL DEFAULT 1,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Migrate old mood_ticker_data table if it exists with TEXT mood column
        let mood_ticker_columns: Vec<(String, String)> = conn
            .prepare("PRAGMA table_info(mood_ticker_data)")?
            .query_map([], |row| {
                let col_name: String = row.get(1)?;
                let col_type: String = row.get(2)?;
                Ok((col_name, col_type))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let has_text_mood = mood_ticker_columns.iter()
            .any(|(name, col_type)| name == "mood" && col_type == "TEXT");

        if has_text_mood {
            // Need to migrate from TEXT to INTEGER
            // Create temporary table with new schema
            conn.execute(
                "CREATE TABLE IF NOT EXISTS mood_ticker_data_new (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    mood INTEGER NOT NULL DEFAULT 5,
                    weight REAL,
                    sleep REAL,
                    water INTEGER NOT NULL DEFAULT 0,
                    show_background INTEGER NOT NULL DEFAULT 1,
                    updated_at INTEGER NOT NULL
                )",
                [],
            )?;

            // Copy data, converting text mood to numeric (default to 5 for any value)
            conn.execute(
                "INSERT OR REPLACE INTO mood_ticker_data_new (id, mood, weight, sleep, water, show_background, updated_at)
                 SELECT id, 5, weight, sleep, water, 1, updated_at FROM mood_ticker_data",
                [],
            )?;

            // Drop old table
            conn.execute("DROP TABLE mood_ticker_data", [])?;

            // Rename new table
            conn.execute("ALTER TABLE mood_ticker_data_new RENAME TO mood_ticker_data", [])?;
        }

        // Add show_background column if it doesn't exist
        let mood_ticker_columns_names: Vec<String> = conn
            .prepare("PRAGMA table_info(mood_ticker_data)")?
            .query_map([], |row| row.get(1))?
            .collect::<Result<Vec<_>, _>>()?;

        if !mood_ticker_columns_names.contains(&"show_background".to_string()) {
            conn.execute("ALTER TABLE mood_ticker_data ADD COLUMN show_background INTEGER NOT NULL DEFAULT 1", [])?;
        }

        // Create goals table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                target INTEGER NOT NULL,
                current INTEGER NOT NULL DEFAULT 0,
                is_sub_goal INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create index for goals
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goals_channel ON goals(channel)",
            [],
        )?;

        // Migrate data from watchtime and user_levels to users table
        // This will only run if the users table is empty
        let user_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM users",
            [],
            |row| row.get(0)
        )?;

        if user_count == 0 {
            log::info!("🔄 Migrating data to users table...");

            // Migrate from user_levels (or insert if not exists)
            conn.execute(
                "INSERT INTO users (channel, username, xp, level, total_messages, last_xp_gain, last_seen, created_at, total_minutes)
                 SELECT
                    channel,
                    username,
                    xp,
                    level,
                    total_messages,
                    last_xp_gain,
                    last_xp_gain as last_seen,
                    last_xp_gain as created_at,
                    0 as total_minutes
                 FROM user_levels
                 WHERE NOT EXISTS (
                    SELECT 1 FROM users u WHERE u.channel = user_levels.channel AND u.username = user_levels.username
                 )
                 ON CONFLICT(channel, username) DO UPDATE SET
                    xp = excluded.xp,
                    level = excluded.level,
                    total_messages = excluded.total_messages,
                    last_xp_gain = excluded.last_xp_gain",
                [],
            )?;

            let migrated_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM users",
                [],
                |row| row.get(0)
            )?;

            log::info!("✅ Migrated {} users to the new users table", migrated_count);
        }

        // Initialize default overlays (uses INSERT OR IGNORE to only add if they don't exist)
        log::info!("🔄 Registering default overlays...");
        let timestamp = chrono::Utc::now().timestamp();

        // Register chat overlay
        conn.execute(
            "INSERT INTO overlays (id, name, file_path, width, height, created_at, updated_at)
             VALUES ('chat', 'Chat', '../dist/overlays/chat.html', 400, 600, ?1, ?1)
             ON CONFLICT(id) DO UPDATE SET file_path = '../dist/overlays/chat.html', updated_at = ?1",
            [timestamp],
        )?;

        // Register levelup overlay
        conn.execute(
            "INSERT INTO overlays (id, name, file_path, width, height, created_at, updated_at)
             VALUES ('levelup', 'Level Up', '../dist/overlays/levelup.html', 800, 600, ?1, ?1)
             ON CONFLICT(id) DO UPDATE SET file_path = '../dist/overlays/levelup.html', updated_at = ?1",
            [timestamp],
        )?;

        // Register ticker overlay
        conn.execute(
            "INSERT INTO overlays (id, name, file_path, width, height, created_at, updated_at)
             VALUES ('ticker', 'Ticker', '../dist/overlays/ticker.html', 1920, 1080, ?1, ?1)
             ON CONFLICT(id) DO UPDATE SET file_path = '../dist/overlays/ticker.html', updated_at = ?1",
            [timestamp],
        )?;

        // Register mood ticker overlay
        conn.execute(
            "INSERT INTO overlays (id, name, file_path, width, height, created_at, updated_at)
             VALUES ('mood-ticker', 'Mood Ticker', '../dist/overlays/mood-ticker.html', 1920, 64, ?1, ?1)
             ON CONFLICT(id) DO UPDATE SET file_path = '../dist/overlays/mood-ticker.html', width = 1920, height = 64, updated_at = ?1",
            [timestamp],
        )?;

        // Register status overlay
        conn.execute(
            "INSERT INTO overlays (id, name, file_path, width, height, created_at, updated_at)
             VALUES ('status', 'Status', '../dist/overlays/status.html', 1920, 1080, ?1, ?1)
             ON CONFLICT(id) DO UPDATE SET file_path = '../dist/overlays/status.html', updated_at = ?1",
            [timestamp],
        )?;

        let overlay_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM overlays",
            [],
            |row| row.get(0)
        )?;

        log::info!("✅ Registered {} overlays", overlay_count);

        // Migrate users table to add coins column if it doesn't exist
        let coins_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='coins'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = coins_exists {
            conn.execute(
                "ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
            log::info!("✅ Added coins column to users table");
        }

        // Migrate users table to add spin_tokens column if it doesn't exist
        let spin_tokens_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='spin_tokens'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = spin_tokens_exists {
            conn.execute(
                "ALTER TABLE users ADD COLUMN spin_tokens INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
            log::info!("✅ Added spin_tokens column to users table");
        }

        // Migrate users table to add last_daily_spin column if it doesn't exist
        let last_daily_spin_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='last_daily_spin'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = last_daily_spin_exists {
            conn.execute(
                "ALTER TABLE users ADD COLUMN last_daily_spin INTEGER",
                [],
            )?;
            log::info!("✅ Added last_daily_spin column to users table");
        }

        // Create packs table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS packs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                name TEXT NOT NULL,
                price INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(channel, name)
            )",
            [],
        )?;

        // Create pack_items table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS pack_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                name TEXT NOT NULL,
                rarity TEXT NOT NULL,
                value INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create user_packs table (user's pack inventory)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_packs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                pack_id INTEGER NOT NULL,
                acquired_at INTEGER NOT NULL,
                FOREIGN KEY (pack_id) REFERENCES packs(id)
            )",
            [],
        )?;

        // Create user_items table (user's item collection)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                item_id INTEGER NOT NULL,
                acquired_at INTEGER NOT NULL,
                FOREIGN KEY (item_id) REFERENCES pack_items(id)
            )",
            [],
        )?;

        // Create indexes for pack system
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_packs_user ON user_packs(channel, username)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(channel, username)",
            [],
        )?;

        // Create roulette_games table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS roulette_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'betting',
                winning_number INTEGER,
                spin_started_at INTEGER,
                created_at INTEGER NOT NULL,
                completed_at INTEGER
            )",
            [],
        )?;

        // Create roulette_bets table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS roulette_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                bet_type TEXT NOT NULL,
                bet_value TEXT NOT NULL,
                amount INTEGER NOT NULL,
                payout INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES roulette_games(id)
            )",
            [],
        )?;

        // Create indexes for roulette
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_roulette_games_channel ON roulette_games(channel, status)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_roulette_bets_game ON roulette_bets(game_id)",
            [],
        )?;

        log::info!("✅ Database initialized: data/counters.db");

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Get counter value
    pub fn get_count(&self, channel: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT count FROM counters WHERE channel = ?1 AND task = ?2"
        )?;

        let count = stmt.query_row([channel, task], |row| row.get(0))
            .unwrap_or(0);

        Ok(count)
    }

    /// Increment counter
    pub fn increment(&self, channel: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO counters (channel, task, count, last_updated) VALUES (?1, ?2, 1, ?3)
             ON CONFLICT(channel, task) DO UPDATE SET count = count + 1, last_updated = ?3",
            [channel, task, &timestamp.to_string()],
        )?;

        // Get the new count
        let mut stmt = conn.prepare(
            "SELECT count FROM counters WHERE channel = ?1 AND task = ?2"
        )?;

        let count: i64 = stmt.query_row([channel, task], |row| row.get(0))?;

        Ok(count)
    }

    /// Decrement counter
    pub fn decrement(&self, channel: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        // First check if counter exists
        let current: i64 = {
            let mut stmt = conn.prepare(
                "SELECT count FROM counters WHERE channel = ?1 AND task = ?2"
            )?;
            stmt.query_row([channel, task], |row| row.get(0))
                .unwrap_or(0)
        };

        if current <= 0 {
            return Ok(0);
        }

        conn.execute(
            "UPDATE counters SET count = count - 1, last_updated = ?3
             WHERE channel = ?1 AND task = ?2",
            [channel, task, &timestamp.to_string()],
        )?;

        Ok(current - 1)
    }

    /// Get all counters for a channel
    pub fn get_all_counts(&self, channel: &str) -> Result<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT task, count FROM counters WHERE channel = ?1 AND count > 0 ORDER BY count DESC"
        )?;

        let rows = stmt.query_map([channel], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Reset a specific counter
    pub fn reset(&self, channel: &str, task: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO counters (channel, task, count, last_updated) VALUES (?1, ?2, 0, ?3)
             ON CONFLICT(channel, task) DO UPDATE SET count = 0, last_updated = ?3",
            [channel, task, &timestamp.to_string()],
        )?;

        Ok(())
    }

    // === TODO METHODS ===

    /// Add a todo for a user with spam protection
    /// Returns Err if on cooldown (< 60 seconds since last task)
    pub fn add_todo(&self, channel: &str, username: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();
        let cooldown_seconds = 60; // 1 minute cooldown

        // Check when the user last added a todo
        let last_created: Option<i64> = conn.query_row(
            "SELECT MAX(created_at) FROM todos WHERE channel = ?1 AND username = ?2",
            [channel, username],
            |row| row.get(0)
        ).ok().flatten();

        if let Some(last_created_at) = last_created {
            let time_since_last = timestamp - last_created_at;
            if time_since_last < cooldown_seconds {
                return Err(rusqlite::Error::InvalidQuery.into());
            }
        }

        conn.execute(
            "INSERT INTO todos (channel, username, task, created_at) VALUES (?1, ?2, ?3, ?4)",
            [channel, username, task, &timestamp.to_string()],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all todos for a user (incomplete only)
    pub fn get_user_todos(&self, channel: &str, username: &str) -> Result<Vec<(i64, String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task, created_at FROM todos WHERE channel = ?1 AND username = ?2 AND completed = 0 ORDER BY created_at ASC"
        )?;

        let rows = stmt.query_map([channel, username], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Mark todo as complete and check if XP should be awarded
    /// Returns (was_completed, should_award_xp)
    pub fn complete_todo(&self, channel: &str, username: &str, todo_id: i64) -> Result<(bool, bool)> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        // First, get the task's created_at time and check if it's been rewarded
        let task_info: Option<(i64, i64)> = conn.query_row(
            "SELECT created_at, rewarded FROM todos WHERE id = ?1 AND channel = ?2 AND username = ?3 AND completed = 0",
            [&todo_id.to_string(), channel, username],
            |row| Ok((row.get(0)?, row.get(1)?))
        ).ok();

        if let Some((created_at, rewarded)) = task_info {
            // Check if task is at least 5 minutes old
            let age_seconds = timestamp - created_at;
            let min_age_seconds = 5 * 60; // 5 minutes
            let should_award_xp = age_seconds >= min_age_seconds && rewarded == 0;

            // Mark as completed and rewarded if applicable
            let rows_affected = if should_award_xp {
                conn.execute(
                    "UPDATE todos SET completed = 1, completed_at = ?4, rewarded = 1 WHERE id = ?1 AND channel = ?2 AND username = ?3 AND completed = 0",
                    [&todo_id.to_string(), channel, username, &timestamp.to_string()],
                )?
            } else {
                conn.execute(
                    "UPDATE todos SET completed = 1, completed_at = ?4 WHERE id = ?1 AND channel = ?2 AND username = ?3 AND completed = 0",
                    [&todo_id.to_string(), channel, username, &timestamp.to_string()],
                )?
            };

            Ok((rows_affected > 0, should_award_xp))
        } else {
            Ok((false, false))
        }
    }

    /// Remove a todo (delete)
    pub fn remove_todo(&self, channel: &str, username: &str, todo_id: i64) -> Result<bool> {
        let conn = self.conn.lock().unwrap();

        let rows_affected = conn.execute(
            "DELETE FROM todos WHERE id = ?1 AND channel = ?2 AND username = ?3",
            [&todo_id.to_string(), channel, username],
        )?;

        Ok(rows_affected > 0)
    }

    /// Remove all todos for a user
    pub fn remove_all_user_todos(&self, channel: &str, username: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();

        let rows_affected = conn.execute(
            "DELETE FROM todos WHERE channel = ?1 AND username = ?2",
            [channel, username],
        )?;

        Ok(rows_affected)
    }

    /// Clear all todos for a channel (mod/broadcaster only)
    pub fn clear_all_channel_todos(&self, channel: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();

        let rows_affected = conn.execute(
            "DELETE FROM todos WHERE channel = ?1",
            [channel],
        )?;

        Ok(rows_affected)
    }

    /// Get todo count for a user
    pub fn get_todo_count(&self, channel: &str, username: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM todos WHERE channel = ?1 AND username = ?2 AND completed = 0"
        )?;

        let count: i64 = stmt.query_row([channel, username], |row| row.get(0))?;

        Ok(count as usize)
    }

    /// Get the latest (most recent) incomplete todo for a user
    pub fn get_latest_todo(&self, channel: &str, username: &str) -> Result<Option<(i64, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task FROM todos WHERE channel = ?1 AND username = ?2 AND completed = 0 ORDER BY created_at DESC LIMIT 1"
        )?;

        match stmt.query_row([channel, username], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }) {
            Ok(todo) => Ok(Some(todo)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Get all todos across all channels and users (for overlay display)
    pub fn get_all_todos(&self) -> Result<Vec<(i64, String, String, String, bool, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, username, task, completed, created_at FROM todos ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get::<_, i64>(4)? == 1,
                row.get(5)?,
            ))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Get all tasks for a specific channel (all users, incomplete only)
    pub fn get_channel_tasks(&self, channel: &str) -> Result<Vec<(i64, String, String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, task, created_at FROM todos WHERE channel = ?1 AND completed = 0 ORDER BY created_at ASC"
        )?;

        let rows = stmt.query_map([channel], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    // === TTS METHODS ===

    /// Check if TTS is enabled for a channel
    pub fn is_tts_enabled(&self, channel: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT enabled FROM tts_settings WHERE channel = ?1"
        )?;

        let enabled: i64 = stmt.query_row([channel], |row| row.get(0))
            .unwrap_or(0);

        Ok(enabled == 1)
    }

    /// Set TTS state for a channel
    pub fn set_tts_enabled(&self, channel: &str, enabled: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let enabled_val = if enabled { 1 } else { 0 };

        conn.execute(
            "INSERT INTO tts_settings (channel, enabled) VALUES (?1, ?2)
             ON CONFLICT(channel) DO UPDATE SET enabled = ?2",
            [channel, &enabled_val.to_string()],
        )?;

        Ok(())
    }

    /// Get TTS mode for a channel (broadcaster, whitelist, everyone)
    pub fn get_tts_mode(&self, channel: &str) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT mode FROM tts_settings WHERE channel = ?1"
        )?;

        let mode: String = stmt.query_row([channel], |row| row.get(0))
            .unwrap_or_else(|_| "broadcaster".to_string());

        Ok(mode)
    }

    /// Set TTS mode for a channel
    pub fn set_tts_mode(&self, channel: &str, mode: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO tts_settings (channel, enabled, mode) VALUES (?1, 1, ?2)
             ON CONFLICT(channel) DO UPDATE SET mode = ?2",
            [channel, mode],
        )?;

        Ok(())
    }

    /// Add user to TTS whitelist
    pub fn add_tts_user(&self, channel: &str, username: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        conn.execute(
            "INSERT OR IGNORE INTO tts_users (channel, username) VALUES (?1, ?2)",
            [channel, &username_lower],
        )?;

        Ok(())
    }

    /// Remove user from TTS whitelist
    pub fn remove_tts_user(&self, channel: &str, username: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        let rows_affected = conn.execute(
            "DELETE FROM tts_users WHERE channel = ?1 AND username = ?2",
            [channel, &username_lower],
        )?;

        Ok(rows_affected > 0)
    }

    /// Check if user is on TTS whitelist
    pub fn is_tts_user(&self, channel: &str, username: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM tts_users WHERE channel = ?1 AND username = ?2"
        )?;

        let count: i64 = stmt.query_row([channel, &username_lower], |row| row.get(0))?;

        Ok(count > 0)
    }

    /// Get all TTS whitelisted users for a channel
    pub fn get_tts_users(&self, channel: &str) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT username FROM tts_users WHERE channel = ?1 ORDER BY username ASC"
        )?;

        let rows = stmt.query_map([channel], |row| row.get(0))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Check if user has TTS privileges based on mode and whitelist
    pub fn has_tts_privilege(&self, channel: &str, username: &str, is_broadcaster: bool) -> Result<bool> {
        let mode = self.get_tts_mode(channel)?;

        match mode.as_str() {
            "broadcaster" => Ok(is_broadcaster),
            "whitelist" => {
                if is_broadcaster {
                    Ok(true)
                } else {
                    self.is_tts_user(channel, username)
                }
            }
            "everyone" => {
                // In everyone mode, allow if:
                // - broadcaster
                // - whitelisted
                // - has set their voice
                if is_broadcaster {
                    Ok(true)
                } else if self.is_tts_user(channel, username).unwrap_or(false) {
                    Ok(true)
                } else {
                    self.has_custom_voice(channel, username)
                }
            }
            _ => Ok(false)
        }
    }

    /// Check if user has set a custom voice (not using default)
    pub fn has_custom_voice(&self, channel: &str, username: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM tts_users WHERE channel = ?1 AND username = ?2 AND voice IS NOT NULL)",
            [channel, &username_lower],
            |row| row.get(0)
        )?;

        Ok(exists)
    }

    /// Get TTS voice preference for a user (returns default if not set)
    pub fn get_tts_voice(&self, channel: &str, username: &str) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        let voice = conn.query_row(
            "SELECT voice FROM tts_users WHERE channel = ?1 AND username = ?2",
            [channel, &username_lower],
            |row| row.get(0)
        ).optional()?;

        Ok(voice.unwrap_or_else(|| "Brian".to_string()))
    }

    /// Set TTS voice preference for a user
    pub fn set_tts_voice(&self, channel: &str, username: &str, voice: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        conn.execute(
            "INSERT INTO tts_users (channel, username, voice) VALUES (?1, ?2, ?3)
             ON CONFLICT(channel, username) DO UPDATE SET voice = ?3",
            [channel, &username_lower, voice],
        )?;

        Ok(())
    }

    // === HUE METHODS ===

    /// Get Hue configuration
    pub fn get_hue_config(&self) -> Result<Option<(String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT bridge_ip, username FROM hue_config WHERE id = 1"
        )?;

        match stmt.query_row([], |row| {
            let ip: String = row.get(0)?;
            let user: String = row.get(1)?;
            Ok((ip, user))
        }) {
            Ok(config) => Ok(Some(config)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Save Hue configuration
    pub fn save_hue_config(&self, bridge_ip: &str, username: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO hue_config (id, bridge_ip, username, last_updated) VALUES (1, ?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET bridge_ip = ?1, username = ?2, last_updated = ?3",
            [bridge_ip, username, &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Clear Hue configuration
    pub fn clear_hue_config(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM hue_config WHERE id = 1", [])?;
        Ok(())
    }

    /// Get all custom Hue scenes
    pub fn get_hue_scenes(&self) -> Result<Vec<(String, u8, u8, u8)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT name, red, green, blue FROM hue_scenes ORDER BY name"
        )?;

        let scenes = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, u8>(1)?,
                row.get::<_, u8>(2)?,
                row.get::<_, u8>(3)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(scenes)
    }

    /// Get a specific custom Hue scene by name
    pub fn get_hue_scene(&self, name: &str) -> Result<Option<(u8, u8, u8)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT red, green, blue FROM hue_scenes WHERE name = ?1"
        )?;

        match stmt.query_row([name], |row| {
            Ok((
                row.get::<_, u8>(0)?,
                row.get::<_, u8>(1)?,
                row.get::<_, u8>(2)?,
            ))
        }) {
            Ok(rgb) => Ok(Some(rgb)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Save a custom Hue scene
    pub fn save_hue_scene(&self, name: &str, red: u8, green: u8, blue: u8) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO hue_scenes (name, red, green, blue, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(name) DO UPDATE SET red = ?2, green = ?3, blue = ?4",
            rusqlite::params![name, red, green, blue, timestamp],
        )?;

        Ok(())
    }

    /// Delete a custom Hue scene
    pub fn delete_hue_scene(&self, name: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM hue_scenes WHERE name = ?1", [name])?;
        Ok(())
    }

    // Animated Scenes (multi-color sequences)

    /// Get all animated scenes with their color steps
    pub fn get_animated_scenes(&self) -> Result<Vec<(i64, String, String, Vec<(i64, u8, u8, u8, u16, u16)>)>> {
        let conn = self.conn.lock().unwrap();

        // Get all scenes
        let mut stmt = conn.prepare(
            "SELECT id, name, tag FROM hue_animated_scenes ORDER BY name"
        )?;

        let scene_ids: Vec<(i64, String, String)> = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        // For each scene, get its steps
        let mut scenes = Vec::new();
        for (id, name, tag) in scene_ids {
            let mut step_stmt = conn.prepare(
                "SELECT id, red, green, blue, transition_time, duration_time
                 FROM hue_scene_steps
                 WHERE scene_id = ?1
                 ORDER BY step_order"
            )?;

            let steps: Vec<(i64, u8, u8, u8, u16, u16)> = step_stmt.query_map([id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, u8>(1)?,
                    row.get::<_, u8>(2)?,
                    row.get::<_, u8>(3)?,
                    row.get::<_, u16>(4)?,
                    row.get::<_, u16>(5)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

            scenes.push((id, name, tag, steps));
        }

        Ok(scenes)
    }

    /// Get an animated scene by tag
    pub fn get_animated_scene_by_tag(&self, tag: &str) -> Result<Option<(i64, String, Vec<(u8, u8, u8, u16, u16)>)>> {
        let conn = self.conn.lock().unwrap();

        // Get scene
        let scene: Option<(i64, String)> = conn.query_row(
            "SELECT id, name FROM hue_animated_scenes WHERE tag = ?1",
            [tag],
            |row| Ok((row.get(0)?, row.get(1)?))
        ).optional()?;

        if let Some((id, name)) = scene {
            // Get steps
            let mut stmt = conn.prepare(
                "SELECT red, green, blue, transition_time, duration_time
                 FROM hue_scene_steps
                 WHERE scene_id = ?1
                 ORDER BY step_order"
            )?;

            let steps: Vec<(u8, u8, u8, u16, u16)> = stmt.query_map([id], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

            Ok(Some((id, name, steps)))
        } else {
            Ok(None)
        }
    }

    /// Create a new animated scene
    pub fn create_animated_scene(&self, name: &str, tag: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO hue_animated_scenes (name, tag, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![name, tag, timestamp],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Add a color step to an animated scene
    pub fn add_scene_step(&self, scene_id: i64, order: i32, r: u8, g: u8, b: u8, transition: u16, duration: u16) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO hue_scene_steps (scene_id, step_order, red, green, blue, transition_time, duration_time)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![scene_id, order, r, g, b, transition, duration],
        )?;

        Ok(())
    }

    /// Update scene step order (for drag-and-drop reordering)
    pub fn reorder_scene_steps(&self, scene_id: i64, step_ids: &[i64]) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        for (new_order, step_id) in step_ids.iter().enumerate() {
            conn.execute(
                "UPDATE hue_scene_steps SET step_order = ?1 WHERE id = ?2 AND scene_id = ?3",
                rusqlite::params![new_order as i32, step_id, scene_id],
            )?;
        }

        Ok(())
    }

    /// Delete a scene step
    pub fn delete_scene_step(&self, step_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM hue_scene_steps WHERE id = ?1", [step_id])?;
        Ok(())
    }

    /// Delete an animated scene (cascade deletes all steps)
    pub fn delete_animated_scene(&self, scene_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM hue_animated_scenes WHERE id = ?1", [scene_id])?;
        Ok(())
    }

    /// Update scene step color and timings
    pub fn update_scene_step(&self, step_id: i64, r: u8, g: u8, b: u8, transition: u16, duration: u16) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE hue_scene_steps
             SET red = ?1, green = ?2, blue = ?3, transition_time = ?4, duration_time = ?5
             WHERE id = ?6",
            rusqlite::params![r, g, b, transition, duration, step_id],
        )?;

        Ok(())
    }

    // === WATCHTIME METHODS ===

    /// Update watchtime for a user (increment by minutes)
    pub fn update_watchtime(&self, channel: &str, username: &str, minutes: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();
        let username_lower = username.to_lowercase();

        conn.execute(
            "INSERT INTO users (channel, username, total_minutes, last_seen, created_at) VALUES (?1, ?2, ?3, ?4, ?4)
             ON CONFLICT(channel, username) DO UPDATE SET total_minutes = total_minutes + ?3, last_seen = ?4",
            [channel, &username_lower, &minutes.to_string(), &timestamp.to_string()],
        )?;

        // Get the new total
        let mut stmt = conn.prepare(
            "SELECT total_minutes FROM users WHERE channel = ?1 AND username = ?2"
        )?;

        let total: i64 = stmt.query_row([channel, &username_lower], |row| row.get(0))?;

        Ok(total)
    }

    /// Get watchtime for a user in minutes
    pub fn get_watchtime(&self, channel: &str, username: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT total_minutes FROM users WHERE channel = ?1 AND username = ?2"
        )?;

        let minutes: i64 = stmt.query_row([channel, &username_lower], |row| row.get(0))
            .unwrap_or(0);

        Ok(minutes)
    }

    /// Get top watchers for a channel
    pub fn get_top_watchers(&self, channel: &str, limit: usize) -> Result<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT username, total_minutes FROM users WHERE channel = ?1 ORDER BY total_minutes DESC LIMIT ?2"
        )?;

        let rows = stmt.query_map([channel, &limit.to_string()], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Get all watchers for a channel with pagination
    pub fn get_all_watchers(&self, channel: &str, limit: usize, offset: usize) -> Result<Vec<(String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT username, total_minutes, last_seen FROM users
             WHERE channel = ?1
             ORDER BY total_minutes DESC
             LIMIT ?2 OFFSET ?3"
        )?;

        let rows = stmt.query_map([channel, &limit.to_string(), &offset.to_string()], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Search watchers by username
    pub fn search_watchers(&self, channel: &str, search_term: &str) -> Result<Vec<(String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let search_pattern = format!("%{}%", search_term.to_lowercase());
        let mut stmt = conn.prepare(
            "SELECT username, total_minutes, last_seen FROM users
             WHERE channel = ?1 AND username LIKE ?2
             ORDER BY total_minutes DESC"
        )?;

        let rows = stmt.query_map([channel, &search_pattern], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Get total count of watchers for a channel
    pub fn get_watchers_count(&self, channel: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM users WHERE channel = ?1"
        )?;

        let count: i64 = stmt.query_row([channel], |row| row.get(0))?;
        Ok(count as usize)
    }

    /// Get unique viewers who were active in a time period (last_seen within the period)
    /// time_period: "day" (24h), "week" (7 days), "month" (30 days)
    pub fn get_viewers_by_period(&self, channel: &str, time_period: &str, limit: usize, offset: usize) -> Result<Vec<(String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        let seconds = match time_period {
            "day" => 86400,      // 24 hours
            "week" => 604800,    // 7 days
            "month" => 2592000,  // 30 days
            _ => 86400,          // default to day
        };

        let cutoff_time = now - seconds;

        let mut stmt = conn.prepare(
            "SELECT username, total_minutes, last_seen FROM users
             WHERE channel = ?1 AND last_seen >= ?2
             ORDER BY last_seen DESC
             LIMIT ?3 OFFSET ?4"
        )?;

        let rows = stmt.query_map(
            [channel, &cutoff_time.to_string(), &limit.to_string(), &offset.to_string()],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        )?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Get count of viewers active in a time period
    pub fn get_viewers_count_by_period(&self, channel: &str, time_period: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        let seconds = match time_period {
            "day" => 86400,
            "week" => 604800,
            "month" => 2592000,
            _ => 86400,
        };

        let cutoff_time = now - seconds;

        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM users WHERE channel = ?1 AND last_seen >= ?2"
        )?;

        let count: i64 = stmt.query_row([channel, &cutoff_time.to_string()], |row| row.get(0))?;
        Ok(count as usize)
    }

    // === STREAM UPTIME METHODS ===

    /// Set stream as live (start tracking uptime)
    pub fn start_stream(&self, channel: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO stream_uptime (channel, stream_started_at, last_updated) VALUES (?1, ?2, ?3)
             ON CONFLICT(channel) DO UPDATE SET stream_started_at = ?2, last_updated = ?3",
            [channel, &timestamp.to_string(), &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Set stream as offline (stop tracking uptime)
    pub fn end_stream(&self, channel: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE stream_uptime SET stream_started_at = NULL, last_updated = ?2 WHERE channel = ?1",
            [channel, &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Get stream uptime in seconds (returns None if stream is offline)
    pub fn get_stream_uptime(&self, channel: &str) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT stream_started_at FROM stream_uptime WHERE channel = ?1"
        )?;

        let start_time: Option<i64> = stmt.query_row([channel], |row| row.get(0))
            .ok()
            .and_then(|v| v);

        if let Some(start) = start_time {
            let now = chrono::Utc::now().timestamp();
            Ok(Some(now - start))
        } else {
            Ok(None)
        }
    }

    /// Check if stream is currently live
    pub fn is_stream_live(&self, channel: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT stream_started_at FROM stream_uptime WHERE channel = ?1"
        )?;

        let start_time: Option<i64> = stmt.query_row([channel], |row| row.get(0))
            .ok()
            .and_then(|v| v);

        Ok(start_time.is_some())
    }

    // === CUSTOM TEXT COMMANDS METHODS ===

    /// Add a custom text command
    pub fn add_text_command(&self, channel: &str, command: &str, response: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();
        let command_lower = command.to_lowercase();

        conn.execute(
            "INSERT INTO text_commands (channel, command, response, created_at) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(channel, command) DO UPDATE SET response = ?3",
            [channel, &command_lower, response, &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Update a custom text command (edit response, auto-post settings)
    pub fn update_text_command(&self, channel: &str, command: &str, response: &str, auto_post: bool, interval_minutes: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let command_lower = command.to_lowercase();
        let auto_post_int = if auto_post { 1 } else { 0 };

        let rows_affected = conn.execute(
            "UPDATE text_commands SET response = ?1, auto_post = ?2, interval_minutes = ?3 WHERE channel = ?4 AND command = ?5",
            rusqlite::params![response, auto_post_int, interval_minutes, channel, &command_lower],
        )?;

        if rows_affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        Ok(())
    }

    /// Get a custom text command response
    pub fn get_text_command(&self, channel: &str, command: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let command_lower = command.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT response FROM text_commands WHERE channel = ?1 AND command = ?2"
        )?;

        match stmt.query_row([channel, &command_lower], |row| row.get(0)) {
            Ok(response) => Ok(Some(response)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Get all custom text commands for a channel
    pub fn get_all_text_commands(&self, channel: &str) -> Result<Vec<(String, String, bool, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT command, response, auto_post, interval_minutes FROM text_commands WHERE channel = ?1 ORDER BY command ASC"
        )?;

        let rows = stmt.query_map([channel], |row| {
            let auto_post_int: i64 = row.get(2)?;
            Ok((
                row.get(0)?,
                row.get(1)?,
                auto_post_int == 1,
                row.get(3)?
            ))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Delete a custom text command
    pub fn delete_text_command(&self, channel: &str, command: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let command_lower = command.to_lowercase();

        let rows_affected = conn.execute(
            "DELETE FROM text_commands WHERE channel = ?1 AND command = ?2",
            [channel, &command_lower],
        )?;

        Ok(rows_affected > 0)
    }

    /// Get auto-post commands that are due to be posted
    pub fn get_due_auto_post_commands(&self, channel: &str) -> Result<Vec<(String, String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        let mut stmt = conn.prepare(
            "SELECT command, response, interval_minutes FROM text_commands
             WHERE channel = ?1 AND auto_post = 1
             AND (last_posted_at IS NULL OR (? - last_posted_at) >= (interval_minutes * 60))
             ORDER BY command ASC"
        )?;

        let rows = stmt.query_map([channel, &now.to_string()], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Update last_posted_at for a text command
    pub fn update_text_command_posted(&self, channel: &str, command: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let command_lower = command.to_lowercase();

        conn.execute(
            "UPDATE text_commands SET last_posted_at = ?1 WHERE channel = ?2 AND command = ?3",
            rusqlite::params![now, channel, &command_lower],
        )?;

        Ok(())
    }

    // === OVERLAY METHODS ===

    /// Add or update an overlay metadata
    pub fn save_overlay(&self, id: &str, name: &str, file_path: &str, width: i32, height: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO overlays (id, name, file_path, width, height, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET name = ?2, file_path = ?3, width = ?4, height = ?5, updated_at = ?7",
            [id, name, file_path, &width.to_string(), &height.to_string(), &timestamp.to_string(), &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Get an overlay by ID
    pub fn get_overlay(&self, id: &str) -> Result<Option<(String, String, i32, i32)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT name, file_path, width, height FROM overlays WHERE id = ?1"
        )?;

        match stmt.query_row([id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        }) {
            Ok(data) => Ok(Some(data)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Get all overlays
    pub fn get_all_overlays(&self) -> Result<Vec<(String, String, String, i32, i32, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, file_path, width, height, updated_at FROM overlays ORDER BY updated_at DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Delete an overlay
    pub fn delete_overlay(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();

        let rows_affected = conn.execute(
            "DELETE FROM overlays WHERE id = ?1",
            [id],
        )?;

        Ok(rows_affected > 0)
    }

    // === WITHINGS METHODS ===

    /// Save weight measurement
    pub fn save_weight_measurement(&self, date: i64, weight: f64, fat_mass: Option<f64>, muscle_mass: Option<f64>, bone_mass: Option<f64>, hydration: Option<f64>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let synced_at = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO withings_measurements (date, weight, fat_mass, muscle_mass, bone_mass, hydration, synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(date) DO UPDATE SET
                weight = ?2,
                fat_mass = ?3,
                muscle_mass = ?4,
                bone_mass = ?5,
                hydration = ?6,
                synced_at = ?7",
            rusqlite::params![date, weight, fat_mass, muscle_mass, bone_mass, hydration, synced_at],
        )?;

        Ok(())
    }

    /// Get weight measurements for a date range
    pub fn get_weight_measurements(&self, start_date: Option<i64>, end_date: Option<i64>, limit: Option<i64>) -> Result<Vec<(i64, f64, Option<f64>, Option<f64>, Option<f64>, Option<f64>)>> {
        let conn = self.conn.lock().unwrap();

        let mut sql = "SELECT date, weight, fat_mass, muscle_mass, bone_mass, hydration FROM withings_measurements WHERE 1=1".to_string();

        if start_date.is_some() {
            sql.push_str(" AND date >= ?1");
        }
        if end_date.is_some() {
            sql.push_str(" AND date <= ?2");
        }

        sql.push_str(" ORDER BY date DESC");

        if let Some(lim) = limit {
            sql.push_str(&format!(" LIMIT {}", lim));
        }

        let mut stmt = conn.prepare(&sql)?;

        let mut results = Vec::new();

        match (start_date, end_date) {
            (Some(start), Some(end)) => {
                let rows = stmt.query_map(&[&start as &dyn rusqlite::ToSql, &end], |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                })?;
                for row in rows {
                    results.push(row?);
                }
            }
            (Some(start), None) => {
                let rows = stmt.query_map(&[&start as &dyn rusqlite::ToSql], |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                })?;
                for row in rows {
                    results.push(row?);
                }
            }
            (None, Some(end)) => {
                let rows = stmt.query_map(&[&end as &dyn rusqlite::ToSql], |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                })?;
                for row in rows {
                    results.push(row?);
                }
            }
            (None, None) => {
                let rows = stmt.query_map([], |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                })?;
                for row in rows {
                    results.push(row?);
                }
            }
        }

        Ok(results)
    }

    /// Get latest weight measurement
    pub fn get_latest_weight(&self) -> Result<Option<(i64, f64, Option<f64>, Option<f64>, Option<f64>, Option<f64>)>> {
        let measurements = self.get_weight_measurements(None, None, Some(1))?;
        Ok(measurements.into_iter().next())
    }

    /// Save Withings OAuth tokens
    pub fn save_withings_tokens(&self, access_token: &str, refresh_token: &str, expires_at: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let updated_at = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO withings_config (id, access_token, refresh_token, expires_at, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET
                access_token = ?1,
                refresh_token = ?2,
                expires_at = ?3,
                updated_at = ?4",
            rusqlite::params![access_token, refresh_token, expires_at, updated_at],
        )?;

        Ok(())
    }

    /// Get Withings access token
    pub fn get_withings_access_token(&self) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT access_token FROM withings_config WHERE id = 1")?;

        match stmt.query_row([], |row| row.get(0)) {
            Ok(token) => Ok(Some(token)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Save Withings client credentials
    pub fn save_withings_client_credentials(&self, client_id: &str, client_secret: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let updated_at = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO withings_config (id, client_id, client_secret, updated_at)
             VALUES (1, ?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET
                client_id = ?1,
                client_secret = ?2,
                updated_at = ?3",
            rusqlite::params![client_id, client_secret, updated_at],
        )?;

        Ok(())
    }

    /// Get Withings client credentials
    pub fn get_withings_client_credentials(&self) -> Result<Option<(String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT client_id, client_secret FROM withings_config WHERE id = 1")?;

        match stmt.query_row([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }) {
            Ok(creds) => Ok(Some(creds)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    // === USER LEVEL METHODS ===

    /// Calculate XP required for a specific level
    /// Formula: 100 * (level ^ 1.5) - creates exponential growth
    pub fn xp_for_level(level: i64) -> i64 {
        (100.0 * (level as f64).powf(1.5)) as i64
    }

    /// Calculate what level a user should be at based on total XP
    pub fn calculate_level_from_xp(total_xp: i64) -> i64 {
        let mut level = 1;
        let mut xp_needed = 0;

        while xp_needed <= total_xp {
            level += 1;
            xp_needed += Self::xp_for_level(level - 1);
        }

        level - 1
    }

    /// Get user level data
    pub fn get_user_level(&self, channel: &str, username: &str) -> Result<Option<(i64, i64, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT level, xp, total_messages, last_xp_gain FROM users WHERE channel = ?1 AND username = ?2"
        )?;

        match stmt.query_row([channel, &username_lower], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        }) {
            Ok(data) => Ok(Some(data)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Add XP to a user and return (old_level, new_level, new_xp, total_xp)
    /// Returns None if user is on cooldown
    pub fn add_user_xp(&self, channel: &str, username: &str, xp_gain: i64, cooldown_seconds: i64) -> Result<Option<(i64, i64, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let now = chrono::Utc::now().timestamp();

        // Check if user exists and is off cooldown
        let user_data: Option<(i64, i64, i64)> = {
            let mut stmt = conn.prepare(
                "SELECT level, xp, last_xp_gain FROM users WHERE channel = ?1 AND username = ?2"
            )?;
            stmt.query_row([channel, &username_lower], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            }).ok()
        };

        if let Some((level, xp, last_xp_gain)) = user_data {
            // Check cooldown
            if now - last_xp_gain < cooldown_seconds {
                return Ok(None);
            }

            // Add XP
            let new_xp = xp + xp_gain;
            let new_level = Self::calculate_level_from_xp(new_xp);

            conn.execute(
                "UPDATE users SET xp = ?1, level = ?2, total_messages = total_messages + 1, last_xp_gain = ?3, last_seen = ?3
                 WHERE channel = ?4 AND username = ?5",
                [&new_xp.to_string(), &new_level.to_string(), &now.to_string(), channel, &username_lower],
            )?;

            Ok(Some((level, new_level, xp_gain, new_xp)))
        } else {
            // Create new user
            conn.execute(
                "INSERT INTO users (channel, username, xp, level, total_messages, last_xp_gain, last_seen, created_at)
                 VALUES (?1, ?2, ?3, 1, 1, ?4, ?4, ?4)",
                [channel, &username_lower, &xp_gain.to_string(), &now.to_string()],
            )?;

            let new_level = Self::calculate_level_from_xp(xp_gain);
            Ok(Some((1, new_level, xp_gain, xp_gain)))
        }
    }

    /// Get top users by level
    pub fn get_level_leaderboard(&self, channel: &str, limit: usize) -> Result<Vec<(String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT username, level, xp FROM users WHERE channel = ?1 ORDER BY level DESC, xp DESC LIMIT ?2"
        )?;

        let rows = stmt.query_map([channel, &limit.to_string()], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Get user rank in the leaderboard
    pub fn get_user_rank(&self, channel: &str, username: &str) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        // Get user's level and xp first
        let user_data: Option<(i64, i64)> = {
            let mut stmt = conn.prepare(
                "SELECT level, xp FROM users WHERE channel = ?1 AND username = ?2"
            )?;
            stmt.query_row([channel, &username_lower], |row| {
                Ok((row.get(0)?, row.get(1)?))
            }).ok()
        };

        if let Some((level, xp)) = user_data {
            // Count how many users are ranked higher
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) + 1 FROM users
                 WHERE channel = ?1 AND (level > ?2 OR (level = ?2 AND xp > ?3))"
            )?;

            let rank: i64 = stmt.query_row([channel, &level.to_string(), &xp.to_string()], |row| row.get(0))?;
            Ok(Some(rank))
        } else {
            Ok(None)
        }
    }

    // === USER PROFILE METHODS ===

    /// Set user's birthday (format: YYYY-MM-DD)
    pub fn set_user_birthday(&self, channel: &str, username: &str, birthday: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO users (channel, username, birthday, last_seen, created_at) VALUES (?1, ?2, ?3, ?4, ?4)
             ON CONFLICT(channel, username) DO UPDATE SET birthday = ?3",
            [channel, &username_lower, birthday, &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Get user's birthday
    pub fn get_user_birthday(&self, channel: &str, username: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT birthday FROM users WHERE channel = ?1 AND username = ?2"
        )?;

        match stmt.query_row([channel, &username_lower], |row| row.get(0)) {
            Ok(birthday) => Ok(birthday),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Set user's location
    pub fn set_user_location(&self, channel: &str, username: &str, location: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO users (channel, username, location, last_seen, created_at) VALUES (?1, ?2, ?3, ?4, ?4)
             ON CONFLICT(channel, username) DO UPDATE SET location = ?3",
            [channel, &username_lower, location, &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Get user's location
    pub fn get_user_location(&self, channel: &str, username: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT location FROM users WHERE channel = ?1 AND username = ?2"
        )?;

        match stmt.query_row([channel, &username_lower], |row| row.get(0)) {
            Ok(location) => Ok(location),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Get all users with birthdays in a specific month (1-12)
    pub fn get_users_with_birthday_month(&self, channel: &str, month: u8) -> Result<Vec<(String, String)>> {
        let conn = self.conn.lock().unwrap();
        let month_pattern = format!("%-{:02}-%", month);
        let mut stmt = conn.prepare(
            "SELECT username, birthday FROM users WHERE channel = ?1 AND birthday LIKE ?2 ORDER BY birthday"
        )?;

        let rows = stmt.query_map([channel, &month_pattern], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Set user's followed_at timestamp (ISO 8601 format from Twitch API)
    pub fn set_user_followed_at(&self, channel: &str, username: &str, followed_at: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO users (channel, username, followed_at, last_seen, created_at) VALUES (?1, ?2, ?3, ?4, ?4)
             ON CONFLICT(channel, username) DO UPDATE SET followed_at = ?3",
            [channel, &username_lower, followed_at, &timestamp.to_string()],
        )?;

        Ok(())
    }

    /// Get user's followed_at timestamp
    pub fn get_user_followed_at(&self, channel: &str, username: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT followed_at FROM users WHERE channel = ?1 AND username = ?2"
        )?;

        match stmt.query_row([channel, &username_lower], |row| row.get(0)) {
            Ok(followed_at) => Ok(followed_at),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    // === WHEEL SPIN METHODS ===

    /// Add a wheel option
    pub fn add_wheel_option(&self, channel: &str, option_text: &str, color: &str, weight: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO wheel_options (channel, option_text, color, weight, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            [channel, option_text, color, &weight.to_string(), &timestamp.to_string()],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all enabled wheel options for a channel
    pub fn get_wheel_options(&self, channel: &str) -> Result<Vec<WheelOptionData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, option_text, color, weight, enabled FROM wheel_options WHERE channel = ?1 ORDER BY id"
        )?;

        let rows = stmt.query_map([channel], |row| {
            Ok(WheelOptionData {
                id: row.get(0)?,
                option_text: row.get(1)?,
                color: row.get(2)?,
                weight: row.get(3)?,
                enabled: row.get(4)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Delete a wheel option
    pub fn delete_wheel_option(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM wheel_options WHERE id = ?1", [&id.to_string()])?;
        Ok(())
    }

    /// Update a wheel option
    pub fn update_wheel_option(&self, id: i64, option_text: &str, color: &str, weight: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE wheel_options SET option_text = ?1, color = ?2, weight = ?3 WHERE id = ?4",
            [option_text, color, &weight.to_string(), &id.to_string()],
        )?;
        Ok(())
    }

    /// Toggle wheel option enabled state
    pub fn toggle_wheel_option(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE wheel_options SET enabled = NOT enabled WHERE id = ?1",
            [&id.to_string()],
        )?;
        Ok(())
    }

    /// Record a wheel spin
    pub fn record_wheel_spin(&self, channel: &str, winner_text: &str, triggered_by: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO wheel_spins (channel, winner_text, triggered_by, timestamp) VALUES (?1, ?2, ?3, ?4)",
            [channel, winner_text, triggered_by.unwrap_or(""), &timestamp.to_string()],
        )?;

        Ok(())
    }

    // === DISCORD CONFIG METHODS ===

    /// Get Discord configuration
    pub fn get_discord_config(&self) -> Result<DiscordConfig> {
        let conn = self.conn.lock().unwrap();

        let result = conn.query_row(
            "SELECT bot_token, channel_id, enabled, command_prefix, max_song_length, max_queue_size
             FROM discord_config WHERE id = 1",
            [],
            |row| {
                Ok(DiscordConfig {
                    bot_token: row.get(0)?,
                    channel_id: row.get(1)?,
                    enabled: row.get(2)?,
                    command_prefix: row.get(3)?,
                    max_song_length: row.get(4)?,
                    max_queue_size: row.get(5)?,
                })
            },
        );

        match result {
            Ok(config) => Ok(config),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Return default config if none exists
                Ok(DiscordConfig {
                    bot_token: None,
                    channel_id: None,
                    enabled: false,
                    command_prefix: "!sr".to_string(),
                    max_song_length: 600,
                    max_queue_size: 50,
                })
            }
            Err(e) => Err(e),
        }
    }

    /// Save Discord configuration
    pub fn save_discord_config(
        &self,
        bot_token: Option<&str>,
        channel_id: Option<&str>,
        enabled: bool,
        command_prefix: &str,
        max_song_length: i64,
        max_queue_size: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO discord_config (id, bot_token, channel_id, enabled, command_prefix, max_song_length, max_queue_size, created_at, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
             ON CONFLICT(id) DO UPDATE SET
                bot_token = ?1,
                channel_id = ?2,
                enabled = ?3,
                command_prefix = ?4,
                max_song_length = ?5,
                max_queue_size = ?6,
                updated_at = ?7",
            params![
                bot_token,
                channel_id,
                enabled,
                command_prefix,
                max_song_length,
                max_queue_size,
                now,
            ],
        )?;

        Ok(())
    }

    // === SONG REQUEST METHODS ===

    /// Add a new song request
    pub fn add_song_request(&self, song_query: &str, requester_id: &str, requester_name: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO song_requests (song_query, requester_id, requester_name, status, requested_at)
             VALUES (?1, ?2, ?3, 'pending', ?4)",
            [song_query, requester_id, requester_name, &now.to_string()],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get pending song requests
    pub fn get_pending_song_requests(&self) -> Result<Vec<SongRequest>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, song_query, song_title, song_url, requester_id, requester_name, status, requested_at, played_at, skipped_at, error
             FROM song_requests
             WHERE status = 'pending'
             ORDER BY requested_at ASC"
        )?;

        let requests = stmt
            .query_map([], |row| {
                Ok(SongRequest {
                    id: row.get(0)?,
                    song_query: row.get(1)?,
                    song_title: row.get(2)?,
                    song_url: row.get(3)?,
                    requester_id: row.get(4)?,
                    requester_name: row.get(5)?,
                    status: row.get(6)?,
                    requested_at: row.get(7)?,
                    played_at: row.get(8)?,
                    skipped_at: row.get(9)?,
                    error: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(requests)
    }

    /// Get count of pending song requests
    pub fn get_pending_song_requests_count(&self) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM song_requests WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    /// Get all song requests (with optional limit)
    pub fn get_all_song_requests(&self, limit: Option<i64>) -> Result<Vec<SongRequest>> {
        let conn = self.conn.lock().unwrap();

        let query = if let Some(lim) = limit {
            format!(
                "SELECT id, song_query, song_title, song_url, requester_id, requester_name, status, requested_at, played_at, skipped_at, error
                 FROM song_requests
                 ORDER BY requested_at DESC
                 LIMIT {}",
                lim
            )
        } else {
            "SELECT id, song_query, song_title, song_url, requester_id, requester_name, status, requested_at, played_at, skipped_at, error
             FROM song_requests
             ORDER BY requested_at DESC".to_string()
        };

        let mut stmt = conn.prepare(&query)?;

        let requests = stmt
            .query_map([], |row| {
                Ok(SongRequest {
                    id: row.get(0)?,
                    song_query: row.get(1)?,
                    song_title: row.get(2)?,
                    song_url: row.get(3)?,
                    requester_id: row.get(4)?,
                    requester_name: row.get(5)?,
                    status: row.get(6)?,
                    requested_at: row.get(7)?,
                    played_at: row.get(8)?,
                    skipped_at: row.get(9)?,
                    error: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(requests)
    }

    /// Update song request status
    pub fn update_song_request_status(&self, id: i64, status: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        let (field_name, field_value) = match status {
            "playing" => ("played_at", Some(now)),
            "skipped" => ("skipped_at", Some(now)),
            _ => ("played_at", None),
        };

        if let Some(timestamp) = field_value {
            conn.execute(
                &format!("UPDATE song_requests SET status = ?1, {} = ?2 WHERE id = ?3", field_name),
                [&status.to_string(), &timestamp.to_string(), &id.to_string()],
            )?;
        } else {
            conn.execute(
                "UPDATE song_requests SET status = ?1 WHERE id = ?2",
                [&status.to_string(), &id.to_string()],
            )?;
        }

        Ok(())
    }

    /// Update song request with metadata
    pub fn update_song_request_metadata(&self, id: i64, song_title: &str, song_url: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE song_requests SET song_title = ?1, song_url = ?2 WHERE id = ?3",
            [song_title, song_url, &id.to_string()],
        )?;
        Ok(())
    }

    /// Delete a song request
    pub fn delete_song_request(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM song_requests WHERE id = ?1", [&id.to_string()])?;
        Ok(())
    }

    /// Clear all song requests with a specific status
    pub fn clear_song_requests_by_status(&self, status: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM song_requests WHERE status = ?1", [status])?;
        Ok(())
    }

    // === DISCORD CUSTOM COMMAND METHODS ===

    /// Get all custom Discord commands
    pub fn get_discord_custom_commands(&self) -> Result<Vec<DiscordCustomCommand>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, aliases, response, description, permission, cooldown, enabled, created_at, updated_at
             FROM discord_commands
             ORDER BY name ASC"
        )?;

        let commands = stmt
            .query_map([], |row| {
                let aliases_json: String = row.get(2).unwrap_or_else(|_| "[]".to_string());
                let aliases: Vec<String> = serde_json::from_str(&aliases_json).unwrap_or_default();

                Ok(DiscordCustomCommand {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    aliases,
                    response: row.get(3)?,
                    description: row.get(4)?,
                    permission: row.get(5)?,
                    cooldown: row.get(6)?,
                    enabled: row.get::<_, i64>(7)? != 0,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(commands)
    }

    /// Get enabled custom Discord commands
    pub fn get_enabled_discord_custom_commands(&self) -> Result<Vec<DiscordCustomCommand>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, aliases, response, description, permission, cooldown, enabled, created_at, updated_at
             FROM discord_commands
             WHERE enabled = 1
             ORDER BY name ASC"
        )?;

        let commands = stmt
            .query_map([], |row| {
                let aliases_json: String = row.get(2).unwrap_or_else(|_| "[]".to_string());
                let aliases: Vec<String> = serde_json::from_str(&aliases_json).unwrap_or_default();

                Ok(DiscordCustomCommand {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    aliases,
                    response: row.get(3)?,
                    description: row.get(4)?,
                    permission: row.get(5)?,
                    cooldown: row.get(6)?,
                    enabled: row.get::<_, i64>(7)? != 0,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(commands)
    }

    /// Get a custom Discord command by ID
    pub fn get_discord_custom_command(&self, id: i64) -> Result<Option<DiscordCustomCommand>> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT id, name, aliases, response, description, permission, cooldown, enabled, created_at, updated_at
             FROM discord_commands WHERE id = ?1",
            [id],
            |row| {
                let aliases_json: String = row.get(2).unwrap_or_else(|_| "[]".to_string());
                let aliases: Vec<String> = serde_json::from_str(&aliases_json).unwrap_or_default();

                Ok(DiscordCustomCommand {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    aliases,
                    response: row.get(3)?,
                    description: row.get(4)?,
                    permission: row.get(5)?,
                    cooldown: row.get(6)?,
                    enabled: row.get::<_, i64>(7)? != 0,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        );

        match result {
            Ok(cmd) => Ok(Some(cmd)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Create a new custom Discord command
    pub fn create_discord_custom_command(
        &self,
        name: &str,
        aliases: &[String],
        response: &str,
        description: &str,
        permission: &str,
        cooldown: i64,
        enabled: bool,
    ) -> anyhow::Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let aliases_json = serde_json::to_string(aliases)?;

        conn.execute(
            "INSERT INTO discord_commands (name, aliases, response, description, permission, cooldown, enabled, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![
                name,
                aliases_json,
                response,
                description,
                permission,
                cooldown,
                enabled as i64,
                now,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update a custom Discord command
    pub fn update_discord_custom_command(
        &self,
        id: i64,
        name: &str,
        aliases: &[String],
        response: &str,
        description: &str,
        permission: &str,
        cooldown: i64,
        enabled: bool,
    ) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let aliases_json = serde_json::to_string(aliases)?;

        conn.execute(
            "UPDATE discord_commands SET
                name = ?1, aliases = ?2, response = ?3, description = ?4,
                permission = ?5, cooldown = ?6, enabled = ?7, updated_at = ?8
             WHERE id = ?9",
            params![
                name,
                aliases_json,
                response,
                description,
                permission,
                cooldown,
                enabled as i64,
                now,
                id,
            ],
        )?;

        Ok(())
    }

    /// Delete a custom Discord command
    pub fn delete_discord_custom_command(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM discord_commands WHERE id = ?1", [id])?;
        Ok(())
    }

    /// Toggle a custom Discord command's enabled state
    pub fn toggle_discord_custom_command(&self, id: i64, enabled: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE discord_commands SET enabled = ?1, updated_at = ?2 WHERE id = ?3",
            params![enabled as i64, now, id],
        )?;

        Ok(())
    }

    // === RAW QUERY METHODS ===

    /// Execute a raw SELECT query and return results as JSON
    pub fn execute_query(&self, query: &str) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(query)?;

        // Get column names
        let column_count = stmt.column_count();
        let column_names: Vec<String> = (0..column_count)
            .map(|i| stmt.column_name(i).unwrap_or("unknown").to_string())
            .collect();

        // Execute query and collect rows
        let mut rows = stmt.query([])?;
        let mut results = Vec::new();

        while let Some(row) = rows.next()? {
            let mut row_data = serde_json::Map::new();

            for (i, col_name) in column_names.iter().enumerate() {
                // Try to get value as different types
                let value: serde_json::Value = if let Ok(v) = row.get::<_, i64>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.get::<_, f64>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.get::<_, String>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.get::<_, Vec<u8>>(i) {
                    serde_json::json!(format!("<BLOB {} bytes>", v.len()))
                } else {
                    serde_json::json!(null)
                };

                row_data.insert(col_name.clone(), value);
            }

            results.push(serde_json::Value::Object(row_data));
        }

        serde_json::to_string(&results)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
    }

    /// Get list of all tables in the database
    pub fn get_tables(&self) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )?;

        let tables = stmt.query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(tables)
    }

    /// Get schema for a specific table
    pub fn get_table_schema(&self, table_name: &str) -> Result<String> {
        let conn = self.conn.lock().unwrap();

        // Get CREATE TABLE statement
        let mut stmt = conn.prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?1"
        )?;

        let schema: String = stmt.query_row([table_name], |row| row.get(0))?;
        Ok(schema)
    }

    /// Execute a non-SELECT query (INSERT, UPDATE, DELETE)
    /// Returns number of affected rows
    pub fn execute_write_query(&self, query: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let rows_affected = conn.execute(query, [])?;
        Ok(rows_affected)
    }

    // === CONFESSION METHODS ===

    /// Add a new confession
    pub fn add_confession(&self, channel: &str, username: &str, message: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO confessions (channel, username, message, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![channel, username, message, timestamp],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all confessions for a channel
    pub fn get_confessions(&self, channel: &str) -> Result<Vec<(i64, String, String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, message, created_at FROM confessions WHERE channel = ?1 ORDER BY created_at DESC"
        )?;

        let confessions = stmt.query_map([channel], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(confessions)
    }

    /// Delete a confession by ID
    pub fn delete_confession(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM confessions WHERE id = ?1", [&id.to_string()])?;
        Ok(())
    }

    // === ALEXA COMMANDS ===

    /// Get all Alexa commands
    pub fn get_all_alexa_commands(&self) -> std::result::Result<Vec<crate::modules::alexa::AlexaCommand>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, intent_name, action_type, action_value, response_text, enabled
             FROM alexa_commands
             ORDER BY name"
        ).map_err(|e| e.to_string())?;

        let commands = stmt.query_map([], |row| {
            Ok(crate::modules::alexa::AlexaCommand {
                id: row.get(0)?,
                name: row.get(1)?,
                intent_name: row.get(2)?,
                action_type: row.get(3)?,
                action_value: row.get(4)?,
                response_text: row.get(5)?,
                enabled: row.get::<_, i64>(6)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

        Ok(commands)
    }

    /// Get Alexa command by intent name
    pub fn get_alexa_command_by_intent(&self, intent_name: &str) -> std::result::Result<Option<crate::modules::alexa::AlexaCommand>, String> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT id, name, intent_name, action_type, action_value, response_text, enabled
             FROM alexa_commands
             WHERE intent_name = ?1",
            [intent_name],
            |row| {
                Ok(crate::modules::alexa::AlexaCommand {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    intent_name: row.get(2)?,
                    action_type: row.get(3)?,
                    action_value: row.get(4)?,
                    response_text: row.get(5)?,
                    enabled: row.get::<_, i64>(6)? == 1,
                })
            }
        ).optional().map_err(|e| e.to_string())?;

        Ok(result)
    }

    /// Save Alexa command (insert or update)
    pub fn save_alexa_command(&self, command: &crate::modules::alexa::AlexaCommand) -> std::result::Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        if command.id == 0 {
            // Insert new
            conn.execute(
                "INSERT INTO alexa_commands (name, intent_name, action_type, action_value, response_text, enabled, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    command.name,
                    command.intent_name,
                    command.action_type,
                    command.action_value,
                    command.response_text,
                    if command.enabled { 1 } else { 0 },
                    now,
                    now
                ]
            ).map_err(|e| e.to_string())?;
        } else {
            // Update existing
            conn.execute(
                "UPDATE alexa_commands
                 SET name = ?1, intent_name = ?2, action_type = ?3, action_value = ?4,
                     response_text = ?5, enabled = ?6, updated_at = ?7
                 WHERE id = ?8",
                rusqlite::params![
                    command.name,
                    command.intent_name,
                    command.action_type,
                    command.action_value,
                    command.response_text,
                    if command.enabled { 1 } else { 0 },
                    now,
                    command.id
                ]
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    /// Delete Alexa command
    pub fn delete_alexa_command(&self, id: i64) -> std::result::Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM alexa_commands WHERE id = ?1", [&id.to_string()])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Get Alexa configuration
    pub fn get_alexa_config(&self) -> std::result::Result<Option<(String, u16, Option<String>, Option<String>, bool)>, String> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT obs_host, obs_port, obs_password, skill_id, enabled FROM alexa_config WHERE id = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)? as u16,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, i64>(4)? == 1,
                ))
            }
        ).optional().map_err(|e| e.to_string())?;

        Ok(result)
    }

    /// Save Alexa configuration
    pub fn save_alexa_config(&self, obs_host: &str, obs_port: u16, obs_password: Option<String>, skill_id: Option<String>, enabled: bool) -> std::result::Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO alexa_config (id, obs_host, obs_port, obs_password, skill_id, enabled)
             VALUES (1, ?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                obs_host,
                obs_port as i64,
                obs_password,
                skill_id,
                if enabled { 1 } else { 0 }
            ]
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    // === TWITCH CONFIG METHODS ===

    /// Encrypt sensitive data using AES-256-GCM
    fn encrypt_value(&self, plaintext: &str, key_base64: &str) -> std::result::Result<String, String> {
        use aes_gcm::{
            aead::{Aead, KeyInit},
            Aes256Gcm, Nonce,
        };
        use base64::{engine::general_purpose, Engine as _};

        let key_bytes = general_purpose::STANDARD
            .decode(key_base64)
            .map_err(|e| format!("Failed to decode encryption key: {}", e))?;

        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);

        // Generate random nonce
        let nonce_bytes: [u8; 12] = rand::random();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Combine nonce + ciphertext and encode as base64
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(general_purpose::STANDARD.encode(&result))
    }

    /// Decrypt sensitive data using AES-256-GCM
    fn decrypt_value(&self, ciphertext: &str, key_base64: &str) -> std::result::Result<String, String> {
        use aes_gcm::{
            aead::{Aead, KeyInit},
            Aes256Gcm, Nonce,
        };
        use base64::{engine::general_purpose, Engine as _};

        let key_bytes = general_purpose::STANDARD
            .decode(key_base64)
            .map_err(|e| format!("Failed to decode encryption key: {}", e))?;

        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);

        let encrypted_data = general_purpose::STANDARD
            .decode(ciphertext)
            .map_err(|e| format!("Failed to decode encrypted data: {}", e))?;

        if encrypted_data.len() < 12 {
            return Err("Invalid encrypted data: too short".to_string());
        }

        let (nonce_bytes, ciphertext_bytes) = encrypted_data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, ciphertext_bytes)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 in decrypted data: {}", e))
    }

    /// Get or generate encryption key for Twitch config
    fn get_or_create_twitch_encryption_key(&self, conn: &rusqlite::Connection) -> std::result::Result<String, String> {
        use base64::{engine::general_purpose, Engine as _};

        // Try to get existing key
        let existing_key: Option<String> = conn.query_row(
            "SELECT encryption_key FROM twitch_config WHERE id = 1",
            [],
            |row| row.get(0)
        ).optional().map_err(|e| e.to_string())?;

        if let Some(key) = existing_key {
            return Ok(key);
        }

        // Generate new 256-bit key
        let key: [u8; 32] = rand::random();
        let key_str = general_purpose::STANDARD.encode(&key);

        Ok(key_str)
    }

    /// Get Twitch configuration
    pub fn get_twitch_config(&self) -> std::result::Result<crate::modules::twitch::TwitchConfig, String> {
        let conn = self.conn.lock().unwrap();

        let result = conn.query_row(
            "SELECT access_token, refresh_token, client_id, client_secret, bot_username, channels, token_expires_at, encryption_key
             FROM twitch_config WHERE id = 1",
            [],
            |row| {
                let access_token_encrypted: Option<String> = row.get(0)?;
                let refresh_token_encrypted: Option<String> = row.get(1)?;
                let client_id: String = row.get(2)?;
                let client_secret_encrypted: String = row.get(3)?;
                let bot_username: String = row.get(4)?;
                let channels_json: String = row.get(5)?;
                let token_expires_at: Option<i64> = row.get(6)?;
                let encryption_key: String = row.get(7)?;

                Ok((
                    access_token_encrypted,
                    refresh_token_encrypted,
                    client_id,
                    client_secret_encrypted,
                    bot_username,
                    channels_json,
                    token_expires_at,
                    encryption_key,
                ))
            },
        ).optional().map_err(|e| e.to_string())?;

        match result {
            Some((access_token_enc, refresh_token_enc, client_id, client_secret_enc, bot_username, channels_json, token_expires_at, encryption_key)) => {
                // Decrypt sensitive fields
                let access_token = if let Some(enc) = access_token_enc {
                    Some(self.decrypt_value(&enc, &encryption_key)?)
                } else {
                    None
                };

                let refresh_token = if let Some(enc) = refresh_token_enc {
                    Some(self.decrypt_value(&enc, &encryption_key)?)
                } else {
                    None
                };

                let client_secret = if !client_secret_enc.is_empty() {
                    self.decrypt_value(&client_secret_enc, &encryption_key)?
                } else {
                    String::new()
                };

                let channels: Vec<String> = serde_json::from_str(&channels_json)
                    .unwrap_or_else(|_| vec![]);

                Ok(crate::modules::twitch::TwitchConfig {
                    access_token,
                    refresh_token,
                    client_id,
                    client_secret,
                    bot_username,
                    channels,
                    token_expires_at,
                    encryption_key: Some(encryption_key),
                })
            }
            None => {
                // Return default config if none exists
                Ok(crate::modules::twitch::TwitchConfig::default())
            }
        }
    }

    /// Save Twitch configuration
    pub fn save_twitch_config(&self, config: &crate::modules::twitch::TwitchConfig) -> std::result::Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        // Get or create encryption key
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)?;

        // Encrypt sensitive fields
        let access_token_encrypted = if let Some(ref token) = config.access_token {
            Some(self.encrypt_value(token, &encryption_key)?)
        } else {
            None
        };

        let refresh_token_encrypted = if let Some(ref token) = config.refresh_token {
            Some(self.encrypt_value(token, &encryption_key)?)
        } else {
            None
        };

        let client_secret_encrypted = if !config.client_secret.is_empty() {
            self.encrypt_value(&config.client_secret, &encryption_key)?
        } else {
            String::new()
        };

        let channels_json = serde_json::to_string(&config.channels)
            .map_err(|e| format!("Failed to serialize channels: {}", e))?;

        conn.execute(
            "INSERT INTO twitch_config (id, access_token, refresh_token, client_id, client_secret, bot_username, channels, token_expires_at, encryption_key, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                access_token = ?1,
                refresh_token = ?2,
                client_id = ?3,
                client_secret = ?4,
                bot_username = ?5,
                channels = ?6,
                token_expires_at = ?7,
                encryption_key = ?8,
                updated_at = ?9",
            rusqlite::params![
                access_token_encrypted,
                refresh_token_encrypted,
                config.client_id,
                client_secret_encrypted,
                config.bot_username,
                channels_json,
                config.token_expires_at,
                encryption_key,
                now,
            ],
        ).map_err(|e| e.to_string())?;

        log::info!("✅ Twitch config saved to database");
        Ok(())
    }

    /// Update OAuth tokens
    pub fn update_twitch_tokens(&self, access_token: String, refresh_token: String, expires_in: i64) -> std::result::Result<(), String> {
        let mut config = self.get_twitch_config()?;

        config.access_token = Some(access_token);
        config.refresh_token = Some(refresh_token);
        config.token_expires_at = Some(chrono::Utc::now().timestamp() + expires_in);

        self.save_twitch_config(&config)
    }

    /// Check if Twitch token is expired or about to expire (within 5 minutes)
    pub fn is_twitch_token_expired(&self) -> std::result::Result<bool, String> {
        let config = self.get_twitch_config()?;

        if let Some(expires_at) = config.token_expires_at {
            let now = chrono::Utc::now().timestamp();
            let time_until_expiry = expires_at - now;
            log::info!("Twitch token expiry check - expires_at: {}, now: {}, time_until_expiry: {}s", expires_at, now, time_until_expiry);
            // Consider expired if within 5 minutes of expiration
            Ok(now >= expires_at - 300)
        } else {
            log::warn!("No Twitch token expiration time set - treating as expired");
            Ok(true) // No expiration time means treat as expired
        }
    }

    // ========== Ticker Methods ==========

    /// Get all ticker messages
    pub fn get_ticker_messages(&self) -> Result<Vec<TickerMessage>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, message, enabled, is_sticky, created_at, updated_at
             FROM ticker_messages
             ORDER BY id ASC"
        )?;

        let messages = stmt.query_map([], |row| {
            Ok(TickerMessage {
                id: row.get(0)?,
                message: row.get(1)?,
                enabled: row.get::<_, i64>(2)? == 1,
                is_sticky: row.get::<_, i64>(3)? == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(messages)
    }

    /// Get enabled ticker messages only
    pub fn get_enabled_ticker_messages(&self) -> Result<Vec<TickerMessage>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, message, enabled, is_sticky, created_at, updated_at
             FROM ticker_messages
             WHERE enabled = 1
             ORDER BY id ASC"
        )?;

        let messages = stmt.query_map([], |row| {
            Ok(TickerMessage {
                id: row.get(0)?,
                message: row.get(1)?,
                enabled: row.get::<_, i64>(2)? == 1,
                is_sticky: row.get::<_, i64>(3)? == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(messages)
    }

    /// Add a ticker message
    pub fn add_ticker_message(&self, message: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO ticker_messages (message, enabled, created_at, updated_at)
             VALUES (?1, 1, ?2, ?3)",
            params![message, now, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update a ticker message
    pub fn update_ticker_message(&self, id: i64, message: &str, enabled: bool, is_sticky: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE ticker_messages
             SET message = ?1, enabled = ?2, is_sticky = ?3, updated_at = ?4
             WHERE id = ?5",
            params![message, if enabled { 1 } else { 0 }, if is_sticky { 1 } else { 0 }, now, id],
        )?;

        Ok(())
    }

    /// Toggle ticker message sticky state
    pub fn toggle_ticker_message_sticky(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE ticker_messages
             SET is_sticky = NOT is_sticky, updated_at = ?1
             WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    /// Delete a ticker message
    pub fn delete_ticker_message(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ticker_messages WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Toggle ticker message enabled state
    pub fn toggle_ticker_message(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE ticker_messages
             SET enabled = NOT enabled, updated_at = ?1
             WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    // ========== Status Config Methods ==========

    /// Get status configuration
    pub fn get_status_config(&self) -> Result<StatusConfig> {
        let conn = self.conn.lock().unwrap();

        match conn.query_row(
            "SELECT stream_start_date, ticker_speed, max_ticker_items, segment_duration, updated_at FROM status_config WHERE id = 1",
            [],
            |row| {
                Ok(StatusConfig {
                    stream_start_date: row.get(0)?,
                    ticker_speed: row.get(1)?,
                    max_ticker_items: row.get(2)?,
                    segment_duration: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        ).optional()? {
            Some(config) => Ok(config),
            None => {
                // Create default config
                let now = chrono::Utc::now().timestamp();
                conn.execute(
                    "INSERT INTO status_config (id, stream_start_date, ticker_speed, max_ticker_items, segment_duration, updated_at)
                     VALUES (1, NULL, 30, 20, 15, ?1)",
                    params![now],
                )?;
                Ok(StatusConfig {
                    stream_start_date: None,
                    ticker_speed: 30,
                    max_ticker_items: 20,
                    segment_duration: 15,
                    updated_at: now,
                })
            }
        }
    }

    /// Update stream start date (ISO 8601 format: YYYY-MM-DD)
    pub fn update_stream_start_date(&self, start_date: Option<String>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO status_config (id, stream_start_date, ticker_speed, max_ticker_items, updated_at)
             VALUES (1, ?1, 30, 20, ?2)
             ON CONFLICT(id) DO UPDATE SET
                stream_start_date = ?1,
                updated_at = ?2",
            params![start_date, now],
        )?;

        Ok(())
    }

    /// Update ticker speed (animation duration in seconds)
    pub fn update_ticker_speed(&self, speed: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO status_config (id, stream_start_date, ticker_speed, max_ticker_items, updated_at)
             VALUES (1, NULL, ?1, 20, ?2)
             ON CONFLICT(id) DO UPDATE SET
                ticker_speed = ?1,
                updated_at = ?2",
            params![speed, now],
        )?;

        Ok(())
    }

    /// Update max ticker items
    pub fn update_max_ticker_items(&self, max_items: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO status_config (id, stream_start_date, ticker_speed, max_ticker_items, segment_duration, updated_at)
             VALUES (1, NULL, 30, ?1, 15, ?2)
             ON CONFLICT(id) DO UPDATE SET
                max_ticker_items = ?1,
                updated_at = ?2",
            params![max_items, now],
        )?;

        Ok(())
    }

    /// Update segment duration
    pub fn update_segment_duration(&self, duration: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO status_config (id, stream_start_date, ticker_speed, max_ticker_items, segment_duration, updated_at)
             VALUES (1, NULL, 30, 20, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET
                segment_duration = ?1,
                updated_at = ?2",
            params![duration, now],
        )?;

        Ok(())
    }

    // ========== Ticker Segment Methods ==========

    /// Get all ticker segments
    pub fn get_ticker_segments(&self) -> Result<Vec<TickerSegment>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, type, enabled, content, position, created_at, updated_at
             FROM ticker_segments
             ORDER BY position ASC, id ASC"
        )?;

        let segments = stmt.query_map([], |row| {
            let content_str: String = row.get(3)?;
            Ok(TickerSegment {
                id: row.get(0)?,
                segment_type: row.get(1)?,
                enabled: row.get::<_, i64>(2)? == 1,
                content: serde_json::from_str(&content_str).unwrap_or(serde_json::json!({})),
                position: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(segments)
    }

    /// Add a ticker segment
    pub fn add_ticker_segment(&self, segment_type: &str, content: &serde_json::Value) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let content_str = serde_json::to_string(content)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        // Get the next position (max position + 1)
        let next_position: i64 = conn.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM ticker_segments",
            [],
            |row| row.get(0)
        )?;

        conn.execute(
            "INSERT INTO ticker_segments (type, enabled, content, position, created_at, updated_at)
             VALUES (?1, 1, ?2, ?3, ?4, ?5)",
            params![segment_type, content_str, next_position, now, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update a ticker segment
    pub fn update_ticker_segment(&self, id: i64, segment_type: &str, enabled: bool, content: &serde_json::Value, position: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let content_str = serde_json::to_string(content)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        conn.execute(
            "UPDATE ticker_segments
             SET type = ?1, enabled = ?2, content = ?3, position = ?4, updated_at = ?5
             WHERE id = ?6",
            params![segment_type, if enabled { 1 } else { 0 }, content_str, position, now, id],
        )?;

        Ok(())
    }

    /// Reorder ticker segments
    pub fn reorder_ticker_segments(&self, segment_ids: &[i64]) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        // Update position for each segment based on its index in the array
        for (position, &segment_id) in segment_ids.iter().enumerate() {
            conn.execute(
                "UPDATE ticker_segments
                 SET position = ?1, updated_at = ?2
                 WHERE id = ?3",
                params![position as i64, now, segment_id],
            )?;
        }

        Ok(())
    }

    /// Delete a ticker segment
    pub fn delete_ticker_segment(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ticker_segments WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Toggle ticker segment enabled state
    pub fn toggle_ticker_segment(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE ticker_segments
             SET enabled = NOT enabled, updated_at = ?1
             WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    /// Update stream start days (deprecated, kept for backwards compatibility)
    pub fn update_stream_start_days(&self, days: i64) -> Result<()> {
        // Calculate date from days ago
        let start_date = chrono::Utc::now() - chrono::Duration::days(days);
        let date_string = start_date.format("%Y-%m-%d").to_string();
        self.update_stream_start_date(Some(date_string))
    }

    /// Get ticker events configuration
    pub fn get_ticker_events_config(&self) -> Result<TickerEventsConfig> {
        let conn = self.conn.lock().unwrap();

        match conn.query_row(
            "SELECT show_followers, show_subscribers, show_raids, show_donations, show_gifted_subs, show_cheers, updated_at
             FROM ticker_events_config WHERE id = 1",
            [],
            |row| {
                Ok(TickerEventsConfig {
                    show_followers: row.get::<_, i64>(0)? != 0,
                    show_subscribers: row.get::<_, i64>(1)? != 0,
                    show_raids: row.get::<_, i64>(2)? != 0,
                    show_donations: row.get::<_, i64>(3)? != 0,
                    show_gifted_subs: row.get::<_, i64>(4)? != 0,
                    show_cheers: row.get::<_, i64>(5)? != 0,
                    updated_at: row.get(6)?,
                })
            },
        ).optional()? {
            Some(config) => Ok(config),
            None => {
                // Create default config with all events enabled
                let now = chrono::Utc::now().timestamp();
                conn.execute(
                    "INSERT INTO ticker_events_config
                     (id, show_followers, show_subscribers, show_raids, show_donations, show_gifted_subs, show_cheers, updated_at)
                     VALUES (1, 1, 1, 1, 1, 1, 1, ?1)",
                    params![now],
                )?;
                Ok(TickerEventsConfig {
                    show_followers: true,
                    show_subscribers: true,
                    show_raids: true,
                    show_donations: true,
                    show_gifted_subs: true,
                    show_cheers: true,
                    updated_at: now,
                })
            }
        }
    }

    /// Update ticker events configuration
    pub fn update_ticker_events_config(&self, config: &TickerEventsConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO ticker_events_config
             (id, show_followers, show_subscribers, show_raids, show_donations, show_gifted_subs, show_cheers, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                show_followers = ?1,
                show_subscribers = ?2,
                show_raids = ?3,
                show_donations = ?4,
                show_gifted_subs = ?5,
                show_cheers = ?6,
                updated_at = ?7",
            params![
                config.show_followers as i64,
                config.show_subscribers as i64,
                config.show_raids as i64,
                config.show_donations as i64,
                config.show_gifted_subs as i64,
                config.show_cheers as i64,
                now
            ],
        )?;

        Ok(())
    }

    // ========== Ticker Events Methods ==========

    /// Add a ticker event (with rotation if max items exceeded)
    pub fn add_ticker_event(&self, event_type: &str, event_data: &str, display_text: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        // Get max items setting
        let config = self.get_status_config()?;
        let max_items = config.max_ticker_items;

        // Get current total count (messages + events)
        let message_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ticker_messages WHERE enabled = 1",
            [],
            |row| row.get(0)
        )?;

        let event_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ticker_events",
            [],
            |row| row.get(0)
        )?;

        let total_count = message_count + event_count;

        // If we're at or over the limit, remove oldest NON-STICKY events until we have room
        if total_count >= max_items {
            let to_remove = (total_count - max_items) + 1;
            conn.execute(
                "DELETE FROM ticker_events WHERE id IN (
                    SELECT id FROM ticker_events WHERE is_sticky = 0 ORDER BY created_at ASC LIMIT ?1
                )",
                params![to_remove],
            )?;
        }

        // Insert new event (not sticky by default)
        conn.execute(
            "INSERT INTO ticker_events (event_type, event_data, display_text, is_sticky, created_at)
             VALUES (?1, ?2, ?3, 0, ?4)",
            params![event_type, event_data, display_text, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all ticker events
    pub fn get_ticker_events(&self) -> Result<Vec<TickerEvent>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, event_type, event_data, display_text, is_sticky, created_at
             FROM ticker_events
             ORDER BY created_at DESC"
        )?;

        let events = stmt.query_map([], |row| {
            Ok(TickerEvent {
                id: row.get(0)?,
                event_type: row.get(1)?,
                event_data: row.get(2)?,
                display_text: row.get(3)?,
                is_sticky: row.get::<_, i64>(4)? == 1,
                created_at: row.get(5)?,
            })
        })?;

        events.collect()
    }

    /// Toggle ticker event sticky state
    pub fn toggle_ticker_event_sticky(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE ticker_events
             SET is_sticky = NOT is_sticky
             WHERE id = ?1",
            params![id],
        )?;

        Ok(())
    }

    /// Delete a ticker event
    pub fn delete_ticker_event(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ticker_events WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Clear all ticker events
    pub fn clear_ticker_events(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ticker_events", [])?;
        Ok(())
    }

    // ========== Goals Methods ==========

    /// Get all goals for a channel
    pub fn get_goals(&self, channel: &str) -> Result<Vec<Goal>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, title, description, type, target, current, is_sub_goal, created_at, updated_at
             FROM goals
             WHERE channel = ?1
             ORDER BY created_at DESC"
        )?;

        let goals = stmt.query_map(params![channel], |row| {
            Ok(Goal {
                id: row.get(0)?,
                channel: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                goal_type: row.get(4)?,
                target: row.get(5)?,
                current: row.get(6)?,
                is_sub_goal: row.get::<_, i64>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(goals)
    }

    /// Get a single goal by ID
    pub fn get_goal_by_id(&self, id: i64) -> Result<Option<Goal>> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT id, channel, title, description, type, target, current, is_sub_goal, created_at, updated_at
             FROM goals
             WHERE id = ?1",
            params![id],
            |row| {
                Ok(Goal {
                    id: row.get(0)?,
                    channel: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    goal_type: row.get(4)?,
                    target: row.get(5)?,
                    current: row.get(6)?,
                    is_sub_goal: row.get::<_, i64>(7)? == 1,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            }
        ).optional()?;

        Ok(result)
    }

    /// Create a new goal
    pub fn create_goal(&self, channel: &str, title: &str, description: Option<&str>, goal_type: &str, target: i64, current: i64, is_sub_goal: bool) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO goals (channel, title, description, type, target, current, is_sub_goal, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                channel,
                title,
                description,
                goal_type,
                target,
                current,
                if is_sub_goal { 1 } else { 0 },
                now,
                now
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update a goal
    pub fn update_goal(&self, id: i64, title: &str, description: Option<&str>, goal_type: &str, target: i64, current: i64, is_sub_goal: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE goals
             SET title = ?1, description = ?2, type = ?3, target = ?4, current = ?5, is_sub_goal = ?6, updated_at = ?7
             WHERE id = ?8",
            params![
                title,
                description,
                goal_type,
                target,
                current,
                if is_sub_goal { 1 } else { 0 },
                now,
                id
            ],
        )?;

        Ok(())
    }

    /// Update goal progress
    pub fn update_goal_progress(&self, id: i64, current: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE goals
             SET current = ?1, updated_at = ?2
             WHERE id = ?3",
            params![current, now, id],
        )?;

        Ok(())
    }

    /// Delete a goal
    pub fn delete_goal(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM goals WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ========== Twitch Accounts Methods ==========

    /// Add a new Twitch account
    pub fn add_twitch_account(
        &self,
        account_type: &str,
        user_id: &str,
        username: &str,
        display_name: Option<&str>,
        access_token: &str,
        refresh_token: &str,
        scopes: &[String],
        expires_in: i64,
    ) -> Result<i64> {
        let conn = self.conn.lock().unwrap();

        // Get encryption key
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        // Encrypt tokens
        let encrypted_access = self.encrypt_value(access_token, &encryption_key)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;
        let encrypted_refresh = self.encrypt_value(refresh_token, &encryption_key)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        // Calculate expiration timestamp
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let expires_at = now + expires_in;

        // Convert scopes to JSON
        let scopes_json = serde_json::to_string(scopes).unwrap_or_else(|_| "[]".to_string());

        // If this is the first account or account_type is "bot", set it as active
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM twitch_accounts",
            [],
            |row| row.get(0)
        )?;
        let is_active = if count == 0 || account_type == "bot" { 1 } else { 0 };

        // Insert account
        conn.execute(
            "INSERT INTO twitch_accounts (
                account_type, user_id, username, display_name,
                access_token, refresh_token, scopes, token_expires_at,
                is_active, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                account_type,
                user_id,
                username,
                display_name,
                encrypted_access,
                encrypted_refresh,
                scopes_json,
                expires_at,
                is_active,
                now,
                now,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all Twitch accounts
    pub fn get_twitch_accounts(&self) -> Result<Vec<TwitchAccount>> {
        let conn = self.conn.lock().unwrap();
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        let mut stmt = conn.prepare(
            "SELECT id, account_type, user_id, username, display_name,
                    access_token, refresh_token, scopes, token_expires_at,
                    is_active, created_at, updated_at
             FROM twitch_accounts
             ORDER BY account_type DESC, created_at ASC"
        )?;

        let rows: Vec<_> = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,      // id
                row.get::<_, String>(1)?,   // account_type
                row.get::<_, String>(2)?,   // user_id
                row.get::<_, String>(3)?,   // username
                row.get::<_, Option<String>>(4)?, // display_name
                row.get::<_, String>(5)?,   // encrypted access_token
                row.get::<_, String>(6)?,   // encrypted refresh_token
                row.get::<_, String>(7)?,   // scopes json
                row.get::<_, i64>(8)?,      // token_expires_at
                row.get::<_, i64>(9)?,      // is_active
                row.get::<_, i64>(10)?,     // created_at
                row.get::<_, i64>(11)?,     // updated_at
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut accounts = Vec::new();
        for (id, account_type, user_id, username, display_name, encrypted_access, encrypted_refresh, scopes_json, token_expires_at, is_active, created_at, updated_at) in rows {
            let access_token = self.decrypt_value(&encrypted_access, &encryption_key).unwrap_or_default();
            let refresh_token = self.decrypt_value(&encrypted_refresh, &encryption_key).unwrap_or_default();
            let scopes: Vec<String> = serde_json::from_str(&scopes_json).unwrap_or_default();

            accounts.push(TwitchAccount {
                id,
                account_type,
                user_id,
                username,
                display_name,
                access_token,
                refresh_token,
                scopes,
                token_expires_at,
                is_active: is_active == 1,
                created_at,
                updated_at,
            });
        }

        Ok(accounts)
    }

    /// Get Twitch account by ID
    pub fn get_twitch_account_by_id(&self, id: i64) -> Result<Option<TwitchAccount>> {
        let conn = self.conn.lock().unwrap();
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        let row_data = conn.query_row(
            "SELECT id, account_type, user_id, username, display_name,
                    access_token, refresh_token, scopes, token_expires_at,
                    is_active, created_at, updated_at
             FROM twitch_accounts
             WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, i64>(8)?,
                    row.get::<_, i64>(9)?,
                    row.get::<_, i64>(10)?,
                    row.get::<_, i64>(11)?,
                ))
            }
        ).optional()?;

        Ok(row_data.map(|(id, account_type, user_id, username, display_name, encrypted_access, encrypted_refresh, scopes_json, token_expires_at, is_active, created_at, updated_at)| {
            let access_token = self.decrypt_value(&encrypted_access, &encryption_key).unwrap_or_default();
            let refresh_token = self.decrypt_value(&encrypted_refresh, &encryption_key).unwrap_or_default();
            let scopes: Vec<String> = serde_json::from_str(&scopes_json).unwrap_or_default();

            TwitchAccount {
                id,
                account_type,
                user_id,
                username,
                display_name,
                access_token,
                refresh_token,
                scopes,
                token_expires_at,
                is_active: is_active == 1,
                created_at,
                updated_at,
            }
        }))
    }

    /// Get active Twitch account
    pub fn get_active_twitch_account(&self) -> Result<Option<TwitchAccount>> {
        let conn = self.conn.lock().unwrap();
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        let row_data = conn.query_row(
            "SELECT id, account_type, user_id, username, display_name,
                    access_token, refresh_token, scopes, token_expires_at,
                    is_active, created_at, updated_at
             FROM twitch_accounts
             WHERE is_active = 1
             LIMIT 1",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, i64>(8)?,
                    row.get::<_, i64>(9)?,
                    row.get::<_, i64>(10)?,
                    row.get::<_, i64>(11)?,
                ))
            }
        ).optional()?;

        Ok(row_data.map(|(id, account_type, user_id, username, display_name, encrypted_access, encrypted_refresh, scopes_json, token_expires_at, is_active, created_at, updated_at)| {
            let access_token = self.decrypt_value(&encrypted_access, &encryption_key).unwrap_or_default();
            let refresh_token = self.decrypt_value(&encrypted_refresh, &encryption_key).unwrap_or_default();
            let scopes: Vec<String> = serde_json::from_str(&scopes_json).unwrap_or_default();

            TwitchAccount {
                id,
                account_type,
                user_id,
                username,
                display_name,
                access_token,
                refresh_token,
                scopes,
                token_expires_at,
                is_active: is_active == 1,
                created_at,
                updated_at,
            }
        }))
    }

    /// Set active Twitch account (only one can be active at a time)
    pub fn set_active_twitch_account(&self, account_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Deactivate all accounts
        conn.execute("UPDATE twitch_accounts SET is_active = 0", [])?;

        // Activate the specified account
        conn.execute(
            "UPDATE twitch_accounts SET is_active = 1, updated_at = ?1 WHERE id = ?2",
            params![
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64,
                account_id
            ],
        )?;

        Ok(())
    }

    /// Update Twitch account tokens
    pub fn update_twitch_account_tokens(
        &self,
        account_id: i64,
        access_token: &str,
        refresh_token: &str,
        expires_in: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        let encrypted_access = self.encrypt_value(access_token, &encryption_key)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;
        let encrypted_refresh = self.encrypt_value(refresh_token, &encryption_key)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let expires_at = now + expires_in;

        conn.execute(
            "UPDATE twitch_accounts
             SET access_token = ?1, refresh_token = ?2, token_expires_at = ?3, updated_at = ?4
             WHERE id = ?5",
            params![encrypted_access, encrypted_refresh, expires_at, now, account_id],
        )?;

        Ok(())
    }

    /// Get Twitch account by user_id
    pub fn get_twitch_account_by_user_id(&self, user_id: &str) -> Result<Option<TwitchAccount>> {
        let conn = self.conn.lock().unwrap();
        let encryption_key = self.get_or_create_twitch_encryption_key(&conn)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

        let row_data = conn.query_row(
            "SELECT id, account_type, user_id, username, display_name,
                    access_token, refresh_token, scopes, token_expires_at,
                    is_active, created_at, updated_at
             FROM twitch_accounts
             WHERE user_id = ?1",
            params![user_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, i64>(8)?,
                    row.get::<_, i64>(9)?,
                    row.get::<_, i64>(10)?,
                    row.get::<_, i64>(11)?,
                ))
            }
        ).optional()?;

        Ok(row_data.map(|(id, account_type, user_id, username, display_name, encrypted_access, encrypted_refresh, scopes_json, token_expires_at, is_active, created_at, updated_at)| {
            let access_token = self.decrypt_value(&encrypted_access, &encryption_key).unwrap_or_default();
            let refresh_token = self.decrypt_value(&encrypted_refresh, &encryption_key).unwrap_or_default();
            let scopes: Vec<String> = serde_json::from_str(&scopes_json).unwrap_or_default();

            TwitchAccount {
                id,
                account_type,
                user_id,
                username,
                display_name,
                access_token,
                refresh_token,
                scopes,
                token_expires_at,
                is_active: is_active == 1,
                created_at,
                updated_at,
            }
        }))
    }

    /// Delete Twitch account
    pub fn delete_twitch_account(&self, account_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM twitch_accounts WHERE id = ?1", params![account_id])?;
        Ok(())
    }

    /// Get app setting
    pub fn get_app_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        ).optional()?;
        Ok(result)
    }

    /// Set app setting
    pub fn set_app_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, value, now],
        )?;
        Ok(())
    }

    // ==================== NOTES SYSTEM METHODS ====================

    /// Get all notes (stub for notes plugin)
    pub fn get_notes(&self) -> Result<Vec<serde_json::Value>> {
        Ok(vec![])
    }

    /// Get favorite notes (stub for notes plugin)
    pub fn get_favorite_notes(&self) -> Result<Vec<serde_json::Value>> {
        Ok(vec![])
    }

    /// Get note categories (stub for notes plugin)
    pub fn get_note_categories(&self) -> Result<Vec<String>> {
        Ok(vec![])
    }

    /// Create note (stub for notes plugin)
    pub fn create_note(&self, _title: &str, _content: &str, _category: &str, _mood: Option<&str>, _tags: Vec<String>) -> Result<i64> {
        Ok(0) // Return dummy ID
    }

    /// Update note (stub for notes plugin)
    pub fn update_note(&self, _id: i64, _title: &str, _content: &str, _category: &str, _mood: Option<&str>, _tags: Vec<String>) -> Result<()> {
        Ok(())
    }

    /// Delete note (stub for notes plugin)
    pub fn delete_note(&self, _id: i64) -> Result<()> {
        Ok(())
    }

    /// Toggle note favorite status (stub for notes plugin)
    pub fn toggle_note_favorite(&self, _id: i64) -> Result<()> {
        Ok(())
    }

    // ==================== SCHEDULE SEGMENT METHODS ====================

    /// Upsert schedule segment (stub for twitch schedule plugin)
    pub fn upsert_schedule_segment(
        &self,
        _segment_id: &str,
        _broadcaster_id: &str,
        _broadcaster_name: &str,
        _start_time: &str,
        _end_time: &str,
        _title: &str,
        _category_id: Option<&str>,
        _category_name: Option<&str>,
        _is_recurring: bool,
        _is_canceled: bool,
        _is_vacation: bool,
        _updated_at: i64,
    ) -> Result<()> {
        Ok(())
    }

    /// Delete schedule segment (stub for twitch schedule plugin)
    pub fn delete_schedule_segment(&self, _segment_id: &str) -> Result<()> {
        Ok(())
    }

    // ==================== BREAKING NEWS METHODS ====================

    /// Update breaking news (stub for ticker plugin)
    pub fn update_breaking_news(&self, _active: bool, _message: Option<String>) -> Result<()> {
        Ok(())
    }

    // ==================== MOOD TICKER METHODS ====================

    /// Get mood ticker data
    pub fn get_mood_ticker_data(&self) -> Result<MoodTickerData> {
        let conn = self.conn.lock().unwrap();

        match conn.query_row(
            "SELECT mood, weight, sleep, water, show_background, updated_at FROM mood_ticker_data WHERE id = 1",
            [],
            |row| {
                Ok(MoodTickerData {
                    mood: row.get(0)?,
                    weight: row.get(1)?,
                    sleep: row.get(2)?,
                    water: row.get(3)?,
                    show_background: row.get::<_, i64>(4)? != 0,
                    updated_at: row.get(5)?,
                })
            },
        ) {
            Ok(data) => Ok(data),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Create default data
                let now = chrono::Utc::now().timestamp();
                conn.execute(
                    "INSERT INTO mood_ticker_data (id, mood, weight, sleep, water, show_background, updated_at)
                     VALUES (1, 5, NULL, NULL, 0, 1, ?1)",
                    params![now],
                )?;
                Ok(MoodTickerData {
                    mood: 5,
                    weight: None,
                    sleep: None,
                    water: 0,
                    show_background: true,
                    updated_at: now,
                })
            }
            Err(e) => Err(e.into()),
        }
    }

    /// Update mood ticker data
    pub fn update_mood_ticker_data(&self, mood: i64, weight: Option<f64>, sleep: Option<f64>, water: i64, show_background: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO mood_ticker_data (id, mood, weight, sleep, water, show_background, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                mood = ?1,
                weight = ?2,
                sleep = ?3,
                water = ?4,
                show_background = ?5,
                updated_at = ?6",
            params![mood, weight, sleep, water, if show_background { 1 } else { 0 }, now],
        )?;

        Ok(())
    }

    // ==================== PACK SYSTEM METHODS ====================

    /// Get a pack by name
    pub fn get_pack_by_name(&self, channel: &str, name: &str) -> Result<Option<Pack>> {
        let conn = self.conn.lock().unwrap();

        // First try to get pack for this specific channel
        let result = conn.query_row(
            "SELECT id, channel, name, price, enabled, created_at, updated_at
             FROM packs WHERE channel = ?1 AND LOWER(name) = LOWER(?2)",
            params![channel, name],
            |row| Ok(Pack {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                price: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        ).optional()?;

        // If not found for this channel, try to find it in any channel
        if result.is_none() {
            log::warn!("⚠️ Pack '{}' not found for channel '{}', searching all channels", name, channel);
            let fallback = conn.query_row(
                "SELECT id, channel, name, price, enabled, created_at, updated_at
                 FROM packs WHERE LOWER(name) = LOWER(?1)",
                params![name],
                |row| Ok(Pack {
                    id: row.get(0)?,
                    channel: row.get(1)?,
                    name: row.get(2)?,
                    price: row.get(3)?,
                    enabled: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            ).optional()?;
            return Ok(fallback);
        }

        Ok(result)
    }

    /// Get all enabled packs for a channel
    pub fn get_enabled_packs(&self, channel: &str) -> Result<Vec<Pack>> {
        let conn = self.conn.lock().unwrap();

        log::info!("🔍 Searching for enabled packs for channel: '{}'", channel);

        // First try to get packs for this specific channel
        let mut stmt = conn.prepare(
            "SELECT id, channel, name, price, enabled, created_at, updated_at
             FROM packs WHERE channel = ?1 AND enabled = 1 ORDER BY price ASC"
        )?;
        let mut packs: Vec<Pack> = stmt.query_map(params![channel], |row| {
            Ok(Pack {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                price: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        // If no packs found for this channel, get all enabled packs
        if packs.is_empty() {
            log::warn!("⚠️ No packs found for channel '{}', fetching all enabled packs", channel);
            let mut stmt = conn.prepare(
                "SELECT id, channel, name, price, enabled, created_at, updated_at
                 FROM packs WHERE enabled = 1 ORDER BY price ASC"
            )?;
            packs = stmt.query_map([], |row| {
                Ok(Pack {
                    id: row.get(0)?,
                    channel: row.get(1)?,
                    name: row.get(2)?,
                    price: row.get(3)?,
                    enabled: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

            log::info!("✅ Found {} enabled packs (across all channels)", packs.len());
        } else {
            log::info!("✅ Found {} enabled packs for channel '{}'", packs.len(), channel);
        }

        Ok(packs)
    }

    /// Check if user has a pack
    pub fn user_has_pack(&self, channel: &str, username: &str, pack_id: i64) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM user_packs WHERE channel = ?1 AND LOWER(username) = LOWER(?2) AND pack_id = ?3",
            params![channel, username, pack_id],
            |row| row.get(0)
        )?;
        Ok(count > 0)
    }

    /// Get all enabled items for a channel
    pub fn get_enabled_items(&self, channel: &str) -> Result<Vec<PackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, name, rarity, value, enabled, created_at, updated_at
             FROM pack_items WHERE channel = ?1 AND enabled = 1"
        )?;
        let items = stmt.query_map(params![channel], |row| {
            Ok(PackItem {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                rarity: row.get(3)?,
                value: row.get(4)?,
                enabled: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(items)
    }

    /// Add a pack to user's inventory
    pub fn add_user_pack(&self, channel: &str, username: &str, pack_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO user_packs (channel, username, pack_id, acquired_at) VALUES (?1, LOWER(?2), ?3, ?4)",
            params![channel, username, pack_id, now],
        )?;
        Ok(())
    }

    /// Add an item to user's collection
    pub fn add_user_item(&self, channel: &str, username: &str, item_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO user_items (channel, username, item_id, acquired_at) VALUES (?1, LOWER(?2), ?3, ?4)",
            params![channel, username, item_id, now],
        )?;
        Ok(())
    }

    /// Remove a pack from user's inventory
    pub fn remove_user_pack(&self, channel: &str, username: &str, pack_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM user_packs WHERE channel = ?1 AND LOWER(username) = LOWER(?2) AND pack_id = ?3 AND id IN (
                SELECT id FROM user_packs WHERE channel = ?1 AND LOWER(username) = LOWER(?2) AND pack_id = ?3 LIMIT 1
            )",
            params![channel, username, pack_id],
        )?;
        Ok(())
    }

    /// Get all items owned by a user
    pub fn get_user_items(&self, channel: &str, username: &str) -> Result<Vec<PackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT pi.id, pi.channel, pi.name, pi.rarity, pi.value, pi.enabled, pi.created_at, pi.updated_at
             FROM user_items ui
             JOIN pack_items pi ON ui.item_id = pi.id
             WHERE ui.channel = ?1 AND LOWER(ui.username) = LOWER(?2)
             ORDER BY ui.acquired_at DESC"
        )?;
        let items = stmt.query_map(params![channel, username], |row| {
            Ok(PackItem {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                rarity: row.get(3)?,
                value: row.get(4)?,
                enabled: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(items)
    }

    /// Get all packs owned by a user
    pub fn get_user_packs(&self, channel: &str, username: &str) -> Result<Vec<Pack>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT p.id, p.channel, p.name, p.price, p.enabled, p.created_at, p.updated_at
             FROM user_packs up
             JOIN packs p ON up.pack_id = p.id
             WHERE up.channel = ?1 AND LOWER(up.username) = LOWER(?2)
             ORDER BY up.acquired_at DESC"
        )?;
        let packs = stmt.query_map(params![channel, username], |row| {
            Ok(Pack {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                price: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(packs)
    }

    /// Add coins to a user's balance
    pub fn add_coins(&self, channel: &str, username: &str, amount: i64) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Initialize user if they don't exist
        conn.execute(
            "INSERT OR IGNORE INTO users (channel, username, coins, spin_tokens, last_seen, created_at)
             VALUES (?1, LOWER(?2), 0, 0, ?3, ?3)",
            params![channel, username, now],
        )?;

        // Add coins
        conn.execute(
            "UPDATE users SET coins = coins + ?3, last_seen = ?4
             WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username, amount, now],
        )?;

        // Get new balance
        let new_balance: i64 = conn.query_row(
            "SELECT coins FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        )?;

        Ok(Some(new_balance))
    }

    /// Remove coins from a user's balance
    pub fn remove_coins(&self, channel: &str, username: &str, amount: i64) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Check current balance
        let current_balance: i64 = conn.query_row(
            "SELECT coins FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        ).unwrap_or(0);

        if current_balance < amount {
            return Ok(None); // Insufficient coins
        }

        // Remove coins
        conn.execute(
            "UPDATE users SET coins = coins - ?3, last_seen = ?4
             WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username, amount, now],
        )?;

        // Get new balance
        let new_balance: i64 = conn.query_row(
            "SELECT coins FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        )?;

        Ok(Some(new_balance))
    }

    /// Get user's coin balance
    pub fn get_user_coins(&self, channel: &str, username: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let coins: i64 = conn.query_row(
            "SELECT coins FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        ).unwrap_or(0);
        Ok(coins)
    }

    /// Add spin tokens to a user's balance
    pub fn add_spin_tokens(&self, channel: &str, username: &str, amount: i64) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Initialize user if they don't exist
        conn.execute(
            "INSERT OR IGNORE INTO users (channel, username, coins, spin_tokens, last_seen, created_at)
             VALUES (?1, LOWER(?2), 0, 0, ?3, ?3)",
            params![channel, username, now],
        )?;

        // Add spin tokens
        conn.execute(
            "UPDATE users SET spin_tokens = spin_tokens + ?3, last_seen = ?4
             WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username, amount, now],
        )?;

        // Get new balance
        let new_balance: i64 = conn.query_row(
            "SELECT spin_tokens FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        )?;

        Ok(Some(new_balance))
    }

    /// Get user's currency (coins, spin tokens, and daily availability)
    pub fn get_user_currency(&self, channel: &str, username: &str) -> Result<(i64, i64, bool)> {
        let conn = self.conn.lock().unwrap();

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let result = conn.query_row(
            "SELECT coins, spin_tokens, COALESCE(last_daily_spin, 0) FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| {
                let coins: i64 = row.get(0)?;
                let spin_tokens: i64 = row.get(1)?;
                let last_daily_spin: i64 = row.get(2)?;
                let daily_available = (now - last_daily_spin) >= 86400; // 24 hours
                Ok((coins, spin_tokens, daily_available))
            }
        ).unwrap_or((0, 0, true));
        Ok(result)
    }

    /// Get user's spin token balance
    pub fn get_spin_tokens(&self, channel: &str, username: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let tokens: i64 = conn.query_row(
            "SELECT spin_tokens FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        ).unwrap_or(0);
        Ok(tokens)
    }

    /// Remove spin tokens from a user's balance
    pub fn remove_spin_tokens(&self, channel: &str, username: &str, amount: i64) -> Result<Option<i64>> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Check current balance
        let current_balance: i64 = conn.query_row(
            "SELECT spin_tokens FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        ).unwrap_or(0);

        if current_balance < amount {
            return Ok(None); // Insufficient tokens
        }

        // Remove tokens
        conn.execute(
            "UPDATE users SET spin_tokens = spin_tokens - ?3, last_seen = ?4
             WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username, amount, now],
        )?;

        // Get new balance
        let new_balance: i64 = conn.query_row(
            "SELECT spin_tokens FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        )?;

        Ok(Some(new_balance))
    }

    /// Use daily spin (check if user has used daily spin today)
    pub fn use_daily_spin(&self, channel: &str, username: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Check if user has used daily spin today (within last 24 hours)
        let last_spin: Option<i64> = conn.query_row(
            "SELECT last_daily_spin FROM users WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username],
            |row| row.get(0)
        ).optional()?;

        if let Some(last) = last_spin {
            let seconds_since_last = now - last;
            if seconds_since_last < 86400 {
                return Ok(false); // Already used today
            }
        }

        // Update last daily spin time
        conn.execute(
            "UPDATE users SET last_daily_spin = ?3 WHERE channel = ?1 AND LOWER(username) = LOWER(?2)",
            params![channel, username, now],
        )?;

        Ok(true)
    }

    /// Get all packs for a channel
    pub fn get_all_packs(&self, channel: &str) -> Result<Vec<Pack>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, name, price, enabled, created_at, updated_at
             FROM packs WHERE channel = ?1 ORDER BY price ASC"
        )?;
        let packs = stmt.query_map(params![channel], |row| {
            Ok(Pack {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                price: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(packs)
    }

    /// Get all packs across all channels (for management UI)
    pub fn get_all_packs_no_filter(&self) -> Result<Vec<Pack>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, name, price, enabled, created_at, updated_at
             FROM packs ORDER BY channel, price ASC"
        )?;
        let packs = stmt.query_map([], |row| {
            Ok(Pack {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                price: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(packs)
    }

    /// Add a new pack
    pub fn add_pack(&self, channel: &str, name: &str, price: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO packs (channel, name, price, enabled, created_at, updated_at)
             VALUES (?1, ?2, ?3, 1, ?4, ?4)",
            params![channel, name, price, now],
        )?;
        Ok(())
    }

    /// Update a pack
    pub fn update_pack(&self, id: i64, name: &str, price: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE packs SET name = ?2, price = ?3, updated_at = ?4 WHERE id = ?1",
            params![id, name, price, now],
        )?;
        Ok(())
    }

    /// Delete a pack
    pub fn delete_pack(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM packs WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Toggle pack enabled status
    pub fn toggle_pack(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE packs SET enabled = NOT enabled, updated_at = ?2 WHERE id = ?1",
            params![id, now],
        )?;
        Ok(())
    }

    /// Get all pack items for a channel
    pub fn get_all_pack_items(&self, channel: &str) -> Result<Vec<PackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, name, rarity, value, enabled, created_at, updated_at
             FROM pack_items WHERE channel = ?1 ORDER BY rarity, name"
        )?;
        let items = stmt.query_map(params![channel], |row| {
            Ok(PackItem {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                rarity: row.get(3)?,
                value: row.get(4)?,
                enabled: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(items)
    }

    /// Get all pack items across all channels (for management UI)
    pub fn get_all_pack_items_no_filter(&self) -> Result<Vec<PackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel, name, rarity, value, enabled, created_at, updated_at
             FROM pack_items ORDER BY
             CASE rarity
                WHEN 'mythic' THEN 1
                WHEN 'legendary' THEN 2
                WHEN 'epic' THEN 3
                WHEN 'rare' THEN 4
                WHEN 'uncommon' THEN 5
                WHEN 'common' THEN 6
                ELSE 7
             END, name"
        )?;
        let items = stmt.query_map([], |row| {
            Ok(PackItem {
                id: row.get(0)?,
                channel: row.get(1)?,
                name: row.get(2)?,
                rarity: row.get(3)?,
                value: row.get(4)?,
                enabled: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(items)
    }

    /// Add a new pack item
    pub fn add_pack_item(&self, channel: &str, name: &str, rarity: &str, value: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5)",
            params![channel, name, rarity, value, now],
        )?;
        Ok(())
    }

    /// Update a pack item
    pub fn update_pack_item(&self, id: i64, name: &str, rarity: &str, value: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE pack_items SET name = ?2, rarity = ?3, value = ?4, updated_at = ?5 WHERE id = ?1",
            params![id, name, rarity, value, now],
        )?;
        Ok(())
    }

    /// Delete a pack item
    pub fn delete_pack_item(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM pack_items WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Toggle pack item enabled status
    pub fn toggle_pack_item(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE pack_items SET enabled = NOT enabled, updated_at = ?2 WHERE id = ?1",
            params![id, now],
        )?;
        Ok(())
    }

    // ==================== PACK SYSTEM SEED DATA ====================

    /// Clear all packs and items for a channel
    pub fn clear_all_packs(&self, channel: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Delete all user packs for this channel
        conn.execute(
            "DELETE FROM user_packs WHERE channel = ?1",
            params![channel],
        )?;

        // Delete all user items for this channel
        conn.execute(
            "DELETE FROM user_items WHERE channel = ?1",
            params![channel],
        )?;

        // Delete all packs for this channel
        conn.execute(
            "DELETE FROM packs WHERE channel = ?1",
            params![channel],
        )?;

        // Delete all pack items for this channel
        conn.execute(
            "DELETE FROM pack_items WHERE channel = ?1",
            params![channel],
        )?;

        Ok(())
    }

    /// Seed the database with sample packs and items
    pub fn seed_pack_data(&self, channel: &str) -> Result<()> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let conn = self.conn.lock().unwrap();

        // Check if packs already exist
        let pack_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM packs WHERE channel = ?1",
            params![channel],
            |row| row.get(0),
        )?;

        if pack_count > 0 {
            return Ok(()); // Already seeded
        }

        // Insert packs
        let packs = vec![
            ("Starter Pack", 100),
            ("Bronze Pack", 250),
            ("Silver Pack", 500),
            ("Gold Pack", 1000),
            ("Diamond Pack", 2500),
        ];

        for (name, price) in packs {
            conn.execute(
                "INSERT INTO packs (channel, name, price, enabled, created_at, updated_at) VALUES (?1, ?2, ?3, 1, ?4, ?4)",
                params![channel, name, price, now],
            )?;
        }

        // Insert common items
        let common_items = vec![
            ("Wooden Sword", 10),
            ("Leather Boots", 15),
            ("Basic Shield", 12),
            ("Simple Potion", 8),
            ("Torn Map", 5),
            ("Rusty Dagger", 9),
            ("Old Helmet", 11),
        ];

        for (name, value) in common_items {
            conn.execute(
                "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at) VALUES (?1, ?2, 'common', ?3, 1, ?4, ?4)",
                params![channel, name, value, now],
            )?;
        }

        // Insert uncommon items
        let uncommon_items = vec![
            ("Iron Sword", 25),
            ("Enchanted Bow", 30),
            ("Magic Amulet", 35),
            ("Health Potion", 20),
            ("Mysterious Compass", 28),
            ("Silver Ring", 32),
        ];

        for (name, value) in uncommon_items {
            conn.execute(
                "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at) VALUES (?1, ?2, 'uncommon', ?3, 1, ?4, ?4)",
                params![channel, name, value, now],
            )?;
        }

        // Insert rare items
        let rare_items = vec![
            ("Steel Greatsword", 50),
            ("Crystal Shield", 55),
            ("Dragon Scale Armor", 75),
            ("Elixir of Strength", 45),
            ("Ancient Scroll", 60),
            ("Sapphire Necklace", 70),
        ];

        for (name, value) in rare_items {
            conn.execute(
                "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at) VALUES (?1, ?2, 'rare', ?3, 1, ?4, ?4)",
                params![channel, name, value, now],
            )?;
        }

        // Insert epic items
        let epic_items = vec![
            ("Flaming Sword", 150),
            ("Shadow Cloak", 180),
            ("Phoenix Feather", 200),
            ("Thunderbolt Staff", 175),
            ("Boots of Speed", 160),
        ];

        for (name, value) in epic_items {
            conn.execute(
                "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at) VALUES (?1, ?2, 'epic', ?3, 1, ?4, ?4)",
                params![channel, name, value, now],
            )?;
        }

        // Insert legendary items
        let legendary_items = vec![
            ("Excalibur", 500),
            ("Crown of Kings", 600),
            ("Dragon Heart", 750),
            ("Orb of Wisdom", 550),
            ("Wings of Freedom", 650),
        ];

        for (name, value) in legendary_items {
            conn.execute(
                "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at) VALUES (?1, ?2, 'legendary', ?3, 1, ?4, ?4)",
                params![channel, name, value, now],
            )?;
        }

        // Insert mythic items
        let mythic_items = vec![
            ("Infinity Gauntlet", 2000),
            ("Divine Blade", 2500),
            ("Celestial Crown", 3000),
            ("Cosmic Orb", 2750),
        ];

        for (name, value) in mythic_items {
            conn.execute(
                "INSERT INTO pack_items (channel, name, rarity, value, enabled, created_at, updated_at) VALUES (?1, ?2, 'mythic', ?3, 1, ?4, ?4)",
                params![channel, name, value, now],
            )?;
        }

        Ok(())
    }

    // ========== Roulette Methods ==========

    /// Create a new roulette game
    pub fn create_roulette_game(&self, channel: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO roulette_games (channel, status, created_at)
             VALUES (?1, 'betting', ?2)",
            params![channel, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get current active roulette game for a channel
    pub fn get_active_roulette_game(&self, channel: &str) -> Result<Option<RouletteGame>> {
        let conn = self.conn.lock().unwrap();

        match conn.query_row(
            "SELECT id, channel, status, winning_number, spin_started_at, created_at, completed_at
             FROM roulette_games
             WHERE channel = ?1 AND status IN ('betting', 'spinning')
             ORDER BY created_at DESC
             LIMIT 1",
            params![channel],
            |row| {
                Ok(RouletteGame {
                    id: row.get(0)?,
                    channel: row.get(1)?,
                    status: row.get(2)?,
                    winning_number: row.get(3)?,
                    spin_started_at: row.get(4)?,
                    created_at: row.get(5)?,
                    completed_at: row.get(6)?,
                })
            },
        ).optional()? {
            Some(game) => Ok(Some(game)),
            None => Ok(None)
        }
    }

    /// Get roulette game by ID
    pub fn get_roulette_game(&self, game_id: i64) -> Result<Option<RouletteGame>> {
        let conn = self.conn.lock().unwrap();

        match conn.query_row(
            "SELECT id, channel, status, winning_number, spin_started_at, created_at, completed_at
             FROM roulette_games
             WHERE id = ?1",
            params![game_id],
            |row| {
                Ok(RouletteGame {
                    id: row.get(0)?,
                    channel: row.get(1)?,
                    status: row.get(2)?,
                    winning_number: row.get(3)?,
                    spin_started_at: row.get(4)?,
                    created_at: row.get(5)?,
                    completed_at: row.get(6)?,
                })
            },
        ).optional()? {
            Some(game) => Ok(Some(game)),
            None => Ok(None)
        }
    }

    /// Place a bet on a roulette game
    pub fn place_roulette_bet(&self, game_id: i64, user_id: &str, username: &str, bet_type: &str, bet_value: &str, amount: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO roulette_bets (game_id, user_id, username, bet_type, bet_value, amount, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![game_id, user_id, username, bet_type, bet_value, amount, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all bets for a roulette game
    pub fn get_roulette_bets(&self, game_id: i64) -> Result<Vec<RouletteBet>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, game_id, user_id, username, bet_type, bet_value, amount, payout, created_at
             FROM roulette_bets
             WHERE game_id = ?1
             ORDER BY created_at ASC"
        )?;

        let bets = stmt.query_map(params![game_id], |row| {
            Ok(RouletteBet {
                id: row.get(0)?,
                game_id: row.get(1)?,
                user_id: row.get(2)?,
                username: row.get(3)?,
                bet_type: row.get(4)?,
                bet_value: row.get(5)?,
                amount: row.get(6)?,
                payout: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(bets)
    }

    /// Update roulette game status
    pub fn update_roulette_game_status(&self, game_id: i64, status: &str, winning_number: Option<i64>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        if status == "spinning" {
            conn.execute(
                "UPDATE roulette_games
                 SET status = ?1, spin_started_at = ?2
                 WHERE id = ?3",
                params![status, now, game_id],
            )?;
        } else if status == "completed" {
            conn.execute(
                "UPDATE roulette_games
                 SET status = ?1, winning_number = ?2, completed_at = ?3
                 WHERE id = ?4",
                params![status, winning_number, now, game_id],
            )?;
        } else {
            conn.execute(
                "UPDATE roulette_games
                 SET status = ?1
                 WHERE id = ?2",
                params![status, game_id],
            )?;
        }

        Ok(())
    }

    /// Update bet payout
    pub fn update_roulette_bet_payout(&self, bet_id: i64, payout: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE roulette_bets
             SET payout = ?1
             WHERE id = ?2",
            params![payout, bet_id],
        )?;

        Ok(())
    }

    /// Get user's last bets from their most recent game (for repeat betting)
    pub fn get_user_last_roulette_bets(&self, channel: &str, user_id: &str) -> Result<Vec<RouletteBet>> {
        let conn = self.conn.lock().unwrap();

        // First, find the user's most recent game where they placed bets
        let last_game_id: Option<i64> = conn.query_row(
            "SELECT game_id FROM roulette_bets
             WHERE user_id = ?1
             AND game_id IN (SELECT id FROM roulette_games WHERE channel = ?2)
             ORDER BY created_at DESC
             LIMIT 1",
            params![user_id, channel],
            |row| row.get(0)
        ).ok();

        if let Some(game_id) = last_game_id {
            // Get all bets from that game by this user
            let mut stmt = conn.prepare(
                "SELECT id, game_id, user_id, username, bet_type, bet_value, amount, payout, created_at
                 FROM roulette_bets
                 WHERE game_id = ?1 AND user_id = ?2
                 ORDER BY created_at ASC"
            )?;

            let bets = stmt.query_map(params![game_id, user_id], |row| {
                Ok(RouletteBet {
                    id: row.get(0)?,
                    game_id: row.get(1)?,
                    user_id: row.get(2)?,
                    username: row.get(3)?,
                    bet_type: row.get(4)?,
                    bet_value: row.get(5)?,
                    amount: row.get(6)?,
                    payout: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

            Ok(bets)
        } else {
            Ok(Vec::new())
        }
    }

    /// Delete all bets for a user in a specific game (cancel bets)
    pub fn cancel_user_roulette_bets(&self, game_id: i64, user_id: &str) -> Result<Vec<RouletteBet>> {
        let conn = self.conn.lock().unwrap();

        // First get the bets to return them
        let mut stmt = conn.prepare(
            "SELECT id, game_id, user_id, username, bet_type, bet_value, amount, payout, created_at
             FROM roulette_bets
             WHERE game_id = ?1 AND user_id = ?2"
        )?;

        let bets = stmt.query_map(params![game_id, user_id], |row| {
            Ok(RouletteBet {
                id: row.get(0)?,
                game_id: row.get(1)?,
                user_id: row.get(2)?,
                username: row.get(3)?,
                bet_type: row.get(4)?,
                bet_value: row.get(5)?,
                amount: row.get(6)?,
                payout: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        // Delete the bets
        conn.execute(
            "DELETE FROM roulette_bets WHERE game_id = ?1 AND user_id = ?2",
            params![game_id, user_id],
        )?;

        Ok(bets)
    }

    /// Get completed roulette games for a channel
    pub fn get_roulette_history(&self, channel: &str, limit: i64) -> Result<Vec<RouletteGame>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, channel, status, winning_number, spin_started_at, created_at, completed_at
             FROM roulette_games
             WHERE channel = ?1 AND status = 'completed'
             ORDER BY completed_at DESC
             LIMIT ?2"
        )?;

        let games = stmt.query_map(params![channel, limit], |row| {
            Ok(RouletteGame {
                id: row.get(0)?,
                channel: row.get(1)?,
                status: row.get(2)?,
                winning_number: row.get(3)?,
                spin_started_at: row.get(4)?,
                created_at: row.get(5)?,
                completed_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(games)
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Self {
            conn: self.conn.clone(),
        }
    }
}
