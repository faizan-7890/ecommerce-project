'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setAccessToken } from '@/lib/api';

export function TokenSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        // Fetch the clerk JWT template (or standard session token)
        const token = await getToken();
        setAccessToken(token);
      } else {
        setAccessToken(null);
      }
    };
    syncToken();
    
    // Periodically sync to ensure token doesn't expire during long sessions
    const interval = setInterval(syncToken, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [getToken, isSignedIn]);

  return null;
}
