// DO NOT MODIFY - THIS IS AN AUTO-GENERATED FILE.
// USE THE `genkit-firebase-tools` CLI TO REGENERATE THIS FILE.
export class FirestorePermissionError extends Error {
    constructor(
      public context: {
        path: string;
        operation: 'create' | 'read' | 'update' | 'delete';
        requestResourceData: object;
      },
      public source: Error
    ) {
      super(
        `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
          context,
          null,
          2
        )}.`
      );
    }
  }
  