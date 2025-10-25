# 🔔 WebArcade Alerts Overlay

An awesome alerts overlay system with stunning Babylon.js 3D animations for Twitch events!

## 🎨 Features

### Supported Alert Types

- **Follow Alerts** ❤️ - Heart explosion with pink particles
- **Subscription Alerts** ⭐ - Star shower with tier-based colors
- **Resubscription Alerts** 🎉 - Enhanced star effects with month count
- **Gift Subscription Alerts** 🎁 - Gift boxes with golden ribbons and confetti
- **Raid Alerts** ⚔️ - Army of colorful cubes marching in
- **Bits/Cheer Alerts** 💎 - Spinning gems with purple-to-gold gradient
- **Channel Points Alerts** ✨ - Glowing cyan orbs pulsating

### Animation Features

- **3D Babylon.js Effects** - Each alert type has unique 3D animations
- **Particle Systems** - Thousands of particles for each effect
- **Queue System** - Multiple alerts are queued and displayed sequentially
- **Auto-Hide** - Alerts auto-hide after 6 seconds
- **Smooth Transitions** - Fade in/out animations
- **Tier-Specific Colors** - Different colors for Tier 1/2/3 subscriptions

## 🚀 Setup

### 1. Build the Overlays

```bash
bun run build:overlays
```

This will compile the alerts overlay along with all other overlays.

### 2. Start the Bridge Server

```bash
cd bridge
cargo run --release
```

The bridge server runs on `http://localhost:3001` and WebSocket on `ws://localhost:3002`.

### 3. Access the Alerts Overlay

The alerts overlay is available at:
```
http://localhost:3001/overlay/alerts
```

### 4. Add to OBS

1. Add a **Browser Source** in OBS
2. Set URL to: `http://localhost:3001/overlay/alerts`
3. Set Width: `1920`
4. Set Height: `1080`
5. Check ✅ **Shutdown source when not visible**
6. Check ✅ **Refresh browser when scene becomes active**

## 🧪 Testing Alerts

### Using the Test Script

We've provided a convenient test script to trigger different alert types:

```bash
# Trigger all alerts in sequence
node test-alerts.js

# Trigger all alerts explicitly
node test-alerts.js all

# Trigger a specific alert type
node test-alerts.js follow
node test-alerts.js sub
node test-alerts.js raid
node test-alerts.js bits

# List all available alert types
node test-alerts.js list
```

### Using cURL or HTTP Client

You can also trigger alerts manually using the REST API:

```bash
# Follow alert
curl -X POST http://localhost:3001/twitch/alert/test \
  -H "Content-Type: application/json" \
  -d '{"alert_type": "follow"}'

# Subscription alert
curl -X POST http://localhost:3001/twitch/alert/test \
  -H "Content-Type: application/json" \
  -d '{"alert_type": "sub"}'

# Raid alert
curl -X POST http://localhost:3001/twitch/alert/test \
  -H "Content-Type: application/json" \
  -d '{"alert_type": "raid"}'
```

### Valid Alert Types

- `follow` - New follower
- `sub` or `subscription` - New subscriber
- `resub` or `resubscription` - Resubscription
- `gift_sub` or `gift` - Gift subscription
- `raid` - Incoming raid
- `bits` or `cheer` - Bits/cheer event
- `channel_points` - Channel points redemption

## 📡 Real-Time Twitch Events (EventSub)

### Current Status

The system currently supports **test alerts** via the REST API. For real-time Twitch events, you'll need to set up **Twitch EventSub webhooks**.

### What's Been Prepared

✅ Event type definitions for all Twitch alert types
✅ Event broadcasting system
✅ Frontend handlers for all event types
✅ Test API endpoint for development

### To Add Real EventSub Support

To receive real-time events from Twitch, you'll need to:

1. **Set up ngrok** (for webhook endpoint during development)
   ```bash
   ngrok http 3001
   ```

2. **Implement EventSub webhook handler** in `bridge/src/modules/twitch/eventsub.rs`
   - Add webhook verification (HMAC-SHA256)
   - Add subscription creation via Twitch API
   - Add challenge response handling

3. **Subscribe to Twitch Events** via the Twitch API:
   - `channel.follow`
   - `channel.subscribe`
   - `channel.subscription.message`
   - `channel.subscription.gift`
   - `channel.raid`
   - `channel.cheer`
   - `channel.channel_points_custom_reward_redemption.add`

### Useful Resources

- [Twitch EventSub Documentation](https://dev.twitch.tv/docs/eventsub/)
- [EventSub Subscription Types](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/)
- [Webhook Setup Guide](https://dev.twitch.tv/docs/eventsub/handling-webhook-events/)

## 🎮 Customization

### Modifying Animations

The alert animations are defined in `src/overlays/alerts.jsx`. Each alert type has its own animation function:

- `createFollowAnimation()` - Heart explosion
- `createSubAnimation()` - Star shower
- `createGiftSubAnimation()` - Gift boxes
- `createRaidAnimation()` - Marching cubes
- `createBitsAnimation()` - Gem spiral
- `createChannelPointsAnimation()` - Glowing orbs

### Adjusting Timing

```javascript
const DISPLAY_DURATION = 6000; // Alert display time (ms)
const ANIMATION_DURATION = 5000; // 3D animation time (ms)
```

### Changing Colors

Each animation uses specific color schemes. For example, subscriptions have tier-based colors:

- **Tier 1** (1000): Blue/Cyan
- **Tier 2** (2000): Red/Pink
- **Tier 3** (3000): Purple/Magenta

## 🏗️ Architecture

### Frontend (SolidJS + Babylon.js)

- **Location**: `src/overlays/alerts.jsx`
- **Framework**: SolidJS for reactive UI
- **3D Engine**: Babylon.js for animations
- **WebSocket**: Connects to `ws://localhost:3002`

### Backend (Rust)

- **Event Types**: `bridge/src/modules/twitch/twitch_irc_client.rs`
- **Event Broadcasting**: `bridge/src/modules/twitch/twitch_manager.rs`
- **API Handler**: `bridge/src/modules/handlers.rs`
- **EventSub Module**: `bridge/src/modules/twitch/eventsub.rs`

### Event Flow

```
Twitch IRC/EventSub → TwitchManager → WebSocket Server → Alert Overlay
                          ↓
                    broadcast::channel
                          ↓
                   All Connected Clients
```

## 🐛 Troubleshooting

### Overlay Not Loading

1. Check that the bridge server is running
2. Verify the overlay URL: `http://localhost:3001/overlay/alerts`
3. Check browser console for errors

### Alerts Not Appearing

1. Check WebSocket connection status (bottom-right of overlay)
2. Should show: 🟢 Connected
3. If disconnected, restart the bridge server

### 3D Animations Not Working

1. Ensure browser supports WebGL
2. Check that Babylon.js loaded correctly
3. Look for errors in browser console

### Test Alerts Not Triggering

1. Verify bridge server is running on port 3001
2. Check that Twitch manager is initialized
3. Look at bridge server logs for errors

## 📝 API Reference

### Test Alert Endpoint

**Endpoint**: `POST /twitch/alert/test`

**Request Body**:
```json
{
  "alert_type": "follow"
}
```

**Response**:
```json
{
  "success": true,
  "content": "Test follow alert triggered successfully"
}
```

**Error Response**:
```json
{
  "error": "Unknown alert type: xyz. Valid types: follow, sub, resub, gift_sub, raid, bits, channel_points"
}
```

## 🎉 Usage Tips

1. **Test Before Going Live** - Use the test script to preview all alert types
2. **Adjust Alert Duration** - Modify `DISPLAY_DURATION` if alerts feel too short/long
3. **Queue Management** - Alerts are automatically queued if multiple occur simultaneously
4. **Performance** - Babylon.js is GPU-accelerated and performs well even with many particles
5. **Transparency** - The overlay has a transparent background, perfect for OBS

## 🚧 Future Enhancements

- [ ] Add sound effects for each alert type
- [ ] Custom alert images/logos
- [ ] Alert history/replay
- [ ] Alert statistics dashboard
- [ ] Custom message templates
- [ ] Advanced animation customization UI
- [ ] Support for third-party alert services (StreamElements, StreamLabs)

## 📜 License

Part of the WebArcade project.

---

**Enjoy your awesome alerts overlay! 🎊**
