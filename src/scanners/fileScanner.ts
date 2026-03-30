/**
 * @fileoverview FileScanner
 * Responsible for discovering project files and identifying the framework (React, Next, Vue).
 * Supports automatic detection of JavaScript and TypeScript files.
 */

import { promises as fs } from 'fs';
import path from 'path';
import fg from 'fast-glob';

/**
 * Represents discovered project information
 */
export interface ProjectInfo {
  type: 'react' | 'next' | 'vue' | 'node-cli' | 'unknown';
  rootPath: string;
  files: string[];
  projectName: string;
}

export class FileScanner {
  /**
   * Starts project scanning from a given path
   * @param targetPath The path where search begins
   */
  async scan(targetPath: string): Promise<ProjectInfo> {
    const rootPath = path.resolve(targetPath);
    
    if (this.isForbiddenSystemPath(rootPath)) {
      throw new Error(`[Security Error] Analysis of sensitive system directory is forbidden: ${rootPath}`);
    }

    const { type: projectType, name: projectName } = await this.detectProjectMeta(rootPath);
    const files = await this.discoverFiles(rootPath);

    return {
      type: projectType,
      rootPath,
      files,
      projectName
    };
  }

  /**
   * Prevents Path Traversal attacks and prevents analyzing OS root/system directories.
   * @param rootPath Absolute path to check
   */
  private isForbiddenSystemPath(rootPath: string): boolean {
    const normalizedPath = rootPath.toLowerCase().replace(/\\/g, '/');
    
    // Windows protected paths
    if (normalizedPath === 'c:/' || normalizedPath.startsWith('c:/windows') || normalizedPath.startsWith('c:/program files')) {
      return true;
    }
    
    // Unix/Linux protected paths
    const unixForbidden = ['/etc', '/var', '/usr', '/bin', '/sbin', '/boot', '/dev', '/sys', '/lib', '/opt'];
    if (normalizedPath === '/' || unixForbidden.some(p => normalizedPath.startsWith(p))) {
      return true;
    }
    
    return false;
  }

  /**
   * Scans package.json to determine the framework used and the project name
   * @param rootPath Project root path
   */
  private async detectProjectMeta(rootPath: string): Promise<{ type: ProjectInfo['type'], name: string }> {
    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const name = pkg.name || path.basename(rootPath);

      if (deps['next']) return { type: 'next', name };
      if (deps['vue']) return { type: 'vue', name };
      if (deps['react']) return { type: 'react', name };
      
      // Detection of CLI Tools
      if (pkg.bin) return { type: 'node-cli', name };

      return { type: 'unknown', name };
    } catch {
      return { type: 'unknown', name: path.basename(rootPath) };
    }
  }

  /**
   * Uses fast-glob to search for supported file extensions (js, ts, jsx, tsx)
   * @param rootPath Search root path
   */
  private async discoverFiles(rootPath: string): Promise<string[]> {
    const patterns = [
      'src/**/*.{js,jsx,ts,tsx}',
      'app/**/*.{js,jsx,ts,tsx}', // Support for Next.js App Router
      'components/**/*.{js,jsx,ts,tsx}',
      'pages/**/*.{js,jsx,ts,tsx}'
    ];

    const entries = await fg(patterns, {
      cwd: rootPath,
      absolute: true,
      stats: true,
      ignore: [
        '**/node_modules/**', 
        '**/dist/**', 
        '**/.next/**',
        '**/__tests__/**',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        'vitest.config.{js,ts,mjs}',
        'jest.config.{js,ts}',
        'tsconfig.json'
      ]
    });

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limitation (ReDoS / AST Bomb protection)
    
    return entries
      .filter(entry => entry.stats && entry.stats.size <= MAX_FILE_SIZE)
      .map(entry => entry.path);
  }
}
