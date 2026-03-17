/**
 * @fileoverview ComponentAnalyzer
 * Engine responsible for analyzing JS/TS file contents.
 * Uses Babel AST to discover React components and calculate size/complexity.
 */

import { promises as fs } from 'fs';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = (_traverse as any).default || _traverse;

/**
 * Represents analysis metrics for a single component
 */
export interface ComponentMetrics {
  name: string;
  lineCount: number;
  type: 'functional' | 'class';
  isLarge: boolean;
  propCount: number;
  props: string[];
  hookCount: number;
  hooks: string[];
  isClientComponent: boolean;
  drilledProps: string[];
}

export class ComponentAnalyzer {
  private readonly SIZE_THRESHOLD = 300;

  /**
   * Analyzes a single file and extracts component information
   * @param filePath Path of the file to analyze
   */
  async analyzeFile(filePath: string): Promise<ComponentMetrics[]> {
    try {
      const code = await fs.readFile(filePath, 'utf-8');
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const components: ComponentMetrics[] = [];
      const hasUseClient = ast.program.directives.some(d => d.value.value === 'use client');

      traverse(ast, {
        // Detect function declarations (Functional Components)
        FunctionDeclaration: (path: any) => {
          const name = path.node.id?.name;
          if (this.isComponentName(name)) {
            const props = this.extractProps(path.node.params);
            const hooks = this.extractHooks(path);
            components.push({
              name,
              lineCount: path.node.loc.end.line - path.node.loc.start.line + 1,
              type: 'functional',
              isLarge: (path.node.loc.end.line - path.node.loc.start.line + 1) > this.SIZE_THRESHOLD,
              propCount: props.length,
              props,
              hookCount: hooks.length,
              hooks,
              isClientComponent: hasUseClient,
              drilledProps: this.detectPropDrilling(path, props)
            });
          }
        },
        // Detect variable-assigned functions (Arrow Functions)
        VariableDeclarator: (path: any) => {
          if (path.node.id.type === 'Identifier') {
            const name = path.node.id.name;
            const init = path.node.init;
            if (this.isComponentName(name) && 
               (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression')) {
               const props = this.extractProps(init.params);
               const hooks = this.extractHooks(path.get('init'));
               components.push({
                name,
                lineCount: init.loc.end.line - init.loc.start.line + 1,
                type: 'functional',
                isLarge: (init.loc.end.line - init.loc.start.line + 1) > this.SIZE_THRESHOLD,
                propCount: props.length,
                props,
                hookCount: hooks.length,
                hooks,
                isClientComponent: hasUseClient,
                drilledProps: this.detectPropDrilling(path.get('init'), props)
              });
            }
          }
        }
      });

      return components;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extracts hook names used within a component
   * @param componentPath Babel path of the component
   */
  private extractHooks(componentPath: any): string[] {
    const hooks: string[] = [];
    componentPath.traverse({
      CallExpression(path: any) {
        const callee = path.node.callee;
        let hookName: string | null = null;

        if (callee.type === 'Identifier' && callee.name.startsWith('use')) {
          hookName = callee.name;
        } else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && callee.property.name.startsWith('use')) {
          hookName = callee.property.name;
        }

        if (hookName) {
          hooks.push(hookName);
        }
      }
    });
    return hooks;
  }

  /**
   * Extracts prop names from function parameters
   * @param params Babel AST function parameters
   */
  private extractProps(params: any[]): string[] {
    if (params.length === 0) return [];

    const firstParam = params[0];
    
    // Case 1: Destructured props ({ name, age })
    if (firstParam.type === 'ObjectPattern') {
      return firstParam.properties
        .filter((p: any) => p.type === 'ObjectProperty' && p.key.type === 'Identifier')
        .map((p: any) => p.key.name);
    }
    
    // Case 2: Single props object (props)
    if (firstParam.type === 'Identifier') {
      return [firstParam.name];
    }

    return [];
  }

  /**
   * Simple rule to identify component name (starts with uppercase)
   * @param name Name of the identifier
   */
  private isComponentName(name: string | undefined): boolean {
    if (!name) return false;
    return /^[A-Z]/.test(name);
  }

  /**
   * Identifies props that are passed down to children without being used locally
   * Heuristic for V1.2
   */
  private detectPropDrilling(componentPath: any, props: string[]): string[] {
    const drilled: string[] = [];
    const usedLocally = new Set<string>();

    props.forEach(prop => {
      // Find all usages of this prop identifier
      componentPath.traverse({
        Identifier(path: any) {
          if (path.node.name === prop) {
            // Check if it's a JSXAttribute value (passing it down)
            const isPassingDown = path.findParent((p: any) => p.isJSXAttribute());
            if (!isPassingDown) {
              usedLocally.add(prop);
            }
          }
        }
      });

      if (!usedLocally.has(prop)) {
        drilled.push(prop);
      }
    });

    return drilled;
  }
}
