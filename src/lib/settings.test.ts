import { describe, expect, it } from 'vitest';
import {
	controlOf,
	groupOf,
	parseRate,
	refusedKey,
	shown,
	splitSeconds,
	type Labels
} from './settings';

const l: Labels = {
	open: 'Open',
	closed: 'Closed',
	anyone: 'Anyone',
	admins: 'Admins',
	on: 'On',
	off: 'Off',
	none: 'None',
	noLimit: 'No limit',
	strengths: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
};

describe('controlOf', () => {
	it('matches known keys, then shapes, else raw', () => {
		expect(controlOf('registration', l).kind).toBe('choice');
		expect(controlOf('oidc_link_by_email', l)).toEqual({
			kind: 'choice',
			options: [
				['true', 'On'],
				['false', 'Off']
			]
		});
		expect(controlOf('session_max_lifetime_secs', l)).toEqual({
			kind: 'duration',
			zero: 'No limit'
		});
		expect(controlOf('job_new_thing_interval_secs', l).kind).toBe('duration');
		expect(controlOf('rate_limit_something_new', l).kind).toBe('rate');
		expect(controlOf('smtp_port', l).kind).toBe('number');
		expect(controlOf('some_future_key', l).kind).toBe('raw');
	});

	it('groups them, unknown keys last', () => {
		expect(groupOf('smtp_host', controlOf('smtp_host', l))).toBe('smtp');
		expect(groupOf('password_strength', controlOf('password_strength', l))).toBe('access');
		expect(groupOf('trash_retention_secs', controlOf('trash_retention_secs', l))).toBe('storage');
		expect(groupOf('job_cleanup_interval_secs', controlOf('job_cleanup_interval_secs', l))).toBe(
			'jobs'
		);
		expect(groupOf('some_future_key', controlOf('some_future_key', l))).toBe('other');
	});
});

describe('conversions', () => {
	it('splits seconds into the largest even unit', () => {
		expect(splitSeconds(86400)).toEqual({ count: 1, unit: 'days' });
		expect(splitSeconds(900)).toEqual({ count: 15, unit: 'minutes' });
		expect(splitSeconds(90)).toEqual({ count: 90, unit: 'seconds' });
		expect(splitSeconds(0)).toEqual({ count: 0, unit: 'seconds' });
	});

	it('reads rates and refusals', () => {
		expect(parseRate('10/60')).toEqual({ count: 10, seconds: 60 });
		expect(parseRate('ten')).toBeNull();
		expect(refusedKey('invalid setting smtp_port: invalid digit')).toBe('smtp_port');
	});
});

describe('shown', () => {
	const w = {
		units: { seconds: 's', minutes: 'min', hours: 'h', days: 'd' },
		rate: (count: number, per: string) => `${count}/${per}`,
		empty: '(empty)'
	};
	it('shows a value as the page does', () => {
		expect(shown('closed', controlOf('registration', l), w)).toBe('Closed');
		expect(shown('2592000', controlOf('trash_retention_secs', l), w)).toBe('30 d');
		expect(shown('0', controlOf('session_max_lifetime_secs', l), w)).toBe('No limit');
		expect(shown('30/300', controlOf('rate_limit_login_ip', l), w)).toBe('30/5 min');
		expect(shown('Theca', controlOf('instance_name', l), w)).toBe('Theca');
		expect(shown('', controlOf('smtp_username', l), w)).toBe('(empty)');
	});
});
