#!/usr/bin/env node
/**
 * @fileoverview CLI Entry Point
 * Central entry point for running the tool via command line.
 * Sets up commands and delegates execution to specific analyzers.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { FileScanner } from '../scanners/fileScanner.js';
import { ComponentAnalyzer, ComponentMetrics } from '../analyzer/componentAnalyzer.js';
import { DependencyAnalyzer } from '../analyzer/dependencyAnalyzer.js';
import { TerminalReporter } from '../reporters/terminalReporter.js';
import { InsightEngine } from '../analyzer/insightEngine.js';
import { MetaAuditScanner } from '../audit/scanner.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const program = new Command();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main bootstrap function to initialize CLI commands
 */
export async function bootstrap() {
  program
    .name('react-lens')
    .description('CLI tool for analyzing React/Next project architecture')
    .version('1.0.0');

  program
    .command('analyze')
    .description('Analyze the project architecture')
    .argument('[path]', 'path to the project', '.')
    .option('-j, --json [file]', 'output report in JSON format (optional path to save to file)')
    .option('-s, --silent', 'suppress terminal report (best for piping JSON)')
    .option('-g, --graph <file>', 'output dependency graph to file (dot/svg)')
    .option('--fail-under <score>', 'exit with error if score is below this value')
    .action(async (projectPath, options) => {
      const isSilent = options.silent || (options.json === true);
      
      if (!isSilent) {
        console.log(chalk.cyan('Starting architectural analysis...'));
      }
      
      try {
        // 1. File Scanning
        const scanner = new FileScanner();
        const projectInfo = await scanner.scan(projectPath);

        if (projectInfo.files.length === 0) {
          console.log(chalk.yellow('Warning: No relevant files found in common directories.'));
          return;
        }

        // 2. Component Analysis (AST)
        const componentAnalyzer = new ComponentAnalyzer();
        let allComponentMetrics: ComponentMetrics[] = [];
        for (const file of projectInfo.files) {
          const metrics = await componentAnalyzer.analyzeFile(file);
          allComponentMetrics = [...allComponentMetrics, ...metrics];
        }

        // 3. Dependency Analysis
        const dependencyAnalyzer = new DependencyAnalyzer();
        const dependencyMetrics = await dependencyAnalyzer.analyze(projectInfo.rootPath, 'index.ts');

        // 4. Intelligence Insight Engine
        const insightEngine = new InsightEngine();
        const insightReport = insightEngine.generateReport(allComponentMetrics, dependencyMetrics);

        // 5. Reporting
        if (!isSilent) {
          const reporter = new TerminalReporter();
          reporter.report(projectInfo, allComponentMetrics, dependencyMetrics, insightReport);
        }

        // 6. JSON Export / Stdout
        if (options.json) {
          const fullReport = {
            project: projectInfo,
            components: allComponentMetrics,
            dependencies: dependencyMetrics,
            insights: insightReport,
            timestamp: new Date().toISOString()
          };

          const jsonString = JSON.stringify(fullReport, null, 2);

          if (typeof options.json === 'string') {
            await fs.writeFile(options.json, jsonString);
            if (!isSilent) {
              console.log(chalk.green(`\nReport saved to: ${options.json}`));
            }
          } else {
            // Direct stdout for piping
            console.log(jsonString);
          }
        }

        // 7. Graph Export
        if (options.graph) {
          try {
            await dependencyAnalyzer.exportGraph(options.graph);
            console.log(chalk.green(`\nDependency graph exported to: ${options.graph}`));
          } catch (err) {
            console.warn(chalk.yellow(`\nWarning: Could not export graph. Ensure Graphviz is installed for SVG/Images.`), err);
          }
        }

        // 8. CI/CD Guard
        if (options.failUnder) {
          const threshold = parseInt(options.failUnder, 10);
          if (insightReport.score < threshold) {
            console.error(chalk.red(`\nBuild Failed: Architecture score ${insightReport.score}% is below threshold ${threshold}%`));
            process.exit(1);
          }
        }

      } catch (error) {
        console.error(chalk.red('\nAnalysis failed:'), error);
        process.exit(1);
      }
    });

  program
    .command('audit')
    .description('Run internal security audit (Development only)')
    .option('--self', 'run audit on react-lens itself')
    .action(async (options) => {
      if (options.self) {
        // Project root is 2 levels up from dist/cli/index.js or 1 level from src/cli/index.ts
        const projectRoot = path.join(__dirname, '../../');
        const scanner = new MetaAuditScanner(projectRoot);
        const passed = await scanner.runAudit();
        if (!passed) process.exit(1);
      } else {
        console.log(chalk.yellow('Please use --self to audit the tool itself.'));
      }
    });

  program.parse(process.argv);
}

// Start only if file is executed directly
const isMain = process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1]?.endsWith('index.ts');

if (isMain) {
  bootstrap().catch((err) => {
    console.error(chalk.red('Fatal Error during execution:'), err);
    process.exit(1);
  });
}
