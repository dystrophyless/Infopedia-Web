import { useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

interface TermSample {
  name: string;
  definition: string;
  source: string;
}

const SAMPLES: TermSample[] = [
  {
    name: 'Алгоритм',
    definition:
      'Орындаушыға берілетін тапсырманы шешуге немесе көрсетілген мақсатқа жетуге бағытталған белгілі бір әрекеттер тізбегінің толық және дәл нұсқаулығы',
    source: 'Арман-ПВ: 8-сынып • Глоссарий • 197',
  },
  {
    name: 'Bigdata',
    definition:
      'Көптеген тораптар бойынша үлестіру жағдайында адам қабылдайтын нәтижелерді алу үшін үлкен көлемдегі құрылымдалған және құрылымдалмаған деректерді өңдеу тәсілдерінің, құралдарының және әдістерінің тобы.',
    source: 'Мектеп: 10-сынып • §31. Bigdata • 100',
  },
  {
    name: 'Blockchain',
    definition:
      'Ол деректермен қауіпсіз және қорғалған түрде алмасуды қамтамасыз етеді және орталықтандырылған деректер қорының арқасында барлық қорды бұзу мүмкіндігінен сақтайды.',
    source: 'Арман-ПВ: 11-сынып • §59-60. Blockchain технологиясы • 228',
  },
  {
    name: 'Виртуализация',
    definition:
      'Технология создания виртуального ресурса (например, операционной системы или сервера) на базе физического оборудования, позволяющая эффективнее использовать ресурсы.',
    source: 'Мектеп: 11-сынып • §12. Облако и виртуализация • 56',
  },
  {
    name: 'Машинное обучение',
    definition:
      'Раздел искусственного интеллекта, в котором алгоритмы строят модели на основе примеров данных и делают прогнозы без явного программирования.',
    source: 'Арман-ПВ: 11-сынып • §40. ИИ и машинное обучение • 168',
  },
];

export function TermCardCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full">
      <div
        ref={scrollerRef}
        className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-6 px-[60px] max-md:px-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        <ul className="flex gap-[45px] w-max">
          {SAMPLES.map((sample, idx) => (
            <li
              key={idx}
              className="snap-center w-[612px] h-[325px] bg-surface border border-border rounded-[15px] p-[60px] shadow-card flex flex-col justify-between max-md:w-[88vw] max-md:h-auto max-md:p-8"
            >
              <h3 className="font-medium text-[38px] text-text max-md:text-[26px]">
                {sample.name}
              </h3>
              <p className="font-light text-[22px] text-text leading-snug max-md:text-[16px]">
                {sample.definition}
              </p>
              <p className="font-light text-[16px] text-border max-md:text-[13px]">
                {sample.source}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-660)}
        aria-label="prev"
        className="absolute -left-2 top-1/2 -translate-y-1/2 bg-surface border border-border rounded-full w-12 h-12 flex items-center justify-center shadow-feature hover:bg-bg transition-colors max-md:hidden"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(660)}
        aria-label="next"
        className="absolute -right-2 top-1/2 -translate-y-1/2 bg-surface border border-border rounded-full w-12 h-12 flex items-center justify-center shadow-feature hover:bg-bg transition-colors max-md:hidden"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={1.8} />
      </button>
    </div>
  );
}
