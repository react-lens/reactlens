import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyAnalyzer } from '../analyzer/dependencyAnalyzer.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Dependency Intelligence Integration', () => {
  let analyzer: DependencyAnalyzer;
  let tempDir: string;

  beforeEach(async () => {
    analyzer = new DependencyAnalyzer();
    tempDir = path.join(os.tmpdir(), 'react-lens-integration-' + Math.random().toString(36).slice(2));
    await fs.mkdir(tempDir, { recursive: true });
  });

  it('should detect real circular dependencies in a project', async () => {
    // Create a circular dependency: A -> B -> A
    await fs.writeFile(path.join(tempDir, 'a.ts'), "import './b.js';");
    await fs.writeFile(path.join(tempDir, 'b.ts'), "import './a.js';");

    const metrics = await analyzer.analyze(tempDir);
    
    expect(metrics.circular.length).toBeGreaterThan(0);
    const cycle = metrics.circular[0]!;
    expect(cycle).toContain('a.ts');
    expect(cycle).toContain('b.ts');
  });

  it('should detect zombie components in a project', async () => {
    // index -> used
    // zombie is alone
    await fs.writeFile(path.join(tempDir, 'index.ts'), "import './used.js';");
    await fs.writeFile(path.join(tempDir, 'used.ts'), "export const x = 1;");
    await fs.writeFile(path.join(tempDir, 'zombie.ts'), "export const z = 1;");

    const metrics = await analyzer.analyze(tempDir, 'index.ts');
    
    expect(metrics.zombieComponents).toContain('zombie.ts');
    expect(metrics.zombieComponents).not.toContain('used.ts');
    expect(metrics.zombieComponents).not.toContain('index.ts');
  });
});
