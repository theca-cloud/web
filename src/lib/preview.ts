// What a preview needs from the server's stream (`/files/{id}/content`):
// the kind of file, its first MiB as text, its bytes as a local `blob:` URL.
// Nothing here throws: every failure is a `Result`.
import { err, ok, type Result } from './result';

export type Kind = 'image' | 'svg' | 'video' | 'audio' | 'pdf' | 'html' | 'text' | 'none';

/** How much text is shown (the rest isn't loaded). */
export const TEXT_LIMIT = 1024 * 1024;

/** Shown at once below this; above, a button (decisions.md, previews). */
export const SMALL = 5 * 1024 * 1024;

export function contentUrl(file: string, version?: string | null): string {
	return `/api/v1/files/${file}/content${version ? `?version=${version}` : ''}`;
}

/**
 * The kind, from the server's `Content-Type` (its rules by extension), and
 * the name for what it serves as text but can be shown otherwise (HTML, SVG).
 */
export async function kindOf(url: string, name: string): Promise<Result<Kind, string>> {
	const lower = name.toLowerCase();
	if (lower.endsWith('.svg')) return ok('svg');
	if (lower.endsWith('.html') || lower.endsWith('.htm')) return ok('html');
	try {
		const head = await fetch(url, { method: 'HEAD' });
		if (!head.ok) return err(`HTTP ${head.status}`);
		const type = head.headers.get('content-type') ?? '';
		if (type.startsWith('image/')) return ok('image');
		if (type.startsWith('video/')) return ok('video');
		if (type.startsWith('audio/')) return ok('audio');
		if (type.startsWith('application/pdf')) return ok('pdf');
		if (type.startsWith('text/')) return ok('text');
		return ok('none');
	} catch (e) {
		return err(String(e));
	}
}

/** Its first MiB, as text (`cut`: there's more). */
export async function firstText(
	url: string
): Promise<Result<{ text: string; cut: boolean }, string>> {
	try {
		const answer = await fetch(url, { headers: { Range: `bytes=0-${TEXT_LIMIT - 1}` } });
		if (!answer.ok) return err(`HTTP ${answer.status}`);
		const total = answer.headers.get('content-range')?.split('/')[1];
		const text = await answer.text();
		return ok({ text, cut: total !== undefined && Number(total) > TEXT_LIMIT });
	} catch (e) {
		return err(String(e));
	}
}

/** Its bytes as a local URL of `type`, where the server's `sandbox` policy doesn't apply. */
export async function blobUrl(url: string, type: string): Promise<Result<string, string>> {
	try {
		const answer = await fetch(url);
		if (!answer.ok) return err(`HTTP ${answer.status}`);
		const bytes = await answer.arrayBuffer();
		return ok(URL.createObjectURL(new Blob([bytes], { type })));
	} catch (e) {
		return err(String(e));
	}
}

/**
 * An HTML file to render in an `<iframe sandbox>` (no script runs): its text,
 * with a policy blocking every outside resource (a tracking image would tell
 * someone it was opened).
 */
export async function htmlDocument(url: string): Promise<Result<string, string>> {
	try {
		const answer = await fetch(url);
		if (!answer.ok) return err(`HTTP ${answer.status}`);
		const policy = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
		return ok(
			`<meta http-equiv="Content-Security-Policy" content="${policy}">${await answer.text()}`
		);
	} catch (e) {
		return err(String(e));
	}
}
