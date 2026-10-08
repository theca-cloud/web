<script lang="ts">
	let { data, children } = $props();
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<div class="w-full max-w-md">
		<p class="mb-6 text-center text-xl font-semibold">{data.instance.name}</p>
		{@render children()}
	</div>
</main>
