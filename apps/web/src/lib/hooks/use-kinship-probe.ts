'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { submitKinshipProbe, type KinshipProbeRequest } from '@/lib/api/kinship-probe';

export function useSubmitKinshipProbe() {
  return useMutation({
    mutationFn: (dto: KinshipProbeRequest) => submitKinshipProbe(dto),
    onSuccess: (res) => {
      toast.success(res.message);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Impossible d\'envoyer la demande.';
      toast.error(msg);
    },
  });
}
