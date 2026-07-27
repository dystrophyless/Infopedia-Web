import { describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import {
  getAnalyzeFailureKind,
  getAnalyzeFileFailureKind,
  type AnalyzeFailureKind,
} from './failurePresentation';
import { getApiErrorClassificationDetail } from '../../../utils/apiError';

describe('getAnalyzeFailureKind', () => {
  const cases: Array<{
    name: string;
    error: unknown;
    stage?: unknown;
    expected: AnalyzeFailureKind;
  }> = [
    {
      name: 'invalid document type code',
      error: { code: 'invalid_document_type', message: 'The file is not a PDF' },
      expected: 'invalidDocument',
    },
    {
      name: 'unsupported document code',
      error: { code: 'unsupported_document', message: 'Unsupported report layout' },
      expected: 'unsupportedDocument',
    },
    {
      name: 'extraction failure code',
      error: { code: 'analyze_extraction_failed', message: 'OCR provider failed' },
      expected: 'extractionFailed',
    },
    {
      name: 'validation stage fallback',
      error: { code: 'unknown_failure' },
      stage: 'validation_failed',
      expected: 'unsupportedDocument',
    },
    {
      name: 'extraction stage fallback',
      error: { code: 'unknown_failure' },
      stage: 'extraction_failed',
      expected: 'extractionFailed',
    },
    { name: 'string error', error: 'invalid_document_type', expected: 'generic' },
    { name: 'malformed error', error: ['unsupported_document'], expected: 'generic' },
    { name: 'null error', error: null, expected: 'generic' },
  ];

  it.each(cases)('maps $name without exposing backend payloads', ({ error, stage, expected }) => {
    expect(getAnalyzeFailureKind(error, stage)).toBe(expected);
  });

  it('does not classify an unknown error from its English message', () => {
    expect(
      getAnalyzeFailureKind({
        code: 'unknown_failure',
        message: 'invalid_document_type: this is an unsupported document and extraction failed',
      }),
    ).toBe('generic');
  });

  it('classifies a client-rejected non-PDF as an invalid document', () => {
    expect(
      getAnalyzeFileFailureKind(
        { name: 'answers.txt', size: 128, type: 'text/plain' },
        2 * 1024 * 1024,
      ),
    ).toBe('invalidDocument');
  });

  it('classifies FastAPI structured detail from an Axios 400 without using its message', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: {
        detail: {
          code: 'unsupported_document',
          message: 'invalid_document_type should not override the stable code',
        },
      },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {},
    } as AxiosResponse;

    const detail = getApiErrorClassificationDetail(error);
    expect(getAnalyzeFailureKind(detail, detail?.stage)).toBe('unsupportedDocument');
  });

  it('keeps unstructured Axios and network failures generic', () => {
    const stringDetailError = new AxiosError('Request failed');
    stringDetailError.response = {
      data: { detail: 'invalid_document_type' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {},
    } as AxiosResponse;

    const stringDetail = getApiErrorClassificationDetail(stringDetailError);
    const networkDetail = getApiErrorClassificationDetail(new AxiosError('Network Error'));

    expect(getAnalyzeFailureKind(stringDetail, stringDetail?.stage)).toBe('generic');
    expect(getAnalyzeFailureKind(networkDetail, networkDetail?.stage)).toBe('generic');
  });
});
