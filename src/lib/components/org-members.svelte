<script lang="ts">
	// An organization's members and pending invitations: added by email (an
	// account joins at once, another address is invited: the server decides),
	// removed or uninvited (never the owner).
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Member = components['schemas']['Member'];

	let { organization, members }: { organization: string; members: Member[] } = $props();

	let adding: FormDialog;
	let confirm: ConfirmDialog;
	let email = $state('');

	function add() {
		email = '';
		adding.show();
	}

	async function submit() {
		const params = { path: { id: organization } };
		const body = { email: email.trim() };
		const result = await call(api.POST('/api/v1/organizations/{id}/members', { params, body }));
		if (!result.ok) return explain(result.error);
		toast(
			result.data.joined
				? m.member_joined({ email: body.email })
				: m.member_invited({ email: body.email })
		);
		await invalidate('app:organization');
	}

	async function remove(member: Member) {
		const sure = await confirm.ask(
			member.joined
				? {
						title: m.member_remove_title({ email: member.email }),
						text: m.member_remove_text(),
						action: m.remove()
					}
				: {
						title: m.invitation_cancel_title({ email: member.email }),
						text: m.invitation_cancel_text(),
						action: m.invitation_cancel()
					}
		);
		if (!sure) return;
		const params = { path: { id: organization, user: member.id } };
		const result = await call(api.DELETE('/api/v1/organizations/{id}/members/{user}', { params }));
		if (result.ok) {
			await invalidate('app:organization');
		} else {
			toast.error(explain(result.error));
		}
	}
</script>

{#snippet badge(text: string)}
	<span class="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{text}</span>
{/snippet}

<Table.Root>
	<Table.Body>
		{#each members as member (member.id)}
			<Table.Row>
				<Table.Cell class="font-medium">
					{member.email}
					{#if member.owner}{@render badge(m.member_owner())}{/if}
					{#if !member.joined}{@render badge(m.member_pending())}{/if}
				</Table.Cell>
				<Table.Cell class="text-right">
					{#if !member.owner}
						<Button
							variant="ghost"
							size="sm"
							aria-label="{m.remove()} {member.email}"
							onclick={() => remove(member)}
						>
							{member.joined ? m.remove() : m.invitation_cancel()}
						</Button>
					{/if}
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
<div>
	<Button size="sm" onclick={add}>{m.member_add()}</Button>
</div>

<FormDialog
	bind:this={adding}
	title={m.member_add()}
	text={m.member_add_text()}
	action={m.member_add()}
	{submit}
>
	<div class="grid gap-2">
		<Label for="member-email">{m.email()}</Label>
		<Input id="member-email" type="email" required autocomplete="off" bind:value={email} />
	</div>
</FormDialog>

<ConfirmDialog bind:this={confirm} />
