'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FullPageSpinner } from '@/components/shared/loading-spinner';

// Kinship probe (now "Sonde de parente") is the third tab of /connect.
export default function KinshipProbeRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/connect?tab=probe');
  }, [router]);
  return <FullPageSpinner />;
}
