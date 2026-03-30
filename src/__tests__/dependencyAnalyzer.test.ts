import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DependencyAnalyzer } from '../analyzer/dependencyAnalyzer.js';
import madge from 'madge';

vi.mock('madge', () => ({
  default: vi.fn(),
}));

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
    vi.clearAllMocks();
  });

  it('should detect circular dependencies and calculate coupling', async () => {
    const mockMadgeInstance = {
      circular: () => [['a.ts', 'b.ts', 'a.ts']],
      obj: () => ({
        'a.ts': ['b.ts'],
        'b.ts': ['a.ts'],
        'c.ts': ['b.ts'], // c depends on b
      })
    };
    (madge as any).mockResolvedValue(mockMadgeInstance);

    const metrics = await analyzer.analyze('/root', []);
    
    expect(metrics.circular).toHaveLength(1);
    expect(metrics.totalModules).toBe(3);
    expect(metrics.internalModules).toHaveLength(3);
    expect(metrics.couplingMap['b.ts']).toBe(2); // a and c depend on b
    expect(metrics.zombieComponents).toContain('c.ts');
  });

  it('should export graph to DOT format', async () => {
    const mockMadgeInstance = {
      dot: vi.fn().mockResolvedValue('digraph {}'),
      circular: () => [],
      obj: () => ({})
    };
    (madge as any).mockResolvedValue(mockMadgeInstance);
    
    await analyzer.analyze('/root', []);
    const result = await analyzer.exportGraph('out.dot');
    expect(result).toBe('digraph {}');
    expect(mockMadgeInstance.dot).toHaveBeenCalledWith('out.dot');
  });

  it('should ignore entry point in zombie detection', async () => {
    const mockMadgeInstance = {
      circular: () => [],
      obj: () => ({
        'index.ts': ['auth.ts'],
        'auth.ts': [],
      })
    };
    (madge as any).mockResolvedValue(mockMadgeInstance);

    const metrics = await analyzer.analyze('/root', []);
    expect(metrics.zombieComponents).not.toContain('index.ts');
    expect(metrics.zombieComponents).toHaveLength(0);
  });
});
