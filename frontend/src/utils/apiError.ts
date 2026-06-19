import axios from 'axios';

function detailToMessage(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const firstMessage = detail
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        if ('msg' in item && typeof item.msg === 'string') return item.msg;
        if ('message' in item && typeof item.message === 'string') return item.message;
        return null;
      })
      .find(Boolean);

    return firstMessage ?? null;
  }

  if (!detail || typeof detail !== 'object') return null;

  if ('message' in detail && typeof detail.message === 'string') {
    return detail.message;
  }

  if ('code' in detail && typeof detail.code === 'string') {
    return detail.code;
  }

  return null;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err) || !err.response?.data) return fallback;

  const data = err.response.data as { detail?: unknown; message?: unknown; code?: unknown };
  const detailMessage = detailToMessage(data.detail);
  if (detailMessage) return detailMessage;

  if (typeof data.message === 'string') return data.message;
  if (typeof data.code === 'string') return data.code;

  return fallback;
}

export function getTaskErrorMessage(value: unknown): string | null {
  return detailToMessage(value);
}
