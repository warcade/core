use crate::commands::database::Database;
use crate::modules::twitch::{CommandSystem, Command, PermissionLevel};
use log::error;
use std::sync::Arc;

/// Register pack commands (!buypack, !packs, !openpack, !items)
pub async fn register(command_system: &CommandSystem, database: Database) {
    // !buypack command - purchase a pack
    let buypack_db = database.clone();
    let buypack_command = Command {
        name: "buypack".to_string(),
        aliases: vec!["purchasepack".to_string()],
        description: "Purchase a pack with coins. Usage: !buypack <pack_name>".to_string(),
        usage: "!buypack <pack_name>".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 3,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = buypack_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let response = handle_buypack_command(&channel, &username, &args, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !packs command - list available packs
    let packs_db = database.clone();
    let packs_command = Command {
        name: "packs".to_string(),
        aliases: vec!["listpacks".to_string()],
        description: "List available packs to purchase".to_string(),
        usage: "!packs".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 5,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = packs_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();

            tokio::spawn(async move {
                let response = handle_packs_command(&channel, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !openpack command - open a pack you own
    let openpack_db = database.clone();
    let openpack_command = Command {
        name: "openpack".to_string(),
        aliases: vec!["open".to_string()],
        description: "Open a pack you own. Usage: !openpack <pack_name>".to_string(),
        usage: "!openpack <pack_name>".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 3,
        enabled: true,
        handler: Arc::new(move |ctx, irc, api| {
            let db = openpack_db.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();
            let api = api.clone();

            tokio::spawn(async move {
                let response = handle_openpack_command(&channel, &username, &args, &db, &api).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !items command - view your items
    let items_db = database.clone();
    let items_command = Command {
        name: "items".to_string(),
        aliases: vec!["myitems".to_string(), "collection".to_string()],
        description: "View your item collection".to_string(),
        usage: "!items [username]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 5,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = items_db.clone();
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

                let response = handle_items_command(&channel, &target_user, &username, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    // !mypacks command - view your owned packs
    let mypacks_db = database.clone();
    let mypacks_command = Command {
        name: "mypacks".to_string(),
        aliases: vec!["ownedpacks".to_string()],
        description: "View packs you own".to_string(),
        usage: "!mypacks [username]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 5,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = mypacks_db.clone();
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

                let response = handle_mypacks_command(&channel, &target_user, &username, &db).await;
                let _ = irc.send_message(&channel, &response).await;
            });

            Ok(None)
        }),
    };

    command_system.register_command(buypack_command).await;
    command_system.register_command(packs_command).await;
    command_system.register_command(openpack_command).await;
    command_system.register_command(items_command).await;
    command_system.register_command(mypacks_command).await;

    log::info!("✅ Registered pack commands (!buypack, !packs, !openpack, !items, !mypacks)");
}

/// Handle !buypack command - automatically opens the pack
async fn handle_buypack_command(
    channel: &str,
    username: &str,
    args: &[String],
    database: &Database,
) -> String {
    if args.is_empty() {
        return format!("@{} Usage: !buypack <pack_name>. Use !packs to see available packs.", username);
    }

    let pack_name = args.join(" ");

    // Get pack info
    let pack = match database.get_pack_by_name(channel, &pack_name) {
        Ok(Some(pack)) => pack,
        Ok(None) => {
            return format!("@{} Pack '{}' not found. Use !packs to see available packs.", username, pack_name);
        }
        Err(e) => {
            error!("Failed to get pack: {}", e);
            return "❌ Failed to get pack info".to_string();
        }
    };

    if !pack.enabled {
        return format!("@{} Pack '{}' is not available for purchase.", username, pack_name);
    }

    // Check if user has enough coins
    let user_coins = match database.get_user_coins(channel, username) {
        Ok(coins) => coins,
        Err(e) => {
            error!("Failed to get user coins: {}", e);
            return "❌ Failed to check your balance".to_string();
        }
    };

    if user_coins < pack.price {
        return format!(
            "@{} You need {} coins to buy '{}', but you only have {} coins.",
            username, pack.price, pack_name, user_coins
        );
    }

    // Deduct coins
    match database.remove_coins(channel, username, pack.price) {
        Ok(Some(new_balance)) => {
            // Get all enabled items for opening
            let all_items = match database.get_enabled_items(channel) {
                Ok(items) => items,
                Err(e) => {
                    error!("Failed to get items: {}", e);
                    // Refund coins
                    let _ = database.add_coins(channel, username, pack.price);
                    return "❌ Failed to get items. Coins refunded.".to_string();
                }
            };

            if all_items.is_empty() {
                let _ = database.add_coins(channel, username, pack.price);
                return "❌ No items available in packs. Coins refunded.".to_string();
            }

            // Roll for 1 item
            let rolled_item = match roll_item(&all_items) {
                Some(item) => item.clone(),
                None => {
                    let _ = database.add_coins(channel, username, pack.price);
                    return "❌ Failed to roll item. Coins refunded.".to_string();
                }
            };

            // Add item to user's collection
            if let Err(e) = database.add_user_item(channel, username, rolled_item.id) {
                error!("Failed to add item to user collection: {}", e);
            }

            // Send to overlay via WebSocket
            let pack_opening_data = serde_json::json!({
                "type": "pack_opening",
                "pack": {
                    "username": username,
                    "pack_name": pack_name,
                    "items": vec![serde_json::json!({
                        "name": rolled_item.name,
                        "rarity": rolled_item.rarity,
                        "value": rolled_item.value
                    })]
                }
            });

            // Broadcast to WebSocket clients
            crate::modules::websocket_server::broadcast_pack_opening(pack_opening_data);

            format!(
                "📦 @{} opened {}! {} {} {}",
                username,
                pack_name,
                get_rarity_emoji(&rolled_item.rarity),
                rolled_item.rarity,
                rolled_item.name
            )
        }
        Ok(None) => "❌ Insufficient coins".to_string(),
        Err(e) => {
            error!("Failed to remove coins: {}", e);
            "❌ Failed to process purchase".to_string()
        }
    }
}

/// Handle !packs command
async fn handle_packs_command(channel: &str, database: &Database) -> String {
    match database.get_enabled_packs(channel) {
        Ok(packs) => {
            if packs.is_empty() {
                return "📦 No packs available for purchase at the moment.".to_string();
            }

            let pack_list: Vec<String> = packs
                .iter()
                .map(|pack| format!("{} ({} coins)", pack.name, pack.price))
                .collect();

            format!("📦 Available packs: {} | Use !buypack <name> to purchase", pack_list.join(", "))
        }
        Err(e) => {
            error!("Failed to get packs: {}", e);
            "❌ Failed to get available packs".to_string()
        }
    }
}

/// Handle !openpack command
async fn handle_openpack_command(
    channel: &str,
    username: &str,
    args: &[String],
    database: &Database,
    _api: &Arc<crate::modules::twitch::TwitchAPI>,
) -> String {
    if args.is_empty() {
        return format!("@{} Usage: !openpack <pack_name>. Use !mypacks to see your packs.", username);
    }

    let pack_name = args.join(" ");

    // Check if user has this pack
    let pack = match database.get_pack_by_name(channel, &pack_name) {
        Ok(Some(pack)) => pack,
        Ok(None) => {
            return format!("@{} Pack '{}' not found.", username, pack_name);
        }
        Err(e) => {
            error!("Failed to get pack: {}", e);
            return "❌ Failed to get pack info".to_string();
        }
    };

    // Check if user owns this pack
    if !database.user_has_pack(channel, username, pack.id).unwrap_or(false) {
        return format!("@{} You don't own '{}'. Use !buypack to purchase it.", username, pack_name);
    }

    // Get all enabled items
    let all_items = match database.get_enabled_items(channel) {
        Ok(items) => items,
        Err(e) => {
            error!("Failed to get items: {}", e);
            return "❌ Failed to get items".to_string();
        }
    };

    if all_items.is_empty() {
        return "❌ No items available in packs. Please contact a moderator.".to_string();
    }

    // Roll for 1 item
    let rolled_item = match roll_item(&all_items) {
        Some(item) => item.clone(),
        None => {
            return "❌ Failed to roll item.".to_string();
        }
    };

    // Add item to user's collection
    if let Err(e) = database.add_user_item(channel, username, rolled_item.id) {
        error!("Failed to add item to user collection: {}", e);
    }

    // Remove pack from user's inventory
    if let Err(e) = database.remove_user_pack(channel, username, pack.id) {
        error!("Failed to remove pack from inventory: {}", e);
    }

    // Send to overlay via WebSocket
    let pack_opening_data = serde_json::json!({
        "type": "pack_opening",
        "pack": {
            "username": username,
            "pack_name": pack_name,
            "items": vec![serde_json::json!({
                "name": rolled_item.name,
                "rarity": rolled_item.rarity,
                "value": rolled_item.value
            })]
        }
    });

    // Broadcast to WebSocket clients
    crate::modules::websocket_server::broadcast_pack_opening(pack_opening_data);

    format!(
        "📦 @{} opened {}! {} {} {}",
        username,
        pack_name,
        get_rarity_emoji(&rolled_item.rarity),
        rolled_item.rarity,
        rolled_item.name
    )
}

/// Handle !items command
async fn handle_items_command(
    channel: &str,
    target_user: &str,
    requesting_user: &str,
    database: &Database,
) -> String {
    match database.get_user_items(channel, target_user) {
        Ok(items) => {
            if items.is_empty() {
                if target_user == requesting_user {
                    return format!("@{} You don't have any items yet. Buy and open packs with !buypack!", target_user);
                } else {
                    return format!("{} doesn't have any items yet.", target_user);
                }
            }

            let total_value: i64 = items.iter().map(|i| i.value).sum();
            let item_counts = count_items_by_rarity(&items);

            if target_user == requesting_user {
                format!(
                    "✨ @{} Collection: {} items | {} | Total value: {} coins",
                    target_user,
                    items.len(),
                    item_counts,
                    total_value
                )
            } else {
                format!(
                    "✨ {}'s Collection: {} items | {} | Total value: {} coins",
                    target_user,
                    items.len(),
                    item_counts,
                    total_value
                )
            }
        }
        Err(e) => {
            error!("Failed to get user items: {}", e);
            "❌ Failed to get items".to_string()
        }
    }
}

/// Handle !mypacks command
async fn handle_mypacks_command(
    channel: &str,
    target_user: &str,
    requesting_user: &str,
    database: &Database,
) -> String {
    match database.get_user_packs(channel, target_user) {
        Ok(packs) => {
            if packs.is_empty() {
                if target_user == requesting_user {
                    return format!("@{} You don't have any packs. Use !buypack to purchase one!", target_user);
                } else {
                    return format!("{} doesn't have any packs.", target_user);
                }
            }

            let pack_counts = count_packs(&packs);

            if target_user == requesting_user {
                format!(
                    "📦 @{} Owned packs: {} | Use !openpack <name> to open",
                    target_user,
                    pack_counts
                )
            } else {
                format!("📦 {}'s packs: {}", target_user, pack_counts)
            }
        }
        Err(e) => {
            error!("Failed to get user packs: {}", e);
            "❌ Failed to get packs".to_string()
        }
    }
}

/// Roll for an item based on rarity weights
fn roll_item(items: &[crate::commands::database::PackItem]) -> Option<&crate::commands::database::PackItem> {
    // Define rarity weights
    let weights = [
        ("common", 50.0),
        ("uncommon", 30.0),
        ("rare", 15.0),
        ("epic", 4.0),
        ("legendary", 0.9),
        ("mythic", 0.1),
    ];

    // Roll for rarity
    let roll = fastrand::f64() * 100.0;
    let mut cumulative = 0.0;
    let mut selected_rarity = "common";

    for (rarity, weight) in weights.iter() {
        cumulative += weight;
        if roll < cumulative {
            selected_rarity = rarity;
            break;
        }
    }

    // Filter items by rarity
    let rarity_items: Vec<&crate::commands::database::PackItem> = items
        .iter()
        .filter(|item| item.rarity == selected_rarity)
        .collect();

    // Pick random item from rarity pool
    if rarity_items.is_empty() {
        // Fallback to any random item if no items of selected rarity
        items.get(fastrand::usize(0..items.len()))
    } else {
        Some(rarity_items[fastrand::usize(0..rarity_items.len())])
    }
}

/// Count items by rarity
fn count_items_by_rarity(items: &[crate::commands::database::PackItem]) -> String {
    let mut counts = std::collections::HashMap::new();

    for item in items {
        *counts.entry(&item.rarity).or_insert(0) += 1;
    }

    let mut result: Vec<String> = counts
        .iter()
        .map(|(rarity, count)| format!("{}: {}", rarity, count))
        .collect();

    result.sort();
    result.join(", ")
}

/// Count packs
fn count_packs(packs: &[crate::commands::database::Pack]) -> String {
    let mut counts = std::collections::HashMap::new();

    for pack in packs {
        *counts.entry(&pack.name).or_insert(0) += 1;
    }

    counts
        .iter()
        .map(|(name, count)| {
            if *count > 1 {
                format!("{} x{}", name, count)
            } else {
                name.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(", ")
}

/// Get emoji for rarity
fn get_rarity_emoji(rarity: &str) -> &str {
    match rarity.to_lowercase().as_str() {
        "common" => "⚪",
        "uncommon" => "🟢",
        "rare" => "🔵",
        "epic" => "🟣",
        "legendary" => "🟠",
        "mythic" => "🔴",
        _ => "⚫",
    }
}
