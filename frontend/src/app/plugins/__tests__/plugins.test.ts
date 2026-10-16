import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Mesh & Canary Plugin Templates (MESH-01)', () => {
  const pluginsPageContent = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf-8'
  );

  it('contains mtls-auth plugin template with mutual TLS authentication configuration', () => {
    expect(pluginsPageContent).toContain("'mtls-auth'");
    expect(pluginsPageContent).toContain("title: 'Mutual TLS (mTLS) Authentication'");
    expect(pluginsPageContent).toContain("category: 'Authentication'");
    expect(pluginsPageContent).toContain('ca_certificates: []');
    expect(pluginsPageContent).toContain('revocation_check_mode:');
  });

  it('contains canary plugin template with traffic splitting and hash options', () => {
    expect(pluginsPageContent).toContain('canary: {');
    expect(pluginsPageContent).toContain("title: 'Canary Release & Traffic Splitting'");
    expect(pluginsPageContent).toContain("category: 'Traffic Control'");
    expect(pluginsPageContent).toContain('percentage: 10');
    expect(pluginsPageContent).toContain("hash_header: 'X-Canary'");
    expect(pluginsPageContent).toContain("hash_cookie: 'canary_token'");
  });

  it('exposes canary and mtls-auth in modal select dropdown options', () => {
    expect(pluginsPageContent).toContain('<option value="canary">');
    expect(pluginsPageContent).toContain('<option value="mtls-auth">');
  });
});
