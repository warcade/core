use rusqlite::{Connection, Result, params, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLevel {
    pub user_id: String,
    pub username: String,
    pub total_xp: i64,
    pub level: i64,
    pub last_xp_at: i64,
    pub created_at: i64,
}

pub fn calculate_level(xp: i64) -> i64 {
    // Level formula: level = floor(sqrt(xp / 100))
    ((xp as f64 / 100.0).sqrt().floor() as i64).max(1)
}

pub fn xp_for_level(level: i64) -> i64 {
    // Reverse: xp = level^2 * 100
    level * level * 100
}

pub fn add_xp(
    conn: &Connection,
    user_id: &str,
    username: &str,
    amount: i64,
    reason: Option<&str>,
) -> Result<(i64, i64)> {
    let now = current_timestamp();

    // Get current level or create user
    let old_level = if let Some(user_level) = get_user_level(conn, user_id)? {
        user_level.level
    } else {
        // Create new user
        conn.execute(
            "INSERT INTO user_levels (user_id, username, total_xp, level, last_xp_at, created_at)
             VALUES (?1, ?2, 0, 1, ?3, ?3)",
            params![user_id, username, now],
        )?;
        1
    };

    // Add XP
    conn.execute(
        "UPDATE user_levels SET total_xp = total_xp + ?1, last_xp_at = ?2 WHERE user_id = ?3",
        params![amount, now, user_id],
    )?;

    // Record transaction
    conn.execute(
        "INSERT INTO xp_transactions (user_id, amount, reason, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![user_id, amount, reason, now],
    )?;

    // Get new total XP and calculate level
    let total_xp: i64 = conn.query_row(
        "SELECT total_xp FROM user_levels WHERE user_id = ?1",
        params![user_id],
        |row| row.get(0),
    )?;

    let new_level = calculate_level(total_xp);

    // Update level if changed
    if new_level != old_level {
        conn.execute(
            "UPDATE user_levels SET level = ?1 WHERE user_id = ?2",
            params![new_level, user_id],
        )?;
    }

    Ok((old_level, new_level))
}

pub fn get_user_level(conn: &Connection, user_id: &str) -> Result<Option<UserLevel>> {
    conn.query_row(
        "SELECT user_id, username, total_xp, level, last_xp_at, created_at
         FROM user_levels WHERE user_id = ?1",
        params![user_id],
        |row| Ok(UserLevel {
            user_id: row.get(0)?,
            username: row.get(1)?,
            total_xp: row.get(2)?,
            level: row.get(3)?,
            last_xp_at: row.get(4)?,
            created_at: row.get(5)?,
        }),
    ).optional()
}

pub fn get_leaderboard(conn: &Connection, limit: usize) -> Result<Vec<UserLevel>> {
    let mut stmt = conn.prepare(
        "SELECT user_id, username, total_xp, level, last_xp_at, created_at
         FROM user_levels
         ORDER BY total_xp DESC
         LIMIT ?1"
    )?;

    let users = stmt.query_map(params![limit], |row| {
        Ok(UserLevel {
            user_id: row.get(0)?,
            username: row.get(1)?,
            total_xp: row.get(2)?,
            level: row.get(3)?,
            last_xp_at: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;

    Ok(users)
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
