// DO NOT MODIFY - THIS IS AN AUTO-GENERATED FILE.
// USE THE `genkit-firebase-tools` CLI TO REGENERATE THIS FILE.
'use client';
import { errorEmitter } from '@/firebase/error-emitter';
import { useEffect } from 'react';

export function FirebaseErrorListener() {
  useEffect(() => {
    errorEmitter.on('permission-error', error => {
      // We are intentionally not logging the error here because the
      // default behavior of the errorEmitter is to log the error to
      // the console.
    });
  }, []);
  return null;
}
