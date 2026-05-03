'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FullPageSpinner } from '@/components/shared/loading-spinner';

// Invitations now live as a tab inside the unified /connect page (Inviter ·
// Code famille · Sonde de parente). This route is preserved for back-compat
// with old links/notifications and just forwards to the right tab.
export default function InvitationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/connect?tab=invite');
  }, [router]);
  return <FullPageSpinner />;
}
