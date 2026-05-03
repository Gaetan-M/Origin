'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FullPageSpinner } from '@/components/shared/loading-spinner';

// Family codes are now the second tab of /connect. Old direct links and
// any inbound notification URLs land here and get forwarded.
export default function FamilyCodesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/connect?tab=code');
  }, [router]);
  return <FullPageSpinner />;
}
