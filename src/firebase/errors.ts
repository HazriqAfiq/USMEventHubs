'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;
  public serverError: any;

  constructor(context: SecurityRuleContext, serverError?: any) {
    const message = `Firestore Permission Denied: You do not have permission to perform the '${context.operation}' operation on the path '${context.path}'.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    this.serverError = serverError;

    // This is to make the error visible in the Next.js development overlay
    this.stack = serverError?.stack || new Error(message).stack;
  }
}
