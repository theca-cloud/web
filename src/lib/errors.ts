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
	weak_password: () => m.error_weak_password(),
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
	unknown_provider: () => m.error_unknown_provider(),
	name_taken: () => m.error_name_taken(),
	name_invalid: () => m.error_name_invalid(),
	move_into_itself: () => m.error_move_into_itself(),
	other_organization: () => m.error_other_organization(),
	library_name_taken: () => m.error_library_name_taken(),
	root: () => m.error_root(),
	not_found: () => m.error_not_found(),
	forbidden: () => m.error_forbidden(),
	cancelled: () => m.error_cancelled(),
	invalid_name: () => m.error_invalid_name(),
	folder_exists: () => m.error_folder_exists(),
	quota_exceeded: () => m.error_quota_exceeded(),
	corrupted: () => m.error_corrupted(),
	storage: () => m.error_storage(),
	source_changed: () => m.error_source_changed(),
	io: () => m.error_io(),
	unexpected_answer: () => m.error_unexpected_answer(),
	unsupported_server: () => m.error_unsupported_server(),
	query_too_short: () => m.error_query_too_short(),
	invalid_scope: () => m.error_invalid_scope(),
	no_password: () => m.error_no_password(),
	last_identity: () => m.error_last_identity(),
	full_session_required: () => m.error_full_session_required(),
	owns_organizations: () => m.error_owns_organizations(),
	last_admin: () => m.error_last_admin(),
	totp_required: () => m.error_totp_required(),
	totp_enabled: () => m.error_totp_enabled(),
	session_required: () => m.error_session_required()
};

/** The message for an API error. */
export function explain(error: Pick<ApiError, 'code' | 'message'> & Partial<ApiError>): string {
	return byCode[error.code]?.(error as ApiError) ?? m.error_unknown({ message: error.message });
}

/** The message for a bare code (an OIDC login's `?error=`). */
export function explainCode(code: string): string {
	return explain({ status: 0, code, message: code });
}
