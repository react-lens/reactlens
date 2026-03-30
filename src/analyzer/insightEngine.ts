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
  technicalImpact: string;
  solution: string;
  evidence: string;
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
          technicalImpact: 'Large components increase cognitive load, reduce testability, and can inflate JavaScript bundle sizes, leading to slower browser parsing times.',
          solution: 'Extract distinct UI sections into smaller \'Dumb Components\' and isolate generic data-fetching logic into Custom Hooks.',
          evidence: `File located at ${c.name}. AST verified line count (start: 1, end: ${c.lineCount}). Threshold is ${this.TRESHOLDS.LARGE_COMPONENT} lines.`
        });
      }

      if (c.propCount > this.TRESHOLDS.HIGH_PROP_COUNT) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: `Excessive prop count (${c.propCount} props).`,
          technicalImpact: 'Passing too many props creates tight coupling, making the component brittle and hard to refactor. It often indicates a component is trying to do too much.',
          solution: 'Group related props into single configuration objects, or utilize React Context API for data needed across deep structural layers.',
          evidence: `Component signature accepts ${c.propCount} distinct properties. Threshold is ${this.TRESHOLDS.HIGH_PROP_COUNT}.`
        });
      }

      if (c.hookCount > this.TRESHOLDS.HIGH_HOOK_COUNT) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: `High hook complexity (${c.hookCount} hooks).`,
          technicalImpact: 'An abundance of internal hooks couples state logic inextricably to the UI, making state management difficult to track and unit test.',
          solution: 'Abstract related state and effect logic into reusable Custom Hooks, maintaining a strict separation of concerns.',
          evidence: `AST parser identified ${c.hookCount} distinct React Hook calls within the component body. Threshold is ${this.TRESHOLDS.HIGH_HOOK_COUNT}.`
        });
      }

      if (c.drilledProps.length > 0) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: `Prop Drilling detected for: ${c.drilledProps.join(', ')}.`,
          technicalImpact: 'Passing props through components that do not consume them breaks React\'s Memoization algorithms. This causes unnecessary cascading re-renders across the intermediate DOM tree.',
          solution: 'Extract this state into a React Context Provider or utilize a specialized state management library like Zustand.',
          evidence: `Props [${c.drilledProps.join(', ')}] are received in the signature but only passed down directly via JSX attributes, never consumed locally.`
        });
      }

      if (c.isClientComponent) {
        recommendations.push({
          level: 'info',
          target: c.name,
          message: 'Client-side component identified.',
          technicalImpact: 'Client Components ship JavaScript to the browser. Overusing them negates the performance benefits of Next.js Server-Side Rendering and increases Total Blocking Time (TBT).',
          solution: 'Keep this component as a Server Component if it does not require interactivity (onClick, useState), passing only necessary interactive bits as deep Client leaves.',
          evidence: `Component explicitly declares the 'use client' directive at the top of the file.`
        });
      }
    });

    // Analyze dependencies for recommendations
    dependencyMetrics.circular.forEach((cycle, i) => {
      recommendations.push({
        level: 'error',
        target: `Cycle ${i + 1}`,
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        technicalImpact: 'Cyclic imports crash bundlers, cause maximum call stack limits, and introduce non-deterministic module loading behaviors in Node.js/Next.js environments.',
        solution: 'Extract the mutually dependent code into a third, independent shared module, and have both original modules import from the new shared core.',
        evidence: `Dependency tree traversal confirms a cyclic import path across ${cycle.length} files.`
      });
    });

    dependencyMetrics.zombieComponents.forEach(z => {
      recommendations.push({
        level: 'warning',
        target: z,
        message: 'Unused module (Zombie Component).',
        technicalImpact: 'Dead code bloats the repository, confuses developers attempting to map out architecture, and poses a risk of silently importing legacy vulnerable dependencies.',
        solution: 'Safely delete this file. Ensure it is not dynamically imported or referenced in configuration files before removal.',
        evidence: `Dual-verification confirmed: Scanned ${dependencyMetrics.totalModules} modules. Found 0 import statements (static or dynamic) referencing "${z}" across the entire project tree.`
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
        technicalImpact: 'Having more Client Components relative to Server Components fundamentally defeats the architectural premise of Next.js App Router, severely impacting SEO and initial page load speed.',
        solution: 'Audit your component tree to push the \'use client\' directive as far down the leaves of the tree as possible.',
        evidence: `Detected ${clientComponents.length} Client Components vs ${serverComponents.length} Server Components across the application tree.`
      });
    }
  }
}
