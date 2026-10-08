<script lang="ts">
	// An admin list's search: a GET form, so the query stays in the address
	// (`?q=`) and the page's `load` searches.
	import SearchIcon from '@lucide/svelte/icons/search';
	import { Input } from '#lib/components/ui/input/index.js';

	let { q, label }: { q: string; label: string } = $props();
</script>

<form role="search" method="get" class="relative max-w-sm">
	<SearchIcon
		class="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
	/>
	<Input name="q" type="search" aria-label={label} placeholder={label} value={q} class="pl-8" />
</form>
