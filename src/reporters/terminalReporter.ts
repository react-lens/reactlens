/**
 * @fileoverview TerminalReporter
 * Responsible for formatting and displaying results to the user in the CLI.
 * Uses Chalk for aesthetic styling and informative colors.
 */

import chalk from 'chalk';
import { ProjectInfo } from '../scanners/fileScanner.js';
import { ComponentMetrics } from '../analyzer/componentAnalyzer.js';
import { DependencyMetrics } from '../analyzer/dependencyAnalyzer.js';
import { ArchitectureReport, Recommendation } from '../analyzer/insightEngine.js';

export class TerminalReporter {
  /**
   * Displays the final report in a formatted and attractive way
   * @param projectInfo Basic scanning information
   * @param componentsMetrics Component analysis results
   * @param dependencyMetrics Dependency analysis results
   * @param insightReport Advanced insights and scoring
   */
  report(
    projectInfo: ProjectInfo,
    componentsMetrics: ComponentMetrics[],
    dependencyMetrics: DependencyMetrics,
    insightReport: ArchitectureReport
  ) {
    const border = '━'.repeat(45);
    const subBorder = '─'.repeat(45);

    console.log('\n' + chalk.cyan(border));
    console.log(chalk.cyan.bold('  ReactLens Architecture Report'));
    console.log(chalk.cyan(border) + '\n');

    // Stats
    const typeLabel = projectInfo.type === 'node-cli' ? 'Node CLI Tool' : projectInfo.type.toUpperCase();
    console.log(chalk.bold('General Statistics'));
    console.log(`${chalk.dim('• Project Type:')} ${chalk.green(typeLabel)}`);
    console.log(`${chalk.dim('• Modules:')}      ${chalk.blue(dependencyMetrics.internalModules.length)} internal / ${chalk.blue(dependencyMetrics.externalModules.length)} external`);
    console.log(`${chalk.dim('• Components:')}   ${chalk.blue(componentsMetrics.length)}`);
    
    // Score Breakdown
    console.log('\n' + chalk.bold('Health Breakdown'));
    console.log(`${chalk.dim('• Complexity:')} ${this.getScoreColor(insightReport.breakdown.complexity)(insightReport.breakdown.complexity + '%')}`);
    console.log(`${chalk.dim('• Coupling:')}   ${this.getScoreColor(insightReport.breakdown.coupling)(insightReport.breakdown.coupling + '%')}`);
    console.log(`${chalk.dim('• Zombies:')}    ${this.getScoreColor(insightReport.breakdown.zombies)(insightReport.breakdown.zombies + '%')}`);
    
    console.log(chalk.dim(subBorder));

    // Insights
    if (insightReport.recommendations.length > 0) {
      console.log('\n' + chalk.bold('Actionable Insights'));
      
      const sortedRecs = [...insightReport.recommendations].sort((a, b) => {
        const order = { error: 0, warning: 1, info: 2 };
        return order[a.level] - order[b.level];
      });

      sortedRecs.forEach(rec => {
        let label = '[INFO]';
        let color = chalk.blue;
        
        if (rec.level === 'error') {
          label = '[ERROR]';
          color = chalk.red.bold;
        } else if (rec.level === 'warning') {
          label = '[WARN]';
          color = chalk.yellow.bold;
        }

        console.log(`\n${color(label)} ${chalk.bold(rec.target)}`);
        console.log(`  ${chalk.white(rec.message)}`);
        console.log(`  ${chalk.dim('↳')} ${chalk.green(rec.suggestion)}`);
      });
    } else {
      console.log('\n' + chalk.green('[OK] Architecture is healthy. No issues found.'));
    }

    // Final Score
    console.log('\n' + chalk.dim(subBorder));
    const scoreColor = this.getScoreColor(insightReport.score);
    console.log(`${chalk.bold('Overall Architecture Score:')} ${scoreColor.bold(insightReport.score + '%')}`);
    console.log(chalk.cyan(border) + '\n');
  }

  private getLevelColor(level: Recommendation['level']) {
    if (level === 'error') return chalk.red;
    if (level === 'warning') return chalk.yellow;
    return chalk.cyan;
  }

  /**
   * Determines color based on score value
   * @param score Numerical score from 0-100
   */
  private getScoreColor(score: number) {
    if (score > 80) return chalk.green;
    if (score > 50) return chalk.yellow;
    return chalk.red;
  }
}
