'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n';
import type { IdentityDocumentRow as Row } from '@/lib/api/admin-moderation';
import { IdentityDocumentDecisionDialog } from './identity-document-decision-dialog';

const DOC_LABELS: Record<string, string> = {
  CNI_CAMEROUN: 'CNI Cameroun',
  PASSPORT_CAMEROUN: 'Passeport CM',
  PASSPORT_FOREIGN: 'Passeport étranger',
  ACTE_NAISSANCE: 'Acte de naissance',
  CARTE_CONSULAIRE: 'Carte consulaire',
  PERMIS_CONDUIRE: 'Permis de conduire',
  CARTE_ELECTEUR: "Carte d'électeur",
  CARTE_SCOLAIRE: 'Carte scolaire',
  OTHER: 'Autre',
};

export function IdentityDocumentRowCard({ doc }: { doc: Row }) {
  const t = useT();
  const [mode, setMode] = useState<'verify' | 'reject' | null>(null);

  return (
    <>
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-deep-blue" />
              <span className="text-sm font-semibold text-charcoal">
                {DOC_LABELS[doc.documentType] ?? doc.documentType}
              </span>
              {doc.documentNumberLast4 && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  ••••{doc.documentNumberLast4}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] uppercase">
                {doc.verificationStatus}
              </Badge>
            </div>
            <Link
              href={`/persons/${doc.person.id}`}
              className="text-sm text-deep-blue hover:underline inline-flex items-center gap-1"
            >
              {doc.person.displayName}
              <ExternalLink className="h-3 w-3" />
            </Link>
            <div className="flex flex-wrap gap-3 text-xs text-charcoal/70">
              {doc.issuingAuthority && (
                <span>
                  <span className="font-medium">{t('admin.moderation.document.authority')}:</span>{' '}
                  {doc.issuingAuthority}
                </span>
              )}
              {doc.issueDate && (
                <span>
                  <span className="font-medium">Émis le:</span> {formatDate(doc.issueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 lg:justify-end">
            <Button size="sm" variant="success" onClick={() => setMode('verify')}>
              <Check className="h-3.5 w-3.5" />
              {t('admin.moderation.document.verify')}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setMode('reject')}>
              <X className="h-3.5 w-3.5" />
              {t('admin.moderation.document.reject')}
            </Button>
          </div>
        </CardContent>
      </Card>
      {mode && (
        <IdentityDocumentDecisionDialog
          documentId={doc.id}
          mode={mode}
          open={mode !== null}
          onOpenChange={(o) => !o && setMode(null)}
        />
      )}
    </>
  );
}
