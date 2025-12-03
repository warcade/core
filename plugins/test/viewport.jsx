import { createSignal, onMount } from 'solid-js';
import { api } from '@/api/bridge';

export default function Viewport() {
    const [message, setMessage] = createSignal('Loading...');

    onMount(async () => {
        try {
            const response = await api('test/hello');
            const data = await response.json();
            setMessage(data.message);
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    });

    return (
        <div class="p-4">
            <h1 class="text-xl font-bold mb-4">test</h1>
            <p class="text-base-content/70">{message()}</p>
        </div>
    );
}
