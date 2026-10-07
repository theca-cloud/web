// What the user reads for an API error: a message per stable `code`
// (CLAUDE.md, every string a message), the server's text as a last resort.
import { m } from '#lib/paraglide/messages.js';
import type { ApiError } from './api';

const byCode: Record<string, (error: ApiError) => string> = {
	network: () => m.error_network(),
	invalid_credentials: () => m.error_invalid_credentials(),
	invalid_totp: () => m.error_invalid_totp(),
	email_not_verified: () => m.error_email_not_verified(),
	account_suspended: () => m.error_account_suspended(),
	invalid_email: () => m.error_invalid_email(),
	weak_password: (e) => m.error_weak_password({ message: e.message }),
	registration_closed: () => m.error_registration_closed(),
	email_unavailable: () => m.error_email_unavailable(),
	invalid_token: () => m.error_invalid_token(),
	invalid_setup: (e) => m.error_invalid_setup({ message: e.message }),
	storage_unusable: (e) => m.error_storage_unusable({ message: e.message }),
	invalid_setup_token: () => m.error_invalid_setup_token(),
	already_set_up: () => m.error_already_set_up(),
	storage_name_taken: () => m.error_storage_name_taken(),
	rate_limited: () => m.error_rate_limited(),
	unknown_identity: () => m.error_unknown_identity(),
	identity_taken: () => m.error_identity_taken(),
	oidc_expired: () => m.error_oidc_expired(),
	oidc_refused: () => m.error_oidc_refused(),
	unknown_provider: () => m.error_unknown_provider()
};

/** The message for an API error. */
export function explain(error: ApiError): string {
	return byCode[error.code]?.(error) ?? m.error_unknown({ message: error.message });
}

/** The message for a bare code (an OIDC login's `?error=`). */
export function explainCode(code: string): string {
	return explain({ status: 0, code, message: code });
}
