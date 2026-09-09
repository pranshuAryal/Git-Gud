'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyMergeRequestDetailPage() {
  const { mid } = useParams<{ mid: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/merge-requests/${mid}`);
  }, [mid, router]);

  return null;
}