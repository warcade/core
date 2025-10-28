import { createSignal } from 'solid-js';
import { IconCircle, IconPlayerStop, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-solidjs';

export default function RecordingControls(props) {
  const [isPaused, setIsPaused] = createSignal(false);

  const handleToggleRecording = () => {
    if (props.isRecording) {
      props.onStop();
    } else {
      props.onStart();
    }
  };

  const handleTogglePause = () => {
    if (isPaused()) {
      props.onResume?.();
      setIsPaused(false);
    } else {
      props.onPause?.();
      setIsPaused(true);
    }
  };

  return (
    <div class="flex items-center gap-2 p-2 bg-base-100 border border-base-300 rounded-lg">
      <button
        class={`btn btn-sm gap-2 ${props.isRecording ? 'btn-error' : 'btn-primary'}`}
        onClick={handleToggleRecording}
      >
        {props.isRecording ? (
          <>
            <IconPlayerStop size={16} />
            Stop Recording
          </>
        ) : (
          <>
            <IconCircle size={16} class={props.isRecording ? 'animate-pulse' : ''} />
            Start Recording
          </>
        )}
      </button>

      {props.isRecording && (
        <button
          class="btn btn-sm btn-ghost gap-2"
          onClick={handleTogglePause}
        >
          {isPaused() ? (
            <>
              <IconPlayerPlay size={16} />
              Resume
            </>
          ) : (
            <>
              <IconPlayerPause size={16} />
              Pause
            </>
          )}
        </button>
      )}

      {props.isRecording && (
        <div class="flex items-center gap-2 ml-2">
          <div class="w-3 h-3 bg-error rounded-full animate-pulse"></div>
          <span class="text-sm font-mono">REC {props.duration || "00:00"}</span>
        </div>
      )}
    </div>
  );
}
