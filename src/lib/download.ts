// Downloads: a link the browser saves. Through the Service Worker's engine
// when it controls the page (chunks from the storage, no file in memory);
// otherwise (a first load, before it activates) the server's stream.

type Downloadable = {
	id: string;
	name: string;
	size?: number | null;
	current_version?: string | null;
};

/** Saves `file` (its version from the listing): a link followed, as a click would. */
export function download(file: Downloadable) {
	const version = file.current_version ?? '';
	const link = document.createElement('a');
	if (navigator.serviceWorker?.controller) {
		// A plain navigation: Chromium doesn't send `download` links through the
		// Service Worker. Its answer, an attachment, is saved; the page stays.
		const query = new URLSearchParams({ version, size: String(file.size ?? ''), name: file.name });
		link.href = `/sw/download/${file.id}?${query}`;
	} else {
		// The server serves files inline (previews): `download` makes it a file.
		link.href = `/api/v1/files/${file.id}/content${version ? `?version=${version}` : ''}`;
		link.download = file.name;
	}
	link.click();
}
