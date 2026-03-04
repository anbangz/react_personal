import * as React from 'react';

// Lightweight mock for react-markdown (v10 is ESM-only, which breaks Jest's CJS transform)
const ReactMarkdown = ({ children }: { children: string }) => (
  <div data-testid="markdown">{children}</div>
);

export default ReactMarkdown;
