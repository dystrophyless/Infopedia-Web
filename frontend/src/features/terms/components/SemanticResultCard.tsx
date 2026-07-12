import type { Definition } from '../../../types';
import { DefinitionMetadata } from './DefinitionMetadata';

export function SemanticResultCard({ definition }: { definition: Definition }) {
  return (
    <article className="rounded-[15px] border border-border bg-surface p-8 shadow-feature max-md:p-6 max-md:shadow-none">
      <p className="max-w-[760px] whitespace-pre-line text-[20px] leading-relaxed text-text max-md:text-[16px]">{definition.text}</p>
      <DefinitionMetadata definition={definition} variant="detail" />
    </article>
  );
}
