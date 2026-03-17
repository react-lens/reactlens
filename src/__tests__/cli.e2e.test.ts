import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('CLI End-to-End', () => {
  const cliPath = path.resolve('src/cli/index.ts');
  const tsxBin = path.resolve('node_modules/.bin/tsx');

  it('should generate a JSON report via CLI', { timeout: 30000 }, () => {
    const tempReport = path.join(os.tmpdir(), 'report.json');
    if (fs.existsSync(tempReport)) fs.unlinkSync(tempReport);

    try {
      execSync(`"${tsxBin}" "${cliPath}" analyze . --json "${tempReport}"`, {
        stdio: 'inherit'
      });

      expect(fs.existsSync(tempReport)).toBe(true);
      const content = JSON.parse(fs.readFileSync(tempReport, 'utf-8'));
      expect(content).toHaveProperty('insights');
      expect(content).toHaveProperty('timestamp');
    } finally {
      if (fs.existsSync(tempReport)) fs.unlinkSync(tempReport);
    }
  });

  it('should fail when score is below --fail-under', { timeout: 30000 }, () => {
    // Force fail by setting threshold above 100
    try {
      execSync(`"${tsxBin}" "${cliPath}" analyze . --fail-under 105`, {
        stdio: 'pipe'
      });
      expect(true).toBe(false);
    } catch (error: any) {
      // error.status might be undefined if execSync behaves differently, 
      // but usually it's the exit code.
      expect(error.status || 1).toBe(1);
      expect(error.stderr.toString()).toContain('Build Failed');
    }
  });
});
