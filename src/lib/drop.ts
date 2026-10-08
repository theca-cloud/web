// What a drop holds: its files with their paths below the drop (`a.txt`,
// `folder/b.txt`) and every folder, empty ones too, walked through the
// browser's entries API.
import type { Entry } from './engine';
import { err, ok, type Result } from './result';

export async function dropped(
	data: DataTransfer
): Promise<Result<{ entries: Entry[]; folders: string[] }, string>> {
	const entries: Entry[] = [];
	const folders: string[] = [];
	// Read at once: the drop's data is gone after the event. An item without
	// an entry (no entries API) is taken as a plain file.
	const roots: FileSystemEntry[] = [];
	for (const item of data.items) {
		if (item.kind !== 'file') continue;
		const entry = item.webkitGetAsEntry();
		const file = item.getAsFile();
		if (entry) roots.push(entry);
		else if (file) entries.push({ path: file.name, file });
	}

	async function walk(entry: FileSystemEntry, prefix: string) {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isFile) {
			const file = await new Promise<File>((resolve, reject) =>
				(entry as FileSystemFileEntry).file(resolve, reject)
			);
			entries.push({ path, file });
		} else if (entry.isDirectory) {
			folders.push(path);
			const reader = (entry as FileSystemDirectoryEntry).createReader();
			// A directory comes in batches, until an empty one.
			for (;;) {
				const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
					reader.readEntries(resolve, reject)
				);
				if (batch.length === 0) break;
				await Promise.all(batch.map((child) => walk(child, path)));
			}
		}
	}

	try {
		await Promise.all(roots.map((root) => walk(root, '')));
	} catch (e) {
		return err(String(e));
	}
	return ok({ entries, folders });
}
