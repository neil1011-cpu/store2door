'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * Refined to prevent global application crashes by logging instead of throwing.
 */
export function FirebaseErrorListener() {
  const [lastError, setLastError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.warn('[Firebase Security] Permission Denied:', {
        path: error.request.path,
        method: error.request.method,
        auth: error.request.auth?.uid || 'anonymous'
      });
      setLastError(error);
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // We no longer 'throw' the error here. 
  // Individual pages or hooks handle their own local error states.
  // This prevents the global error.tsx boundary from catching a transient permission error and crashing the whole app.
  return null;
}
