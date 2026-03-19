import { execSync } from 'child_process';
import { SECURITY_RULES } from './rules.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class MetaAuditScanner {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run the full internal security audit
   * REDESIGN: Premium Dashboard Logic
   * Logic: We detect terminal width and use repeat() to ensure the UI is flexible.
   * Manual Fix Tip: Use 'process.stdout.columns' to adjust the layout dynamically.
   */
  async runAudit(): Promise<boolean> {
    const width = process.stdout.columns || 60;
    const line = '═'.repeat(Math.min(width - 4, 60));
    
    console.log('\n' + chalk.cyan.bold(line));
    console.log(chalk.cyan.bold('  [META-AUDIT] ReactLens Security Dashboard'));
    console.log(chalk.cyan.bold(line));

    const dependencyHealth = this.checkDependencyVulnerabilities();
    const codeHealth = this.scanCodebase();

    console.log('\n' + chalk.cyan.bold(line));
    
    if (dependencyHealth && codeHealth) {
      console.log(chalk.bgGreen.black.bold('  SUCCESS  ') + chalk.green(' Logic is hardened & certified safe.'));
      return true;
    } else {
      console.log(chalk.bgRed.black.bold('  FAILURE  ') + chalk.red(' Critical security findings require attention.'));
      return false;
    }
  }

  /**
   * Rule 5: Supply Chain Integrity (npm audit)
   * UI Tip: Using dimmed symbols and bold labels for visual hierarchy.
   */
  private checkDependencyVulnerabilities(): boolean {
    console.log('\n' + chalk.bold('  [1/2] Supply Chain Integrity Check'));
    process.stdout.write(chalk.dim('        Analyzing target packages... '));
    
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      process.stdout.write(chalk.green('PASSED\n'));
      console.log(chalk.dim('        ↳ No high-risk supply chain vulnerabilities.'));
      return true;
    } catch (error) {
      process.stdout.write(chalk.red('FAILED\n'));
      console.log(chalk.red('        ↳ High-risk vulnerabilities detected. Run "npm audit".'));
      return false;
    }
  }

  /**
   * Scans src directory for Rules 1-4
   * UI Tip: Using a 'Status Bar' style for the scan results.
   */
  private scanCodebase(): boolean {
    console.log('\n  ' + chalk.bold('[2/2] Codebase Pattern Analysis'));
    process.stdout.write(chalk.dim('        Scanning source logic... '));
    
    let issuesFound = 0;
    const srcPath = path.join(this.projectRoot, 'src');
    
    this.walkSync(srcPath, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectRoot, filePath);

        SECURITY_RULES.DANGEROUS_SINKS.forEach(sink => {
          if (content.includes(sink)) {
            if (issuesFound === 0) process.stdout.write(chalk.red('ISSUES FOUND\n'));
            console.log(chalk.red(`        [ALERT] Danger Sink: "${sink}"`));
            console.log(chalk.dim(`        ↳ Location: ${relativePath}`));
            issuesFound++;
          }
        });
      }
    });

    if (issuesFound === 0) {
      process.stdout.write(chalk.green('CLEAN\n'));
      console.log(chalk.dim('        ↳ No suspicious logic patterns matched.'));
      return true;
    }
    return false;
  }

  private walkSync(dir: string, callback: (file: string) => void) {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory() && file !== 'audit') {
        this.walkSync(filePath, callback);
      } else {
        callback(filePath);
      }
    });
  }
}
