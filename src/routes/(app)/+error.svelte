<script lang="ts">
	// Errors inside the app (a library or folder not found, the server
	// failing): in the frame, the sidebar still there.
	import ErrorMessage from '#lib/components/error-message.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<div class="p-6">
	<ErrorMessage href="/" back={m.back_home()} />
</div>
