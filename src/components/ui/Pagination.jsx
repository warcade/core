import { splitProps, For, Show, createMemo } from 'solid-js';

/**
 * Pagination - Page navigation
 *
 * @example
 * <Pagination
 *   total={100}
 *   pageSize={10}
 *   currentPage={page()}
 *   onChange={setPage}
 * />
 *
 * <Pagination
 *   total={50}
 *   pageSize={10}
 *   currentPage={page()}
 *   onChange={setPage}
 *   showFirst
 *   showLast
 * />
 */
export function Pagination(props) {
    const [local, others] = splitProps(props, [
        'class',
        'total',
        'pageSize',
        'currentPage',
        'onChange',
        'size',
        'showFirst',
        'showLast',
        'maxButtons'
    ]);

    const totalPages = createMemo(() => {
        return Math.ceil((local.total || 0) / (local.pageSize || 10));
    });

    const currentPage = () => local.currentPage || 1;
    const maxButtons = () => local.maxButtons || 5;

    // Calculate visible page numbers
    const pageNumbers = createMemo(() => {
        const total = totalPages();
        const current = currentPage();
        const max = maxButtons();

        if (total <= max) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const half = Math.floor(max / 2);
        let start = Math.max(1, current - half);
        let end = Math.min(total, start + max - 1);

        if (end - start < max - 1) {
            start = Math.max(1, end - max + 1);
        }

        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    });

    const sizes = {
        xs: 'btn-xs',
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg'
    };

    const sizeClass = sizes[local.size] || sizes.md;

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages() && page !== currentPage()) {
            local.onChange?.(page);
        }
    };

    return (
        <div class={`join ${local.class || ''}`} {...others}>
            <Show when={local.showFirst}>
                <button
                    class={`join-item btn ${sizeClass}`}
                    onClick={() => goToPage(1)}
                    disabled={currentPage() === 1}
                >
                    ««
                </button>
            </Show>
            <button
                class={`join-item btn ${sizeClass}`}
                onClick={() => goToPage(currentPage() - 1)}
                disabled={currentPage() === 1}
            >
                «
            </button>
            <For each={pageNumbers()}>
                {(page) => (
                    <button
                        class={`join-item btn ${sizeClass} ${currentPage() === page ? 'btn-active' : ''}`}
                        onClick={() => goToPage(page)}
                    >
                        {page}
                    </button>
                )}
            </For>
            <button
                class={`join-item btn ${sizeClass}`}
                onClick={() => goToPage(currentPage() + 1)}
                disabled={currentPage() === totalPages()}
            >
                »
            </button>
            <Show when={local.showLast}>
                <button
                    class={`join-item btn ${sizeClass}`}
                    onClick={() => goToPage(totalPages())}
                    disabled={currentPage() === totalPages()}
                >
                    »»
                </button>
            </Show>
        </div>
    );
}

export default Pagination;
