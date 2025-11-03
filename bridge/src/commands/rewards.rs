use super::database::Database;
use log::{info, error};

/// Reward event types
#[derive(Debug, Clone)]
pub enum RewardEvent {
    LevelUp(i64), // Level reached
    FirstMessage,
    Follow,
    Subscribe(i64), // Tier (1, 2, or 3)
    GiftSub(i64), // Number of subs gifted
    Raid(i64), // Number of raiders
    Cheer(i64), // Number of bits
    StreamMilestone(i64), // Hours streamed milestone
    WatchtimeMilestone(i64), // Hours watched milestone
}

/// Reward configuration for an event
#[derive(Debug, Clone)]
pub struct RewardConfig {
    pub coins: i64,
    pub spin_tokens: i64,
}

/// Reward callback system
pub struct RewardSystem;

impl RewardSystem {
    /// Process a reward event and award coins/tokens
    pub fn process_event(
        db: &Database,
        channel: &str,
        username: &str,
        event: RewardEvent,
    ) -> Result<RewardConfig, anyhow::Error> {
        let config = match event {
            RewardEvent::LevelUp(level) => Self::calculate_level_rewards(level),
            RewardEvent::FirstMessage => RewardConfig {
                coins: 100,
                spin_tokens: 1,
            },
            RewardEvent::Follow => RewardConfig {
                coins: 250,
                spin_tokens: 1,
            },
            RewardEvent::Subscribe(tier) => RewardConfig {
                coins: 500 * tier,
                spin_tokens: tier,
            },
            RewardEvent::GiftSub(count) => RewardConfig {
                coins: 100 * count,
                spin_tokens: if count >= 5 { 1 } else { 0 },
            },
            RewardEvent::Raid(viewers) => {
                // Scale rewards based on raid size
                let tokens = match viewers {
                    0..=10 => 0,
                    11..=50 => 1,
                    51..=100 => 2,
                    _ => 3,
                };
                RewardConfig {
                    coins: viewers * 5,
                    spin_tokens: tokens,
                }
            }
            RewardEvent::Cheer(bits) => RewardConfig {
                coins: bits,
                spin_tokens: if bits >= 500 { 1 } else { 0 },
            },
            RewardEvent::StreamMilestone(hours) => RewardConfig {
                coins: hours * 100,
                spin_tokens: if hours % 10 == 0 { 1 } else { 0 },
            },
            RewardEvent::WatchtimeMilestone(hours) => RewardConfig {
                coins: hours * 50,
                spin_tokens: if hours % 5 == 0 { 1 } else { 0 },
            },
        };

        // Award coins
        if config.coins > 0 {
            if let Err(e) = db.add_coins(channel, username, config.coins) {
                error!("Failed to award coins for {:?} to {}: {}", event, username, e);
                return Err(e.into());
            }
        }

        // Award spin tokens
        if config.spin_tokens > 0 {
            if let Err(e) = db.add_spin_tokens(channel, username, config.spin_tokens) {
                error!("Failed to award spin tokens for {:?} to {}: {}", event, username, e);
                return Err(e.into());
            }
        }

        info!(
            "💰 Rewarded {} for {:?}: {} coins, {} spin tokens",
            username, event, config.coins, config.spin_tokens
        );

        Ok(config)
    }

    /// Calculate rewards for leveling up
    pub fn calculate_level_rewards(level: i64) -> RewardConfig {
        // Base coin reward increases with level
        let base_coins = 50 + (level * 10); // 60 coins at lvl 1, 110 at lvl 5, 510 at lvl 50

        // Bonus coins for milestone levels
        let bonus_coins = match level {
            5 | 10 | 15 | 20 | 25 | 30 | 40 | 50 => 100, // Milestone bonus
            _ => 0,
        };

        // Spin tokens for major milestones
        let spin_tokens = match level {
            5 | 10 | 20 | 30 | 50 => 1,
            25 | 100 => 2, // Extra for special milestones
            _ => 0,
        };

        RewardConfig {
            coins: base_coins + bonus_coins,
            spin_tokens,
        }
    }

    /// Format reward config into a readable string
    pub fn format_rewards(config: &RewardConfig) -> String {
        let mut parts = vec![];

        if config.coins > 0 {
            parts.push(format!("{} coins", config.coins));
        }

        if config.spin_tokens > 0 {
            parts.push(format!(
                "{} spin token{}",
                config.spin_tokens,
                if config.spin_tokens > 1 { "s" } else { "" }
            ));
        }

        if parts.is_empty() {
            "No rewards".to_string()
        } else {
            parts.join(" + ")
        }
    }

    /// Award first time chatter bonus
    pub fn award_first_message(
        db: &Database,
        channel: &str,
        username: &str,
    ) -> Result<Option<RewardConfig>, anyhow::Error> {
        // Check if user has chatted before (has any messages)
        // Note: This should be called BEFORE awarding XP for the message
        match db.get_user_level(channel, username) {
            Ok(Some((_, _, total_messages, _))) => {
                // User exists - only award if they have no messages yet
                // This handles edge case where user was created for other reasons
                if total_messages <= 1 {
                    // First or second message (in case we're called after XP awarded)
                    let config = Self::process_event(db, channel, username, RewardEvent::FirstMessage)?;
                    Ok(Some(config))
                } else {
                    Ok(None)
                }
            }
            Ok(None) => {
                // New user - definitely their first message
                let config = Self::process_event(db, channel, username, RewardEvent::FirstMessage)?;
                Ok(Some(config))
            }
            Err(e) => Err(e.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_level_rewards() {
        let level_1 = RewardSystem::calculate_level_rewards(1);
        assert_eq!(level_1.coins, 60); // 50 + 1*10
        assert_eq!(level_1.spin_tokens, 0);

        let level_5 = RewardSystem::calculate_level_rewards(5);
        assert_eq!(level_5.coins, 200); // 50 + 5*10 + 100 bonus
        assert_eq!(level_5.spin_tokens, 1);

        let level_25 = RewardSystem::calculate_level_rewards(25);
        assert_eq!(level_25.coins, 400); // 50 + 25*10 + 100 bonus
        assert_eq!(level_25.spin_tokens, 2);
    }

    #[test]
    fn test_format_rewards() {
        let config = RewardConfig {
            coins: 100,
            spin_tokens: 2,
        };
        assert_eq!(RewardSystem::format_rewards(&config), "100 coins + 2 spin tokens");

        let config_coins_only = RewardConfig {
            coins: 50,
            spin_tokens: 0,
        };
        assert_eq!(RewardSystem::format_rewards(&config_coins_only), "50 coins");
    }
}
