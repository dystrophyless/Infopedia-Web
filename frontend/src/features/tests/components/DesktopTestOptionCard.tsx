import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockKeyIcon, Target03Icon } from '@hugeicons/core-free-icons';

export type DesktopTestOptionCardContract = 'weak-pre-analysis' | 'mock-inactive';

export interface DesktopTestOptionCardProps {
  mode: 'random' | 'weak' | 'mock';
  title: string;
  description: string;
  icon?: ReactNode;
  iconTone?: string;
  to?: string;
  unavailableMessage?: string;
  statusBadge?: string;
  contract?: DesktopTestOptionCardContract;
  className?: string;
}

function ContractIcon({ contract }: { contract: DesktopTestOptionCardContract }) {
  if (contract === 'weak-pre-analysis') {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-[#f25f54] text-white" aria-hidden data-option-card-icon>
        <HugeiconsIcon icon={Target03Icon} size={24} strokeWidth={1.5} aria-hidden="true" data-option-card-icon-glyph />
      </span>
    );
  }
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-[#cbf0df] text-white" aria-hidden data-option-card-icon>
      <HugeiconsIcon icon={LockKeyIcon} size={24} strokeWidth={1.5} aria-hidden="true" data-option-card-icon-glyph />
    </span>
  );
}

export function DesktopTestOptionCard({
  mode,
  title,
  description,
  icon,
  iconTone = '',
  to,
  unavailableMessage,
  statusBadge,
  contract,
  className = '',
}: DesktopTestOptionCardProps) {
  const isContractCard = contract !== undefined;
  const titleTone = contract === 'mock-inactive' ? 'text-[#6e6779]' : 'text-[#161519]';
  const descriptionTone = contract === 'mock-inactive' ? 'text-[#b1acb9]' : 'text-[#6e6779]';
  const statusBadgeWidth = contract === 'weak-pre-analysis' ? 'w-[143px]' : 'w-[163px]';
  const content = (
    <>
      {isContractCard ? (
        <span className="flex w-full items-start justify-between">
          <ContractIcon contract={contract} />
          <span
            className={`flex ${statusBadgeWidth} items-center justify-center rounded-[8px] bg-[#f8f5fc] px-4 py-2 text-[12px] font-medium leading-3 text-[#a585db]`}
            data-option-card-status-badge
          >
            {statusBadge}
          </span>
        </span>
      ) : (
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-[8px] ${iconTone}`} aria-hidden>
          {icon}
        </span>
      )}
      <span className="flex w-full flex-col items-start gap-4">
        <span className={`text-[20px] font-medium leading-5 ${titleTone}`}>{title}</span>
        <span className={`w-full text-[16px] font-normal leading-4 ${descriptionTone}`}>{description}</span>
        {!isContractCard && !to && unavailableMessage ? (
          <span className="text-[14px] font-normal leading-[14px] text-[#6e6779]">{unavailableMessage}</span>
        ) : null}
      </span>
    </>
  );
  const interactiveClasses = to
    ? 'cursor-pointer transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]'
    : '';
  const classes = `flex h-full min-w-0 flex-col items-start gap-6 rounded-[16px] bg-white px-6 pb-8 pt-6 text-left ${interactiveClasses} ${className}`;

  if (!to) {
    return (
      <div
        className={classes}
        aria-disabled="true"
        data-test-mode={mode}
        data-testid={`tests-${mode}-mode-card`}
        data-option-card-contract={contract}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={classes}
      data-test-mode={mode}
      data-testid={`tests-${mode}-mode-card`}
      data-option-card-contract={contract}
    >
      {content}
    </Link>
  );
}
