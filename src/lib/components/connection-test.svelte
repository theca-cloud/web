<script lang="ts">
	// A connection test's button and its outcome (decisions.md, Connection
	// tests): the server's answer in green, or what failed in red. A helper,
	// never required to save. `run` tests the values as typed.
	import { Button } from '#lib/components/ui/button/index.js';
	import type { ApiError } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Result } from '#lib/result.js';

	type Outcome = components['schemas']['ConnectionTest'];

	let {
		label = m.connection_test(),
		run
	}: {
		label?: string;
		run: () => Promise<Result<Outcome, ApiError>>;
	} = $props();

	let busy = $state(false);
	let outcome = $state<{ ok: boolean; message: string }>();

	async function test() {
		busy = true;
		outcome = undefined;
		const result = await run();
		busy = false;
		// A refused request (an invalid value) is a failed test too, said by its code.
		outcome = result.ok ? result.data : { ok: false, message: explain(result.error) };
	}
</script>

<div class="grid gap-1.5">
	<div>
		<Button type="button" size="sm" variant="outline" disabled={busy} onclick={test}>
			{busy ? m.connection_testing() : label}
		</Button>
	</div>
	<p
		role="status"
		class={['text-sm break-words', outcome?.ok ? 'text-emerald-700' : 'text-destructive']}
	>
		{#if outcome}
			{outcome.ok
				? m.connection_ok({ message: outcome.message })
				: m.connection_failed({ message: outcome.message })}
		{/if}
	</p>
</div>
