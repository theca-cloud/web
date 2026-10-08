<script lang="ts">
	// Every setting through the matcher (decisions.md): a hand-made control
	// for known keys and shapes, the raw value for an unknown one. One Save
	// sends the changed ones, all or none; a refusal shows at its setting.
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import SettingField from '#lib/components/setting-field.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import { controlOf, groupOf, refusedKey, type Group } from '#lib/settings.js';

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
	const groups: [Group, string][] = [
		['general', m.settings_general()],
		['access', m.settings_access()],
		['smtp', m.settings_smtp()],
		['limits', m.settings_limits()],
		['jobs', m.settings_jobs()],
		['other', m.settings_other()]
	];

	const fields = $derived(
		data.settings.map((s) => {
			const control = controlOf(s.key, labels);
			return { ...s, control, group: groupOf(s.key, control) };
		})
	);
	// The edits, by key (`''`: back to the default); a setting not edited shows its saved value.
	let edits = $state<Record<string, string>>({});
	const saved = $derived(Object.fromEntries(data.settings.map((s) => [s.key, s.value ?? ''])));
	const current = (key: string) => edits[key] ?? saved[key];
	const changed = $derived(Object.keys(edits).filter((key) => edits[key] !== saved[key]));
	let refused = $state<{ key: string; message: string }>();
	let busy = $state(false);

	async function save() {
		busy = true;
		refused = undefined;
		const sent = Object.fromEntries(changed.map((key) => [key, edits[key]]));
		const body = Object.fromEntries(changed.map((key) => [key, edits[key] || null]));
		const result = await call(api.PATCH('/api/v1/admin/settings', { body }));
		busy = false;
		if (result.ok) {
			toast(m.settings_saved());
			await invalidate('app:admin');
			// Only what was sent: an edit made meanwhile stays.
			for (const [key, value] of Object.entries(sent)) {
				if (edits[key] === value) delete edits[key];
			}
			return;
		}
		const key = refusedKey(result.error.message);
		if (key) {
			refused = { key, message: explain(result.error) };
		} else {
			toast.error(explain(result.error));
		}
	}
</script>

<div class="sticky top-0 z-10 flex items-center gap-2 bg-background py-2">
	<Button size="sm" disabled={busy || changed.length === 0} onclick={save}>
		{m.settings_save({ count: changed.length })}
	</Button>
	{#if changed.length > 0}
		<Button size="sm" variant="ghost" onclick={() => (edits = {})}>
			{m.settings_discard()}
		</Button>
	{/if}
</div>

{#each groups as [group, title] (group)}
	{@const inGroup = fields.filter((f) => f.group === group)}
	{#if inGroup.length > 0}
		<section class="grid max-w-3xl">
			<h2 class="font-medium">{title}</h2>
			{#each inGroup as f (f.key)}
				<SettingField
					key={f.key}
					description={f.description}
					fallback={f.default}
					control={f.control}
					bind:value={() => current(f.key), (v) => (edits[f.key] = v)}
					error={refused?.key === f.key ? refused.message : undefined}
				/>
			{/each}
		</section>
	{/if}
{/each}
