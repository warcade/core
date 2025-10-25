// Test script for triggering different alert types
// Run this after starting the bridge server

const alertTypes = [
  { type: 'follow', name: 'Follow Alert' },
  { type: 'sub', name: 'Subscription Alert' },
  { type: 'resub', name: 'Resubscription Alert' },
  { type: 'gift_sub', name: 'Gift Sub Alert' },
  { type: 'raid', name: 'Raid Alert' },
  { type: 'bits', name: 'Bits/Cheer Alert' },
  { type: 'channel_points', name: 'Channel Points Alert' }
];

async function triggerAlert(alertType) {
  try {
    const response = await fetch('http://localhost:3001/twitch/alert/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alert_type: alertType })
    });

    const result = await response.json();
    if (result.success) {
      console.log(`✅ ${alertType} alert triggered successfully!`);
    } else {
      console.error(`❌ Failed to trigger ${alertType} alert:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Error triggering ${alertType} alert:`, error.message);
  }
}

async function triggerAllAlerts() {
  console.log('🎬 Starting alert test sequence...\n');

  for (const alert of alertTypes) {
    console.log(`📢 Triggering ${alert.name}...`);
    await triggerAlert(alert.type);
    // Wait 8 seconds between alerts to avoid overlap
    await new Promise(resolve => setTimeout(resolve, 8000));
  }

  console.log('\n🎉 Alert test sequence complete!');
}

async function triggerSpecificAlert(alertType) {
  const alert = alertTypes.find(a => a.type === alertType);
  if (!alert) {
    console.error(`❌ Unknown alert type: ${alertType}`);
    console.log('Valid types:', alertTypes.map(a => a.type).join(', '));
    return;
  }

  console.log(`📢 Triggering ${alert.name}...`);
  await triggerAlert(alertType);
}

// CLI handling
const args = process.argv.slice(2);

if (args.length === 0) {
  // No arguments - trigger all alerts
  triggerAllAlerts();
} else if (args[0] === 'all') {
  // Explicit 'all' command
  triggerAllAlerts();
} else if (args[0] === 'list') {
  // List available alert types
  console.log('📋 Available alert types:\n');
  alertTypes.forEach(alert => {
    console.log(`  - ${alert.type.padEnd(15)} (${alert.name})`);
  });
} else {
  // Trigger specific alert type
  triggerSpecificAlert(args[0]);
}
