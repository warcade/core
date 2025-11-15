import { render } from 'solid-js/web'
import * as SolidJS from 'solid-js'
import * as SolidJSWeb from 'solid-js/web'
import * as SolidJSStore from 'solid-js/store'
import * as TablerIconsSolidJS from '@tabler/icons-solidjs'
import { createPlugin, usePluginAPI, viewportTypes } from './api/plugin'
import { api, BRIDGE_API, WEBARCADE_WS } from './api/bridge'
import App from './App'

// Expose SolidJS globally for runtime plugins
window.SolidJS = SolidJS
window.SolidJSWeb = SolidJSWeb
window.SolidJSStore = SolidJSStore
window.TablerIconsSolidJS = TablerIconsSolidJS

// Expose plugin API globally
window.WebArcadeAPI = {
  createPlugin,
  usePluginAPI,
  viewportTypes,
  api,
  BRIDGE_API,
  WEBARCADE_WS
}

const root = document.getElementById('root')

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.textContent = '')
}

render(() => <App />, root)
