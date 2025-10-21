/**
 * Bridge API client
 * Uses relative URLs to work with proxy in development (HTTPS)
 * and direct connection in production
 */

const BRIDGE_BASE_URL = import.meta.env.PROD ? 'http://localhost:3001' : '';

export async function bridgeFetch(path, options = {}) {
  const url = `${BRIDGE_BASE_URL}${path}`;
  return fetch(url, options);
}

export default {
  fetch: bridgeFetch,
  baseUrl: BRIDGE_BASE_URL,
};
