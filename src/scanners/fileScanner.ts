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
}

export class FileScanner {
  /**
   * Starts project scanning from a given path
   * @param targetPath The path where search begins
   */
  async scan(targetPath: string): Promise<ProjectInfo> {
    const rootPath = path.resolve(targetPath);
    const projectType = await this.detectProjectType(rootPath);
    const files = await this.discoverFiles(rootPath);

    return {
      type: projectType,
      rootPath,
      files
    };
  }

  /**
   * Scans package.json to determine the framework used
   * @param rootPath Project root path
   */
  private async detectProjectType(rootPath: string): Promise<ProjectInfo['type']> {
    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next']) return 'next';
      if (deps['vue']) return 'vue';
      if (deps['react']) return 'react';
      
      // Detection of CLI Tools
      if (pkg.bin) return 'node-cli';

      return 'unknown';
    } catch {
      return 'unknown';
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

    const files = await fg(patterns, {
      cwd: rootPath,
      absolute: true,
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

    return files;
  }
}
