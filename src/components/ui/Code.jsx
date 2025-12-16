import { splitProps, Show, createSignal } from 'solid-js';

/**
 * Code - Code block display
 *
 * @example
 * <Code>const x = 1;</Code>
 * <Code language="javascript" showLineNumbers>
 *   {`function hello() {
 *     console.log('Hello!');
 *   }`}
 * </Code>
 * <Code copyable>{code}</Code>
 */
export function Code(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'language',
        'showLineNumbers',
        'copyable',
        'inline',
        'wrap'
    ]);

    const [copied, setCopied] = createSignal(false);

    const handleCopy = async () => {
        const text = typeof local.children === 'string'
            ? local.children
            : local.children?.toString() || '';

        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Inline code
    if (local.inline) {
        return (
            <code class={`bg-base-300 px-1 rounded text-sm ${local.class || ''}`} {...others}>
                {local.children}
            </code>
        );
    }

    // Get lines for line numbers
    const lines = () => {
        const content = typeof local.children === 'string' ? local.children : '';
        return content.split('\n');
    };

    return (
        <div class={`relative group ${local.class || ''}`} {...others}>
            <Show when={local.copyable}>
                <button
                    class="absolute top-2 right-2 btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                >
                    {copied() ? '✓ Copied' : '📋 Copy'}
                </button>
            </Show>
            <Show when={local.language}>
                <div class="absolute top-2 left-2 text-xs opacity-50">
                    {local.language}
                </div>
            </Show>
            <pre class={`bg-base-300 rounded-lg p-4 overflow-x-auto ${local.wrap ? 'whitespace-pre-wrap' : ''} ${local.language ? 'pt-8' : ''}`}>
                <Show when={local.showLineNumbers} fallback={
                    <code class="text-sm">{local.children}</code>
                }>
                    <code class="text-sm">
                        <table class="border-collapse">
                            <tbody>
                                {lines().map((line, i) => (
                                    <tr>
                                        <td class="pr-4 text-right select-none opacity-40 border-r border-base-content/10 w-8">
                                            {i + 1}
                                        </td>
                                        <td class="pl-4">{line || ' '}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </code>
                </Show>
            </pre>
        </div>
    );
}

export default Code;
