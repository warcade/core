export const WEBARCADE_WS = 'ws://localhost:3002';
export const BRIDGE_API = 'http://localhost:3001';

const BRIDGE_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.PROD)
  ? 'http://localhost:3001'
  : '';

export async function bridge(path, options = {}) {
  const url = `${BRIDGE_BASE_URL}${path}`;
  return fetch(url, options);
}

export default {
  fetch: bridge,
  baseUrl: BRIDGE_BASE_URL,
};
