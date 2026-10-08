// The admin's settings page: which control shows each setting (decisions.md:
// a hand-made one for known keys and shapes, the raw value for an unknown
// key), its group, and the conversions between a control and the stored text.

export type Control =
	| { kind: 'choice'; options: [value: string, label: string][] }
	| { kind: 'duration'; zero?: string }
	| { kind: 'rate' }
	| { kind: 'number' }
	| { kind: 'text' }
	| { kind: 'raw' };

export type Group = 'general' | 'access' | 'smtp' | 'limits' | 'jobs' | 'other';

/** Labels the matcher needs, from the page's messages. */
export type Labels = {
	open: string;
	closed: string;
	anyone: string;
	admins: string;
	on: string;
	off: string;
	none: string;
	noLimit: string;
	strengths: string[];
};

const switches = ['oidc_link_by_email', 'oidc_allow_internal_issuers'];
const numbers = ['max_pending_uploads', 'smtp_port'];
const texts = ['instance_name', 'smtp_host', 'smtp_username', 'smtp_from', 'smtp_password_file'];

/** The control for a setting: by exact key, then by shape, else its raw text. */
export function controlOf(key: string, l: Labels): Control {
	const choices: Record<string, [string, string][]> = {
		registration: [
			['open', l.open],
			['closed', l.closed]
		],
		organization_creation: [
			['anyone', l.anyone],
			['admins', l.admins]
		],
		smtp_tls: [
			['starttls', 'STARTTLS'],
			['tls', 'TLS'],
			['none', l.none]
		],
		password_strength: l.strengths.map((name, level) => [String(level), `${level}: ${name}`])
	};
	if (key in choices) return { kind: 'choice', options: choices[key] };
	if (switches.includes(key))
		return {
			kind: 'choice',
			options: [
				['true', l.on],
				['false', l.off]
			]
		};
	if (key === 'session_max_lifetime_secs') return { kind: 'duration', zero: l.noLimit };
	if (key.endsWith('_secs')) return { kind: 'duration' };
	if (key.startsWith('rate_limit_')) return { kind: 'rate' };
	if (numbers.includes(key)) return { kind: 'number' };
	if (texts.includes(key)) return { kind: 'text' };
	return { kind: 'raw' };
}

/** Where a setting shows on the page. */
export function groupOf(key: string, control: Control): Group {
	if (control.kind === 'raw') return 'other';
	if (key.startsWith('smtp_')) return 'smtp';
	if (key.startsWith('rate_limit_')) return 'limits';
	if (key.startsWith('job_')) return 'jobs';
	if (['registration', 'organization_creation', 'password_strength'].includes(key)) return 'access';
	if (key.startsWith('oidc_') || key.startsWith('session_')) return 'access';
	return 'general';
}

export const units = { seconds: 1, minutes: 60, hours: 3600, days: 86400 } as const;
export type Unit = keyof typeof units;

/** Seconds as a number of the largest unit dividing them evenly. */
export function splitSeconds(seconds: number): { count: number; unit: Unit } {
	for (const unit of ['days', 'hours', 'minutes'] as const) {
		if (seconds > 0 && seconds % units[unit] === 0) {
			return { count: seconds / units[unit], unit };
		}
	}
	return { count: seconds, unit: 'seconds' };
}

/** A rate limit's text (`count/seconds`) as its parts; `null` if it isn't one. */
export function parseRate(text: string): { count: number; seconds: number } | null {
	const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
	return match ? { count: Number(match[1]), seconds: Number(match[2]) } : null;
}

/** The setting a refusal names (`invalid setting <key>: <reason>`), if any. */
export function refusedKey(message: string): string | null {
	return /setting (\w+)/.exec(message)?.[1] ?? null;
}
