/**
 * Parser engine version, stamped on every log line and audit record so a
 * result can always be traced back to the exact rule set that produced it.
 *
 * Bump:
 *  - PATCH for bug fixes in existing stages/rules,
 *  - MINOR when a new bank rule module or stage capability is added,
 *  - MAJOR when the canonical output schema changes.
 */
export const PARSER_VERSION = '0.1.0'
