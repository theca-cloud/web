<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let { data, children } = $props();
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="mb-6 flex flex-col items-center gap-3">
			<img src="/favicon.svg" alt={m.app_name()} class="size-12" />
			<p class="text-xl font-semibold">{data.instance.name}</p>
		</div>
		{@render children()}
	</div>
</main>
