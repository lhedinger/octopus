import '@testing-library/jest-dom/vitest';

// jsdom lacks crypto.randomUUID in some versions; provide a stable shim.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  let counter = 0;
  (crypto as unknown as { randomUUID: () => string }).randomUUID = () =>
    `00000000-0000-4000-8000-${(counter++).toString(16).padStart(12, '0')}`;
}
