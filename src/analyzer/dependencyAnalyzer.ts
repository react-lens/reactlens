/**
 * @fileoverview DependencyAnalyzer
 * Responsible for analyzing file relationships and structural issues.
 * Uses Madge library to identify circular dependencies, unused modules, and coupling.
 */

import madge from 'madge';

/**
 * Represents dependency metrics for the project
 */
export interface DependencyMetrics {
  circular: string[][];
  totalModules: number;
  zombieComponents: string[];
  couplingMap: Record<string, number>;
  internalModules: string[];
  externalModules: string[];
}

export class DependencyAnalyzer {
  private madgeInstance: any = null;

  /**
   * Analyzes the project and detects circular dependencies, zombies, and coupling
   * @param rootPath Project root path
   * @param entryPoint Optional entry point to help identify unused files (e.g., src/cli/index.ts)
   */
  async analyze(rootPath: string, entryPoint?: string): Promise<DependencyMetrics> {
    try {
      this.madgeInstance = await (madge as any)(rootPath, {
        fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
        excludeRegExp: [/node_modules/, /dist/, /.next/, /__tests__/, /\.test\./, /\.spec\./, /vitest\.config/, /jest\.config/],
      });

      const circular = this.madgeInstance.circular();
      const obj = this.madgeInstance.obj();
      const totalModules = Object.keys(obj).length;

      // Calculate coupling and modules
      const couplingMap: Record<string, number> = {};
      const internalModules: string[] = Object.keys(obj);
      const externalSet = new Set<string>();

      internalModules.forEach(module => {
        couplingMap[module] = 0;
      });

      Object.values(obj).forEach((deps: any) => {
        deps.forEach((dep: string) => {
          // If it's not in our internal modules, it might be an external lib
          // Note: Madge with default config might not list all npm packages unless configured.
          // But we can infer external ones if they don't match our file paths or are explicitly listed.
          if (couplingMap[dep] !== undefined) {
            couplingMap[dep]++;
          } else {
            externalSet.add(dep);
          }
        });
      });

      const zombieComponents = internalModules.filter(module => {
        if (entryPoint && module.includes(entryPoint)) return false;
        return couplingMap[module] === 0;
      });

      return {
        circular,
        totalModules,
        zombieComponents,
        couplingMap,
        internalModules,
        externalModules: Array.from(externalSet)
      };
    } catch (error) {
      console.error('Error during dependency analysis:', error);
      return { 
        circular: [], 
        totalModules: 0, 
        zombieComponents: [], 
        couplingMap: {}, 
        internalModules: [], 
        externalModules: [] 
      };
    }
  }

  /**
   * Exports the dependency graph to a visual format
   * @param outputPath Path where the graph will be saved
   */
  async exportGraph(outputPath: string): Promise<string> {
    if (!this.madgeInstance) throw new Error('You must run analyze() before exporting a graph.');
    
    const ext = outputPath.split('.').pop()?.toLowerCase();
    
    if (ext === 'svg') {
      return await this.madgeInstance.image(outputPath);
    } else {
      // Default to DOT format which is robust
      return await this.madgeInstance.dot(outputPath);
    }
  }
}
