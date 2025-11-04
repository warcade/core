use rusqlite::{Connection, Result, params, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyAccount {
    pub user_id: String,
    pub username: String,
    pub balance: i64,
    pub lifetime_earned: i64,
    pub lifetime_spent: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn get_balance(conn: &Connection, user_id: &str) -> Result<i64> {
    conn.query_row(
        "SELECT balance FROM currency_accounts WHERE user_id = ?1",
        params![user_id],
        |row| row.get(0),
    ).or(Ok(0))
}

pub fn get_account(conn: &Connection, user_id: &str) -> Result<Option<CurrencyAccount>> {
    conn.query_row(
        "SELECT user_id, username, balance, lifetime_earned, lifetime_spent, created_at, updated_at
         FROM currency_accounts WHERE user_id = ?1",
        params![user_id],
        |row| Ok(CurrencyAccount {
            user_id: row.get(0)?,
            username: row.get(1)?,
            balance: row.get(2)?,
            lifetime_earned: row.get(3)?,
            lifetime_spent: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        }),
    ).optional()
}

pub fn add_currency(
    conn: &Connection,
    user_id: &str,
    username: &str,
    amount: i64,
    reason: Option<&str>,
) -> Result<()> {
    let now = current_timestamp();

    // Ensure account exists
    ensure_account(conn, user_id, username)?;

    // Update balance
    conn.execute(
        "UPDATE currency_accounts
         SET balance = balance + ?1, lifetime_earned = lifetime_earned + ?1, updated_at = ?2
         WHERE user_id = ?3",
        params![amount, now, user_id],
    )?;

    // Record transaction
    conn.execute(
        "INSERT INTO currency_transactions (user_id, amount, transaction_type, reason, created_at)
         VALUES (?1, ?2, 'add', ?3, ?4)",
        params![user_id, amount, reason, now],
    )?;

    Ok(())
}

pub fn deduct_currency(
    conn: &Connection,
    user_id: &str,
    amount: i64,
    reason: Option<&str>,
) -> Result<()> {
    let now = current_timestamp();

    // Check balance
    let balance = get_balance(conn, user_id)?;
    if balance < amount {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }

    // Update balance
    conn.execute(
        "UPDATE currency_accounts
         SET balance = balance - ?1, lifetime_spent = lifetime_spent + ?1, updated_at = ?2
         WHERE user_id = ?3",
        params![amount, now, user_id],
    )?;

    // Record transaction
    conn.execute(
        "INSERT INTO currency_transactions (user_id, amount, transaction_type, reason, created_at)
         VALUES (?1, ?2, 'deduct', ?3, ?4)",
        params![user_id, -amount, reason, now],
    )?;

    Ok(())
}

pub fn transfer_currency(
    conn: &Connection,
    from_user: &str,
    to_user: &str,
    to_username: &str,
    amount: i64,
) -> Result<()> {
    // Deduct from sender
    deduct_currency(conn, from_user, amount, Some("Transfer"))?;

    // Add to receiver
    add_currency(conn, to_user, to_username, amount, Some("Transfer received"))?;

    Ok(())
}

pub fn get_leaderboard(conn: &Connection, limit: usize) -> Result<Vec<CurrencyAccount>> {
    let mut stmt = conn.prepare(
        "SELECT user_id, username, balance, lifetime_earned, lifetime_spent, created_at, updated_at
         FROM currency_accounts
         ORDER BY balance DESC
         LIMIT ?1"
    )?;

    let accounts = stmt.query_map(params![limit], |row| {
        Ok(CurrencyAccount {
            user_id: row.get(0)?,
            username: row.get(1)?,
            balance: row.get(2)?,
            lifetime_earned: row.get(3)?,
            lifetime_spent: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;

    Ok(accounts)
}

fn ensure_account(conn: &Connection, user_id: &str, username: &str) -> Result<()> {
    let now = current_timestamp();

    conn.execute(
        "INSERT OR IGNORE INTO currency_accounts (user_id, username, balance, lifetime_earned, lifetime_spent, created_at, updated_at)
         VALUES (?1, ?2, 0, 0, 0, ?3, ?3)",
        params![user_id, username, now],
    )?;

    Ok(())
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
