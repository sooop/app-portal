<script>
    import { fade, fly } from 'svelte/transition';
    import { onMount } from 'svelte';
    import {
        loadHistoryList,
        getHistoryList,
        getCurrentHistoryId,
        getIsLoading,
        switchToEntry,
        removeEntry
    } from '$lib/db/history-store.svelte.js';

    /** @type {{ onLoadEntry: (entry: any) => void }} */
    let { onLoadEntry } = $props();

    let isOpen = $state(false);
    let searchQuery = $state('');
    let deleteConfirmId = $state(/** @type {string | null} */ (null));
    let loadingEntryId = $state(/** @type {string | null} */ (null));

    // Get reactive values
    let historyList = $derived(getHistoryList());
    let currentHistoryId = $derived(getCurrentHistoryId());
    let isLoading = $derived(getIsLoading());

    // Filtered list based on search
    let filteredList = $derived(
        searchQuery.trim()
            ? historyList.filter(item =>
                item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : historyList
    );

    onMount(() => {
        loadHistoryList();
    });

    function togglePopover() {
        isOpen = !isOpen;
        if (isOpen) {
            searchQuery = '';
            deleteConfirmId = null;
        }
    }

    function closePopover() {
        isOpen = false;
        searchQuery = '';
        deleteConfirmId = null;
    }

    /**
     * Handle clicking outside to close popover
     * @param {MouseEvent} event
     */
    function handleClickOutside(event) {
        const target = /** @type {HTMLElement} */ (event.target);
        if (!target.closest('.file-history-popover') && !target.closest('.file-history-button')) {
            closePopover();
        }
    }

    /**
     * Handle ESC key to close popover
     * @param {KeyboardEvent} event
     */
    function handleKeydown(event) {
        if (event.key === 'Escape' && isOpen) {
            closePopover();
        }
    }

    /**
     * Format file size
     * @param {number} bytes
     * @returns {string}
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
        return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    }

    /**
     * Format date
     * @param {number} timestamp
     * @returns {string}
     */
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    /**
     * Handle entry click to load
     * @param {string} id
     */
    async function handleEntryClick(id) {
        if (id === currentHistoryId) return;

        try {
            loadingEntryId = id;
            const entry = await switchToEntry(id);
            if (entry) {
                onLoadEntry(entry);
                closePopover();
            }
        } catch (err) {
            console.error('Failed to load entry:', err);
        } finally {
            loadingEntryId = null;
        }
    }

    /**
     * Handle delete button click
     * @param {Event} event
     * @param {string} id
     */
    function handleDeleteClick(event, id) {
        event.stopPropagation();
        deleteConfirmId = id;
    }

    /**
     * Confirm delete
     * @param {Event} event
     * @param {string} id
     */
    async function confirmDelete(event, id) {
        event.stopPropagation();
        try {
            await removeEntry(id);
            deleteConfirmId = null;
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    }

    /**
     * Cancel delete
     * @param {Event} event
     */
    function cancelDelete(event) {
        event.stopPropagation();
        deleteConfirmId = null;
    }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative">
    <!-- Trigger button -->
    <button
        onclick={togglePopover}
        class="file-history-button px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-all duration-150 flex items-center gap-2 whitespace-nowrap"
        aria-expanded={isOpen}
        aria-haspopup="true"
    >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        파일 이력
        {#if historyList.length > 0}
            <span class="bg-neutral-200 text-neutral-800 text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                {historyList.length}
            </span>
        {/if}
    </button>

    <!-- Popover -->
    {#if isOpen}
        <div
            in:fly={{ y: -10, duration: 200 }}
            out:fade={{ duration: 150 }}
            class="file-history-popover absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded shadow-lg z-50"
        >
            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <h3 class="text-sm font-medium text-neutral-900 whitespace-nowrap">파일 이력</h3>
                <button
                    onclick={closePopover}
                    class="p-1 hover:bg-neutral-100 rounded transition-colors"
                    aria-label="닫기"
                >
                    <svg class="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Search -->
            <div class="px-4 py-2.5 border-b border-neutral-100">
                <div class="relative">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="파일명 검색..."
                        class="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400"
                    />
                </div>
            </div>

            <!-- List -->
            <div class="max-h-80 overflow-y-auto">
                {#if isLoading && historyList.length === 0}
                    <div class="px-4 py-8 text-center text-neutral-600">
                        <div class="animate-spin rounded-full h-6 w-6 border-2 border-neutral-400 border-t-transparent mx-auto mb-2"></div>
                        불러오는 중...
                    </div>
                {:else if historyList.length === 0}
                    <div class="px-4 py-8 text-center text-neutral-600">
                        <svg class="w-10 h-10 text-neutral-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        저장된 파일이 없습니다
                    </div>
                {:else if filteredList.length === 0}
                    <div class="px-4 py-8 text-center text-neutral-600">
                        검색 결과가 없습니다
                    </div>
                {:else}
                    {#each filteredList as item (item.id)}
                        <div
                            onclick={() => handleEntryClick(item.id)}
                            onkeydown={(e) => e.key === 'Enter' && handleEntryClick(item.id)}
                            role="button"
                            tabindex="0"
                            class="px-4 py-3 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 cursor-pointer transition-colors {item.id === currentHistoryId ? 'bg-neutral-50' : ''}"
                        >
                            <div class="flex items-start gap-3">
                                <svg class="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-medium text-neutral-900 truncate">{item.fileName}</p>
                                        {#if item.id === currentHistoryId}
                                            <span class="flex-shrink-0 text-xs bg-neutral-900 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                                                현재 보는 중
                                            </span>
                                        {/if}
                                    </div>
                                    <p class="text-xs text-neutral-500 mt-0.5 whitespace-nowrap">
                                        {formatDate(item.uploadedAt)} · {formatFileSize(item.fileSize)}
                                    </p>

                                    <!-- Delete confirmation -->
                                    {#if deleteConfirmId === item.id}
                                        <div class="mt-2 flex items-center gap-2" in:fade={{ duration: 150 }}>
                                            <span class="text-xs text-neutral-700 whitespace-nowrap">삭제하시겠습니까?</span>
                                            <button
                                                onclick={(e) => confirmDelete(e, item.id)}
                                                class="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                                            >
                                                확인
                                            </button>
                                            <button
                                                onclick={cancelDelete}
                                                class="text-xs text-neutral-700 hover:text-neutral-900 whitespace-nowrap"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    {:else}
                                        <button
                                            onclick={(e) => handleDeleteClick(e, item.id)}
                                            class="mt-1 text-xs text-neutral-400 hover:text-red-600 transition-colors whitespace-nowrap"
                                        >
                                            삭제
                                        </button>
                                    {/if}
                                </div>

                                <!-- Loading indicator -->
                                {#if loadingEntryId === item.id}
                                    <div class="flex-shrink-0">
                                        <div class="animate-spin rounded-full h-4 w-4 border-2 border-neutral-400 border-t-transparent"></div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>
