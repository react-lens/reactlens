/**
 * @fileoverview ImportScanner
 * Native regex-based import cross-reference scanner.
 * Operates independently of Madge to verify module usage
 * by directly reading source file contents and extracting import statements.
 * This serves as the second verification layer for zombie detection.
 */

import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Maps each file basename to the number of times it is imported across the project.
 * Example: { "FooterContact": 2, "LoginForm": 1 }
 */
export type ImportReferenceMap = Record<string, number>;

export class ImportScanner {
  /**
   * Regex pattern to capture the module specifier from all common import forms:
   * - import X from 'path'
   * - import { X } from 'path'
   * - import * as X from 'path'
   * - export { X } from 'path'
   * - const X = lazy(() => import('path'))
   * - require('path')
   */
  private readonly IMPORT_PATTERNS = [
    /(?:import|export)\s+[\s\S]{0,1000}?\s+from\s+['"]([^'"]+)['"]/g,
    /(?:import|export)\s*\([\s]*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  /**
   * Scans all provided source files and builds a reference map
   * indicating how many times each module basename is imported across the project.
   *
   * @param filePaths Absolute paths to all source files in the project
   * @returns A map of file basenames (without extension) to their import count
   */
  async buildReferenceMap(filePaths: string[]): Promise<ImportReferenceMap> {
    const refMap: ImportReferenceMap = {};

    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const importedModules = this.extractImportedModules(content);

        for (const moduleName of importedModules) {
          // Extract the final segment of the import path (the file basename)
          const basename = this.extractBasename(moduleName);
          if (basename) {
            refMap[basename] = (refMap[basename] || 0) + 1;
          }
        }
      } catch {
        // Skip files that cannot be read
      }
    }

    return refMap;
  }

  /**
   * Extracts all module specifiers from a file's source code.
   * Returns raw import paths like '@/components/layout/footer/FooterContact'
   *
   * @param sourceCode The raw text content of the source file
   */
  private extractImportedModules(sourceCode: string): string[] {
    const modules: string[] = [];

    for (const pattern of this.IMPORT_PATTERNS) {
      // Reset the regex state for each file
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(sourceCode)) !== null) {
        const specifier = match[1];
        if (specifier && !this.isExternalPackage(specifier)) {
          modules.push(specifier);
        }
      }
    }

    return modules;
  }

  /**
   * Extracts the filename (without extension) from an import path.
   * Examples:
   *   '@/components/layout/footer/FooterContact' -> 'FooterContact'
   *   './FooterLinks' -> 'FooterLinks'
   *   '../utils/helpers' -> 'helpers'
   *
   * @param importPath The raw import module specifier
   */
  private extractBasename(importPath: string): string | null {
    // Remove any file extension if present
    const cleaned = importPath.replace(/\.(tsx?|jsx?|js|ts)$/, '');
    // Get the last path segment
    const segments = cleaned.split('/');
    const last = segments[segments.length - 1];

    // Ignore index imports as they are ambiguous
    if (!last || last === 'index' || last === '.') {
      return null;
    }

    return last;
  }

  /**
   * Determines if an import specifier points to an external npm package
   * rather than a local project file.
   *
   * @param specifier The import module specifier
   */
  private isExternalPackage(specifier: string): boolean {
    // Local paths start with '.', '/', or use aliases like '@/' or '~/'
    if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
    if (specifier.startsWith('@/') || specifier.startsWith('~/')) return false;

    // Scoped npm packages like '@babel/parser'
    if (specifier.startsWith('@') && !specifier.startsWith('@/')) return true;

    // Everything else without a path separator is likely an npm package
    if (!specifier.includes('/')) return true;

    // Packages with subpaths like 'lodash/merge'
    return !specifier.startsWith('@/') && !specifier.startsWith('~/');
  }
}
