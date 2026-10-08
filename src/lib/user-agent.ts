// A session's browser and system, shortened from its user agent ("Firefox on
// macOS"), for the account's list of sessions. `null`: nothing recognized (the
// session's own name then).

const browsers: [RegExp, string][] = [
	[/Edg\//, 'Edge'],
	[/OPR\//, 'Opera'],
	[/Firefox\//, 'Firefox'],
	[/Chrome\//, 'Chrome'],
	[/Safari\//, 'Safari']
];
const systems: [RegExp, string][] = [
	[/iPhone|iPad/, 'iOS'],
	[/Android/, 'Android'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/Windows/, 'Windows'],
	[/Linux/, 'Linux']
];

export function browserOf(agent: string | null | undefined): string | null {
	if (!agent) return null;
	const browser = browsers.find(([pattern]) => pattern.test(agent))?.[1];
	const system = systems.find(([pattern]) => pattern.test(agent))?.[1];
	if (browser && system) return `${browser} · ${system}`;
	return browser ?? system ?? null;
}
