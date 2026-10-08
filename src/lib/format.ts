// Sizes and dates as the tables show them.

const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/** `1.2 MiB`: powers of 1024, as the CLI shows them; one decimal below 10. */
export function formatSize(bytes: number): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	const shown = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
	return `${shown} ${units[unit]}`;
}

const dates = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** A date in the browser's language and time zone. */
export function formatDate(value: string): string {
	return dates.format(new Date(value));
}
