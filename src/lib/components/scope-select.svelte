<script lang="ts">
	// Where search or trash looks, widening from the context (decisions.md):
	// folder → library → organization → everywhere.
	import { m } from '#lib/paraglide/messages.js';
	import type { Scope, ScopeOption } from '#lib/scope.js';

	let {
		options,
		scope,
		pick
	}: { options: ScopeOption[]; scope: Scope; pick: (scope: Scope) => void } = $props();

	const key = (s: Scope) => JSON.stringify(s);
</script>

<label class="grid gap-1 text-sm">
	{m.search_in()}
	<select
		aria-label={m.search_in()}
		class="h-8 rounded-lg border border-input bg-background px-2 text-sm"
		value={key(scope)}
		onchange={(event) => pick(JSON.parse(event.currentTarget.value))}
	>
		{#each options as option (key(option.scope))}
			<option value={key(option.scope)}>{option.label}</option>
		{/each}
	</select>
</label>
