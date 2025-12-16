import { splitProps, Show, createSignal, For } from 'solid-js';

/**
 * FileInput - File upload input
 *
 * @example
 * <FileInput label="Upload file" onChange={handleFile} />
 * <FileInput label="Images" accept="image/*" multiple />
 * <FileInput label="Drop zone" dropzone onChange={handleFiles} />
 */
export function FileInput(props) {
    const [local, others] = splitProps(props, [
        'class',
        'label',
        'hint',
        'error',
        'variant',
        'size',
        'accept',
        'multiple',
        'onChange',
        'dropzone',
        'showPreview',
        'maxSize'
    ]);

    const [isDragging, setIsDragging] = createSignal(false);
    const [files, setFiles] = createSignal([]);
    const [fileError, setFileError] = createSignal(null);

    const variants = {
        default: 'file-input-bordered',
        ghost: 'file-input-ghost',
        primary: 'file-input-primary',
        secondary: 'file-input-secondary',
        accent: 'file-input-accent',
        info: 'file-input-info',
        success: 'file-input-success',
        warning: 'file-input-warning',
        error: 'file-input-error'
    };

    const sizes = {
        xs: 'file-input-xs',
        sm: 'file-input-sm',
        md: '',
        lg: 'file-input-lg'
    };

    const inputClass = () => {
        let cls = 'file-input';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        cls += ' w-full';
        if (local.error || fileError()) cls += ' file-input-error';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const validateFiles = (fileList) => {
        const maxSize = local.maxSize; // in bytes
        if (maxSize) {
            for (const file of fileList) {
                if (file.size > maxSize) {
                    setFileError(`File "${file.name}" exceeds ${formatSize(maxSize)}`);
                    return false;
                }
            }
        }
        setFileError(null);
        return true;
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleChange = (e) => {
        const fileList = Array.from(e.target.files || []);
        if (validateFiles(fileList)) {
            setFiles(fileList);
            local.onChange?.(local.multiple ? fileList : fileList[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const fileList = Array.from(e.dataTransfer.files || []);
        if (validateFiles(fileList)) {
            setFiles(fileList);
            local.onChange?.(local.multiple ? fileList : fileList[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    // Dropzone variant
    if (local.dropzone) {
        return (
            <div class="form-control w-full">
                <Show when={local.label}>
                    <label class="label">
                        <span class="label-text">{local.label}</span>
                    </label>
                </Show>
                <div
                    class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                        isDragging() ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById('file-input-dropzone')?.click()}
                >
                    <input
                        id="file-input-dropzone"
                        type="file"
                        class="hidden"
                        accept={local.accept}
                        multiple={local.multiple}
                        onChange={handleChange}
                        {...others}
                    />
                    <div class="text-4xl mb-2">📁</div>
                    <p class="font-medium">Drop files here or click to upload</p>
                    <p class="text-sm opacity-60 mt-1">
                        {local.accept ? `Accepts: ${local.accept}` : 'Any file type'}
                    </p>
                </div>
                <Show when={files().length > 0}>
                    <div class="mt-2 space-y-1">
                        <For each={files()}>
                            {(file) => (
                                <div class="flex items-center gap-2 text-sm bg-base-200 rounded px-2 py-1">
                                    <span>📄</span>
                                    <span class="flex-1 truncate">{file.name}</span>
                                    <span class="opacity-60">{formatSize(file.size)}</span>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>
                <Show when={local.error || fileError() || local.hint}>
                    <label class="label">
                        <span class={`label-text-alt ${local.error || fileError() ? 'text-error' : ''}`}>
                            {local.error || fileError() || local.hint}
                        </span>
                    </label>
                </Show>
            </div>
        );
    }

    // Standard file input
    return (
        <div class="form-control w-full">
            <Show when={local.label}>
                <label class="label">
                    <span class="label-text">{local.label}</span>
                </label>
            </Show>
            <input
                type="file"
                class={inputClass()}
                accept={local.accept}
                multiple={local.multiple}
                onChange={handleChange}
                {...others}
            />
            <Show when={local.error || fileError() || local.hint}>
                <label class="label">
                    <span class={`label-text-alt ${local.error || fileError() ? 'text-error' : ''}`}>
                        {local.error || fileError() || local.hint}
                    </span>
                </label>
            </Show>
        </div>
    );
}

export default FileInput;
