<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data, children } = $props();
	let error = $state<string>();

	async function logout() {
		const result = await call(api.POST('/api/v1/auth/logout'));
		// A session already gone (401): logged out all the same.
		if (result.ok || result.error.status === 401) {
			await goto('/login', { invalidateAll: true });
		} else {
			error = explain(result.error);
		}
	}
</script>

<header class="flex items-center justify-between border-b px-4 py-2">
	<a href="/" class="font-semibold">{m.app_name()}</a>
	{#if error}
		<p role="alert" class="text-sm text-destructive">{error}</p>
	{/if}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" aria-label={m.account_menu()}>{data.me.email}</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onSelect={logout}>{m.logout()}</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</header>

{@render children()}
