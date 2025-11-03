use crate::commands::database::Database;
use crate::modules::twitch::{CommandSystem, Command, PermissionLevel};
use log::error;
use std::sync::Arc;

/// Register currency commands (!gamba, !coins, !balance)
pub async fn register(command_system: &CommandSystem, database: Database) {
    // !gamba command - gamble coins
    let gamba_db = database.clone();
    let gamba_command = Command {
        name: "gamba".to_string(),
        aliases: vec!["gamble".to_string(), "bet".to_string()],
        description: "Gamble your coins! Usage: !gamba <amount>".to_string(),
        usage: "!gamba <amount> or !gamba all".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 5,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = gamba_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let response = handle_gamba_command(&channel, &username, &args, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !coins / !balance command - check coin balance
    let coins_db = database.clone();
    let coins_command = Command {
        name: "coins".to_string(),
        aliases: vec!["balance".to_string(), "bal".to_string()],
        description: "Check your coin balance and spin tokens".to_string(),
        usage: "!coins [username]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 3,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = coins_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let target_user = if args.is_empty() {
                    username.clone()
                } else {
                    args[0].trim_start_matches('@').to_string()
                };

                let response = handle_coins_command(&channel, &target_user, &username, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !spintokens command - check spin tokens
    let tokens_db = database.clone();
    let tokens_command = Command {
        name: "spintokens".to_string(),
        aliases: vec!["spins".to_string(), "tokens".to_string()],
        description: "Check your spin token balance".to_string(),
        usage: "!spintokens [username]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 3,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = tokens_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let target_user = if args.is_empty() {
                    username.clone()
                } else {
                    args[0].trim_start_matches('@').to_string()
                };

                let response = handle_tokens_command(&channel, &target_user, &username, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !givespin command - broadcaster/mod only to award spin tokens
    let give_spin_db = database.clone();
    let give_spin_command = Command {
        name: "givespin".to_string(),
        aliases: vec!["awardtoken".to_string(), "givespintoken".to_string()],
        description: "Award spin tokens to a user (Broadcaster/Mod only)".to_string(),
        usage: "!givespin <username> [amount]".to_string(),
        permission: PermissionLevel::Moderator,
        cooldown_seconds: 0,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = give_spin_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let response = handle_give_spin_command(&channel, &args, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !givecoins command - broadcaster/mod only to award coins
    let give_coins_db = database.clone();
    let give_coins_command = Command {
        name: "givecoins".to_string(),
        aliases: vec!["awardcoins".to_string()],
        description: "Award coins to a user (Broadcaster/Mod only)".to_string(),
        usage: "!givecoins <username> <amount>".to_string(),
        permission: PermissionLevel::Moderator,
        cooldown_seconds: 0,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = give_coins_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let response = handle_give_coins_command(&channel, &args, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    command_system.register_command(gamba_command).await;
    command_system.register_command(coins_command).await;
    command_system.register_command(tokens_command).await;
    command_system.register_command(give_spin_command).await;
    command_system.register_command(give_coins_command).await;

    log::info!("✅ Registered currency commands (!gamba, !coins, !spintokens, !givespin, !givecoins)");
}

/// Handle !gamba command
async fn handle_gamba_command(
    channel: &str,
    username: &str,
    args: &[String],
    database: &Database,
) -> String {
    if args.is_empty() {
        return format!("@{} Usage: !gamba <amount> or !gamba all", username);
    }

    // Get user's current balance
    let current_balance = match database.get_user_coins(channel, username) {
        Ok(balance) => balance,
        Err(e) => {
            error!("Failed to get user coins: {}", e);
            return "❌ Failed to check your balance".to_string();
        }
    };

    if current_balance == 0 {
        return format!("@{} You don't have any coins to gamble! Chat more to earn coins.", username);
    }

    // Parse bet amount
    let bet_amount = if args[0].to_lowercase() == "all" {
        current_balance
    } else {
        match args[0].parse::<i64>() {
            Ok(amount) if amount > 0 => amount,
            _ => {
                return format!("@{} Please enter a valid amount (or 'all')", username);
            }
        }
    };

    // Check if user has enough coins
    if bet_amount > current_balance {
        return format!(
            "@{} You don't have enough coins! Your balance: {} coins",
            username, current_balance
        );
    }

    // Minimum bet
    if bet_amount < 10 {
        return format!("@{} Minimum bet is 10 coins!", username);
    }

    // Roll the dice (50/50 chance, but we can make it slightly favorable)
    let roll = fastrand::u8(1..=100);
    let won = roll >= 48; // 53% chance to win

    if won {
        // Win: add the bet amount (double their bet)
        let winnings = bet_amount;
        match database.add_coins(channel, username, winnings) {
            Ok(Some(new_balance)) => {
                // Chance to win a spin token on big wins
                let bonus_msg = if bet_amount >= 500 && fastrand::u8(1..=100) <= 10 {
                    match database.add_spin_tokens(channel, username, 1) {
                        Ok(_) => " + 1 SPIN TOKEN! 🎫",
                        _ => "",
                    }
                } else {
                    ""
                };

                format!(
                    "🎰 @{} rolled {} and WON! +{} coins! New balance: {} coins{}",
                    username, roll, winnings, new_balance, bonus_msg
                )
            }
            Ok(None) => {
                "❌ Error processing winnings".to_string()
            }
            Err(e) => {
                error!("Failed to add coins: {}", e);
                "❌ Error processing winnings".to_string()
            }
        }
    } else {
        // Lose: remove the bet amount
        match database.remove_coins(channel, username, bet_amount) {
            Ok(Some(new_balance)) => {
                format!(
                    "🎰 @{} rolled {} and lost. -{} coins. New balance: {} coins. Better luck next time!",
                    username, roll, bet_amount, new_balance
                )
            }
            Ok(None) => "❌ Error: Insufficient funds".to_string(),
            Err(e) => {
                error!("Failed to remove coins: {}", e);
                "❌ Error processing bet".to_string()
            }
        }
    }
}

/// Handle !coins command
async fn handle_coins_command(
    channel: &str,
    target_user: &str,
    requesting_user: &str,
    database: &Database,
) -> String {
    match database.get_user_currency(channel, target_user) {
        Ok((coins, spin_tokens, daily_available)) => {
            let daily_status = if daily_available {
                "✅ Available"
            } else {
                "❌ Used"
            };

            if target_user == requesting_user {
                format!(
                    "💰 @{} Balance: {} coins | 🎫 {} spin token{} | 🎡 Daily spin: {}",
                    target_user,
                    coins,
                    spin_tokens,
                    if spin_tokens == 1 { "" } else { "s" },
                    daily_status
                )
            } else {
                format!(
                    "💰 {}'s Balance: {} coins | 🎫 {} spin token{}",
                    target_user,
                    coins,
                    spin_tokens,
                    if spin_tokens == 1 { "" } else { "s" }
                )
            }
        }
        Err(e) => {
            error!("Failed to get user currency: {}", e);
            format!("❌ Failed to get balance for {}", target_user)
        }
    }
}

/// Handle !spintokens command
async fn handle_tokens_command(
    channel: &str,
    target_user: &str,
    requesting_user: &str,
    database: &Database,
) -> String {
    match database.get_user_currency(channel, target_user) {
        Ok((_, spin_tokens, daily_available)) => {
            let daily_status = if daily_available {
                "You have 1 free daily spin available!"
            } else {
                "Daily spin used (resets in ~24h)"
            };

            if target_user == requesting_user {
                format!(
                    "🎫 @{} You have {} spin token{}. {}",
                    target_user,
                    spin_tokens,
                    if spin_tokens == 1 { "" } else { "s" },
                    daily_status
                )
            } else {
                format!(
                    "🎫 {} has {} spin token{}",
                    target_user,
                    spin_tokens,
                    if spin_tokens == 1 { "" } else { "s" }
                )
            }
        }
        Err(e) => {
            error!("Failed to get spin tokens: {}", e);
            format!("❌ Failed to get spin tokens for {}", target_user)
        }
    }
}

/// Handle !givespin command (moderator/broadcaster only)
async fn handle_give_spin_command(
    channel: &str,
    args: &[String],
    database: &Database,
) -> String {
    if args.is_empty() {
        return "Usage: !givespin <username> [amount]".to_string();
    }

    let target_user = args[0].trim_start_matches('@').to_string();

    log::info!("🎫 !givespin: channel='{}' target_user='{}' args={:?}", channel, target_user, args);

    // Default to 1 token if no amount specified
    let amount = if args.len() > 1 {
        match args[1].parse::<i64>() {
            Ok(amt) if amt > 0 && amt <= 100 => amt,
            Ok(_) => {
                return "Amount must be between 1 and 100".to_string();
            }
            Err(_) => {
                return "Invalid amount. Usage: !givespin <username> [amount]".to_string();
            }
        }
    } else {
        1
    };

    // Check current balance before adding
    match database.get_spin_tokens(channel, &target_user) {
        Ok(current) => log::info!("Current spin tokens for {} in {}: {}", target_user, channel, current),
        Err(e) => log::error!("Failed to check current tokens: {}", e),
    }

    match database.add_spin_tokens(channel, &target_user, amount) {
        Ok(Some(new_balance)) => {
            log::info!("✅ Successfully awarded {} tokens to {}. New balance: {}", amount, target_user, new_balance);
            format!(
                "🎫 Awarded {} spin token{} to @{}! They now have {} token{} total.",
                amount,
                if amount == 1 { "" } else { "s" },
                target_user,
                new_balance,
                if new_balance == 1 { "" } else { "s" }
            )
        }
        Ok(None) => {
            error!("Failed to award spin tokens: user not found or balance issue");
            "❌ Failed to award spin tokens".to_string()
        }
        Err(e) => {
            error!("Failed to award spin tokens: {}", e);
            "❌ Failed to award spin tokens".to_string()
        }
    }
}

/// Handle !givecoins command (moderator/broadcaster only)
async fn handle_give_coins_command(
    channel: &str,
    args: &[String],
    database: &Database,
) -> String {
    if args.len() < 2 {
        return "Usage: !givecoins <username> <amount>".to_string();
    }

    let target_user = args[0].trim_start_matches('@').to_string();

    let amount = match args[1].parse::<i64>() {
        Ok(amt) if amt > 0 && amt <= 100000 => amt,
        Ok(_) => {
            return "Amount must be between 1 and 100,000".to_string();
        }
        Err(_) => {
            return "Invalid amount. Usage: !givecoins <username> <amount>".to_string();
        }
    };

    match database.add_coins(channel, &target_user, amount) {
        Ok(Some(new_balance)) => {
            format!(
                "💰 Awarded {} coins to @{}! They now have {} coins total.",
                amount,
                target_user,
                new_balance
            )
        }
        Ok(None) => {
            error!("Failed to award coins: user not found or balance issue");
            "❌ Failed to award coins".to_string()
        }
        Err(e) => {
            error!("Failed to award coins: {}", e);
            "❌ Failed to award coins".to_string()
        }
    }
}
