<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();
</script>

<dl class="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-6 text-sm">
	<dt class="text-muted-foreground">{m.about_app()}</dt>
	<dd>{data.app}</dd>
	<dt class="text-muted-foreground">{m.about_server()}</dt>
	<dd>{data.server}</dd>
	<dt class="text-muted-foreground">{m.about_engine()}</dt>
	<dd>{data.engine}</dd>
	<dt class="text-muted-foreground">{m.about_service_worker()}</dt>
	<dd>{data.serviceWorker}</dd>
</dl>
