'use client';

import { PageHeader } from '@/components/shared/page-header';
import { CreateInvitationForm } from '@/components/invitations/create-invitation-form';
import { InvitationList } from '@/components/invitations/invitation-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCreateInvitation } from '@/lib/hooks/use-invitations';
import { useT } from '@/i18n';

export default function InvitationsPage() {
  const createInvitation = useCreateInvitation();
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t('invitations.title')} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('invitations.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateInvitationForm
            onSubmit={(data) => createInvitation.mutate(data)}
            isPending={createInvitation.isPending}
          />
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-charcoal">{t('invitations.title')}</h2>
        <InvitationList />
      </div>
    </div>
  );
}
