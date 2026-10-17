<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { title } from '#lib/title.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>{title(page)}</title>
</svelte:head>

{@render children()}
