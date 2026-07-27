export type AnalyzeFailureKind =
  | 'invalidDocument'
  | 'unsupportedDocument'
  | 'extractionFailed'
  | 'generic';

const FAILURE_KIND_BY_CODE: Record<string, AnalyzeFailureKind> = {
  invalid_document_type: 'invalidDocument',
  unsupported_document: 'unsupportedDocument',
  analyze_extraction_failed: 'extractionFailed',
};

const FAILURE_KIND_BY_STAGE: Record<string, AnalyzeFailureKind> = {
  validation_failed: 'unsupportedDocument',
  extraction_failed: 'extractionFailed',
};

const PDF_CONTENT_TYPES = new Set(['application/pdf', 'application/x-pdf']);

interface AnalyzeUploadFile {
  name: string;
  size: number;
  type?: string;
}

export function getAnalyzeFailureKind(error: unknown, stage?: unknown): AnalyzeFailureKind {
  if (!isErrorPayload(error)) return 'generic';

  const codeKind = typeof error.code === 'string' ? FAILURE_KIND_BY_CODE[error.code] : undefined;
  if (codeKind) return codeKind;

  return typeof stage === 'string' ? FAILURE_KIND_BY_STAGE[stage] ?? 'generic' : 'generic';
}

export function getAnalyzeFileFailureKind(
  file: AnalyzeUploadFile | null,
  maxUploadBytes: number,
): AnalyzeFailureKind | null {
  if (!file || file.size === 0 || file.size > maxUploadBytes) return 'invalidDocument';

  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const hasPdfType = file.type ? PDF_CONTENT_TYPES.has(file.type) : false;

  return hasPdfExtension || hasPdfType ? null : 'invalidDocument';
}

function isErrorPayload(error: unknown): error is Record<string, unknown> {
  return typeof error === 'object' && error !== null && !Array.isArray(error);
}
