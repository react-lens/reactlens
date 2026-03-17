import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileScanner } from '../scanners/fileScanner.js';
import { promises as fs } from 'fs';
import path from 'path';

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

vi.mock('fast-glob', () => ({
  default: vi.fn().mockResolvedValue(['/abs/path/to/file.tsx']),
}));

describe('FileScanner', () => {
  let scanner: FileScanner;

  beforeEach(() => {
    scanner = new FileScanner();
    vi.clearAllMocks();
  });

  it('should detect react project from package.json', async () => {
    const mockPackageJson = JSON.stringify({
      dependencies: { react: '18.0.0' }
    });
    
    (fs.readFile as any).mockResolvedValue(mockPackageJson);
    
    const info = await scanner.scan('/mock/root');
    expect(info.type).toBe('react');
  });

  it('should return unknown for missing package.json', async () => {
    (fs.readFile as any).mockRejectedValue(new Error('File not found'));
    
    const info = await scanner.scan('/mock/root');
    expect(info.type).toBe('unknown');
  });
});
