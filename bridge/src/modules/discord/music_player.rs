use anyhow::Result;
use serenity::all::{ChannelId, GuildId};
use songbird::{input::YoutubeDl, Call, Event, EventContext, EventHandler, TrackEvent};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

use crate::commands::database::{Database, SongRequest};

/// Current playback state
#[derive(Debug, Clone)]
pub struct NowPlaying {
    pub song_request: SongRequest,
    pub title: Option<String>,
    pub duration: Option<u64>,
    pub started_at: i64,
}

/// Music player state
pub struct MusicPlayer {
    database: Arc<Database>,
    current_guild: Arc<RwLock<Option<GuildId>>>,
    current_channel: Arc<RwLock<Option<ChannelId>>>,
    now_playing: Arc<RwLock<Option<NowPlaying>>>,
    is_playing: Arc<RwLock<bool>>,
}

impl MusicPlayer {
    pub fn new(database: Arc<Database>) -> Self {
        Self {
            database,
            current_guild: Arc::new(RwLock::new(None)),
            current_channel: Arc::new(RwLock::new(None)),
            now_playing: Arc::new(RwLock::new(None)),
            is_playing: Arc::new(RwLock::new(false)),
        }
    }

    /// Join a voice channel
    pub async fn join_channel(
        &self,
        songbird: Arc<songbird::Songbird>,
        guild_id: GuildId,
        channel_id: ChannelId,
    ) -> Result<()> {
        let handler = songbird.join(guild_id, channel_id).await;

        match handler {
            Ok(_) => {
                *self.current_guild.write().await = Some(guild_id);
                *self.current_channel.write().await = Some(channel_id);
                log::info!("Joined voice channel {} in guild {}", channel_id, guild_id);
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to join voice channel: {}", e);
                Err(anyhow::anyhow!("Failed to join voice channel: {}", e))
            }
        }
    }

    /// Leave the current voice channel
    pub async fn leave_channel(&self, songbird: Arc<songbird::Songbird>) -> Result<()> {
        let guild_id = self.current_guild.read().await.clone();

        if let Some(guild_id) = guild_id {
            songbird.leave(guild_id).await?;
            *self.current_guild.write().await = None;
            *self.current_channel.write().await = None;
            *self.now_playing.write().await = None;
            *self.is_playing.write().await = false;
            log::info!("Left voice channel in guild {}", guild_id);
        }

        Ok(())
    }

    /// Play the next song in the queue
    pub async fn play_next(&self, songbird: Arc<songbird::Songbird>) -> Result<Option<String>> {
        let guild_id = match *self.current_guild.read().await {
            Some(id) => id,
            None => return Err(anyhow::anyhow!("Not in a voice channel")),
        };

        // Get the next pending song request
        let song_request = match self.database.get_pending_song_requests()? {
            requests if !requests.is_empty() => requests[0].clone(),
            _ => {
                log::info!("No more songs in queue");
                *self.is_playing.write().await = false;
                return Ok(None);
            }
        };

        log::info!("Playing song: {}", song_request.song_query);

        // Get the songbird handler
        let handler_lock = match songbird.get(guild_id) {
            Some(handler) => handler,
            None => return Err(anyhow::anyhow!("Not in a voice channel")),
        };

        let mut handler = handler_lock.lock().await;

        // Search YouTube and get audio source
        let source = match YoutubeDl::new(
            reqwest::Client::new(),
            format!("ytsearch1:{}", song_request.song_query),
        )
        .await
        {
            Ok(source) => source,
            Err(e) => {
                log::error!("Failed to search YouTube for '{}': {}", song_request.song_query, e);
                // Mark as skipped and try next song
                self.database.update_song_request_status(song_request.id, "skipped")?;
                return self.play_next(songbird).await;
            }
        };

        // Get metadata
        let metadata = source.aux_metadata().await?;
        let title = metadata.title.clone();
        let duration = metadata.duration.map(|d| d.as_secs());

        // Play the track
        let track_handle = handler.play_input(source.into());

        // Set up track end event to play next song
        let database = self.database.clone();
        let songbird_clone = songbird.clone();
        let player = Arc::new(MusicPlayer::new(database.clone()));
        let request_id = song_request.id;

        track_handle.add_event(
            Event::Track(TrackEvent::End),
            TrackEndHandler {
                database: database.clone(),
                songbird: songbird_clone,
                player,
                request_id,
            },
        )?;

        // Update now playing
        *self.now_playing.write().await = Some(NowPlaying {
            song_request: song_request.clone(),
            title: title.clone(),
            duration,
            started_at: chrono::Utc::now().timestamp(),
        });
        *self.is_playing.write().await = true;

        // Mark song as playing in database
        self.database.update_song_request_status(song_request.id, "playing")?;

        Ok(title.or(Some(song_request.song_query)))
    }

    /// Skip the current song
    pub async fn skip(&self, songbird: Arc<songbird::Songbird>) -> Result<()> {
        let guild_id = match *self.current_guild.read().await {
            Some(id) => id,
            None => return Err(anyhow::anyhow!("Not in a voice channel")),
        };

        if let Some(handler_lock) = songbird.get(guild_id) {
            let handler = handler_lock.lock().await;
            handler.queue().skip()?;

            // Update status of current song to skipped
            if let Some(now_playing) = self.now_playing.read().await.as_ref() {
                self.database.update_song_request_status(now_playing.song_request.id, "skipped")?;
            }
        }

        Ok(())
    }

    /// Pause playback
    pub async fn pause(&self, songbird: Arc<songbird::Songbird>) -> Result<()> {
        let guild_id = match *self.current_guild.read().await {
            Some(id) => id,
            None => return Err(anyhow::anyhow!("Not in a voice channel")),
        };

        if let Some(handler_lock) = songbird.get(guild_id) {
            let handler = handler_lock.lock().await;
            if let Some(track) = handler.queue().current() {
                track.pause()?;
            }
        }

        Ok(())
    }

    /// Resume playback
    pub async fn resume(&self, songbird: Arc<songbird::Songbird>) -> Result<()> {
        let guild_id = match *self.current_guild.read().await {
            Some(id) => id,
            None => return Err(anyhow::anyhow!("Not in a voice channel")),
        };

        if let Some(handler_lock) = songbird.get(guild_id) {
            let handler = handler_lock.lock().await;
            if let Some(track) = handler.queue().current() {
                track.play()?;
            }
        }

        Ok(())
    }

    /// Get current playing song
    pub async fn get_now_playing(&self) -> Option<NowPlaying> {
        self.now_playing.read().await.clone()
    }

    /// Check if player is active
    pub async fn is_playing(&self) -> bool {
        *self.is_playing.read().await
    }

    /// Get current voice channel
    pub async fn get_current_channel(&self) -> Option<(GuildId, ChannelId)> {
        let guild = self.current_guild.read().await.clone()?;
        let channel = self.current_channel.read().await.clone()?;
        Some((guild, channel))
    }
}

/// Event handler for when a track ends
struct TrackEndHandler {
    database: Arc<Database>,
    songbird: Arc<songbird::Songbird>,
    player: Arc<MusicPlayer>,
    request_id: i64,
}

#[serenity::async_trait]
impl EventHandler for TrackEndHandler {
    async fn act(&self, _ctx: &EventContext<'_>) -> Option<Event> {
        log::info!("Track ended, marking as played");

        // Mark the song as played
        if let Err(e) = self.database.update_song_request_status(self.request_id, "played") {
            log::error!("Failed to mark song as played: {}", e);
        }

        // Play next song
        if let Err(e) = self.player.play_next(self.songbird.clone()).await {
            log::error!("Failed to play next song: {}", e);
        }

        None
    }
}
