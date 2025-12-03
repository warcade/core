/**
 * WebArcade API Shim
 *
 * This module provides Tauri-compatible exports that use the WebArcade IPC bridge.
 * Import from this instead of @tauri-apps/api/* when running in the lightweight wrapper.
 *
 * The window.__WEBARCADE__ API is injected by the Rust wrapper's ipc_bridge.js
 */

// Helper to get the WebArcade API
function getApi() {
    if (typeof window !== 'undefined' && window.__WEBARCADE__) {
        return window.__WEBARCADE__;
    }
    return null;
}

// Check if we're running in WebArcade (lightweight) or Tauri
export function isWebArcade() {
    return typeof window !== 'undefined' && !!window.__WEBARCADE__;
}

export function isTauri() {
    return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__ && !window.__TAURI_INTERNALS__.__WEBARCADE_COMPAT__;
}

// ==================== DPI Types ====================

export class LogicalSize {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}

export class LogicalPosition {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class PhysicalSize {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}

export class PhysicalPosition {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// ==================== Window API ====================

class WebArcadeWindow {
    async close() {
        const api = getApi();
        if (api) return api.window.close();
    }

    async minimize() {
        const api = getApi();
        if (api) return api.window.minimize();
    }

    async maximize() {
        const api = getApi();
        if (api) return api.window.maximize();
    }

    async unmaximize() {
        const api = getApi();
        if (api) return api.window.unmaximize();
    }

    async toggleMaximize() {
        const api = getApi();
        if (api) return api.window.toggleMaximize();
    }

    async isMaximized() {
        const api = getApi();
        if (api) return api.window.isMaximized();
    }

    async setFullscreen(enabled) {
        const api = getApi();
        if (api) return api.window.setFullscreen(enabled);
    }

    async setSize(size) {
        const api = getApi();
        if (api) {
            const width = size.width || size;
            const height = size.height || arguments[1];
            return api.window.setSize(width, height);
        }
    }

    async innerSize() {
        const api = getApi();
        if (api) {
            const size = await api.window.getSize();
            return new PhysicalSize(size.width, size.height);
        }
        return new PhysicalSize(window.innerWidth, window.innerHeight);
    }

    async outerSize() {
        return this.innerSize();
    }

    async setPosition(position) {
        const api = getApi();
        if (api) {
            const x = position.x !== undefined ? position.x : position;
            const y = position.y !== undefined ? position.y : arguments[1];
            return api.window.setPosition(x, y);
        }
    }

    async innerPosition() {
        const api = getApi();
        if (api) {
            const pos = await api.window.getPosition();
            return new PhysicalPosition(pos.x, pos.y);
        }
        return new PhysicalPosition(0, 0);
    }

    async outerPosition() {
        return this.innerPosition();
    }

    async setMinSize(size) {
        const api = getApi();
        if (api && size) {
            return api.window.setMinSize(size.width, size.height);
        }
    }

    async setMaxSize(size) {
        const api = getApi();
        if (api && size) {
            return api.window.setMaxSize(size.width, size.height);
        }
    }

    async center() {
        const api = getApi();
        if (api) return api.window.center();
    }

    async setTitle(title) {
        const api = getApi();
        if (api) return api.window.setTitle(title);
        else document.title = title;
    }

    async show() {
        // Window is always visible in WebArcade
        return Promise.resolve();
    }

    async hide() {
        return this.minimize();
    }
}

let windowInstance = null;

export function getCurrentWindow() {
    if (!windowInstance) {
        windowInstance = new WebArcadeWindow();
    }
    return windowInstance;
}

// ==================== Event API ====================

export async function emit(event, payload) {
    const api = getApi();
    if (api) return api.event.emit(event, payload);
}

export async function listen(event, callback) {
    const api = getApi();
    if (api) return api.event.listen(event, callback);
    // Return a no-op unlisten function
    return () => {};
}

export async function once(event, callback) {
    const unlisten = await listen(event, (payload) => {
        unlisten();
        callback(payload);
    });
    return unlisten;
}

// ==================== Core API ====================

export async function invoke(cmd, args) {
    // For commands that need to go to the bridge server
    const response = await fetch(`http://127.0.0.1:3001/api/${cmd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {})
    });
    return response.json();
}

// Export grouped by module (like Tauri does)
export const window = {
    getCurrentWindow,
    WebArcadeWindow
};

export const event = {
    emit,
    listen,
    once
};

export const core = {
    invoke
};

export const dpi = {
    LogicalSize,
    LogicalPosition,
    PhysicalSize,
    PhysicalPosition
};
