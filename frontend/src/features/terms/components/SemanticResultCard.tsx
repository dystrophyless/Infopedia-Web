import type { Definition } from '../../../types';
import { DefinitionMetadata } from './DefinitionMetadata';

export function SemanticResultCard({ definition }: { definition: Definition }) {
  return (
    <article className="rounded-[15px] border border-border bg-surface p-8 max-md:rounded-[16px] max-md:border-0 max-md:bg-white max-md:p-6">
      <p className="max-w-[760px] whitespace-pre-line text-[20px] leading-5 text-text max-md:text-[16px] max-md:leading-4">{definition.text}</p>
      <DefinitionMetadata definition={definition} variant="detail" />
    </article>
  );
}
