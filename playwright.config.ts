import { defineConfig, devices } from '@playwright/test';

// THECA_TEST_APP (CI): the server serving build/, as in production. Unset: the
// Vite dev server, started here, in front of scripts/dev.sh's server.
const app = process.env.THECA_TEST_APP;

export default defineConfig({
	testDir: 'tests/e2e',
	use: { baseURL: app ?? 'http://localhost:5173' },
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				// Full Chromium: the headless shell ignores the flag below.
				channel: 'chromium',
				// CI serves the app over plain HTTP on a host name (http://theca:8080):
				// not a secure context, so no Service Worker without this flag.
				launchOptions: app
					? { args: [`--unsafely-treat-insecure-origin-as-secure=${app}`] }
					: undefined
			}
		}
	],
	webServer: app
		? undefined
		: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true }
});
