'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const t = useT();
  const { locale, setLocale } = useUiStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('admin.settings.locale')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={locale === 'fr' ? 'default' : 'outline'}
            onClick={() => setLocale('fr')}
            className="justify-center"
          >
            Français
          </Button>
          <Button
            variant={locale === 'en' ? 'default' : 'outline'}
            onClick={() => setLocale('en')}
            className="justify-center"
          >
            English
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
