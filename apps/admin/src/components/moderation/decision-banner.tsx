import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useT } from '@/i18n';

export function DecisionBanner() {
  const t = useT();
  return (
    <Alert variant="info" className="mb-4">
      <Info className="h-4 w-4" />
      <AlertDescription>{t('admin.moderation.decisionBanner')}</AlertDescription>
    </Alert>
  );
}
