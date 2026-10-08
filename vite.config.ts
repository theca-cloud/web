import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// The dev server (scripts/dev.sh), behind this one: same origin, no CORS.
const server = 'http://localhost:8093';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// A single-page app: the server answers index.html for every path it
			// doesn't use (WEB_DIR), and the app routes it.
			adapter: adapter({ fallback: 'index.html' })
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// English only for now: no locale to detect or remember yet.
			strategy: ['baseLocale']
		})
	],
	server: {
		// Its port is PUBLIC_URL's (scripts/dev.sh): taken, it fails rather than
		// moves. Not Vite's default 5173, which other projects keep busy.
		port: 5193,
		strictPort: true,
		proxy: { '/api': server, '/dav': server }
	},
	// The engine's worker imports @theca/client as an ES module.
	worker: { format: 'es' },
	// @theca/client's .wasm is loaded from its own URL (import.meta.url), which pre-bundling breaks.
	optimizeDeps: { exclude: ['@theca/client'] },
	test: {
		expect: { requireAssertions: true },
		include: ['src/**/*.test.ts']
	}
});
