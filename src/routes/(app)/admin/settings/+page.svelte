<script lang="ts">
	// Every setting through the matcher (decisions.md): a hand-made control
	// for known keys and shapes, the raw value for an unknown one. A card per
	// group, saying what differs from the defaults; its dialog edits that
	// group, one Save for the group's changes, all or none.
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ConnectionTest from '#lib/components/connection-test.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import SettingField from '#lib/components/setting-field.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import { controlOf, groupOf, refusedKey, shown, type Group } from '#lib/settings.js';

	let { data } = $props();

	const labels = {
		open: m.registration_open(),
		closed: m.registration_closed(),
		anyone: m.creation_anyone(),
		admins: m.creation_admins(),
		on: m.on(),
		off: m.off(),
		none: m.none(),
		noLimit: m.no_limit(),
		strengths: [m.strength_0(), m.strength_1(), m.strength_2(), m.strength_3(), m.strength_4()]
	};
	const words = {
		units: {
			seconds: m.unit_seconds(),
			minutes: m.unit_minutes(),
			hours: m.unit_hours(),
			days: m.unit_days()
		},
		rate: (count: number, per: string) => m.rate_shown({ count, per }),
		empty: m.setting_empty()
	};
	const groups: [Group, string, string][] = [
		['general', m.settings_general(), m.settings_general_text()],
		['access', m.settings_access(), m.settings_access_text()],
		['smtp', m.settings_smtp(), m.settings_smtp_text()],
		['storage', m.settings_storage(), m.settings_storage_text()],
		['limits', m.settings_limits(), m.settings_limits_text()],
		['jobs', m.settings_jobs(), m.settings_jobs_text()],
		['other', m.settings_other(), m.settings_other_text()]
	];
	// A known setting's human name (`setting_name_<key>`); an unknown one keeps its key.
	const messages = m as unknown as Record<string, (() => string) | undefined>;
	const nameOf = (key: string) => messages[`setting_name_${key}`]?.() ?? key;

	const fields = $derived(
		data.settings.map((s) => {
			const control = controlOf(s.key, labels);
			return { ...s, control, name: nameOf(s.key), group: groupOf(s.key, control) };
		})
	);
	const saved = $derived(Object.fromEntries(data.settings.map((s) => [s.key, s.value ?? ''])));

	/** A card's line: its settings that differ from the default, the first three. */
	function summary(group: Group): string {
		if (group === 'smtp' && !saved['smtp_host']) return m.settings_smtp_off();
		const custom = fields.filter((f) => f.group === group && saved[f.key] !== '');
		if (custom.length === 0) return m.settings_defaults();
		const listed = custom
			.slice(0, 3)
			.map((f) => `${f.name}: ${shown(saved[f.key], f.control, words)}`);
		if (custom.length > 3) listed.push(m.settings_more({ count: custom.length - 3 }));
		return listed.join(' · ');
	}

	// The open dialog's group and its edits, by key (`''`: back to the default).
	let editing = $state<Group>('general');
	let edits = $state<Record<string, string>>({});
	let refused = $state<{ key: string; message: string }>();
	let dialog: FormDialog;
	const current = (key: string) => edits[key] ?? saved[key];

	function edit(group: Group) {
		editing = group;
		edits = {};
		refused = undefined;
		dialog.show();
	}

	async function save(): Promise<string | undefined> {
		refused = undefined;
		const changed = Object.keys(edits).filter((key) => edits[key] !== saved[key]);
		if (changed.length === 0) return;
		const body = Object.fromEntries(changed.map((key) => [key, edits[key] || null]));
		const result = await call(api.PATCH('/api/v1/admin/settings', { body }));
		if (result.ok) {
			toast(m.settings_saved());
			await invalidate('app:admin');
			return;
		}
		const key = refusedKey(result.error.message);
		if (key) refused = { key, message: explain(result.error) };
		return explain(result.error);
	}

	const open = $derived(groups.find(([g]) => g === editing));

	// The Email dialog's tests: its SMTP values as typed (unsaved), over the saved ones.
	const smtpEdits = () =>
		Object.fromEntries(
			Object.entries(edits)
				.filter(([key]) => key.startsWith('smtp_'))
				.map(([key, value]) => [key, value || null])
		);
</script>

<div class="grid max-w-5xl gap-4 sm:grid-cols-2">
	{#each groups as [group, name, text] (group)}
		{#if fields.some((f) => f.group === group)}
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-semibold">{name}</Card.Title>
					<Card.Description>{text}</Card.Description>
					<Card.Action>
						<Button
							size="sm"
							variant="outline"
							aria-label="{m.edit()}: {name}"
							onclick={() => edit(group)}>{m.edit()}</Button
						>
					</Card.Action>
				</Card.Header>
				<Card.Content class="text-sm">{summary(group)}</Card.Content>
			</Card.Root>
		{/if}
	{/each}
</div>

<FormDialog
	bind:this={dialog}
	title={open?.[1] ?? ''}
	text={open?.[2]}
	action={m.save()}
	submit={save}
>
	<!-- The longest groups (rate limits) scroll inside the dialog. -->
	<div class="-mx-1 max-h-[60vh] overflow-y-auto px-1">
		{#each fields.filter((f) => f.group === editing) as f (f.key)}
			<SettingField
				key={f.key}
				name={f.name}
				description={f.description}
				fallback={f.default}
				control={f.control}
				bind:value={() => current(f.key), (v) => (edits[f.key] = v)}
				error={refused?.key === f.key ? refused.message : undefined}
			/>
		{/each}
	</div>
	{#if editing === 'smtp'}
		<div class="flex flex-wrap gap-x-4 gap-y-2">
			<ConnectionTest
				run={() => call(api.POST('/api/v1/admin/smtp/test', { body: smtpEdits() }))}
			/>
			<ConnectionTest
				label={m.smtp_send_test()}
				run={() => call(api.POST('/api/v1/admin/smtp/send-test', { body: smtpEdits() }))}
			/>
		</div>
	{/if}
</FormDialog>
