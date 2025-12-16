if(typeof document!=='undefined'){const s=document.createElement('style');s.setAttribute('data-plugin','demo');s.textContent="";document.head.appendChild(s);}
var e=window.SolidJSWeb;e.render,e.hydrate,e.renderToString,e.renderToStream,e.isServer,e.Portal,e.Dynamic;var t=e.template,s=e.insert,a=e.createComponent,n=(e.memo,e.effect),l=e.className,o=(e.classList,e.style,e.spread),r=e.assign,i=(e.setAttribute,e.setAttributeNS,e.addEventListener,e.delegateEvents),c=(e.clearDelegatedEvents,e.setProperty,e.getNextElement,e.getNextMatch,e.getNextMarker,e.runHydrationEvents,e.getHydrationKey,e.Assets,e.HydrationScript,e.NoHydration,e.Hydration,e.ssr,e.ssrClassList,e.ssrStyle,e.ssrSpread,e.ssrElement,e.escape,e.resolveSSRNode,e.use,e.dynamicProperty),d=e.SVGElements;e.setStyleProperty;var p=window.WebArcadeAPI,u=p.plugin;p.createPlugin,p.usePluginAPI,p.viewportTypes,p.pluginAPI,p.panelStore,p.panels,p.activePlugin,p.panelVisibility,p.PANELS,p.horizontalMenuButtonsEnabled,p.footerVisible,p.viewportTabsVisible,p.pluginTabsVisible,p.leftPanelVisible,p.propertiesPanelVisible,p.bottomPanelVisible,p.toolbarVisible,p.fullscreenMode,p.api,p.BRIDGE_API,p.WEBARCADE_WS;var b=window.SolidJS,g=b.createSignal,m=(b.createEffect,b.createMemo,b.createRoot,b.createContext,b.useContext,b.onMount,b.onCleanup,b.onError,b.untrack,b.batch,b.on,b.createDeferred,b.createRenderEffect,b.createComputed,b.createReaction,b.createSelector,b.observable,b.from,b.mapArray,b.indexArray,b.Show),h=b.For,f=(b.Switch,b.Match,b.Index,b.ErrorBoundary,b.Suspense,b.SuspenseList,b.children,b.lazy,b.createResource,b.createUniqueId,b.splitProps);b.mergeProps,b.getOwner,b.runWithOwner,b.DEV,b.enableScheduling,b.enableExternalSource;var x={outline:{xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"},filled:{xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"currentColor",stroke:"none"}},y=Symbol("hyper-element"),v=function(e){function t(){let s=[].slice.call(arguments),a,n=[],l=!1;for(;Array.isArray(s[0]);)s=s[0];s[0][y]&&s.unshift(t.Fragment),"string"==typeof s[0]&&function e(t){for(let s=1;s<t.length;s++)if("function"==typeof t[s]){l=!0;return}else Array.isArray(t[s])&&e(t[s])}(s);let o=()=>{for(;s.length;)!function t(o){let r=typeof o;if(null!=o){if("string"===r)a?a.appendChild(document.createTextNode(o)):function(t){let s=t.split(/([\.#]?[^\s#.]+)/);/^\.|#/.test(s[1])&&(a=document.createElement("div"));for(let t=0;t<s.length;t++){let l=s[t],o=l.substring(1,l.length);l&&(a?"."===l[0]?n.push(o):"#"===l[0]&&a.setAttribute("id",o):a=e.SVGElements.has(l)?document.createElementNS("http://www.w3.org/2000/svg",l):document.createElement(l))}}(o);else if("number"===r||"boolean"===r||"bigint"===r||"symbol"===r||o instanceof Date||o instanceof RegExp)a.appendChild(document.createTextNode(o.toString()));else if(Array.isArray(o))for(let e=0;e<o.length;e++)t(o[e]);else if(o instanceof Element)e.insert(a,o,l?null:void 0);else if("object"===r){let t=!1,l=Object.getOwnPropertyDescriptors(o);for(let s in l){if("class"===s&&0!==n.length){let e=n.join(" "),t="function"==typeof l.class.value?()=>e+" "+l.class.value():e+" "+o.class;Object.defineProperty(o,"class",{...l[s],value:t}),n=[]}"ref"!==s&&"on"!==s.slice(0,2)&&"function"==typeof l[s].value?(e.dynamicProperty(o,s),t=!0):l[s].get&&(t=!0)}t?e.spread(a,o,a instanceof SVGElement,!!s.length):e.assign(a,o,a instanceof SVGElement,!!s.length)}else if("function"===r)if(a){for(;o[y];)o=o();e.insert(a,o,l?null:void 0)}else{let t,n=s[0];null!=n&&("object"!=typeof n||Array.isArray(n)||n instanceof Element)||(t=s.shift()),t||(t={}),s.length&&(t.children=s.length>1?s:s[0]);let l=Object.getOwnPropertyDescriptors(t);for(let s in l)if(Array.isArray(l[s].value)){let a=l[s].value;t[s]=()=>{for(let e=0;e<a.length;e++)for(;a[e][y];)a[e]=a[e]();return a},e.dynamicProperty(t,s)}else"function"!=typeof l[s].value||l[s].value.length||e.dynamicProperty(t,s);a=e.createComponent(o,t),s=[]}}}(s.shift());return a instanceof Element&&n.length&&a.classList.add(...n),a};return o[y]=!0,o}return t.Fragment=e=>e.children,t}({spread:o,assign:r,insert:s,createComponent:a,dynamicProperty:c,SVGElements:d}),w=(e,t,s,a)=>{let n=s=>{let[n,l]=f(s,["color","size","stroke","title","children","class"]),o=x[e];return v("svg",[{...o,width:()=>null!=n.size?n.size:o.width,height:()=>null!=n.size?n.size:o.height,title:()=>null!=n.title?n.title:void 0,..."filled"===e?{fill:()=>null!=n.color?n.color:"currentColor"}:{stroke:()=>null!=n.color?n.color:"currentColor","stroke-width":()=>null!=n.stroke?n.stroke:o["stroke-width"]},class:()=>`tabler-icon tabler-icon-${t} ${null!=n.class?n.class:""}`},l],[n.title&&v("title",{},n.title),...a.map(([e,t])=>v(e,t)),n.children])};return n.displayName=`${s}`,n},S=w("outline","book","Book",[["path",{d:"M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"}],["path",{d:"M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"}],["path",{d:"M3 6l0 13"}],["path",{d:"M12 6l0 13"}],["path",{d:"M21 6l0 13"}]]),C=w("outline","brand-github","BrandGithub",[["path",{d:"M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"}]]),M=w("outline","code","Code",[["path",{d:"M7 8l-4 4l4 4"}],["path",{d:"M17 8l4 4l-4 4"}],["path",{d:"M14 4l-4 16"}]]),P=w("outline","components","Components",[["path",{d:"M3 12l3 3l3 -3l-3 -3z"}],["path",{d:"M15 12l3 3l3 -3l-3 -3z"}],["path",{d:"M9 6l3 3l3 -3l-3 -3z"}],["path",{d:"M9 18l3 3l3 -3l-3 -3z"}]]),k=w("outline","layout","Layout",[["path",{d:"M4 4m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v1a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"}],["path",{d:"M4 13m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"}],["path",{d:"M14 4m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"}]]),A=w("outline","server","Server",[["path",{d:"M3 4m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"}],["path",{d:"M3 12m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"}],["path",{d:"M7 8l0 .01"}],["path",{d:"M7 16l0 .01"}]]),E=t('<div class="h-full flex flex-col bg-base-200 border-r border-base-300"><div class="p-3 border-b border-base-300"><h2 class="font-bold text-sm">Getting Started</h2></div><nav class="flex-1 p-2">'),R=t("<button><span>"),T=t('<div class="h-full flex items-center justify-center p-8"><div class="max-w-lg text-center"><h1 class="text-4xl font-bold mb-4">Welcome to WebArcade</h1><p class="text-base-content/70 mb-8">A plugin-first framework for building desktop applications with web technologies.</p><div class="flex flex-col gap-3"><a href=https://warcade.github.io/docs/ target=_blank class="btn btn-primary gap-2">Read the Documentation</a><a href=https://github.com/warcade/core target=_blank class="btn btn-outline gap-2">View on GitHub</a></div><p class="mt-8 text-xs text-base-content/40">Remove this demo by deleting <code class=text-base-content/60>plugins/demo</code> and <code class=text-base-content/60>src/layouts/WelcomeLayout.jsx'),L=t('<div class="h-full overflow-auto p-6"><h1 class="text-2xl font-bold mb-6">UI Components</h1><p class="text-base-content/70 mb-8">WebArcade includes 50+ pre-built UI components based on DaisyUI. Here are some examples:</p><div class="grid gap-8"><section><h2 class="text-lg font-semibold mb-3">Buttons</h2><div class="flex flex-wrap gap-2"><button class="btn btn-primary">Primary</button><button class="btn btn-secondary">Secondary</button><button class="btn btn-accent">Accent</button><button class="btn btn-ghost">Ghost</button><button class="btn btn-outline">Outline</button></div></section><section><h2 class="text-lg font-semibold mb-3">Badges</h2><div class="flex flex-wrap gap-2"><span class=badge>Default</span><span class="badge badge-primary">Primary</span><span class="badge badge-secondary">Secondary</span><span class="badge badge-accent">Accent</span><span class="badge badge-success">Success</span><span class="badge badge-warning">Warning</span><span class="badge badge-error">Error</span></div></section><section><h2 class="text-lg font-semibold mb-3">Interactive</h2><div class="flex flex-wrap items-center gap-4"><div class="flex items-center gap-2"><button class="btn btn-sm">-</button><span class="text-xl font-mono w-12 text-center"></span><button class="btn btn-sm">+</button></div><label class="flex items-center gap-2 cursor-pointer"><input type=checkbox class="checkbox checkbox-primary"><span>Checkbox</span></label><label class="flex items-center gap-2 cursor-pointer"><input type=checkbox class="toggle toggle-primary"><span>Toggle</span></label></div></section><section><h2 class="text-lg font-semibold mb-3">Range: </h2><input type=range class="range range-primary w-full max-w-xs"min=0 max=100></section><section><h2 class="text-lg font-semibold mb-3">Cards</h2><div class="flex gap-4"><div class="card bg-base-100 shadow-md w-64"><div class=card-body><h3 class=card-title>Card Title</h3><p class="text-sm text-base-content/70">Card content goes here.</p><div class="card-actions justify-end"><button class="btn btn-primary btn-sm">Action</button></div></div></div></div></section><section><h2 class="text-lg font-semibold mb-3">Alerts</h2><div class="flex flex-col gap-2 max-w-md"><div class="alert alert-info"><span>Info alert message</span></div><div class="alert alert-success"><span>Success alert message</span></div><div class="alert alert-warning"><span>Warning alert message</span></div><div class="alert alert-error"><span>Error alert message</span></div></div></section><section><h2 class="text-lg font-semibold mb-3">Loading</h2><div class="flex gap-4"><span class="loading loading-spinner loading-md"></span><span class="loading loading-dots loading-md"></span><span class="loading loading-ring loading-md"></span><span class="loading loading-bars loading-md"></span></div></section><section><h2 class="text-lg font-semibold mb-3">Progress</h2><div class="flex flex-col gap-2 max-w-xs"><progress class="progress progress-primary"value=25 max=100></progress><progress class="progress progress-secondary"value=50 max=100></progress><progress class="progress progress-accent"value=75 max=100>'),z=t(`<div class="h-full overflow-auto p-6"><h1 class="text-2xl font-bold mb-6">Create a Plugin</h1><p class="text-base-content/70 mb-8">Plugins are the building blocks of WebArcade. Here's how to create one:</p><div class=space-y-8><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">1</span>Create the plugin file</h2><p class="text-sm text-base-content/70 mb-3">Create a new folder in <code class="bg-base-300 px-1 rounded">plugins/</code> with an <code class="bg-base-300 px-1 rounded">index.jsx</code> file:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>// plugins/my-plugin/index.jsx
import { plugin } from '@/api/plugin';

function MyPanel() {
    return (
        &lt;div class="p-4">
            &lt;h1>Hello from my plugin!&lt;/h1>
        &lt;/div>
    );
}

export default plugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',

    start(api) {
        // Register a panel
        api.register('my-panel', {
            type: 'panel',
            component: MyPanel,
            label: 'My Panel'
        });
    },

    stop() {}
});</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">2</span>Register components</h2><p class="text-sm text-base-content/70 mb-3">Use <code class="bg-base-300 px-1 rounded">api.register()</code> to add panels, toolbar buttons, menus, and status items:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>// Panel
api.register('my-panel', {
    type: 'panel',
    component: MyPanel,
    label: 'My Panel'
});

// Toolbar button
api.register('my-button', {
    type: 'toolbar',
    icon: IconStar,
    tooltip: 'Do something',
    onClick: () => console.log('Clicked!')
});

// Menu
api.register('my-menu', {
    type: 'menu',
    label: 'My Menu',
    submenu: [
        { label: 'Option 1', action: () => {} },
        { label: 'Option 2', action: () => {} }
    ]
});

// Status bar item
api.register('my-status', {
    type: 'status',
    component: () => &lt;span>Ready&lt;/span>,
    align: 'right'
});</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">3</span>Build and test</h2><p class="text-sm text-base-content/70 mb-3">Build your plugin and run the app:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code># Build the plugin
webarcade build my-plugin

# Or rebuild everything
bun run build`),j=t(`<div class="h-full overflow-auto p-6"><h1 class="text-2xl font-bold mb-6">Create a Layout</h1><p class="text-base-content/70 mb-8">Layouts define the structure of your application. They use the <code class="bg-base-300 px-1 rounded">use</code> prop to inject plugin components.</p><div class=space-y-8><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">1</span>Create a layout component</h2><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>// src/layouts/MyLayout.jsx
import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, Footer, DragRegion, WindowControls } from '@/components/ui';

export function MyLayout() {
    return (
        &lt;Column class="h-screen bg-base-100">
            {/* Toolbar with plugin buttons */}
            &lt;Toolbar use={['my-plugin:my-button']}>
                &lt;DragRegion class="flex-1 h-full" />
                &lt;WindowControls />
            &lt;/Toolbar>

            {/* Main content area */}
            &lt;Row flex={1}>
                {/* Resizable sidebar */}
                &lt;Resizable direction="horizontal" side="end" defaultSize={250}>
                    &lt;Slot
                        name="sidebar"
                        use={['my-plugin:my-panel']}
                    />
                &lt;/Resizable>

                {/* Main viewport */}
                &lt;Slot
                    name="main"
                    flex={1}
                    use={['other-plugin:viewport']}
                />
            &lt;/Row>

            {/* Footer with status items */}
            &lt;Footer use={['my-plugin:my-status']} />
        &lt;/Column>
    );
}</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">2</span>Register the layout</h2><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>// src/layouts/index.jsx
import { layoutManager } from '@/api/layout';
import { MyLayout } from './MyLayout';

export function registerLayouts() {
    layoutManager.register('my-layout', {
        name: 'My Layout',
        description: 'Custom layout',
        component: MyLayout,
        icon: 'dashboard'
    });
}

export { MyLayout };</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">3</span>The magic of <code class="bg-base-300 px-1 rounded">use</code></h2><p class="text-sm text-base-content/70 mb-3">The <code class="bg-base-300 px-1 rounded">use</code> prop connects layouts to plugins. Format: <code class="bg-base-300 px-1 rounded">plugin-id:component-id</code></p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{/* Single component */}
&lt;Slot use={['demo:welcome']} />

{/* Multiple components (creates tabs) */}
&lt;Slot use={[
    'editor:code',
    'editor:preview',
    'terminal:console'
]} />

{/* Toolbar buttons from multiple plugins */}
&lt;Toolbar use={[
    'file:save-button',
    'edit:undo-button',
    'view:zoom-controls'
]} /></code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">4</span>Layout tab bar</h2><p class="text-sm text-base-content/70 mb-3">Add a horizontal tab bar to switch between layouts:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>import { LayoutTabs } from '@/components/ui';

// Basic usage
&lt;LayoutTabs />

// With add button
&lt;LayoutTabs
    showAdd={true}
    onAdd={() => createNewLayout()}
/>

// With close buttons
&lt;LayoutTabs
    closable={true}
    onClose={(id) => layoutManager.unregister(id)}
/>`),H=t(`<div class="h-full overflow-auto p-6"><h1 class="text-2xl font-bold mb-6">Backend Plugins</h1><p class="text-base-content/70 mb-8">Full-stack plugins combine a SolidJS frontend with a Rust backend for performance-critical tasks. The CLI handles all the configuration automatically.</p><div class=space-y-8><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">1</span>Plugin structure</h2><p class="text-sm text-base-content/70 mb-3">A full-stack plugin contains these files:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>plugins/my-plugin/
\u251C\u2500\u2500 index.jsx      # Frontend UI
\u251C\u2500\u2500 Cargo.toml     # Routes &amp; dependencies
\u251C\u2500\u2500 mod.rs         # Plugin metadata
\u2514\u2500\u2500 router.rs      # HTTP handlers</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">2</span>Define routes in Cargo.toml</h2><p class="text-sm text-base-content/70 mb-3">Map HTTP endpoints to handler functions:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>[routes]
"GET /hello" = "handle_hello"
"POST /users" = "handle_create_user"
"GET /users/:id" = "handle_get_user"
"PUT /todos/:id/toggle" = "handle_toggle"</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">3</span>Write handlers in router.rs</h2><p class="text-sm text-base-content/70 mb-3">Async functions that receive <code class="bg-base-300 px-1 rounded">HttpRequest</code> and return <code class="bg-base-300 px-1 rounded">HttpResponse</code>:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>pub async fn handle_hello(_req: HttpRequest) -> HttpResponse {
    json_response(&amp;json!({
        "message": "Hello from Rust!"
    }))
}

pub async fn handle_get_user(req: HttpRequest) -> HttpResponse {
    let id = req.path_params.get("id").unwrap();
    // ... fetch user
    json_response(&amp;user)
}

pub async fn handle_create_user(req: HttpRequest) -> HttpResponse {
    let body: CreateUser = req.body_json().unwrap();
    // ... create user
    json_response(&amp;new_user)
}</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">4</span>Call from frontend</h2><p class="text-sm text-base-content/70 mb-3">Use the <code class="bg-base-300 px-1 rounded">api()</code> helper to call your backend:</p><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>import { api } from '@/api/plugin';

// GET request
const res = await api('my-plugin/hello');
const data = await res.json();

// POST request
const res = await api('my-plugin/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'John' })
});</code></pre></section><section><h2 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="badge badge-primary">5</span>Build</h2><pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>webarcade build my-plugin</code></pre><p class="text-sm text-base-content/70 mt-3">This compiles the Rust backend and bundles the JS frontend.`),W=t('<div class="h-full bg-base-100">'),[_,B]=g("welcome"),D=[{id:"welcome",label:"Welcome",icon:S},{id:"components",label:"UI Components",icon:P},{id:"plugin-tutorial",label:"Create a Plugin",icon:M},{id:"layout-tutorial",label:"Create a Layout",icon:k},{id:"backend-tutorial",label:"Backend Plugins",icon:A}];function I(){var e;return s((e=E()).firstChild.nextSibling,a(h,{each:D,children:e=>{var t,o;return o=(t=R()).firstChild,t.$$click=()=>B(e.id),s(t,a(e.icon,{size:16}),o),s(o,()=>e.label),n(()=>l(t,`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${_()===e.id?"bg-primary text-primary-content":"hover:bg-base-300"}`)),t}})),e}function G(){var e,t,n,l,o;return n=(t=(e=T()).firstChild.firstChild.nextSibling.nextSibling.firstChild).firstChild,o=(l=t.nextSibling).firstChild,s(t,a(S,{size:18}),n),s(l,a(C,{size:18}),o),e}function N(){var e,t,a,l,o,r,i,c,d,p,u;let[b,m]=g(0),[h,f]=g(!1),[x,y]=g(50);return r=(o=(l=(a=(t=(e=L()).firstChild.nextSibling.nextSibling.firstChild.nextSibling.nextSibling).firstChild.nextSibling.firstChild).firstChild).nextSibling).nextSibling,c=(i=a.nextSibling).firstChild,d=i.nextSibling.firstChild,(p=t.nextSibling.firstChild).firstChild,u=p.nextSibling,l.$$click=()=>m(e=>e-1),s(o,b),r.$$click=()=>m(e=>e+1),c.addEventListener("change",e=>f(e.target.checked)),d.addEventListener("change",e=>f(e.target.checked)),s(p,x,null),u.$$input=e=>y(parseInt(e.target.value)),n(()=>c.checked=h()),n(()=>d.checked=h()),n(()=>u.value=x()),e}function O(){return z()}function V(){return j()}function q(){return H()}function $(){var e;return s(e=W(),a(m,{get when(){return"welcome"===_()},get children(){return a(G,{})}}),null),s(e,a(m,{get when(){return"components"===_()},get children(){return a(N,{})}}),null),s(e,a(m,{get when(){return"plugin-tutorial"===_()},get children(){return a(O,{})}}),null),s(e,a(m,{get when(){return"layout-tutorial"===_()},get children(){return a(V,{})}}),null),s(e,a(m,{get when(){return"backend-tutorial"===_()},get children(){return a(q,{})}}),null),e}var U=u({id:"demo",name:"Welcome",version:"1.0.0",description:"Welcome screen and tutorials for WebArcade",author:"WebArcade",start(e){e.register("sidebar",{type:"panel",component:I,label:"Navigation"}),e.register("content",{type:"panel",component:$,label:"Content"}),e.register("help-menu",{type:"menu",label:"Help",order:100,submenu:[{label:"Documentation",action:()=>window.open("https://warcade.github.io/docs/")},{label:"GitHub",action:()=>window.open("https://github.com/warcade/core")}]})},stop(){}});i(["click","input"]);export{U as default};