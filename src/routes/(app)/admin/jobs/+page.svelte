<script lang="ts">
	// Every background job, its interval and last runs; one run now. While a
	// run is going, the list reloads every 2 seconds until it ends.
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatDate } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { splitSeconds } from '#lib/settings.js';

	let { data } = $props();

	const running = $derived(data.jobs.some((j) => j.runs.some((r) => r.status === 'running')));

	$effect(() => {
		if (!running) return;
		const timer = setInterval(() => invalidate('app:admin'), 2000);
		return () => clearInterval(timer);
	});

	async function run(job: string) {
		const params = { path: { job } };
		const result = await call(api.POST('/api/v1/admin/jobs/{job}/run', { params }));
		if (!result.ok) toast.error(explain(result.error));
		await invalidate('app:admin');
	}

	const unitNames = {
		seconds: m.unit_seconds(),
		minutes: m.unit_minutes(),
		hours: m.unit_hours(),
		days: m.unit_days()
	};

	function every(seconds: number) {
		const { count, unit } = splitSeconds(seconds);
		return m.job_every({ count, unit: unitNames[unit] });
	}

	function took(started: string, finished?: string | null) {
		if (!finished) return '';
		const ms = new Date(finished).getTime() - new Date(started).getTime();
		return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
	}
</script>

{#each data.jobs as job (job.job)}
	<section class="grid max-w-3xl gap-2">
		<div class="flex items-center gap-2">
			<h2 class="flex-1 font-medium">
				<span class="font-mono">{job.job}</span>
				<span class="ml-1 text-sm font-normal text-muted-foreground"
					>{every(job.interval_secs)}</span
				>
			</h2>
			<Button
				size="sm"
				variant="outline"
				aria-label="{m.job_run()} {job.job}"
				disabled={job.runs.some((r) => r.status === 'running')}
				onclick={() => run(job.job)}
			>
				{m.job_run()}
			</Button>
		</div>
		{#if job.runs.length === 0}
			<p class="text-sm text-muted-foreground">{m.job_never()}</p>
		{:else}
			<Table.Root aria-label={m.job_runs({ job: job.job })}>
				<Table.Body>
					{#each job.runs as r (r.id)}
						<Table.Row>
							<Table.Cell class="text-muted-foreground">{formatDate(r.started_at)}</Table.Cell>
							<Table.Cell
								class={r.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}
							>
								{r.status}
							</Table.Cell>
							<Table.Cell class="text-right text-muted-foreground tabular-nums">
								{m.job_items({ count: r.items })}
							</Table.Cell>
							<Table.Cell class="text-right text-muted-foreground tabular-nums">
								{took(r.started_at, r.finished_at)}
							</Table.Cell>
						</Table.Row>
						{#if r.error}
							<Table.Row>
								<Table.Cell
									colspan={4}
									class="font-mono text-xs whitespace-pre-wrap text-destructive"
								>
									{r.error}
								</Table.Cell>
							</Table.Row>
						{/if}
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>
{/each}
