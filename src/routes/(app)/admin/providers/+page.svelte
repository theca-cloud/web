<script lang="ts">
	// The instance-wide login providers: full sessions, listed on the login
	// page; their secret may be a file path (the admin owns the server).
	import IdentityProviders from '#lib/components/identity-providers.svelte';
	import { api, call } from '#lib/api.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();
</script>

<IdentityProviders
	providers={data.providers}
	text={m.admin_providers_text()}
	secretFile
	save={(body, id) =>
		id
			? call(api.PATCH('/api/v1/admin/identity-providers/{id}', { params: { path: { id } }, body }))
			: call(api.POST('/api/v1/admin/identity-providers', { body }))}
	remove={(id) =>
		call(api.DELETE('/api/v1/admin/identity-providers/{id}', { params: { path: { id } } }))}
	test={(issuer) => call(api.POST('/api/v1/admin/identity-providers/test', { body: { issuer } }))}
/>
