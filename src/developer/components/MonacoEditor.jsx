import { createSignal, onMount, onCleanup, createEffect, untrack } from 'solid-js';
import loader from '@monaco-editor/loader';

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
    multiCursorModifier: 'ctrlCmd',
    wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
    ...options
  };

  const configureTypeScript = (monaco) => {
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

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        1108, 1375, 2307, 2304, 2552, 2339, 2769, 2571, 6133, 7016, 7026, 7031
      ]
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        2307, 2304, 2552, 2339, 2769, 6133, 7016, 7026, 7031
      ]
    });

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
    `;

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
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(solidJSTypes, 'ts:solid-js.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(solidJSTypes, 'ts:solid-js.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(jsxTypes, 'ts:jsx-runtime.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(jsxTypes, 'ts:jsx-runtime.d.ts');
  };

  const getCSSVariable = (name, fallback = '000000') => {
    if (typeof window === 'undefined') return fallback;

    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (!value) return fallback;

      if (value.includes('%')) {
        const parts = value.split(' ');
        if (parts.length >= 3) {
          const h = parseInt(parts[0]) || 0;
          const s = parseInt(parts[1]) || 0;
          const l = parseInt(parts[2]) || 50;
          return hslToHex(h, s, l);
        }
      }

      if (value.startsWith('#')) {
        return value.replace('#', '');
      }

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

  const rgbToHex = (r, g, b) => {
    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  const createDaisyUITheme = (monaco) => {
    const baseContent = getCSSVariable('--bc', 'A6ADBA');
    const base100 = getCSSVariable('--b1', '2A303C');
    const base200 = getCSSVariable('--b2', '242933');
    const base300 = getCSSVariable('--b3', '1D232A');
    const primary = getCSSVariable('--p', '3ABFF8');
    const secondary = getCSSVariable('--s', '828DF8');
    const accent = getCSSVariable('--a', 'F471B5');
    const info = getCSSVariable('--in', '3ABFF8');
    const success = getCSSVariable('--su', '36D399');
    const warning = getCSSVariable('--wa', 'FBBD23');
    const error = getCSSVariable('--er', 'F87272');

    monaco.editor.defineTheme('daisyui-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: baseContent },
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: primary, fontStyle: 'bold' },
        { token: 'identifier', foreground: baseContent },
        { token: 'type', foreground: secondary },
        { token: 'type.identifier', foreground: accent },
        { token: 'string', foreground: success },
        { token: 'string.quote', foreground: success },
        { token: 'number', foreground: warning },
        { token: 'number.float', foreground: warning },
        { token: 'number.hex', foreground: warning },
        { token: 'support.function', foreground: info },
        { token: 'support.function.event', foreground: accent },
        { token: 'keyword.other', foreground: secondary },
        { token: 'operator', foreground: baseContent },
        { token: 'delimiter', foreground: '9CA3AF' },
        { token: 'string.invalid', foreground: error },
        { token: 'string.escape.invalid', foreground: error },
        { token: 'delimiter.bracket', foreground: baseContent },
      ],
      colors: {
        'editor.background': '#' + base100,
        'editor.foreground': '#' + baseContent,
        'editorLineNumber.foreground': '#6B7280',
        'editorLineNumber.activeForeground': '#' + primary,
        'editorCursor.foreground': '#' + primary,
        'editor.selectionBackground': '#' + primary + '40',
        'editor.selectionHighlightBackground': '#' + primary + '20',
        'editor.lineHighlightBackground': '#' + base200,
        'editorIndentGuide.background': '#' + base300,
        'editorIndentGuide.activeBackground': '#' + primary + '60',
        'editorGutter.background': '#' + base100,
        'scrollbar.shadow': '#00000020',
        'scrollbarSlider.background': '#' + base300 + '80',
        'scrollbarSlider.hoverBackground': '#' + base300,
        'scrollbarSlider.activeBackground': '#' + primary + '80',
        'editor.findMatchBackground': '#' + warning + '40',
        'editor.findMatchHighlightBackground': '#' + warning + '20',
        'editorBracketMatch.background': '#' + primary + '20',
        'editorBracketMatch.border': '#' + primary,
        'editorOverviewRuler.border': '#' + base300,
        'editorWidget.background': '#' + base200,
        'editorWidget.border': '#' + base300,
        'editorSuggestWidget.background': '#' + base200,
        'editorSuggestWidget.border': '#' + base300,
        'editorSuggestWidget.selectedBackground': '#' + primary + '40',
        'input.background': '#' + base200,
        'input.border': '#' + base300,
        'input.foreground': '#' + baseContent,
        'dropdown.background': '#' + base200,
        'dropdown.border': '#' + base300,
        'dropdown.foreground': '#' + baseContent,
      }
    });
  };

  onMount(async () => {
    try {
      loader.config({
        paths: {
          vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
        }
      });

      const monaco = await loader.init();
      configureTypeScript(monaco);
      createDaisyUITheme(monaco);

      const editorInstance = monaco.editor.create(containerRef, {
        value: value || '',
        language,
        theme,
        ...defaultOptions,
        dragAndDrop: false,
        dropIntoEditor: { enabled: false }
      });

      setEditor(editorInstance);

      if (onChange) {
        editorInstance.onDidChangeModelContent(() => {
          onChange(editorInstance.getValue());
        });
      }

      if (onMountCallback) {
        onMountCallback(editorInstance, monaco);
      }

      const resizeObserver = new ResizeObserver(() => {
        editorInstance.layout();
      });
      resizeObserver.observe(containerRef);

      onCleanup(() => {
        resizeObserver.disconnect();
        try {
          editorInstance.dispose();
        } catch (error) {
          console.error('Error disposing editor:', error);
        }
      });

    } catch (error) {
      console.error('Error initializing Monaco editor:', error);
    }
  });

  createEffect(() => {
    const newValue = value;
    const editorInstance = untrack(() => editor());

    if (editorInstance && newValue !== undefined) {
      const currentValue = editorInstance.getValue();

      if (currentValue !== newValue) {
        const position = editorInstance.getPosition();
        const scrollTop = editorInstance.getScrollTop();

        editorInstance.setValue(newValue);

        if (position && newValue.length > 0) {
          editorInstance.setPosition(position);
        }
        editorInstance.setScrollTop(scrollTop);
      }
    }
  });

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

  onMount(() => {
    if (theme === 'daisyui-theme') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
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
