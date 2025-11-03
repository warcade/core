use crate::modules::twitch::{CommandSystem, Command, PermissionLevel};
use crate::commands::database::Database;
use std::sync::Arc;
use log::error;

// Roulette number colors (European roulette)
fn get_number_color(num: i64) -> &'static str {
    match num {
        0 => "green",
        1 | 3 | 5 | 7 | 9 | 12 | 14 | 16 | 18 | 19 | 21 | 23 | 25 | 27 | 30 | 32 | 34 | 36 => "red",
        _ => "black"
    }
}

// Calculate payout multiplier for a bet type
fn get_payout_multiplier(bet_type: &str) -> i64 {
    match bet_type {
        "number" => 35,  // 35:1
        "red" | "black" | "odd" | "even" | "low" | "high" => 1,  // 1:1
        "dozen1" | "dozen2" | "dozen3" | "column1" | "column2" | "column3" => 2,  // 2:1
        _ => 0
    }
}

// Check if a number wins for a bet
fn bet_wins(bet_type: &str, bet_value: &str, winning_number: i64) -> bool {
    match bet_type {
        "number" => {
            if let Ok(num) = bet_value.parse::<i64>() {
                num == winning_number
            } else {
                false
            }
        },
        "red" => get_number_color(winning_number) == "red",
        "black" => get_number_color(winning_number) == "black",
        "odd" => winning_number > 0 && winning_number % 2 == 1,
        "even" => winning_number > 0 && winning_number % 2 == 0,
        "low" => winning_number >= 1 && winning_number <= 18,
        "high" => winning_number >= 19 && winning_number <= 36,
        "dozen1" => winning_number >= 1 && winning_number <= 12,
        "dozen2" => winning_number >= 13 && winning_number <= 24,
        "dozen3" => winning_number >= 25 && winning_number <= 36,
        _ => false
    }
}

pub async fn register(command_system: &CommandSystem, db: Database) {
    let db_clone = db.clone();

    // !roulette start/spin/cancel - Manage roulette game
    let roulette_command = Command {
        name: "roulette".to_string(),
        aliases: vec!["rou".to_string()],
        description: "Manage roulette games (mod only)".to_string(),
        usage: "!roulette start | !roulette spin | !roulette cancel".to_string(),
        permission: PermissionLevel::Moderator,
        cooldown_seconds: 0,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = db_clone.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let response = handle_roulette_command(&channel, &args, &db, irc.clone()).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    let db_clone2 = db.clone();

    // !bet <amount> <type> - Place a bet
    let bet_command = Command {
        name: "bet".to_string(),
        aliases: vec!["b".to_string()],
        description: "Place a bet on the roulette table".to_string(),
        usage: "!bet <amount> <number|red|black|odd|even|low|high|dozen1|dozen2|dozen3>".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 3,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = db_clone2.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let user_id = ctx.message.user_id.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let response = handle_bet_command(&channel, &username, &user_id, &args, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    command_system.register_command(roulette_command).await;
    command_system.register_command(bet_command).await;
}

async fn handle_roulette_command(channel: &str, args: &[String], db: &Database, irc: std::sync::Arc<crate::modules::twitch::TwitchIRCManager>) -> String {
    if args.is_empty() {
        return "Usage: !roulette start | !roulette spin | !roulette stop | !roulette refund".to_string();
    }

    match args[0].to_lowercase().as_str() {
        "start" | "new" => {
            // Check if there's already an active game
            match db.get_active_roulette_game(channel) {
                Ok(Some(game)) => {
                    format!("🎰 A roulette game is already in progress! Status: {}", game.status)
                },
                Ok(None) => {
                    // Create new game
                    match db.create_roulette_game(channel) {
                        Ok(game_id) => {
                            // Start betting timer (30 seconds)
                            let channel_clone = channel.to_string();
                            let db_clone = db.clone();
                            let irc_clone = irc;
                            tokio::spawn(async move {
                                // Wait 30 seconds
                                tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;

                                // Check if game is still in betting state
                                if let Ok(Some(game)) = db_clone.get_roulette_game(game_id) {
                                    if game.status == "betting" {
                                        // Auto-spin
                                        let response = auto_spin(&channel_clone, &db_clone, game_id).await;
                                        let _ = irc_clone.send_message(&channel_clone, &response).await;
                                    }
                                }
                            });

                            // Broadcast game start via WebSocket with timer
                            let broadcast_data = serde_json::json!({
                                "type": "roulette_game_started",
                                "game_id": game_id,
                                "channel": channel,
                                "timer_seconds": 30
                            });
                            crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

                            "🎰 Roulette table is open! Place your bets with !bet <amount> <type>. Spinning in 30 seconds!".to_string()
                        },
                        Err(e) => {
                            error!("Failed to create roulette game: {}", e);
                            "❌ Failed to start roulette game".to_string()
                        }
                    }
                },
                Err(e) => {
                    error!("Failed to check for active game: {}", e);
                    "❌ Error checking game status".to_string()
                }
            }
        },
        "spin" => {
            // Get active game
            match db.get_active_roulette_game(channel) {
                Ok(Some(game)) => {
                    if game.status != "betting" {
                        return "🎰 The wheel is already spinning or game is completed!".to_string();
                    }

                    // Get all bets
                    let bets = match db.get_roulette_bets(game.id) {
                        Ok(bets) => bets,
                        Err(e) => {
                            error!("Failed to get bets: {}", e);
                            return "❌ Error getting bets".to_string();
                        }
                    };

                    if bets.is_empty() {
                        return "🎰 No bets placed yet! Place bets with !bet <amount> <type>".to_string();
                    }

                    // Update status to spinning
                    if let Err(e) = db.update_roulette_game_status(game.id, "spinning", None) {
                        error!("Failed to update game status: {}", e);
                        return "❌ Error spinning wheel".to_string();
                    }

                    // Generate random winning number (0-36)
                    let winning_number: i64 = fastrand::i64(0..=36);
                    let winning_color = get_number_color(winning_number);

                    // Update game with winning number
                    if let Err(e) = db.update_roulette_game_status(game.id, "completed", Some(winning_number)) {
                        error!("Failed to complete game: {}", e);
                        return "❌ Error completing game".to_string();
                    }

                    // Process all bets
                    let mut total_wagered = 0;
                    let mut total_payout = 0;
                    let mut winners = Vec::new();

                    for bet in &bets {
                        total_wagered += bet.amount;

                        if bet_wins(&bet.bet_type, &bet.bet_value, winning_number) {
                            let multiplier = get_payout_multiplier(&bet.bet_type);
                            let payout = bet.amount * (multiplier + 1); // Original bet + winnings
                            total_payout += payout;

                            // Update bet with payout
                            if let Err(e) = db.update_roulette_bet_payout(bet.id, payout) {
                                error!("Failed to update bet payout: {}", e);
                            }

                            // Add coins to winner
                            if let Err(e) = db.add_coins(channel, &bet.username, payout) {
                                error!("Failed to add winnings: {}", e);
                            } else {
                                winners.push(format!("{} won {} coins!", bet.username, payout));
                            }
                        }
                    }

                    // Broadcast result via WebSocket
                    let broadcast_data = serde_json::json!({
                        "type": "roulette_result",
                        "game_id": game.id,
                        "winning_number": winning_number,
                        "winning_color": winning_color,
                        "total_wagered": total_wagered,
                        "total_payout": total_payout,
                        "winner_count": winners.len()
                    });
                    crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

                    let mut response = format!("🎰 Wheel spins... {}{} {}! ",
                        winning_number,
                        if winning_color == "red" { "🔴" } else if winning_color == "black" { "⚫" } else { "🟢" },
                        winning_color
                    );

                    if winners.is_empty() {
                        response.push_str(&format!("House wins {} coins!", total_wagered));
                    } else {
                        response.push_str(&format!("{} winner(s)! Total payout: {} coins", winners.len(), total_payout));
                    }

                    response
                },
                Ok(None) => {
                    "🎰 No active roulette game. Start one with !roulette start".to_string()
                },
                Err(e) => {
                    error!("Failed to get active game: {}", e);
                    "❌ Error getting game".to_string()
                }
            }
        },
        "refund" => {
            // Get active game and refund all bets
            match db.get_active_roulette_game(channel) {
                Ok(Some(game)) => {
                    // Get all bets for this game
                    let bets = match db.get_roulette_bets(game.id) {
                        Ok(bets) => bets,
                        Err(e) => {
                            error!("Failed to get bets for refund: {}", e);
                            return "❌ Error getting bets".to_string();
                        }
                    };

                    if bets.is_empty() {
                        // No bets to refund, just close the game
                        if let Err(e) = db.update_roulette_game_status(game.id, "cancelled", None) {
                            error!("Failed to cancel game: {}", e);
                            return "❌ Error cancelling game".to_string();
                        }

                        // Broadcast game stopped
                        let broadcast_data = serde_json::json!({
                            "type": "roulette_game_stopped",
                            "game_id": game.id,
                            "channel": channel
                        });
                        crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

                        return "🎰 Roulette game cancelled (no bets to refund)".to_string();
                    }

                    // Refund all bets
                    let mut refunded_count = 0;
                    let mut total_refunded = 0;

                    for bet in &bets {
                        if let Err(e) = db.add_coins(channel, &bet.username, bet.amount) {
                            error!("Failed to refund {} coins to {}: {}", bet.amount, bet.username, e);
                        } else {
                            refunded_count += 1;
                            total_refunded += bet.amount;
                        }
                    }

                    // Mark game as cancelled
                    if let Err(e) = db.update_roulette_game_status(game.id, "cancelled", None) {
                        error!("Failed to cancel game: {}", e);
                        return "❌ Error cancelling game (bets refunded)".to_string();
                    }

                    // Broadcast game stopped
                    let broadcast_data = serde_json::json!({
                        "type": "roulette_game_stopped",
                        "game_id": game.id,
                        "channel": channel
                    });
                    crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

                    format!("🎰 Roulette game cancelled! Refunded {} coins to {} players",
                            total_refunded, refunded_count)
                },
                Ok(None) => {
                    "🎰 No active roulette game to refund".to_string()
                },
                Err(e) => {
                    error!("Failed to get active game: {}", e);
                    "❌ Error getting game".to_string()
                }
            }
        },
        "cancel" => {
            "🎰 Use !cancelbet to cancel your own bets".to_string()
        },
        "stop" | "end" | "close" => {
            // Get active game and close it
            match db.get_active_roulette_game(channel) {
                Ok(Some(game)) => {
                    // Update game status to completed
                    if let Err(e) = db.update_roulette_game_status(game.id, "closed", None) {
                        error!("Failed to close game: {}", e);
                        return "❌ Error closing game".to_string();
                    }

                    // Broadcast game stopped via WebSocket
                    let broadcast_data = serde_json::json!({
                        "type": "roulette_game_stopped",
                        "game_id": game.id,
                        "channel": channel
                    });
                    crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

                    "🎰 Roulette table closed!".to_string()
                },
                Ok(None) => {
                    "🎰 No active roulette game to close".to_string()
                },
                Err(e) => {
                    error!("Failed to get active game: {}", e);
                    "❌ Error getting game".to_string()
                }
            }
        },
        _ => {
            "Usage: !roulette start | !roulette spin | !roulette stop | !roulette refund".to_string()
        }
    }
}

pub async fn auto_spin(channel: &str, db: &Database, game_id: i64) -> String {
    // This is called automatically after the 30-second betting timer expires
    // Just set status to spinning - frontend will determine result based on physics

    // Update status to spinning
    if let Err(e) = db.update_roulette_game_status(game_id, "spinning", None) {
        error!("Failed to update game status: {}", e);
        return "❌ Error spinning wheel".to_string();
    }

    // Broadcast spin start via WebSocket
    let broadcast_data = serde_json::json!({
        "type": "roulette_spin_started",
        "game_id": game_id,
        "channel": channel
    });
    crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

    String::new()
}

// Process the result after the ball lands (called by frontend)
pub async fn process_result(channel: &str, db: &Database, game_id: i64, winning_number: i64) -> Result<(), String> {
    let winning_color = get_number_color(winning_number);

    // Update game with winning number
    if let Err(e) = db.update_roulette_game_status(game_id, "completed", Some(winning_number)) {
        error!("Failed to complete game: {}", e);
        return Err("Error completing game".to_string());
    }

    // Get all bets
    let bets = match db.get_roulette_bets(game_id) {
        Ok(bets) => bets,
        Err(e) => {
            error!("Failed to get bets: {}", e);
            return Err("Error getting bets".to_string());
        }
    };

    // Process all bets
    let mut total_wagered = 0;
    let mut total_payout = 0;
    let mut winners = Vec::new();

    for bet in &bets {
        total_wagered += bet.amount;

        if bet_wins(&bet.bet_type, &bet.bet_value, winning_number) {
            let multiplier = get_payout_multiplier(&bet.bet_type);
            let payout = bet.amount * (multiplier + 1); // Original bet + winnings
            total_payout += payout;

            // Update bet with payout
            if let Err(e) = db.update_roulette_bet_payout(bet.id, payout) {
                error!("Failed to update bet payout: {}", e);
            }

            // Add coins to winner
            if let Err(e) = db.add_coins(channel, &bet.username, payout) {
                error!("Failed to add winnings: {}", e);
            } else {
                winners.push(format!("{} won {} coins!", bet.username, payout));
            }
        }
    }

    // Broadcast result via WebSocket
    let broadcast_data = serde_json::json!({
        "type": "roulette_result",
        "game_id": game_id,
        "winning_number": winning_number,
        "winning_color": winning_color,
        "total_wagered": total_wagered,
        "total_payout": total_payout,
        "winner_count": winners.len()
    });
    crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

    Ok(())
}

async fn handle_bet_command(channel: &str, username: &str, user_id: &str, args: &[String], db: &Database) -> String {
    if args.is_empty() {
        return "Usage: !bet <amount> <target1> [target2]... or !bet repeat. Example: !bet 100 red or !bet 50 7 9 10 28 32".to_string();
    }

    // Check for repeat command and convert to actual bet args
    let actual_args: Vec<String>;
    let args_to_use = if args.len() == 1 && args[0].to_lowercase() == "repeat" {
        // Get user's last bets
        match db.get_user_last_roulette_bets(channel, user_id) {
            Ok(last_bets) if !last_bets.is_empty() => {
                // Reconstruct the bet command with the last bet amounts and targets
                let amount = last_bets[0].amount;
                actual_args = vec![amount.to_string()]
                    .into_iter()
                    .chain(last_bets.iter().map(|b| b.bet_value.clone()))
                    .collect();
                &actual_args[..]
            },
            Ok(_) => return "❌ No previous bets found to repeat".to_string(),
            Err(e) => {
                error!("Failed to get last bets: {}", e);
                return "❌ Error retrieving last bets".to_string();
            }
        }
    } else {
        args
    };

    if args_to_use.len() < 2 {
        return "Usage: !bet <amount> <target1> [target2]... or !bet repeat. Example: !bet 100 red or !bet 50 7 9 10 28 32".to_string();
    }

    // Parse amount
    let amount = match args_to_use[0].parse::<i64>() {
        Ok(amt) if amt > 0 => amt,
        _ => return "❌ Invalid bet amount. Must be a positive number".to_string()
    };

    // Minimum bet
    if amount < 10 {
        return "❌ Minimum bet is 10 coins".to_string();
    }

    // Get active game
    let game = match db.get_active_roulette_game(channel) {
        Ok(Some(g)) => g,
        Ok(None) => return "🎰 No active roulette game. Wait for a mod to start one with !roulette start".to_string(),
        Err(e) => {
            error!("Failed to get active game: {}", e);
            return "❌ Error getting game".to_string();
        }
    };

    if game.status != "betting" {
        return "🎰 Betting is closed! The wheel is spinning or game is completed".to_string();
    }

    // Parse all bet targets from args_to_use[1..]
    let mut bet_targets = Vec::new();

    for bet_input in &args_to_use[1..] {
        let bet_input_lower = bet_input.to_lowercase();
        let (bet_type, bet_value) = if let Ok(num) = bet_input_lower.parse::<i64>() {
            if num < 0 || num > 36 {
                return format!("❌ Invalid number: {}. Choose 0-36", num);
            }
            ("number", num.to_string())
        } else {
            match bet_input_lower.as_str() {
                "red" => ("red", "red".to_string()),
                "black" => ("black", "black".to_string()),
                "odd" => ("odd", "odd".to_string()),
                "even" => ("even", "even".to_string()),
                "low" => ("low", "low".to_string()),
                "high" => ("high", "high".to_string()),
                "dozen1" | "1st" => ("dozen1", "dozen1".to_string()),
                "dozen2" | "2nd" => ("dozen2", "dozen2".to_string()),
                "dozen3" | "3rd" => ("dozen3", "dozen3".to_string()),
                _ => return format!("❌ Invalid bet type: {}. Use: number (0-36), red, black, odd, even, low, high, dozen1, dozen2, dozen3", bet_input)
            }
        };

        bet_targets.push((bet_type, bet_value));
    }

    let num_bets = bet_targets.len() as i64;
    let total_cost = amount * num_bets;

    // Check user has enough coins for all bets
    match db.get_user_coins(channel, username) {
        Ok(coins) => {
            if coins < total_cost {
                return format!("❌ Not enough coins! You need {} coins ({} × {} bets) but have {} coins",
                    total_cost, amount, num_bets, coins);
            }

            // Deduct total coins
            if let Err(e) = db.add_coins(channel, username, -total_cost) {
                error!("Failed to deduct coins: {}", e);
                return "❌ Error processing bets".to_string();
            }

            // Place all bets
            let mut placed_bets = Vec::new();
            let mut failed = false;

            for (bet_type, bet_value) in &bet_targets {
                match db.place_roulette_bet(game.id, user_id, username, bet_type, bet_value, amount) {
                    Ok(_) => {
                        // Broadcast bet via WebSocket
                        let broadcast_data = serde_json::json!({
                            "type": "roulette_bet_placed",
                            "game_id": game.id,
                            "username": username,
                            "bet_type": bet_type,
                            "bet_value": bet_value,
                            "amount": amount
                        });
                        crate::modules::websocket_server::broadcast_roulette_update(broadcast_data);

                        placed_bets.push(bet_value.clone());
                    },
                    Err(e) => {
                        error!("Failed to place bet on {}: {}", bet_value, e);
                        failed = true;
                        break;
                    }
                }
            }

            if failed {
                // Refund all coins if any bet failed
                let _ = db.add_coins(channel, username, total_cost);
                return "❌ Error placing bets (coins refunded)".to_string();
            }

            // Success message
            if num_bets == 1 {
                let multiplier = get_payout_multiplier(bet_targets[0].0);
                format!("🎰 {} bet {} coins on {}! Potential win: {} coins ({}:1)",
                    username, amount, bet_targets[0].1, amount * (multiplier + 1), multiplier)
            } else {
                format!("🎰 {} placed {} bets of {} coins each on: {}! Total wagered: {} coins",
                    username, num_bets, amount, placed_bets.join(", "), total_cost)
            }
        },
        Err(e) => {
            error!("Failed to get user coins: {}", e);
            "❌ Error checking balance".to_string()
        }
    }
}
