// Test script for new alerts design
const alertTypes = ['follow', 'sub', 'resub', 'gift_sub', 'raid', 'bits', 'channel_points'];

async function testAlert(type) {
  const testData = {
    follow: { type: 'follow', username: 'TestUser', display_name: 'TestUser' },
    sub: { type: 'subscribe', username: 'TestSub', display_name: 'TestSub', tier: '1000' },
    resub: { type: 'resub', username: 'TestResub', display_name: 'TestResub', months: 12, tier: '1000' },
    gift_sub: { type: 'sub_gift', gifter_name: 'TestGifter', gifter_display_name: 'TestGifter', recipient_name: 'Lucky', tier: '1000' },
    raid: { type: 'raid', from_broadcaster_user_name: 'TestRaider', viewers: 42 },
    bits: { type: 'bits', username: 'TestCheerer', display_name: 'TestCheerer', bits: 1000 },
    channel_points: { type: 'channel_points', username: 'TestPointer', display_name: 'TestPointer', reward: { title: 'Epic Reward' } }
  };

  try {
    const response = await fetch('http://localhost:3001/twitch/alert/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alert_type: type })
    });

    const result = await response.json();
    console.log(`✅ ${type} alert triggered:`, result);
  } catch (error) {
    console.error(`❌ Failed to trigger ${type} alert:`, error.message);
  }
}

async function testAllAlerts() {
  console.log('🎨 Testing new glassmorphism alert design...\n');

  for (const type of alertTypes) {
    console.log(`Triggering ${type} alert...`);
    await testAlert(type);
    // Wait 8 seconds between alerts to see each one
    await new Promise(resolve => setTimeout(resolve, 8000));
  }

  console.log('\n✨ All alerts tested! Check the overlay at http://localhost:3001/overlay/alerts');
}

testAllAlerts();
