<script lang="ts">
	// An error page's content: a message per status (the server's own message
	// for the others), and a way back.
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let { href, back }: { href: string; back: string } = $props();

	const message = $derived.by(() => {
		switch (page.status) {
			case 404:
				return m.error_page_not_found();
			case 403:
				return m.error_page_forbidden();
			case 502:
			case 503:
				return m.error_page_unavailable();
			default:
				return page.error?.message ?? m.error_unexpected();
		}
	});
</script>

<div class="grid gap-4">
	<h1 class="text-lg font-medium">{m.error_page_title({ status: page.status })}</h1>
	<p class="text-muted-foreground">{message}</p>
	<div>
		<Button {href} variant="outline">{back}</Button>
	</div>
</div>
