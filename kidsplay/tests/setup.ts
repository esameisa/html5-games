import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { Blob as NodeBlob } from 'node:buffer';

// jsdom's Blob cannot be structured-cloned by fake-indexeddb nor passed to Node's
// URL.createObjectURL; use Node's spec-compliant Blob so storage behaves like a browser.
globalThis.Blob = NodeBlob as unknown as typeof Blob;
