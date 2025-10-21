#!/usr/bin/env node

/**
 * Wait for the bridge server to be ready before continuing
 */

const http = require('http');

const BRIDGE_URL = 'http://localhost:3001';
const MAX_RETRIES = 60; // 60 seconds total
const RETRY_INTERVAL = 1000; // 1 second

let retries = 0;

console.log('🔍 Waiting for bridge server to be ready...');

function checkBridge() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BRIDGE_URL}/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBridge() {
  while (retries < MAX_RETRIES) {
    const isReady = await checkBridge();

    if (isReady) {
      console.log('✅ Bridge server is ready!');
      process.exit(0);
      return;
    }

    retries++;

    if (retries % 5 === 0) {
      console.log(`⏳ Still waiting for bridge... (${retries}s elapsed)`);
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  }

  console.error('❌ Bridge server failed to start within timeout');
  process.exit(1);
}

waitForBridge();
