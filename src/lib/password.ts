// The server's password scorer (zxcvbn, `common`'s code and dictionaries), its
// own WASM beside the engine's in `@theca/client`: loaded on the first page
// choosing a password, never by the Workers (decisions.md, Password strength).

/** A password's strength: zxcvbn's score (0 to 4) and its feedback, as codes. */
export type Strength = { score: number; warning: string | null; suggestions: string[] };
export type Scorer = (password: string, email: string) => Strength;

let scorer: Promise<Scorer | null> | undefined;

/** The scorer, loaded once; `null` if it couldn't be (the bar then stays hidden: the server still decides). */
export function loadScorer(): Promise<Scorer | null> {
	scorer ??= import('@theca/client/password/theca_password.js')
		.then(async (module) => {
			await module.default();
			return (password: string, email: string) =>
				JSON.parse(module.strength(password, email)) as Strength;
		})
		.catch(() => null);
	return scorer;
}

/** The floor kept at every level (`common::password::MIN_LEN`). */
export const MIN_LEN = 8;
