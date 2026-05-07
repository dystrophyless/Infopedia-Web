import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Brain01Icon } from '@hugeicons/core-free-icons';
import type { SearchTask } from '../types';

export function LoadingPanel({ messages }: { messages: SearchTask[] }) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface border border-border rounded-[15px] p-8 shadow-feature flex flex-col items-center gap-4">
      <div className="text-accent animate-pulse">
        <HugeiconsIcon icon={Brain01Icon} size={48} strokeWidth={1.5} />
      </div>
      <p className="text-[18px] text-text font-medium">{t('semanticSearch.loading')}</p>
      {messages.length > 0 && (
        <ul className="w-full max-w-md space-y-1 text-[14px] text-muted">
          {messages.slice(-5).map((m, idx) => (
            <li key={idx} className="truncate">
              {t('semanticSearch.step')} {idx + 1}: {m.step ?? m.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
