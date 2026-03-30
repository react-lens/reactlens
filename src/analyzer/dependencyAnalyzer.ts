/**
 * @fileoverview DependencyAnalyzer
 * Responsible for analyzing file relationships and structural issues.
 * Uses Madge library for primary graph analysis and ImportScanner
 * as a secondary cross-reference verification layer.
 */

import madge from 'madge';
import * as fs from 'fs';
import * as path from 'path';
import { ImportScanner, ImportReferenceMap } from './importScanner.js';

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
   * Analyzes the project and detects circular dependencies, zombies, and coupling.
   * Uses a dual verification system: Madge graph + Native ImportScanner.
   *
   * @param rootPath Project root path
   * @param projectFiles Absolute paths to all discovered source files (from FileScanner)
   * @param customTsConfig Optional path to a specific tsconfig file provided by the user
   */
  async analyze(rootPath: string, projectFiles: string[], customTsConfig?: string): Promise<DependencyMetrics> {
    try {
      // --- Phase 1: Resolve TypeScript configuration ---
      const tsConfigPath = this.resolveTsConfig(rootPath, customTsConfig);

      // --- Phase 2: Primary analysis via Madge ---
      this.madgeInstance = await (madge as any)(rootPath, {
        fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
        excludeRegExp: [/node_modules/, /dist/, /.next/, /__tests__/, /\.test\./, /\.spec\./, /vitest\.config/, /jest\.config/],
        tsConfig: tsConfigPath
      });

      const circular = this.madgeInstance.circular();
      const obj = this.madgeInstance.obj();
      const totalModules = Object.keys(obj).length;

      // --- Phase 3: Build coupling map from Madge graph ---
      const couplingMap: Record<string, number> = {};
      const internalModules: string[] = Object.keys(obj);
      const externalSet = new Set<string>();

      internalModules.forEach(module => {
        couplingMap[module] = 0;
      });

      Object.values(obj).forEach((deps: any) => {
        deps.forEach((dep: string) => {
          if (couplingMap[dep] !== undefined) {
            couplingMap[dep]++;
          } else {
            externalSet.add(dep);
          }
        });
      });

      // --- Phase 4: Secondary verification via Native ImportScanner ---
      const importScanner = new ImportScanner();
      const referenceMap = await importScanner.buildReferenceMap(projectFiles);

      // --- Phase 5: Read package.json bin entries for CLI exemption ---
      const binEntries = this.readBinEntries(rootPath);

      // --- Phase 6: Dual-verified zombie detection ---
      const zombieComponents = internalModules.filter(module => {
        // Madge says this module is imported by at least one other module
        if ((couplingMap[module] ?? 0) > 0) return false;

        // Framework & Architecture Exemptions
        const isEntryPoint = /main\.(tsx|ts|jsx|js)$|index\.(tsx|ts|jsx|js)$|App\.(tsx|ts|jsx|js)$/i.test(module);
        const isNextJsRoute = /\/(page|layout|loading|error|not-found|middleware|route)\.(tsx|ts|jsx|js)$/i.test(module);
        const isRouterPage = /\/pages\//i.test(module) || /\/app\//i.test(module) || /^pages\//i.test(module) || /^app\//i.test(module);
        const isEnvFile = /env\.d\.ts$/i.test(module);
        const isBinEntry = binEntries.some(bin => module.includes(bin));

        if (isEntryPoint || isNextJsRoute || isRouterPage || isEnvFile || isBinEntry) {
          return false;
        }

        // Secondary verification: check if the ImportScanner found any imports
        const moduleBasename = this.getModuleBasename(module);
        if (moduleBasename && (referenceMap[moduleBasename] ?? 0) > 0) {
          return false; // ImportScanner found it referenced somewhere, not a zombie
        }

        // Both Madge and ImportScanner agree: this module is truly unused
        return true;
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
   * Resolves the most appropriate TypeScript configuration file.
   * Priority: custom flag > tsconfig.app.json > tsconfig.json > jsconfig.json
   */
  private resolveTsConfig(rootPath: string, customTsConfig?: string): string | undefined {
    if (customTsConfig) {
      const absoluteCustomPath = path.resolve(customTsConfig);
      if (fs.existsSync(absoluteCustomPath)) {
        return absoluteCustomPath;
      }
      console.warn(`[Warning] Provided tsConfig path not found: ${customTsConfig}`);
    }

    const possiblePaths = [
      path.join(rootPath, 'tsconfig.app.json'),
      path.join(rootPath, '..', 'tsconfig.app.json'),
      path.join(rootPath, 'tsconfig.web.json'),
      path.join(rootPath, '..', 'tsconfig.web.json'),
      path.join(rootPath, 'tsconfig.json'),
      path.join(rootPath, '..', 'tsconfig.json'),
      path.join(rootPath, 'jsconfig.json'),
      path.join(rootPath, '..', 'jsconfig.json')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return undefined;
  }

  /**
   * Reads the "bin" field from the closest package.json to identify
   * CLI entry points that should be exempt from zombie detection.
   */
  private readBinEntries(rootPath: string): string[] {
    const entries: string[] = [];
    const candidates = [
      path.join(rootPath, 'package.json'),
      path.join(rootPath, '..', 'package.json')
    ];

    for (const pkgPath of candidates) {
      try {
        if (fs.existsSync(pkgPath)) {
          const content = fs.readFileSync(pkgPath, 'utf-8');
          const pkg = JSON.parse(content);
          if (pkg.bin) {
            if (typeof pkg.bin === 'string') {
              entries.push(pkg.bin.replace(/^\.\//, '').replace(/^dist\//, ''));
            } else {
              Object.values(pkg.bin).forEach((binPath: any) => {
                entries.push(String(binPath).replace(/^\.\//, '').replace(/^dist\//, ''));
              });
            }
          }
          break;
        }
      } catch {
        // Skip unreadable package.json
      }
    }

    return entries;
  }

  /**
   * Extracts a clean filename (without extension) from a Madge module path.
   * Example: 'components/layout/footer/FooterContact.tsx' -> 'FooterContact'
   */
  private getModuleBasename(modulePath: string): string | null {
    const cleaned = modulePath.replace(/\.(tsx?|jsx?|js|ts)$/, '');
    const segments = cleaned.split('/');
    const last = segments[segments.length - 1];
    if (!last || last === 'index') return null;
    return last;
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
      return await this.madgeInstance.dot(outputPath);
    }
  }
}
