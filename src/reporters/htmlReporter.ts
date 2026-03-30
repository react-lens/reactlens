import { promises as fs } from 'fs';
import { ProjectInfo } from '../scanners/fileScanner.js';
import { ComponentMetrics } from '../analyzer/componentAnalyzer.js';
import { DependencyMetrics } from '../analyzer/dependencyAnalyzer.js';
import { ArchitectureReport, Recommendation } from '../analyzer/insightEngine.js';

export class HtmlReporter {
  /**
   * Main orchestration method to generate and save the HTML report.
   * Breaks down the generation process into modular, maintainable sub-components.
   * 
   * @param projectInfo Core project statistics
   * @param components Analyzed component metrics
   * @param dependencies Dependency and coupling metrics
   * @param insights Advanced architectural recommendations
   * @param outputPath The file system path to save the HTML output
   */
  public async export(
    projectInfo: ProjectInfo,
    components: ComponentMetrics[],
    dependencies: DependencyMetrics,
    insights: ArchitectureReport,
    outputPath: string
  ): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReactLens Architectural Report</title>
    ${this.generateStyles()}
</head>
<body>
    <div class="container">
        ${this.generateHeader(projectInfo)}
        ${this.generateIntegrityScore(insights, projectInfo, components)}
        ${this.generateMetricsGrid(insights, components, dependencies)}
        ${this.generateInsightsSection(insights.recommendations)}
        ${this.generateComponentTable(components)}
    </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Generates internal CSS styles to avoid external stylesheet dependencies.
   */
  private generateStyles(): string {
    return `<style>
        :root {
            --bg: #0f172a; --card-bg: #1e293b; --text: #f8fafc; --text-muted: #94a3b8;
            --primary: #38bdf8; --success: #22c55e; --warning: #eab308; --danger: #ef4444;
            --border: #334155;
        }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: var(--bg); color: var(--text);
            margin: 0; padding: 2rem; line-height: 1.5;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 3rem; border-bottom: 1px solid var(--border); padding-bottom: 2rem; }
        .title { font-size: 2.5rem; font-weight: bold; margin: 0; color: var(--primary); }
        .subtitle { color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
        .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.5rem; }
        .card-title { font-size: 1.25rem; font-weight: 600; margin-top: 0; margin-bottom: 1rem; color: #cbd5e1; }
        
        .score-value { font-size: 3rem; font-weight: bold; margin: 0; line-height: 1; }
        .score-success { color: var(--success); }
        .score-warning { color: var(--warning); }
        .score-danger { color: var(--danger); }
        
        .metric-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
        .metric-row:last-child { border-bottom: none; }
        
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 600; }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .badge-warning { background: rgba(234, 179, 8, 0.2); color: var(--warning); }
        .badge-success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
        
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--text-muted); font-weight: 600; }
        tr:hover { background: rgba(255, 255, 255, 0.02); }
        
        .insight-card { 
            background: rgba(15, 23, 42, 0.6); 
            border: 1px solid var(--border); 
            border-left: 4px solid var(--primary); 
            border-radius: 0.5rem; 
            margin-bottom: 1.5rem; 
            overflow: hidden; 
        }
        .insight-header { 
            padding: 1rem; 
            background: rgba(255, 255, 255, 0.02); 
            border-bottom: 1px solid var(--border); 
            font-weight: 600; 
        }
        .insight-body { padding: 1rem; }
        .insight-impact { 
            padding: 0.75rem; 
            background: rgba(239, 68, 68, 0.05); 
            border-left: 2px solid var(--danger); 
            margin-bottom: 1rem; 
            border-radius: 0.25rem; 
        }
        .insight-solution { 
            padding: 0.75rem; 
            background: rgba(34, 197, 94, 0.05); 
            border-left: 2px solid var(--success); 
            border-radius: 0.25rem; 
        }
        .insight-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; margin-bottom: 0.25rem; }
        .impact-label { color: var(--danger); }
        .solution-label { color: var(--success); }
    </style>`;
  }

  /**
   * Generates the header block identifying the target project and scan time.
   */
  private generateHeader(projectInfo: ProjectInfo): string {
    const sampleFiles = projectInfo.files.slice(0, 3).map(f => f.split(/[/\\]/).pop()).join(', ');
    const moreFiles = projectInfo.files.length > 3 ? '...' : '';
    
    return `<div class="header">
        <h1 class="title">ReactLens Report: <span style="color: var(--primary);">${projectInfo.projectName || 'Unknown Project'}</span></h1>
        <p class="subtitle">
            <strong>Scanned Target:</strong> ${projectInfo.rootPath}<br/>
            <strong>Project Type:</strong> ${projectInfo.type.toUpperCase()}<br/>
            <strong>Files Analyzed:</strong> ${projectInfo.files.length} (e.g., ${sampleFiles}${moreFiles})<br/>
            <strong>Date:</strong> ${new Date().toLocaleString()}
        </p>
    </div>`;
  }

  /**
   * Generates the topmost integrity score and the overview statistics block.
   */
  private generateIntegrityScore(insights: ArchitectureReport, projectInfo: ProjectInfo, components: ComponentMetrics[]): string {
    return `<div class="grid">
        <div class="card" style="text-align: center; display: flex; flex-direction: column; justify-content: center;">
            <h2 class="card-title">Architectural Integrity</h2>
            <p class="score-value ${this.getScoreColor(insights.score)}">${insights.score}%</p>
            <p style="color: var(--text-muted); margin-top: 0.5rem;">Overall Health Score</p>
        </div>
        
        <div class="card">
            <h2 class="card-title">Project Overview</h2>
            <div class="metric-row"><span>Total Files Analyzed</span><strong>${projectInfo.files.length}</strong></div>
            <div class="metric-row"><span>React Components</span><strong>${components.length}</strong></div>
            <div class="metric-row"><span>Project Type</span><strong>${projectInfo.type === 'next' ? 'Next.js' : 'React (SPA)'}</strong></div>
            <div class="metric-row"><span>Language</span><strong style="color: #3178c6">TypeScript/JavaScript</strong></div>
        </div>
    </div>`;
  }

  /**
   * Generates the breakdown of health categories (Complexity, Coupling, Zombies).
   */
  private generateMetricsGrid(insights: ArchitectureReport, components: ComponentMetrics[], dependencies: DependencyMetrics): string {
    return `<div class="grid">
        <div class="card">
            <h2 class="card-title">Complexity Health (40%)</h2>
            <div class="metric-row"><span>Score</span><strong class="${this.getScoreColor(insights.breakdown.complexity)}">${insights.breakdown.complexity}%</strong></div>
            <div class="metric-row"><span>Prop Drills Detected</span><strong>${components.reduce((acc, c) => acc + c.drilledProps.length, 0)}</strong></div>
        </div>
        
        <div class="card">
            <h2 class="card-title">Coupling Health (40%)</h2>
            <div class="metric-row"><span>Score</span><strong class="${this.getScoreColor(insights.breakdown.coupling)}">${insights.breakdown.coupling}%</strong></div>
            <div class="metric-row"><span>Circular Dependencies</span><strong>${dependencies.circular.length}</strong></div>
        </div>
        
        <div class="card">
            <h2 class="card-title">Zombie Health (20%)</h2>
            <div class="metric-row"><span>Score</span><strong class="${this.getScoreColor(insights.breakdown.zombies)}">${insights.breakdown.zombies}%</strong></div>
            <div class="metric-row"><span>Unused Modules</span><strong>${dependencies.zombieComponents.length}</strong></div>
        </div>
    </div>`;
  }

  /**
   * Translates architectural anomalies into structured, educational feedback profiles.
   */
  private generateInsightsSection(recommendations: Recommendation[]): string {
    let content = '';

    if (recommendations.length === 0) {
      content = '<p style="color: var(--success); font-weight: bold;">[SUCCESS] No critical issues found. Architecture is healthy.</p>';
    } else {
      content = recommendations.map(rec => `
        <div class="insight-card">
            <div class="insight-header">
                Target: <strong>${rec.target}</strong> - <span style="font-weight: normal; color: var(--text-muted);">${rec.message}</span>
            </div>
            <div class="insight-body">
                <div class="insight-impact">
                    <div class="insight-label impact-label">Technical Impact</div>
                    <div>${rec.technicalImpact}</div>
                </div>
                <div class="insight-solution">
                    <div class="insight-label solution-label">Actionable Solution</div>
                    <div>${rec.solution}</div>
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.1); border-radius: 4px; border-left: 3px solid var(--primary);">
                    <p style="margin: 0; font-size: 0.85rem; font-family: monospace; color: var(--text-muted);">
                        <strong>Evidence:</strong> ${rec.evidence}
                    </p>
                </div>
            </div>
        </div>
      `).join('');
    }

    return `<div class="card" style="margin-bottom: 3rem;">
        <h2 class="card-title">Technical Architectural Insights</h2>
        ${content}
    </div>`;
  }

  /**
   * Generates a tabular breakdown of components with high metrics for immediate review.
   */
  private generateComponentTable(components: ComponentMetrics[]): string {
    let rows = components.sort((a, b) => b.lineCount - a.lineCount).slice(0, 20).map(comp => `
    <tr>
        <td><strong>${comp.name || 'Anonymous'}</strong></td>
        <td>${comp.lineCount}</td>
        <td>${comp.propCount}</td>
        <td>${comp.hookCount}</td>
        <td>
            ${comp.lineCount >= 300 || comp.propCount >= 10 || comp.drilledProps.length > 0 
                ? `<span class="badge badge-danger">Needs Review</span>` 
                : `<span class="badge badge-success">Healthy</span>`}
        </td>
    </tr>
    `).join('');

    if (components.length === 0) {
      rows = `<tr><td colspan="5" style="text-align: center;">No components found</td></tr>`;
    }

    return `<div class="card">
        <h2 class="card-title">Component Breakdown (Highest Complexity)</h2>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Component Name</th>
                        <th>Lines of Code</th>
                        <th>Props Count</th>
                        <th>Hooks Count</th>
                        <th>Health Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    </div>`;
  }

  /**
   * Translates numerical compliance scores into semantic CSS severity classes.
   */
  private getScoreColor(score: number): string {
    if (score >= 90) return 'score-success';
    if (score >= 70) return 'score-warning';
    return 'score-danger';
  }
}
