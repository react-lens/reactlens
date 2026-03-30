import { describe, it, expect } from 'vitest';
import { InsightEngine } from '../analyzer/insightEngine.js';

describe('InsightEngine', () => {
  const engine = new InsightEngine();

  it('should generate recommendations for large components and props', () => {
    const mockComponents = [
      {
        name: 'HugeComponent',
        lineCount: 400,
        isLarge: true,
        propCount: 10,
        props: [],
        hookCount: 0,
        hooks: [],
        type: 'functional' as const,
        isClientComponent: false,
        drilledProps: []
      }
    ];

    const mockDeps = {
      circular: [],
      totalModules: 1,
      zombieComponents: [],
      couplingMap: {},
      internalModules: ['HugeComponent.tsx'],
      externalModules: []
    };

    const report = engine.generateReport(mockComponents, mockDeps);
    
    expect(report.recommendations).toHaveLength(2); // One for size, one for props
    expect(report.recommendations[0]!.solution).toContain('Extract distinct UI sections');
    expect(report.score).toBeLessThan(100);
  });

  it('should detect circular dependencies and assign high penalty', () => {
    const mockDeps = {
      circular: [['A.ts', 'B.ts', 'A.ts']],
      totalModules: 2,
      zombieComponents: [],
      couplingMap: {},
      internalModules: ['A.ts', 'B.ts'],
      externalModules: []
    };

    const report = engine.generateReport([], mockDeps);
    expect(report.recommendations[0]!.level).toBe('error');
    expect(report.score).toBe(94); // Weighted: (100*0.4) + (85*0.4) + (100*0.2) = 94
  });
});
