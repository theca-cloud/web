<script lang="ts">
	// A new password's field and its strength, scored as the server will (the
	// same zxcvbn): a bar of four, the instance's level marked, zxcvbn's
	// feedback below. It guides; the server decides (the submit stays enabled).
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { MIN_LEN, loadScorer, type Scorer } from '#lib/password.js';

	let {
		value = $bindable(''),
		email,
		level,
		label = m.new_password(),
		id = 'password'
	}: {
		value?: string;
		/** The account's email: it counts against the password. */
		email: string;
		/** The score the instance asks for (0: none, only the length). */
		level: number;
		label?: string;
		id?: string;
	} = $props();

	let scorer = $state<Scorer | null>(null);
	// Started once with the field (no reactive input to follow).
	loadScorer().then((s) => (scorer = s));

	const strength = $derived(scorer && value ? scorer(value, email) : null);
	const short = $derived(value.length > 0 && [...value].length < MIN_LEN);
	const enough = $derived(!short && strength !== null && strength.score >= level);
	const names = [m.strength_0(), m.strength_1(), m.strength_2(), m.strength_3(), m.strength_4()];

	const warnings: Record<string, () => string> = {
		straight_rows_of_keys_are_easy_to_guess: m.password_warning_keyboard_rows,
		short_keyboard_patterns_are_easy_to_guess: m.password_warning_keyboard_patterns,
		repeats_like_aaa_are_easy_to_guess: m.password_warning_repeats,
		repeats_like_abc_abc_are_only_slightly_harder_to_guess: m.password_warning_repeated_words,
		this_is_a_top10_password: m.password_warning_top10,
		this_is_a_top100_password: m.password_warning_top100,
		this_is_a_common_password: m.password_warning_common,
		this_is_similar_to_a_commonly_used_password: m.password_warning_similar,
		sequences_like_abc_are_easy_to_guess: m.password_warning_sequences,
		recent_years_are_easy_to_guess: m.password_warning_recent_years,
		a_word_by_itself_is_easy_to_guess: m.password_warning_one_word,
		dates_are_often_easy_to_guess: m.password_warning_dates,
		names_and_surnames_by_themselves_are_easy_to_guess: m.password_warning_names,
		common_names_and_surnames_are_easy_to_guess: m.password_warning_common_names
	};
	const suggestions: Record<string, () => string> = {
		use_a_few_words_avoid_common_phrases: m.password_suggestion_few_words,
		no_need_for_symbols_digits_or_uppercase_letters: m.password_suggestion_no_symbols,
		add_another_word_or_two: m.password_suggestion_another_word,
		capitalization_doesnt_help_very_much: m.password_suggestion_capitalization,
		all_uppercase_is_almost_as_easy_to_guess_as_all_lowercase: m.password_suggestion_uppercase,
		reversed_words_arent_much_harder_to_guess: m.password_suggestion_reversed,
		predictable_substitutions_dont_help_very_much: m.password_suggestion_substitutions,
		use_a_longer_keyboard_pattern_with_more_turns: m.password_suggestion_keyboard,
		avoid_repeated_words_and_characters: m.password_suggestion_repeats,
		avoid_sequences: m.password_suggestion_sequences,
		avoid_recent_years: m.password_suggestion_recent_years,
		avoid_years_that_are_associated_with_you: m.password_suggestion_your_years,
		avoid_dates_and_years_that_are_associated_with_you: m.password_suggestion_your_dates
	};
	const feedback = $derived(
		strength
			? [strength.warning, ...strength.suggestions].flatMap((code) => {
					const message = code ? (warnings[code] ?? suggestions[code]) : undefined;
					return message ? [message()] : [];
				})
			: []
	);
</script>

<div class="grid gap-2">
	<Label for={id}>{label}</Label>
	<Input {id} type="password" autocomplete="new-password" required bind:value />
	{#if strength}
		<div
			role="meter"
			aria-label={m.strength()}
			aria-valuemin={0}
			aria-valuemax={4}
			aria-valuenow={strength.score}
			aria-valuetext={names[strength.score]}
			class="grid grid-cols-4 gap-1"
		>
			{#each [1, 2, 3, 4] as segment (segment)}
				<div
					class={[
						'h-1 rounded-full',
						segment > strength.score ? 'bg-muted' : enough ? 'bg-primary' : 'bg-destructive'
					]}
				></div>
			{/each}
		</div>
		<p class="text-xs text-muted-foreground">
			{#if short}
				{m.password_too_short({ count: MIN_LEN })}
			{:else if level > 0 && !enough}
				{m.strength_needed({ strength: names[strength.score], needed: names[level] })}
			{:else}
				{names[strength.score]}
			{/if}
		</p>
		{#if !enough && feedback.length > 0}
			<ul class="list-disc pl-4 text-xs text-muted-foreground">
				{#each feedback as line (line)}
					<li>{line}</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
