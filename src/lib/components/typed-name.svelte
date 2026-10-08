<script lang="ts">
	// What a heavy deletion asks to be typed (an organization's name, an
	// account's email), shown to copy (decisions.md).
	import { Input } from '#lib/components/ui/input/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let {
		name,
		label,
		value = $bindable('')
	}: { name: string; label: string; value?: string } = $props();
</script>

<p class="text-sm">
	{m.type_to_confirm()}
	<code class="rounded bg-muted px-1 font-mono break-all select-all">{name}</code>
</p>
<Input aria-label={label} autocomplete="off" required bind:value />
