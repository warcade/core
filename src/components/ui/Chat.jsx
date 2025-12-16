import { splitProps, Show } from 'solid-js';

/**
 * Chat - Chat bubble component
 *
 * @example
 * <Chat.Bubble side="start" message="Hello!" />
 * <Chat.Bubble side="end" message="Hi there!" variant="primary" />
 *
 * <Chat.Bubble
 *   side="start"
 *   avatar={{ src: '/user.jpg', alt: 'User' }}
 *   name="John"
 *   time="12:45"
 *   message="How are you?"
 * />
 */
export function Chat(props) {
    return <div class={`chat-container ${props.class || ''}`}>{props.children}</div>;
}

Chat.Bubble = function ChatBubble(props) {
    const [local, others] = splitProps(props, [
        'class',
        'side',
        'message',
        'children',
        'avatar',
        'name',
        'time',
        'status',
        'variant'
    ]);

    const variants = {
        default: '',
        primary: 'chat-bubble-primary',
        secondary: 'chat-bubble-secondary',
        accent: 'chat-bubble-accent',
        info: 'chat-bubble-info',
        success: 'chat-bubble-success',
        warning: 'chat-bubble-warning',
        error: 'chat-bubble-error'
    };

    const chatClass = () => {
        let cls = 'chat';
        cls += local.side === 'end' ? ' chat-end' : ' chat-start';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const bubbleClass = () => {
        let cls = 'chat-bubble';
        cls += ` ${variants[local.variant] || variants.default}`;
        return cls;
    };

    return (
        <div class={chatClass()} {...others}>
            <Show when={local.avatar}>
                <div class="chat-image avatar">
                    <div class="w-10 rounded-full">
                        <Show when={local.avatar.src} fallback={
                            <div class="bg-neutral text-neutral-content flex items-center justify-center w-full h-full">
                                {local.avatar.initials || '?'}
                            </div>
                        }>
                            <img src={local.avatar.src} alt={local.avatar.alt || 'Avatar'} />
                        </Show>
                    </div>
                </div>
            </Show>
            <Show when={local.name || local.time}>
                <div class="chat-header">
                    {local.name}
                    <Show when={local.time}>
                        <time class="text-xs opacity-50 ml-1">{local.time}</time>
                    </Show>
                </div>
            </Show>
            <div class={bubbleClass()}>
                {local.message || local.children}
            </div>
            <Show when={local.status}>
                <div class="chat-footer opacity-50 text-xs">
                    {local.status}
                </div>
            </Show>
        </div>
    );
};

export default Chat;
