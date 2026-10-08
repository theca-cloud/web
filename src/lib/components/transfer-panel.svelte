<script lang="ts">
	// The uploads, in a corner while they run and until closed: the total
	// progress, each file's state (per-file byte progress: later,
	// features.md), a cancel per file and for everything. Leaving the tab
	// during a run asks first.
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { explain } from '#lib/errors.js';
	import { formatSize } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { transfers, type FileState } from '#lib/transfers.svelte.js';

	const files = $derived(transfers.runs.flatMap((run) => run.files.map((file) => ({ run, file }))));
	const total = $derived(transfers.runs.reduce((sum, run) => sum + run.total, 0));
	const sent = $derived(transfers.runs.reduce((sum, run) => sum + run.sent, 0));
	const percent = $derived(total > 0 ? Math.round((sent / total) * 100) : 0);

	function label(file: FileState): string {
		switch (file.state) {
			case 'queued':
				return m.state_queued();
			case 'done':
				return m.state_done();
			case 'unchanged':
				return m.state_unchanged();
			case 'conflict':
				return m.state_conflict();
			case 'cancelled':
				return m.state_cancelled();
			case 'failed':
				return file.error ? explain(file.error) : m.error_unexpected();
		}
	}

	function onbeforeunload(event: BeforeUnloadEvent) {
		if (transfers.active) event.preventDefault();
	}
</script>

<svelte:window {onbeforeunload} />

{#if transfers.runs.length > 0}
	<section
		aria-label={m.transfers()}
		class="fixed right-4 bottom-4 z-40 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg border bg-popover p-3 text-sm shadow-lg"
	>
		<div class="flex items-center justify-between gap-2">
			<p class="font-medium">
				{transfers.active ? m.transfers_running({ count: files.length }) : m.transfers_finished()}
			</p>
			{#if transfers.active}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => transfers.runs.forEach((run) => !run.finished && transfers.cancel(run))}
				>
					{m.cancel_all()}
				</Button>
			{:else}
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={m.close()}
					onclick={() => transfers.dismiss()}
				>
					<XIcon />
				</Button>
			{/if}
		</div>
		<div
			role="progressbar"
			aria-label={m.transfers()}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={percent}
			class="h-1.5 overflow-hidden rounded-full bg-muted"
		>
			<div class="h-full bg-primary transition-[width]" style="width: {percent}%"></div>
		</div>
		<p class="text-xs text-muted-foreground">
			{m.transfers_progress({ done: formatSize(sent), total: formatSize(total) })}
		</p>
		<ul class="grid max-h-48 gap-1 overflow-y-auto">
			{#each files as { run, file } (`${run.id}/${file.path}`)}
				<li class="flex items-center gap-2">
					<span class="min-w-0 flex-1 truncate" title={file.path}>{file.path}</span>
					<span
						class={[
							'shrink-0 text-xs',
							file.state === 'failed' ? 'text-destructive' : 'text-muted-foreground'
						]}
					>
						{label(file)}
					</span>
					{#if file.state === 'queued'}
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={m.cancel_file({ name: file.path })}
							onclick={() => transfers.cancel(run, file.path)}
						>
							<XIcon />
						</Button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
