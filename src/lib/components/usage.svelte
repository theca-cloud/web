<script lang="ts">
	// How full an organization is: "1.2 GiB of 10 GiB used", and a bar when it
	// has a quota (red above 90 %).
	import { formatSize } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';

	let { used, quota }: { used: number; quota?: number | null } = $props();
</script>

<div class="grid max-w-sm gap-1">
	<p class="text-sm text-muted-foreground">
		{quota
			? m.usage_of({ used: formatSize(used), quota: formatSize(quota) })
			: m.usage({ used: formatSize(used) })}
	</p>
	{#if quota}
		<div
			role="meter"
			aria-label={m.usage_label()}
			aria-valuemin={0}
			aria-valuemax={quota}
			aria-valuenow={used}
			class="h-1.5 overflow-hidden rounded-full bg-muted"
		>
			<div
				class={['h-full', used / quota > 0.9 ? 'bg-destructive' : 'bg-primary']}
				style:width="{Math.min(100, (used / quota) * 100)}%"
			></div>
		</div>
	{/if}
</div>
