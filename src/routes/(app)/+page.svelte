<script lang="ts">
	// A placeholder until step 03: what the plumbing reports.
	import { engine } from '#lib/engine.js';
	import { m } from '#lib/paraglide/messages.js';

	let engineStatus = $state(m.status_starting());
	let serviceWorkerStatus = $state(m.status_starting());

	$effect(() => {
		engine({ kind: 'ready' }).then((result) => {
			engineStatus = result.ok ? m.status_ready() : m.status_failed({ error: result.error });
		});

		if (!('serviceWorker' in navigator)) {
			serviceWorkerStatus = m.status_unavailable();
			return;
		}
		const update = () => {
			if (navigator.serviceWorker.controller) serviceWorkerStatus = m.status_ready();
		};
		navigator.serviceWorker.addEventListener('controllerchange', update);
		update();
		return () => navigator.serviceWorker.removeEventListener('controllerchange', update);
	});
</script>

<main class="p-8">
	<h1 class="text-2xl font-semibold">{m.app_name()}</h1>
	<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4">
		<dt>{m.skeleton_engine()}</dt>
		<dd>{engineStatus}</dd>
		<dt>{m.skeleton_service_worker()}</dt>
		<dd>{serviceWorkerStatus}</dd>
	</dl>
</main>
