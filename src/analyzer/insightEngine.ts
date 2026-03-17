/**
 * @fileoverview InsightEngine
 * Responsible for generating actionable recommendations and calculating advanced scores.
 * Transforms raw metrics into architectural insights.
 */

import { ComponentMetrics } from '../analyzer/componentAnalyzer.js';
import { DependencyMetrics } from '../analyzer/dependencyAnalyzer.js';

export interface Recommendation {
  level: 'info' | 'warning' | 'error';
  target: string;
  message: string;
  suggestion: string;
}

export interface ArchitectureReport {
  score: number;
  breakdown: {
    complexity: number;
    coupling: number;
    zombies: number;
  };
  recommendations: Recommendation[];
}

export class InsightEngine {
  private readonly TRESHOLDS = {
    LARGE_COMPONENT: 300,
    HIGH_PROP_COUNT: 5,
    HIGH_HOOK_COUNT: 4,
  };

  /**
   * Generates a comprehensive architectural insight report
   * @param componentMetrics List of metrics for all components
   * @param dependencyMetrics Results from dependency analysis
   */
  generateReport(
    componentMetrics: ComponentMetrics[],
    dependencyMetrics: DependencyMetrics
  ): ArchitectureReport {
    const recommendations: Recommendation[] = [];

    // Analyze components for recommendations
    componentMetrics.forEach(c => {
      if (c.isLarge) {
        recommendations.push({
          level: 'warning',
          target: c.name,
          message: `Oversized component detected (${c.lineCount} lines).`,
          suggestion: 'Break this component into smaller, more focused sub-components.'
        });
      }

      if (c.propCount > this.TRESHOLDS.HIGH_PROP_COUNT) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: `High prop count (${c.propCount} props).`,
          suggestion: 'Consider grouping related props or using a React Context.'
        });
      }

      if (c.hookCount > this.TRESHOLDS.HIGH_HOOK_COUNT) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: `Complexity warning: High hook count (${c.hookCount} hooks).`,
          suggestion: 'Extract some logic into a Custom Hook to simplify the component.'
        });
      }

      if (c.drilledProps.length > 0) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: `Potential Prop Drilling: ${c.drilledProps.join(', ')} passed down without local usage.`,
          suggestion: 'Consider using React Context or a State Management library for deeply nested data.'
        });
      }

      if (c.isClientComponent) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: 'Client-side component identified.',
          suggestion: 'Ensure heavy logic is moved to server components if possible to improve performance.'
        });
      }
    });

    // Analyze dependencies for recommendations
    dependencyMetrics.circular.forEach((cycle, i) => {
      recommendations.push({
        level: 'error',
        target: `Cycle ${i + 1}`,
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        suggestion: 'Create a shared/core module to break the dependency cycle.'
      });
    });

    dependencyMetrics.zombieComponents.forEach(z => {
      recommendations.push({
        level: 'warning',
        target: z,
        message: 'Unused module (Zombie Component).',
        suggestion: 'Safely remove this file if it is no longer needed.'
      });
    });

    // Next.js Boundary Checks
    this.checkNextJsBoundaries(componentMetrics, dependencyMetrics, recommendations);

    // Deduplicate recommendations
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations);

    const { score, breakdown } = this.calculateAdvancedScore(componentMetrics, dependencyMetrics);

    return {
      score,
      breakdown,
      recommendations: uniqueRecommendations
    };
  }

  /**
   * Removes duplicate recommendations for the same target and message
   */
  private deduplicateRecommendations(recs: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return recs.filter(r => {
      const key = `${r.level}-${r.target}-${r.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Advanced Scoring v2 - Weighs different architectural issues
   */
  private calculateAdvancedScore(components: ComponentMetrics[], deps: DependencyMetrics) {
    let complexityPenalty = 0;
    let couplingPenalty = 0;
    let zombiePenalty = 0;

    // Complexity penalties
    components.forEach(c => {
      if (c.isLarge) complexityPenalty += 5;
      if (c.propCount > 7) complexityPenalty += 3;
      if (c.hookCount > 6) complexityPenalty += 3;
      if (c.drilledProps.length > 0) complexityPenalty += (c.drilledProps.length * 2);
    });

    // Coupling/Graph penalties
    couplingPenalty += (deps.circular.length * 15);
    
    // Zombie penalties
    zombiePenalty += (deps.zombieComponents.length * 2);

    const scores = {
      complexity: Math.max(0, 100 - complexityPenalty),
      coupling: Math.max(0, 100 - couplingPenalty),
      zombies: Math.max(0, 100 - zombiePenalty),
    };

    const totalScore = Math.round((scores.complexity * 0.4) + (scores.coupling * 0.4) + (scores.zombies * 0.2));

    return {
      score: totalScore,
      breakdown: scores
    };
  }

  /**
   * Checks for Next.js specific boundary violations or optimizations
   */
  private checkNextJsBoundaries(
    components: ComponentMetrics[], 
    deps: DependencyMetrics, 
    recommendations: Recommendation[]
  ) {
    const clientComponents = components.filter(c => c.isClientComponent);
    const serverComponents = components.filter(c => !c.isClientComponent);

    // Insight: Balance check
    if (clientComponents.length > serverComponents.length && components.length > 5) {
      recommendations.push({
        level: 'info',
        target: 'Project Structure',
        message: 'High ratio of Client Components detected.',
        suggestion: 'In Next.js, try to keep the majority of your components as Server Components for better performance.'
      });
    }
  }
}
