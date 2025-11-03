// DO NOT MODIFY - THIS IS AN AUTO-GENERATED FILE.
// USE THE `genkit-firebase-tools` CLI TO REGENERATE THIS FILE.
import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

interface ErrorEvents {
    'permission-error': (error: FirestorePermissionError) => void;
  }
  
  declare interface ErrorEmitter {
    on<U extends keyof ErrorEvents>(event: U, listener: ErrorEvents[U]): this;
    emit<U extends keyof ErrorEvents>(
      event: U,
      ...args: Parameters<ErrorEvents[U]>
    ): boolean;
  }
  
  class ErrorEmitter extends EventEmitter {}
  
  export const errorEmitter = new ErrorEmitter();
  
  errorEmitter.on('permission-error', error => {
    console.error(error);
  });
  