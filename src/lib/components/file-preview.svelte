<script lang="ts">
	// A file's preview (decisions.md, previews: nothing runs script, nothing big
	// loads unasked). Video and audio stream; text shows its first MiB; images,
	// SVG, HTML and PDF show at once below 5 MiB, behind a button above. Keyed by
	// the parent on the file and version, so its state starts over with them.
	import { Button } from '#lib/components/ui/button/index.js';
	import { formatSize } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { SMALL, blobUrl, contentUrl, firstText, htmlDocument, kindOf } from '#lib/preview.js';

	let {
		file,
		version,
		name,
		size
	}: { file: string; version?: string | null; name: string; size: number } = $props();

	const url = $derived(contentUrl(file, version));
	const kind = $derived(kindOf(url, name));
	let asked = $state(false);
	let rendered = $state(true);
	const loadsLittle = (k: string) => k === 'video' || k === 'audio' || k === 'text';

	/** Frees a `blob:` URL when its element goes. */
	const revoke = (src: string) => () => () => URL.revokeObjectURL(src);
</script>

{#snippet failed()}
	<p class="text-sm text-muted-foreground">{m.preview_failed()}</p>
{/snippet}

{#snippet source()}
	{#await firstText(url) then text}
		{#if text.ok}
			<pre class="max-h-[70vh] overflow-auto rounded-lg border bg-muted p-3 text-xs">{text.data
					.text}</pre>
			{#if text.data.cut}
				<p class="text-xs text-muted-foreground">{m.preview_cut()}</p>
			{/if}
		{:else}
			{@render failed()}
		{/if}
	{/await}
{/snippet}

{#await kind then k}
	{#if !k.ok}
		{@render failed()}
	{:else if k.data === 'none'}
		<!-- Nothing the browser shows: the download button only. -->
	{:else if !loadsLittle(k.data) && size > SMALL && !asked}
		<div>
			<Button variant="outline" onclick={() => (asked = true)}>
				{m.show_preview({ size: formatSize(size) })}
			</Button>
		</div>
	{:else if k.data === 'video'}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video controls preload="metadata" src={url} class="max-h-[70vh] max-w-full rounded-lg"></video>
	{:else if k.data === 'audio'}
		<audio controls preload="metadata" src={url}></audio>
	{:else if k.data === 'text'}
		{@render source()}
	{:else if k.data === 'image'}
		<img src={url} alt={name} class="max-h-[70vh] max-w-full rounded-lg border" />
	{:else if k.data === 'svg'}
		{#await blobUrl(url, 'image/svg+xml') then src}
			{#if src.ok}
				<img
					src={src.data}
					alt={name}
					class="max-h-[70vh] max-w-full rounded-lg border"
					{@attach revoke(src.data)}
				/>
			{:else}
				{@render failed()}
			{/if}
		{/await}
	{:else if k.data === 'pdf'}
		{#await blobUrl(url, 'application/pdf') then src}
			{#if src.ok}
				<iframe
					src={src.data}
					title={name}
					class="h-[80vh] w-full rounded-lg border"
					{@attach revoke(src.data)}
				></iframe>
			{:else}
				{@render failed()}
			{/if}
		{/await}
	{:else if k.data === 'html'}
		<div class="flex gap-1">
			<Button
				size="sm"
				variant={rendered ? 'secondary' : 'ghost'}
				onclick={() => (rendered = true)}
			>
				{m.preview_rendered()}
			</Button>
			<Button
				size="sm"
				variant={rendered ? 'ghost' : 'secondary'}
				onclick={() => (rendered = false)}
			>
				{m.preview_raw()}
			</Button>
		</div>
		{#if rendered}
			{#await htmlDocument(url) then doc}
				{#if doc.ok}
					<!-- No `allow-scripts`: nothing in it runs. -->
					<iframe
						sandbox=""
						srcdoc={doc.data}
						title={name}
						class="h-[70vh] w-full rounded-lg border bg-white"
					></iframe>
				{:else}
					{@render failed()}
				{/if}
			{/await}
		{:else}
			{@render source()}
		{/if}
	{/if}
{/await}
