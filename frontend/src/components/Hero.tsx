import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="bg-bg w-full pt-[80px] pb-[60px] px-6">
      <div className="mx-auto max-w-[970px] flex flex-col items-center text-center gap-[28px]">
        <h1 className="font-medium text-[40px] leading-tight text-text max-md:text-[32px]">
          {t('landing.heroTitle')}
        </h1>
        <p className="text-[20px] text-text-body max-w-[860px] max-md:text-[16px]">
          {t('landing.heroSubtitle')}
        </p>
        <Link
          to="/search"
          className="bg-primary text-surface rounded-[10px] px-[45px] py-[16px] text-[20px] hover:opacity-90 transition-opacity"
        >
          <span>{t('landing.ctaFind')} </span>
          <span className="text-highlight">{t('landing.ctaTerm')}</span>
          <span> {t('landing.ctaOr')} </span>
          <span className="text-highlight">{t('landing.ctaDefinition')}</span>
        </Link>
      </div>
    </section>
  );
}
