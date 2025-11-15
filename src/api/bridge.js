export const BRIDGE_API = 'http://localhost:3001';
export const WEBARCADE_WS = 'ws://localhost:3002';

export async function api(path, options = {}) {
  const url = `${BRIDGE_API}/${path}`;
  return fetch(url, options);
}

let wsInstance = null;

export function ws() {
  if (!wsInstance || wsInstance.readyState === WebSocket.CLOSED || wsInstance.readyState === WebSocket.CLOSING) {
    wsInstance = new WebSocket(WEBARCADE_WS);
  }
  return wsInstance;
}

export default {
  fetch: api,
  baseUrl: BRIDGE_API,
  ws,
};
