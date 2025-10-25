# Discord Voice Support Setup

## Current Status

Voice playback features are **disabled by default** on Windows due to complex build requirements.

The following features have been implemented but are currently commented out:
- Music player module (`src/modules/discord/music_player.rs`)
- Voice playback commands: `!play`, `!skip`, `!pause`, `!resume`, `!now`, `!stop`
- YouTube audio search and streaming
- Auto-play queue management

## What Works Without Voice

The Discord bot currently supports:
- ✅ Text commands
- ✅ Custom commands
- ✅ Song request queue management (!sr, !queue)
- ✅ User permissions and cooldowns
- ✅ All non-voice Discord features

## Requirements for Voice Support

To enable voice playback on Windows, you need:

### 1. CMake (version 3.5 - 3.30)
```bash
winget install Kitware.CMake
```

### 2. Visual Studio Build Tools 2022
Install from: https://visualstudio.microsoft.com/downloads/
- Select "Desktop development with C++"
- Ensure MSVC compiler is included

### 3. yt-dlp
```bash
winget install yt-dlp.yt-dlp
```

## Enabling Voice Support

Once the build tools are installed:

### 1. Update `Cargo.toml`
Uncomment the songbird dependency:
```toml
songbird = { version = "0.4", features = ["builtin-queue"] }
```

### 2. Update `src/modules/discord/mod.rs`
Uncomment:
```rust
pub mod music_player;
pub use music_player::{MusicPlayer, NowPlaying};
```

### 3. Update `src/modules/handlers.rs`
Uncomment:
```rust
static MUSIC_PLAYER: OnceLock<Arc<crate::modules::discord::MusicPlayer>> = OnceLock::new();
static SONGBIRD: OnceLock<Arc<songbird::Songbird>> = OnceLock::new();

pub fn set_music_player(...) { ... }
pub fn get_music_player(...) -> ... { ... }
pub fn set_songbird(...) { ... }
pub fn get_songbird(...) -> ... { ... }
```

### 4. Update `src/modules/discord/discord_bot.rs`
Add back voice intents and songbird registration:
```rust
let intents = GatewayIntents::GUILD_MESSAGES
    | GatewayIntents::MESSAGE_CONTENT
    | GatewayIntents::GUILDS
    | GatewayIntents::GUILD_VOICE_STATES;

let songbird = songbird::Songbird::serenity();

let client = Client::builder(&token, intents)
    .event_handler(handler)
    .register_songbird_with(songbird.into())
    .await?;
```

### 5. Update `src/modules/discord/builtin_commands.rs`
Uncomment the voice command registrations (lines ~63-128) and implementations (lines ~346-536)

### 6. Initialize in main.rs
```rust
let music_player = Arc::new(MusicPlayer::new(database.clone()));
let songbird = discord_manager.get_songbird();
handlers::set_music_player(music_player);
handlers::set_songbird(songbird);
```

## Voice Commands

Once enabled, these commands will be available:

- `!play` - Join voice and start playing from queue
- `!skip` - Skip current song
- `!pause` - Pause playback
- `!resume` - Resume playback
- `!now` / `!np` - Show currently playing song with progress
- `!stop` - Leave voice channel

## Troubleshooting

### CMake Not Found
- Ensure CMake is in your PATH
- Restart terminal after installation
- Try setting `CMAKE` environment variable in `.cargo/config.toml`

### MSVC Compiler Not Found
- Install Visual Studio Build Tools with C++ workload
- Run from "Developer Command Prompt for VS 2022"

### opus Build Fails
- Ensure CMake version is between 3.5 and 3.30 (not 4.x)
- Check that Visual Studio 2022 is installed with MSVC v143

## Architecture

The music player uses:
- **songbird** - Discord voice client
- **audiopus** - Opus audio codec (requires CMake to build)
- **YouTube search** - `YoutubeDl::new()` with "ytsearch1:" prefix
- **Event-driven** - Auto-plays next song on track end
- **Database-backed** - Song requests stored in SQLite

## Notes

- Voice support is easier to set up on Linux (no CMake issues)
- Consider using pre-built binaries for Windows deployment
- The song request database and queue system work independently of voice playback
