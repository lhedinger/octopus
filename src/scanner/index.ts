/**
 * The scanner module: parses scan YAML (see docs/scan-format.md), assembles it
 * into a project, and merges re-scans without destroying human curation.
 * Deliberately UI-free so a future CLI can drive the same pipeline.
 */
export { parseScanDocs, ScanFormatError } from './parse';
export { assembleProject, repoNodeId, UNNAMED_SYSTEM } from './assemble';
export { mergeScan } from './merge';
export { pruneOrphanLevels } from '../model/project';
export { isRepoDoc, SCAN_FORMAT_VERSION } from './format';
export type { RepoDoc, ScanDoc, SystemDoc } from './format';
