<script lang="ts">
	// One setting, shown by its control (`#lib/settings.ts`). `value` is the
	// stored text, `''` for the default (sent as `null`).
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { NativeSelect } from '#lib/components/ui/native-select/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { parseRate, splitSeconds, units, type Control, type Unit } from '#lib/settings.js';

	let {
		key,
		description,
		fallback,
		control,
		value = $bindable(''),
		error
	}: {
		key: string;
		description: string;
		/** The setting's default, as stored. */
		fallback: string;
		control: Control;
		value?: string;
		error?: string;
	} = $props();

	const id = $derived(`setting-${key}`);
	const unitNames: Record<Unit, string> = {
		seconds: m.unit_seconds(),
		minutes: m.unit_minutes(),
		hours: m.unit_hours(),
		days: m.unit_days()
	};

	// A duration's or a rate's parts, from the value (or the default, as a starting point).
	const rate = $derived(parseRate(value || fallback));
	const seconds = $derived(
		control.kind === 'rate' ? (rate?.seconds ?? 0) : Number(value || fallback) || 0
	);
	const split = $derived(splitSeconds(seconds));

	function duration(count: string, unit: Unit) {
		const total = String(Math.round(Number(count) * units[unit]));
		value = control.kind === 'rate' ? `${rate?.count ?? 0}/${total}` : total;
	}

	/** The default as the page shows it. */
	const shownDefault = $derived.by(() => {
		if (control.kind === 'choice') {
			return control.options.find(([v]) => v === fallback)?.[1] ?? fallback;
		}
		if (control.kind === 'duration') {
			if (Number(fallback) === 0 && control.zero) return control.zero;
			const s = splitSeconds(Number(fallback));
			return `${s.count} ${unitNames[s.unit]}`;
		}
		if (control.kind === 'rate') {
			const r = parseRate(fallback);
			if (!r) return fallback;
			const s = splitSeconds(r.seconds);
			return m.rate_shown({ count: r.count, per: `${s.count} ${unitNames[s.unit]}` });
		}
		return fallback || m.setting_empty();
	});
</script>

{#snippet durationFields(label: string)}
	<Input
		type="number"
		min="0"
		aria-label={label}
		class="w-24"
		value={split.count}
		onchange={(e) => duration(e.currentTarget.value, split.unit)}
	/>
	<NativeSelect
		aria-label="{label} ({m.unit()})"
		value={split.unit}
		onchange={(e) => duration(String(split.count), e.currentTarget.value as Unit)}
	>
		{#each Object.entries(unitNames) as [unit, name] (unit)}
			<option value={unit}>{name}</option>
		{/each}
	</NativeSelect>
{/snippet}

<div class="grid gap-1.5 border-b py-3 last:border-b-0">
	<div class="flex flex-wrap items-baseline gap-x-2">
		<Label for={id} class="font-mono text-xs">{key}</Label>
		<span class="text-xs text-muted-foreground">{m.setting_default({ value: shownDefault })}</span>
	</div>
	<p class="text-sm text-muted-foreground">{description}</p>
	<div class="flex flex-wrap items-center gap-2">
		{#if control.kind === 'choice'}
			<NativeSelect {id} bind:value>
				<option value="">{m.setting_default({ value: shownDefault })}</option>
				{#each control.options as [v, label] (v)}
					<option value={v}>{label}</option>
				{/each}
			</NativeSelect>
		{:else if control.kind === 'duration'}
			{#if value === ''}
				<Button {id} size="sm" variant="outline" onclick={() => (value = fallback)}>
					{m.setting_change()}
				</Button>
			{:else}
				{@render durationFields(key)}
				{#if control.zero && value === '0'}
					<span class="text-sm text-muted-foreground">{control.zero}</span>
				{/if}
			{/if}
		{:else if control.kind === 'rate'}
			{#if value === ''}
				<Button {id} size="sm" variant="outline" onclick={() => (value = fallback)}>
					{m.setting_change()}
				</Button>
			{:else}
				<Input
					{id}
					type="number"
					min="0"
					aria-label={key}
					class="w-24"
					value={rate?.count ?? 0}
					onchange={(e) => (value = `${e.currentTarget.value}/${seconds}`)}
				/>
				<span class="text-sm">{m.rate_per()}</span>
				{@render durationFields(`${key} (${m.rate_window()})`)}
			{/if}
		{:else}
			<Input
				{id}
				inputmode={control.kind === 'number' ? 'numeric' : undefined}
				class={control.kind === 'raw' ? 'font-mono' : ''}
				placeholder={fallback}
				bind:value
			/>
		{/if}
		{#if value !== ''}
			<Button size="sm" variant="ghost" onclick={() => (value = '')}>{m.setting_reset()}</Button>
		{/if}
	</div>
	{#if error}
		<p role="alert" class="text-sm text-destructive">{error}</p>
	{/if}
</div>
