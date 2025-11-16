import { createSignal, onMount, onCleanup, createEffect, untrack } from 'solid-js';
import loader from '@monaco-editor/loader';
import { keyboardShortcuts } from '@/components/KeyboardShortcuts';
import { editorStore } from '@/layout/stores/EditorStore.jsx';
import PowerMode from '@/components/PowerMode';

function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  height = '100%',
  width = '100%',
  options = {},
  onMount: onMountCallback
}) {
  const [editor, setEditor] = createSignal(null);
  let containerRef = null;
  let powerModeInstance = null;
  let powerModeDisposable = null;

  const defaultOptions = {
    automaticLayout: true,
    fontSize: 14,
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    renderWhitespace: 'boundary',
    // Disable keyboard shortcuts that might conflict with app shortcuts
    multiCursorModifier: 'ctrlCmd',
    wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
    ...options
  };

  const scriptingKeywords = [
    // Renzora Engine API
    'Engine', 'Scene', 'Camera', 'Light', 'Mesh', 'Material', 'Texture',
    'Vector3', 'Quaternion', 'Matrix', 'Color3', 'Color4',
    'PhysicsEngine', 'Animation', 'ActionManager',
    'createBox', 'createSphere', 'createGround', 'createPlane',
    'loadMesh', 'loadTexture', 'loadAnimation',
    'setPosition', 'setRotation', 'setScale', 'setVisible',
    'getPosition', 'getRotation', 'getScale', 'isVisible',
    'addLight', 'addCamera', 'addMesh', 'removeMesh',
    'playAnimation', 'stopAnimation', 'pauseAnimation',
    'onPointerDown', 'onPointerUp', 'onPointerMove',
    'onKeyDown', 'onKeyUp', 'onCollision',
    'registerBeforeRender', 'unregisterBeforeRender',
    'dispose', 'clone', 'intersectsMesh'
  ];


  const configureTypeScript = (monaco) => {
    // Configure TypeScript/JavaScript compiler options for ES6+ and JSX
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      reactNamespace: 'React',
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      reactNamespace: 'React',
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      lib: ['es2020', 'dom', 'dom.iterable'],
    });

    // Enable diagnostic features with JSX-friendly settings
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,  // Disable semantic validation to avoid false errors
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        1108, // Return statement can only be used within a function body
        1375, // 'await' expressions are only allowed at the top level of a file
        2307, // Cannot find module
        2304, // Cannot find name
        2552, // Cannot find name. Did you mean...?
        2339, // Property does not exist on type
        2769, // No overload matches this call
        2571, // Object is of type 'unknown'
        6133, // Variable is declared but never used
        7016, // Could not find a declaration file for module
        7026, // JSX element implicitly has type 'any'
        7031, // Binding element implicitly has an 'any' type
      ]
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,  // Disable semantic validation to avoid false errors
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        2307, // Cannot find module
        2304, // Cannot find name
        2552, // Cannot find name. Did you mean...?
        2339, // Property does not exist on type
        2769, // No overload matches this call
        6133, // Variable is declared but never used
        7016, // Could not find a declaration file for module
        7026, // JSX element implicitly has type 'any'
        7031, // Binding element implicitly has an 'any' type
      ]
    });

    // Add type definitions for common libraries
    const solidJSTypes = `
      declare module 'solid-js' {
        export function createSignal<T>(initialValue: T): [() => T, (v: T) => void];
        export function createEffect(fn: () => void): void;
        export function createMemo<T>(fn: () => T): () => T;
        export function onMount(fn: () => void): void;
        export function onCleanup(fn: () => void): void;
        export function Show(props: { when: any; fallback?: any; children: any }): any;
        export function For<T>(props: { each: T[]; fallback?: any; children: (item: T, index: () => number) => any }): any;
        export function Switch(props: { fallback?: any; children: any }): any;
        export function Match(props: { when: any; children: any }): any;
        export function Index<T>(props: { each: T[]; fallback?: any; children: (item: () => T, index: number) => any }): any;
      }
      declare module 'solid-js/web' {
        export function render(code: () => any, element: HTMLElement): void;
      }
    `;

    // Add basic JSX type definitions to help Monaco understand JSX syntax
    const jsxTypes = `
      declare namespace JSX {
        interface IntrinsicElements {
          [elemName: string]: any;
        }
        interface Element extends HTMLElement {}
        interface ElementClass {
          render: any;
        }
        interface ElementAttributesProperty {
          props: {};
        }
        interface ElementChildrenAttribute {
          children: {};
        }
      }

      // Global HTML element interfaces
      interface HTMLAttributes {
        class?: string;
        className?: string;
        style?: any;
        id?: string;
        onClick?: (e: any) => void;
        onChange?: (e: any) => void;
        onInput?: (e: any) => void;
        [key: string]: any;
      }
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(solidJSTypes, 'ts:solid-js.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(solidJSTypes, 'ts:solid-js.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(jsxTypes, 'ts:jsx-runtime.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(jsxTypes, 'ts:jsx-runtime.d.ts');
  };

  const registerRustCompletions = (monaco) => {
    const rustCompletions = [
      // Core API imports and modules
      {
        label: 'use api::core::*',
        kind: monaco.languages.CompletionItemKind.Module,
        documentation: 'Import all WebArcade core API types and utilities',
        insertText: 'use api::core::*;',
        sortText: '0000'
      },
      {
        label: 'use api::prelude::*',
        kind: monaco.languages.CompletionItemKind.Module,
        documentation: 'Import WebArcade prelude (all commonly used items)',
        insertText: 'use api::prelude::*;',
        sortText: '0001'
      },
      // Plugin trait implementation
      {
        label: 'plugin_metadata!',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Define plugin metadata macro',
        insertText: 'plugin_metadata!(\n\t"${1:plugin-id}",\n\t"${2:Plugin Name}",\n\t"${3:1.0.0}",\n\t"${4:Description}",\n\tauthor: "${5:Author}"\n);',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0002'
      },
      {
        label: 'impl Plugin',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Implement Plugin trait for a struct',
        insertText: '#[async_trait]\nimpl Plugin for ${1:MyPlugin} {\n\tplugin_metadata!(\n\t\t"${2:plugin-id}",\n\t\t"${3:Plugin Name}",\n\t\t"${4:1.0.0}",\n\t\t"${5:Description}",\n\t\tauthor: "${6:Author}"\n\t);\n\n\tasync fn init(&self, ctx: &Context) -> Result<()> {\n\t\tlog::info!("[${3}] Initializing");\n\t\t${7}\n\t\tOk(())\n\t}\n\n\tasync fn start(&self, _ctx: Arc<Context>) -> Result<()> {\n\t\tlog::info!("[${3}] Started");\n\t\tOk(())\n\t}\n\n\tasync fn stop(&self) -> Result<()> {\n\t\tlog::info!("[${3}] Stopped");\n\t\tOk(())\n\t}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0003'
      },
      // Router and routes
      {
        label: 'register_routes',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a route registration function',
        insertText: 'pub async fn register_routes(ctx: &Context) -> Result<()> {\n\tlet mut router = Router::new();\n\n\troute!(router, GET "/${1:path}" => ${2:handler_name});\n\n\tctx.register_router("${3:plugin-id}", router).await;\n\tOk(())\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0004'
      },
      {
        label: 'route! GET',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Register a GET route',
        insertText: 'route!(router, GET "/${1:path}" => ${2:handler});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0005'
      },
      {
        label: 'route! POST',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Register a POST route',
        insertText: 'route!(router, POST "/${1:path}" => ${2:handler});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0006'
      },
      {
        label: 'route! PUT',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Register a PUT route',
        insertText: 'route!(router, PUT "/${1:path}" => ${2:handler});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0007'
      },
      {
        label: 'route! DELETE',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Register a DELETE route',
        insertText: 'route!(router, DELETE "/${1:path}" => ${2:handler});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0008'
      },
      // Handler functions
      {
        label: 'async handler',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Create an async HTTP handler function',
        insertText: 'async fn ${1:handle_request}() -> HttpResponse {\n\tlet response = json!({\n\t\t"${2:key}": "${3:value}"\n\t});\n\tjson_response(&response)\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0009'
      },
      {
        label: 'async handler with body',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Create an async HTTP handler with request body',
        insertText: 'async fn ${1:handle_request}(body: String) -> HttpResponse {\n\tmatch serde_json::from_str::<${2:RequestType}>(&body) {\n\t\tOk(req) => {\n\t\t\t${3}\n\t\t\tjson_response(&json!({ "status": "ok" }))\n\t\t}\n\t\tErr(e) => error_response(StatusCode::BAD_REQUEST, &format!("Invalid JSON: {}", e))\n\t}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0010'
      },
      // JSON operations
      {
        label: 'json!',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Create a JSON value',
        insertText: 'json!({\n\t"${1:key}": ${2:value}\n})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0011'
      },
      {
        label: 'json_response',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Return a JSON HTTP response',
        insertText: 'json_response(&${1:data})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0012'
      },
      {
        label: 'error_response',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Return an error HTTP response',
        insertText: 'error_response(StatusCode::${1:BAD_REQUEST}, "${2:Error message}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0013'
      },
      {
        label: 'JsonBuilder',
        kind: monaco.languages.CompletionItemKind.Class,
        documentation: 'Build JSON objects fluently',
        insertText: 'JsonBuilder::object()\n\t.field("${1:key}", ${2:value})\n\t.build()',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0014'
      },
      {
        label: 'Json::parse',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Parse JSON string into Value',
        insertText: 'Json::parse(${1:json_str})?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0015'
      },
      // CSV/INI/Template utilities
      {
        label: 'Csv::parse',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Parse CSV string into rows',
        insertText: 'Csv::parse(${1:csv_text})?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0016'
      },
      {
        label: 'Csv::parse_with_headers',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Parse CSV with headers into HashMaps',
        insertText: 'Csv::parse_with_headers(${1:csv_text})?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0017'
      },
      {
        label: 'Ini::parse',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Parse INI/Config file',
        insertText: 'Ini::parse(${1:ini_text})?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0018'
      },
      {
        label: 'Template::render',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Render template with variables',
        insertText: 'Template::render("${1:Hello {{name}}!}", &${2:vars})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0019'
      },
      {
        label: 'QueryString::parse',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Parse URL query string',
        insertText: 'QueryString::parse("${1:key=value&foo=bar}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0020'
      },
      {
        label: 'QueryBuilder',
        kind: monaco.languages.CompletionItemKind.Class,
        documentation: 'Build query strings fluently',
        insertText: 'QueryBuilder::new()\n\t.param("${1:key}", "${2:value}")\n\t.build()',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0021'
      },
      // Validation
      {
        label: 'Email::is_valid',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Validate email address',
        insertText: 'Email::is_valid("${1:email@example.com}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0022'
      },
      {
        label: 'Password::validate',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Validate password strength',
        insertText: 'Password::validate("${1:password}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0023'
      },
      {
        label: 'Url::is_valid',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Validate URL format',
        insertText: 'Url::is_valid("${1:https://example.com}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0024'
      },
      // Text manipulation
      {
        label: 'Text::slugify',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Convert string to URL-safe slug',
        insertText: 'Text::slugify("${1:Hello World}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0025'
      },
      {
        label: 'Text::truncate',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Truncate string with ellipsis',
        insertText: 'Text::truncate("${1:long text}", ${2:max_len})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0026'
      },
      {
        label: 'Text::to_camel_case',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Convert to camelCase',
        insertText: 'Text::to_camel_case("${1:snake_case}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0027'
      },
      // Crypto
      {
        label: 'Uuid::v4',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Generate a random UUID v4',
        insertText: 'Uuid::v4()',
        sortText: '0028'
      },
      {
        label: 'Token::api_key',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Generate a random API key',
        insertText: 'Token::api_key()',
        sortText: '0029'
      },
      {
        label: 'Random::bytes',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Generate random bytes',
        insertText: 'Random::bytes(${1:32})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0030'
      },
      // Encoding
      {
        label: 'Base64::encode',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Encode bytes to Base64',
        insertText: 'Base64::encode(${1:bytes})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0031'
      },
      {
        label: 'Base64::decode',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Decode Base64 to bytes',
        insertText: 'Base64::decode("${1:base64_string}")?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0032'
      },
      {
        label: 'Hex::encode',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Encode bytes to hex string',
        insertText: 'Hex::encode(${1:bytes})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0033'
      },
      // File system
      {
        label: 'Fs::read_string',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Read file content as string',
        insertText: 'Fs::read_string("${1:path}")?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0034'
      },
      {
        label: 'Fs::write_string',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Write string to file',
        insertText: 'Fs::write_string("${1:path}", "${2:content}")?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0035'
      },
      {
        label: 'Fs::exists',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Check if file exists',
        insertText: 'Fs::exists("${1:path}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0036'
      },
      {
        label: 'Fs::metadata',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Get file metadata (size, timestamps)',
        insertText: 'Fs::metadata("${1:path}")?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0037'
      },
      {
        label: 'Path::webarcade_data',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Get WebArcade data directory path',
        insertText: 'Path::webarcade_data()?',
        sortText: '0038'
      },
      {
        label: 'Path::join',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Join path segments',
        insertText: 'Path::join("${1:base}", &["${2:segment}"])',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0039'
      },
      // Collections
      {
        label: 'LruCache::new',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create an LRU cache with capacity',
        insertText: 'LruCache::new(${1:100})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0040'
      },
      {
        label: 'RingBuffer::new',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a circular buffer',
        insertText: 'RingBuffer::new(${1:10})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0041'
      },
      {
        label: 'Counter::new',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a counter for tracking occurrences',
        insertText: 'Counter::new()',
        sortText: '0042'
      },
      // Error handling
      {
        label: 'WaError::not_found',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a not found error',
        insertText: 'WaError::not_found("${1:Resource not found}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0043'
      },
      {
        label: 'WaError::validation',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a validation error',
        insertText: 'WaError::validation("${1:Invalid input}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0044'
      },
      // Regex
      {
        label: 'Re::is_match',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Test if pattern matches text',
        insertText: 'Re::is_match(r"${1:\\\\d+}", "${2:text}")?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0045'
      },
      {
        label: 'Re::replace_all',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Replace all pattern matches',
        insertText: 'Re::replace_all(r"${1:pattern}", "${2:text}", "${3:replacement}")?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0046'
      },
      // MIME
      {
        label: 'Mime::from_filename',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Get MIME type from filename',
        insertText: 'Mime::from_filename("${1:file.pdf}")',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0047'
      },
      // HTTP Fetch
      {
        label: 'Fetch::get',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a GET request',
        insertText: 'Fetch::get("${1:https://api.example.com}")\n\t.send()\n\t.await?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0048'
      },
      {
        label: 'Fetch::post',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a POST request',
        insertText: 'Fetch::post("${1:https://api.example.com}")\n\t.json(&${2:data})\n\t.send()\n\t.await?',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0049'
      },
      // Time
      {
        label: 'time::timestamp',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Get current Unix timestamp (seconds)',
        insertText: 'time::timestamp()',
        sortText: '0050'
      },
      {
        label: 'time::timestamp_millis',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Get current Unix timestamp (milliseconds)',
        insertText: 'time::timestamp_millis()',
        sortText: '0051'
      },
      // Logging
      {
        label: 'log::info!',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Log info message',
        insertText: 'log::info!("[${1:Plugin}] ${2:message}");',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0052'
      },
      {
        label: 'log::error!',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Log error message',
        insertText: 'log::error!("[${1:Plugin}] ${2:error}");',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0053'
      },
      {
        label: 'log::warn!',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Log warning message',
        insertText: 'log::warn!("[${1:Plugin}] ${2:warning}");',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0054'
      },
      // Database
      {
        label: 'ctx.migrate',
        kind: monaco.languages.CompletionItemKind.Method,
        documentation: 'Run database migrations',
        insertText: 'ctx.migrate(&[\n\tr"\n\t\tCREATE TABLE IF NOT EXISTS ${1:table_name} (\n\t\t\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\t\t${2:column} ${3:TEXT NOT NULL},\n\t\t\tcreated_at INTEGER NOT NULL\n\t\t)\n\t",\n])?;',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0055'
      },
      {
        label: 'ctx.emit',
        kind: monaco.languages.CompletionItemKind.Method,
        documentation: 'Emit an event to WebSocket',
        insertText: 'ctx.emit("${1:event_name}", json!({\n\t"${2:key}": ${3:value}\n})).await;',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0056'
      },
      // Derive macros
      {
        label: '#[derive(Serialize, Deserialize)]',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Add serde serialization derives',
        insertText: '#[derive(Serialize, Deserialize)]\nstruct ${1:Name} {\n\t${2:field}: ${3:String},\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0057'
      },
      {
        label: '#[async_trait]',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Add async trait macro',
        insertText: '#[async_trait]',
        sortText: '0058'
      },
    ];

    // Register completion provider for Rust
    monaco.languages.registerCompletionItemProvider('rust', {
      triggerCharacters: ['.', ':', ' ', '!'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions = rustCompletions.map(suggestion => ({
          ...suggestion,
          range
        }));

        return { suggestions };
      }
    });

    // Add Rust diagnostics for common WebArcade API issues
    const validateRustCode = (model) => {
      const content = model.getValue();
      const markers = [];

      // Check for common WebArcade API issues
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // Check for missing Result handling
        if (line.includes('.await') && !line.includes('?') && !line.includes('match ') && !line.includes('unwrap')) {
          if (!line.trim().startsWith('//')) {
            markers.push({
              severity: monaco.MarkerSeverity.Warning,
              message: 'Consider handling Result with ? operator or match',
              startLineNumber: lineNumber,
              startColumn: line.indexOf('.await') + 1,
              endLineNumber: lineNumber,
              endColumn: line.indexOf('.await') + 7
            });
          }
        }

        // Check for deprecated API usage
        if (line.includes('json_response(') && !line.includes('&')) {
          const pos = line.indexOf('json_response(');
          const closePos = line.indexOf(')', pos);
          if (closePos > pos && !line.substring(pos, closePos).includes('&')) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              message: 'json_response requires a reference (&) to the data',
              startLineNumber: lineNumber,
              startColumn: pos + 14,
              endLineNumber: lineNumber,
              endColumn: closePos + 1
            });
          }
        }

        // Check for missing imports
        if (line.includes('JsonBuilder::') && !content.includes('use api::core::*') && !content.includes('JsonBuilder')) {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: 'JsonBuilder not imported. Add: use api::core::*;',
            startLineNumber: lineNumber,
            startColumn: line.indexOf('JsonBuilder') + 1,
            endLineNumber: lineNumber,
            endColumn: line.indexOf('JsonBuilder') + 12
          });
        }

        // Check for incorrect route! macro syntax
        const routeMatch = line.match(/route!\s*\(\s*router\s*,\s*(\w+)\s+"([^"]+)"/);
        if (routeMatch) {
          const method = routeMatch[1];
          const path = routeMatch[2];

          if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              message: `Invalid HTTP method: ${method}. Use GET, POST, PUT, DELETE, PATCH, HEAD, or OPTIONS`,
              startLineNumber: lineNumber,
              startColumn: line.indexOf(method) + 1,
              endLineNumber: lineNumber,
              endColumn: line.indexOf(method) + method.length + 1
            });
          }

          if (!path.startsWith('/')) {
            markers.push({
              severity: monaco.MarkerSeverity.Warning,
              message: 'Route path should start with /',
              startLineNumber: lineNumber,
              startColumn: line.indexOf('"' + path) + 2,
              endLineNumber: lineNumber,
              endColumn: line.indexOf('"' + path) + path.length + 2
            });
          }
        }

        // Check for async fn without Result return type
        if (line.includes('async fn') && line.includes('-> HttpResponse') && !line.includes('Result<')) {
          // This is fine for handlers
        } else if (line.includes('async fn') && line.includes('->') && !line.includes('Result<') && !line.includes('HttpResponse') && !line.includes('()')) {
          markers.push({
            severity: monaco.MarkerSeverity.Info,
            message: 'Consider returning Result<T> for better error handling',
            startLineNumber: lineNumber,
            startColumn: line.indexOf('->') + 1,
            endLineNumber: lineNumber,
            endColumn: line.length + 1
          });
        }

        // Check for unwrap usage
        if (line.includes('.unwrap()') && !line.trim().startsWith('//') && !line.includes('// unwrap is ok')) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: 'Consider using ? operator or expect() instead of unwrap()',
            startLineNumber: lineNumber,
            startColumn: line.indexOf('.unwrap()') + 1,
            endLineNumber: lineNumber,
            endColumn: line.indexOf('.unwrap()') + 10
          });
        }

        // Check for ctx.emit without .await
        if (line.includes('ctx.emit(') && !line.includes('.await')) {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: 'ctx.emit() is async and requires .await',
            startLineNumber: lineNumber,
            startColumn: line.indexOf('ctx.emit(') + 1,
            endLineNumber: lineNumber,
            endColumn: line.indexOf('ctx.emit(') + 9
          });
        }

        // Check for Context::global() in non-handler context
        if (line.includes('Context::global()') && !content.includes('async fn')) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: 'Context::global() should only be used in async handler functions',
            startLineNumber: lineNumber,
            startColumn: line.indexOf('Context::global()') + 1,
            endLineNumber: lineNumber,
            endColumn: line.indexOf('Context::global()') + 18
          });
        }

        // Check for serde_json::from_str without type annotation
        if (line.includes('serde_json::from_str(') && !line.includes('::<') && !line.includes('let ') && line.includes(': ')) {
          // Has type annotation, this is fine
        } else if (line.includes('serde_json::from_str(') && !line.includes('::<')) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: 'Consider adding type annotation: serde_json::from_str::<Type>(...)',
            startLineNumber: lineNumber,
            startColumn: line.indexOf('serde_json::from_str(') + 1,
            endLineNumber: lineNumber,
            endColumn: line.indexOf('serde_json::from_str(') + 21
          });
        }
      });

      // Check for missing Plugin implementation
      if (content.includes('struct ') && !content.includes('impl Plugin for') && content.includes('mod router')) {
        const structMatch = content.match(/pub\s+struct\s+(\w+)/);
        if (structMatch) {
          const structLine = content.substring(0, content.indexOf(structMatch[0])).split('\n').length;
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: `Consider implementing Plugin trait for ${structMatch[1]}`,
            startLineNumber: structLine,
            startColumn: 1,
            endLineNumber: structLine,
            endColumn: 100
          });
        }
      }

      // Check for missing async_trait macro
      if (content.includes('impl Plugin for') && !content.includes('#[async_trait]')) {
        const implLine = content.substring(0, content.indexOf('impl Plugin for')).split('\n').length;
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: 'Plugin implementation requires #[async_trait] macro',
          startLineNumber: implLine,
          startColumn: 1,
          endLineNumber: implLine,
          endColumn: 50
        });
      }

      return markers;
    };

    // Set up diagnostics for Rust files
    let rustDiagnosticsDisposable = null;
    const setupRustDiagnostics = (editorInstance) => {
      if (rustDiagnosticsDisposable) {
        rustDiagnosticsDisposable.dispose();
      }

      rustDiagnosticsDisposable = editorInstance.onDidChangeModelContent(() => {
        const model = editorInstance.getModel();
        if (model && model.getLanguageId() === 'rust') {
          const markers = validateRustCode(model);
          monaco.editor.setModelMarkers(model, 'webarcade-rust', markers);
        }
      });

      // Initial validation
      const model = editorInstance.getModel();
      if (model && model.getLanguageId() === 'rust') {
        const markers = validateRustCode(model);
        monaco.editor.setModelMarkers(model, 'webarcade-rust', markers);
      }
    };

    // Store the setup function to be called after editor creation
    monaco._webarcadeSetupRustDiagnostics = setupRustDiagnostics;
  };

  const registerScriptingLanguage = (monaco) => {
    // Register tokens provider for syntax highlighting
    monaco.languages.setMonarchTokensProvider('javascript', {
      symbols: /[=><!~?:&|+\-*/^%]+/,
      keywords: [
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
        'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally',
        'for', 'from', 'function', 'get', 'if', 'import', 'in', 'instanceof', 'let',
        'new', 'null', 'return', 'set', 'super', 'switch', 'this', 'throw', 'true',
        'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'
      ],
      typeKeywords: [
        'boolean', 'double', 'byte', 'int', 'short', 'char', 'void', 'long', 'float'
      ],
      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
        '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>='
      ],
      tokenizer: {
        root: [
          [/\b(Engine|Scene|Camera|Light|Mesh|Material|Texture|Vector3|Quaternion|Matrix|Color3|Color4)\b/, 'type.identifier'],
          [/\b(createBox|createSphere|createGround|createPlane|loadMesh|loadTexture|loadAnimation)\b/, 'keyword.other'],
          [/\b(setPosition|setRotation|setScale|setVisible|getPosition|getRotation|getScale|isVisible)\b/, 'support.function'],
          [/\b(addLight|addCamera|addMesh|removeMesh|playAnimation|stopAnimation|pauseAnimation)\b/, 'support.function'],
          [/\b(onPointerDown|onPointerUp|onPointerMove|onKeyDown|onKeyUp|onCollision)\b/, 'support.function.event'],
          [/\b(registerBeforeRender|unregisterBeforeRender|dispose|clone|intersectsMesh)\b/, 'support.function'],

          [/[a-z_$][\w$]*/, {
            cases: {
              '@typeKeywords': 'keyword',
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/[A-Z][\w$]*/, 'type.identifier'],

          [/[{}()[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],

          [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          [/[;,.]/, 'delimiter'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
          [/'/, { token: 'string.quote', bracket: '@open', next: '@stringsingle' }],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],
          ["\\*/", 'comment', '@pop'],
          [/[/*]/, 'comment']
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape.invalid'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],
        stringsingle: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape.invalid'],
          [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],
      },
    });

    // Add WebArcade API type definitions
    const webarcadeAPITypes = `
      declare module '@/api/bridge' {
        export function bridge(url: string, options?: RequestInit): Promise<Response>;
      }

      declare module '@/api/plugin' {
        export function createPlugin(config: PluginConfig): Plugin;
        export interface PluginConfig {
          id: string;
          name: string;
          version: string;
          description: string;
          author: string;
          onInit?: () => Promise<void>;
          onStart?: (api: PluginAPI) => Promise<void>;
          onStop?: () => Promise<void>;
          onDispose?: () => Promise<void>;
        }
        export interface PluginAPI {
          viewport(id: string, options: ViewportOptions): void;
          tab(id: string, options: TabOptions): void;
          showProps(show: boolean): void;
          showMenu(show: boolean): void;
          showFooter(show: boolean): void;
          showTabs(show: boolean): void;
        }
        export interface ViewportOptions {
          label: string;
          component: any;
          icon?: any;
          description?: string;
        }
        export interface TabOptions {
          title: string;
          component: any;
          icon?: any;
          order?: number;
          viewport?: string;
        }
      }

      declare module 'webarcade_api::prelude' {
        export type Result<T> = { Ok: T } | { Err: string };
        export interface Context {
          register_router(name: string, router: Router): Promise<void>;
        }
        export interface Router {
          new(): Router;
        }
        export interface HttpResponse {}
        export function json_response(data: any): HttpResponse;
        export function error_response(message: string): HttpResponse;
        export const route: any;
      }
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(webarcadeAPITypes, 'ts:webarcade-api.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(webarcadeAPITypes, 'ts:webarcade-api.d.ts');

    // Add completion provider for scripting API - with higher priority
    const customSuggestions = [
      // WebArcade API
      {
        label: 'createPlugin',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'WebArcade: Create a plugin',
        insertText: 'createPlugin({\n\tid: \'${1:plugin-id}\',\n\tname: \'${2:Plugin Name}\',\n\tversion: \'${3:1.0.0}\',\n\tdescription: \'${4}\',\n\tauthor: \'${5}\',\n\tasync onInit() {\n\t\t${6}\n\t},\n\tasync onStart(api) {\n\t\t${7}\n\t}\n})',
        insertTextRules: monaco.languages.CompletionItemKind.InsertAsSnippet,
        sortText: '0000'
      },
      {
        label: 'bridge',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'WebArcade: Make HTTP request to backend bridge',
        insertText: 'bridge(\'${1:/api/endpoint}\')',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0001'
      },
      {
        label: 'api.viewport',
        kind: monaco.languages.CompletionItemKind.Method,
        documentation: 'WebArcade: Register a viewport',
        insertText: 'api.viewport(\'${1:viewport-id}\', {\n\tlabel: \'${2:Label}\',\n\tcomponent: ${3:Component},\n\ticon: ${4:Icon},\n\tdescription: \'${5}\'\n})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0002'
      },
      {
        label: 'api.tab',
        kind: monaco.languages.CompletionItemKind.Method,
        documentation: 'WebArcade: Register a tab',
        insertText: 'api.tab(\'${1:tab-id}\', {\n\ttitle: \'${2:Title}\',\n\tcomponent: ${3:Component},\n\ticon: ${4:Icon},\n\torder: ${5:1},\n\tviewport: \'${6:viewport-id}\'\n})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0003'
      },
      {
        label: 'json_response',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'WebArcade Rust API: Return JSON response',
        insertText: 'json_response(&json!({\n\t${1}\n}))',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0004'
      },
      {
        label: 'route!',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'WebArcade Rust API: Define a route',
        insertText: 'route!(router, ${1:GET} "${2:/path}" => ${3:handler_name});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0005'
      },
      {
        label: 'register_routes',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'WebArcade Rust API: Register routes function',
        insertText: 'pub async fn register_routes(ctx: &Context) -> Result<()> {\n\tlet mut router = Router::new();\n\t\n\troute!(router, GET "${1:/path}" => ${2:handler_name});\n\t\n\tctx.register_router("${3:plugin_name}", router).await;\n\tOk(())\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0006'
      },
      // SolidJS specific
      {
        label: 'props',
        kind: monaco.languages.CompletionItemKind.Variable,
        documentation: 'Component properties',
        insertText: 'props',
        sortText: '0100'
      },
      {
        label: 'children',
        kind: monaco.languages.CompletionItemKind.Property,
        documentation: 'Component children',
        insertText: 'children',
        sortText: '0001'
      },
      {
        label: 'createSignal',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS reactive signal',
        insertText: 'createSignal(${1:initialValue})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0002'
      },
      {
        label: 'createEffect',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS reactive effect',
        insertText: 'createEffect(() => {\n\t${1}\n})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0003'
      },
      {
        label: 'createMemo',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS memoized value',
        insertText: 'createMemo(() => ${1})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0004'
      },
      {
        label: 'onMount',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS onMount lifecycle',
        insertText: 'onMount(() => {\n\t${1}\n})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0005'
      },
      {
        label: 'onCleanup',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS cleanup on component unmount',
        insertText: 'onCleanup(() => {\n\t${1}\n})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0006'
      },
      {
        label: 'Show',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS conditional rendering component',
        insertText: '<Show when={${1:condition}}>\n\t${2}\n</Show>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0007'
      },
      {
        label: 'For',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'SolidJS list rendering component',
        insertText: '<For each={${1:array}}>\n\t{(${2:item}) => ${3}}\n</For>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0008'
      },
      // Event handlers
      {
        label: 'onClick',
        kind: monaco.languages.CompletionItemKind.Property,
        documentation: 'Click event handler',
        insertText: 'onClick={(e) => ${1}}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0009'
      },
      {
        label: 'onChange',
        kind: monaco.languages.CompletionItemKind.Property,
        documentation: 'Change event handler',
        insertText: 'onChange={(e) => ${1}}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0010'
      },
      {
        label: 'onInput',
        kind: monaco.languages.CompletionItemKind.Property,
        documentation: 'Input event handler',
        insertText: 'onInput={(e) => ${1}}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0011'
      },
      // ES6+ features
      {
        label: 'async/await',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Async function with await',
        insertText: 'async () => {\n\tconst ${1:result} = await ${2:promise};\n\t${3}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0012'
      },
      {
        label: 'arrowFunction',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Arrow function',
        insertText: '(${1:params}) => ${2:expression}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0013'
      },
      {
        label: 'destructuring',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Object destructuring',
        insertText: 'const { ${1:prop} } = ${2:object}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0014'
      },
      {
        label: 'spread',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Spread operator',
        insertText: '...${1:array}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0015'
      },
      {
        label: 'template',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'Template literal',
        insertText: '`${${1:expression}}`',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0016'
      },
      {
        label: 'import',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'ES6 import statement',
        insertText: "import { ${1:export} } from '${2:module}'",
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0017'
      },
      {
        label: 'export',
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: 'ES6 export statement',
        insertText: 'export ${1:const} ${2:name} = ${3:value}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        sortText: '0018'
      },
      ...scriptingKeywords.map((keyword, index) => ({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: `Renzora Engine API: ${keyword}`,
        insertText: keyword,
        sortText: `1${index.toString().padStart(3, '0')}`
      }))
    ];

    monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Add range to all suggestions
        const suggestions = customSuggestions.map(suggestion => ({
          ...suggestion,
          range
        }));

        return { suggestions };
      }
    });

    monaco.languages.registerCompletionItemProvider('typescript', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Add range to all suggestions
        const suggestions = customSuggestions.map(suggestion => ({
          ...suggestion,
          range
        }));

        return { suggestions };
      }
    });
  };

  // Helper function to get CSS custom property values and convert to hex
  const getCSSVariable = (name, fallback = '000000') => {
    if (typeof window === 'undefined') return fallback;
    
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      
      if (!value) return fallback;
      
      // DaisyUI variables are usually in HSL format like "200 6% 10%"
      // We need to convert them to hex
      if (value.includes('%')) {
        // Parse HSL values like "200 6% 10%"
        const parts = value.split(' ');
        if (parts.length >= 3) {
          const h = parseInt(parts[0]) || 0;
          const s = parseInt(parts[1]) || 0;
          const l = parseInt(parts[2]) || 50;
          return hslToHex(h, s, l);
        }
      }
      
      // If it's already a hex color, use it
      if (value.startsWith('#')) {
        return value.replace('#', '');
      }
      
      // If it's RGB, convert it
      if (value.startsWith('rgb')) {
        const matches = value.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]);
          const g = parseInt(matches[1]);
          const b = parseInt(matches[2]);
          return rgbToHex(r, g, b);
        }
      }
      
      return fallback;
    } catch (error) {
      return fallback;
    }
  };

  // Convert HSL to Hex
  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `${f(0)}${f(8)}${f(4)}`;
  };

  // Convert RGB to Hex
  const rgbToHex = (r, g, b) => {
    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  // Define DaisyUI theme
  const createDaisyUITheme = (monaco) => {
    
    // Get current theme colors from CSS custom properties
    const baseContent = getCSSVariable('--bc', 'A6ADBA');
    const base100 = getCSSVariable('--b1', '2A303C');
    const base200 = getCSSVariable('--b2', '242933');
    const base300 = getCSSVariable('--b3', '1D232A');
    const primary = getCSSVariable('--p', '3ABFF8');
    const secondary = getCSSVariable('--s', '828DF8');
    const accent = getCSSVariable('--a', 'F471B5');
    const _neutral = getCSSVariable('--n', '1B1D1D');
    const info = getCSSVariable('--in', '3ABFF8');
    const success = getCSSVariable('--su', '36D399');
    const warning = getCSSVariable('--wa', 'FBBD23');
    const error = getCSSVariable('--er', 'F87272');


    monaco.editor.defineTheme('daisyui-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // General
        { token: '', foreground: baseContent },
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: primary, fontStyle: 'bold' },
        { token: 'identifier', foreground: baseContent },
        
        // Types and classes
        { token: 'type', foreground: secondary },
        { token: 'type.identifier', foreground: accent },
        
        // Strings and numbers
        { token: 'string', foreground: success },
        { token: 'string.quote', foreground: success },
        { token: 'number', foreground: warning },
        { token: 'number.float', foreground: warning },
        { token: 'number.hex', foreground: warning },
        
        // Functions and methods
        { token: 'support.function', foreground: info },
        { token: 'support.function.event', foreground: accent },
        { token: 'keyword.other', foreground: secondary },
        
        // Operators and delimiters
        { token: 'operator', foreground: baseContent },
        { token: 'delimiter', foreground: '9CA3AF' },
        
        // Invalid/errors
        { token: 'string.invalid', foreground: error },
        { token: 'string.escape.invalid', foreground: error },
        
        // Brackets
        { token: 'delimiter.bracket', foreground: baseContent },
      ],
      colors: {
        // Editor background
        'editor.background': '#' + base100,
        'editor.foreground': '#' + baseContent,

        // Line numbers
        'editorLineNumber.foreground': '#6B7280',
        'editorLineNumber.activeForeground': '#' + primary,

        // Cursor
        'editorCursor.foreground': '#' + primary,

        // Selection
        'editor.selectionBackground': '#' + primary + '40',
        'editor.selectionHighlightBackground': '#' + primary + '20',

        // Current line
        'editor.lineHighlightBackground': '#' + base200,
        
        // Indentation guides
        'editorIndentGuide.background': '#' + base300,
        'editorIndentGuide.activeBackground': '#' + primary + '60',

        // Gutter
        'editorGutter.background': '#' + base100,

        // Scrollbar
        'scrollbar.shadow': '#00000020',
        'scrollbarSlider.background': '#' + base300 + '80',
        'scrollbarSlider.hoverBackground': '#' + base300,
        'scrollbarSlider.activeBackground': '#' + primary + '80',

        // Find/replace
        'editor.findMatchBackground': '#' + warning + '40',
        'editor.findMatchHighlightBackground': '#' + warning + '20',

        // Brackets matching
        'editorBracketMatch.background': '#' + primary + '20',
        'editorBracketMatch.border': '#' + primary,

        // Overview ruler
        'editorOverviewRuler.border': '#' + base300,

        // Widget backgrounds
        'editorWidget.background': '#' + base200,
        'editorWidget.border': '#' + base300,
        'editorSuggestWidget.background': '#' + base200,
        'editorSuggestWidget.border': '#' + base300,
        'editorSuggestWidget.selectedBackground': '#' + primary + '40',

        // Input
        'input.background': '#' + base200,
        'input.border': '#' + base300,
        'input.foreground': '#' + baseContent,

        // Dropdown
        'dropdown.background': '#' + base200,
        'dropdown.border': '#' + base300,
        'dropdown.foreground': '#' + baseContent,
      }
    });
  };

  onMount(async () => {
    try {
      // Configure Monaco loader to minimize bundle size
      loader.config({
        paths: {
          vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
        }
      });

      const monaco = await loader.init();

      // Configure TypeScript for ES6+ and JSX support
      configureTypeScript(monaco);

      // Create and register DaisyUI theme
      createDaisyUITheme(monaco);

      // Register custom language features
      registerScriptingLanguage(monaco);

      const editorInstance = monaco.editor.create(containerRef, {
        value: value || '',
        language,
        theme,
        ...defaultOptions,
        // Disable drag and drop to prevent conflicts with asset drag/drop
        dragAndDrop: false,
        dropIntoEditor: { enabled: false }
      });

      // Explicitly disable drag/drop events on the editor container
      const editorContainer = editorInstance.getDomNode();
      let dragEventListeners = [];
      
      if (editorContainer) {
        const preventDragDrop = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        
        // Store listener references for cleanup
        const addDragListener = (element, event, handler) => {
          element.addEventListener(event, handler, true);
          dragEventListeners.push({ element, event, handler });
        };
        
        // Prevent all drag/drop events on container
        addDragListener(editorContainer, 'dragover', preventDragDrop);
        addDragListener(editorContainer, 'dragenter', preventDragDrop);  
        addDragListener(editorContainer, 'dragleave', preventDragDrop);
        addDragListener(editorContainer, 'drop', preventDragDrop);
        
        // Also prevent on the inner editor elements
        const setupEditableAreaListeners = () => {
          const editableArea = editorContainer.querySelector('.monaco-editor .overflow-guard .monaco-scrollable-element');
          if (editableArea) {
            addDragListener(editableArea, 'dragover', preventDragDrop);
            addDragListener(editableArea, 'dragenter', preventDragDrop);
            addDragListener(editableArea, 'dragleave', preventDragDrop);
            addDragListener(editableArea, 'drop', preventDragDrop);
          }
        };
        
        // Apply immediately and after a small delay to ensure DOM is ready
        setupEditableAreaListeners();
        setTimeout(setupEditableAreaListeners, 100);
      }

      setEditor(editorInstance);

      // Initialize power mode manually (without using the hook to avoid Solid.js context issues)
      powerModeInstance = new PowerMode({
        enabled: editorStore.powerMode.enabled,
        shake: editorStore.powerMode.shake,
        particles: editorStore.powerMode.particles,
        maxParticles: editorStore.powerMode.maxParticles,
        particleSize: editorStore.powerMode.particleSize,
        shakeIntensity: editorStore.powerMode.shakeIntensity
      });

      // Initialize power mode
      powerModeInstance.init(containerRef);

      // Listen to content changes
      powerModeDisposable = editorInstance.onDidChangeModelContent((e) => {
        if (!editorStore.powerMode.enabled || !e.changes || e.changes.length === 0) return;

        // Get cursor position
        const position = editorInstance.getPosition();
        if (!position) return;

        // Convert editor position to screen coordinates
        const coords = editorInstance.getScrolledVisiblePosition(position);
        if (!coords) return;

        const containerRect = containerRef.getBoundingClientRect();
        const editorDom = editorInstance.getDomNode();
        const editorRect = editorDom.getBoundingClientRect();

        const x = coords.left + editorRect.left - containerRect.left;
        const y = coords.top + editorRect.top - containerRect.top + coords.height / 2;

        // Create particles at cursor position
        powerModeInstance.createParticles(x, y);

        // Shake the editor
        powerModeInstance.shake(containerRef);
      });

      // Disable application shortcuts when Monaco Editor is focused
      editorInstance.onDidFocusEditorText(() => {
        keyboardShortcuts.disable();
      });

      editorInstance.onDidBlurEditorText(() => {
        keyboardShortcuts.enable();
      });

      // Handle value changes
      if (onChange) {
        editorInstance.onDidChangeModelContent(() => {
          onChange(editorInstance.getValue());
        });
      }

      // Call onMount callback if provided
      if (onMountCallback) {
        onMountCallback(editorInstance, monaco);
      }

      // Set up Rust diagnostics if available
      if (monaco._webarcadeSetupRustDiagnostics) {
        monaco._webarcadeSetupRustDiagnostics(editorInstance);
      }

      // Handle container resize
      const resizeObserver = new ResizeObserver(() => {
        editorInstance.layout();
      });
      resizeObserver.observe(containerRef);

      onCleanup(() => {

        // Clean up drag/drop event listeners
        if (dragEventListeners) {
          dragEventListeners.forEach(({ element, event, handler }) => {
            try {
              element.removeEventListener(event, handler, true);
            } catch (error) {
            }
          });
          dragEventListeners = [];
        }

        // Clean up power mode
        if (powerModeDisposable) {
          try {
            powerModeDisposable.dispose();
          } catch (error) {
          }
        }
        if (powerModeInstance) {
          try {
            powerModeInstance.dispose();
          } catch (error) {
          }
        }

        // Clean up resize observer
        resizeObserver.disconnect();

        // Re-enable shortcuts if they were disabled
        keyboardShortcuts.enable();

        // Dispose of editor instance
        try {
          editorInstance.dispose();
        } catch (error) {
        }
      });

    } catch (error) {
    }
  });

  // Update editor value when prop changes
  createEffect(() => {
    // Track the value prop explicitly
    const newValue = value;
    const editorInstance = untrack(() => editor());

    if (editorInstance && newValue !== undefined) {
      const currentValue = editorInstance.getValue();

      // Only update if values are actually different
      if (currentValue !== newValue) {
        console.log('[MonacoEditor] Updating editor value, length:', newValue.length);

        // Preserve cursor position and scroll state
        const position = editorInstance.getPosition();
        const scrollTop = editorInstance.getScrollTop();

        editorInstance.setValue(newValue);

        // Restore cursor position if valid
        if (position && newValue.length > 0) {
          editorInstance.setPosition(position);
        }
        editorInstance.setScrollTop(scrollTop);
      }
    }
  });

  // Update editor language when prop changes
  createEffect(() => {
    const editorInstance = editor();
    if (editorInstance && language) {
      const model = editorInstance.getModel();
      if (model) {
        loader.init().then(monaco => {
          monaco.editor.setModelLanguage(model, language);
        });
      }
    }
  });

  // Watch for power mode settings changes and update the instance
  createEffect(() => {
    // Access each property individually to ensure reactivity
    const enabled = editorStore.powerMode.enabled;
    const shake = editorStore.powerMode.shake;
    const particles = editorStore.powerMode.particles;
    const maxParticles = editorStore.powerMode.maxParticles;
    const particleSize = editorStore.powerMode.particleSize;
    const shakeIntensity = editorStore.powerMode.shakeIntensity;

    if (powerModeInstance) {
      console.log('[MonacoEditor] Updating power mode settings:', {
        enabled, shake, particles, maxParticles, particleSize, shakeIntensity
      });

      // Update settings when editorStore.powerMode changes
      powerModeInstance.updateSettings({
        enabled,
        shakeEnabled: shake,
        particlesEnabled: particles,
        maxParticles,
        particleSize,
        shakeIntensity
      });
    }
  });

  // Watch for theme changes using MutationObserver
  onMount(() => {
    if (theme === 'daisyui-theme') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            // Theme changed, update Monaco theme
            const editorInstance = editor();
            if (editorInstance) {
              loader.init().then(monaco => {
                createDaisyUITheme(monaco);
                monaco.editor.setTheme('daisyui-theme');
              });
            }
          }
        });
      });

      // Observe theme changes on html element
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });

      onCleanup(() => {
        observer.disconnect();
      });
    }
  });

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      class="monaco-editor-container"
    />
  );
}

export default MonacoEditor;