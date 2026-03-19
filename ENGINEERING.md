# ReactLens Engineering Reference

This document provides deep technical details about the inner workings of the ReactLens analysis engine.

## Semantic AST Traversal

ReactLens utilizes the `@babel/parser` to generate an Abstract Syntax Tree (AST) from your source code. The `ComponentAnalyzer` traverses this tree to identify:

- **Functional Components:** Detected via function signatures that return JSX elements or calls to `React.createElement`.
- **Hooks Usage:** Identified through the `use` prefix heuristic and dependency array analysis.
- **Prop Drilling:** Calculated by tracking props that are passed to child components but never accessed or used within the parent component's logic.

## Dependency Graph Theory

The `DependencyAnalyzer` constructs a Directed Acyclic Graph (DAG) for the project using the **Madge** engine.

- **Circular Dependencies:** Detected using Depth-First Search (DFS) to find back-edges in the graph.
- **Zombie Components:** These are modules that have no incoming edges from known entry points (like `index.tsx` or `main.tsx`) and are not part of the test suite.

## The Mathematical Scoring Model

The Architectural Integrity Score ($S$) represents the overall health of the project, calculated as a weighted average of three core metrics:

$$S = \text{round}(0.4 \cdot S_{comp} + 0.4 \cdot S_{coup} + 0.2 \cdot S_{zom})$$

### 1. Complexity Score ($S_{comp}$)
Measures the "weight" of your components.
- **Lines of Code:** Components over 300 lines receive a penalty.
- **Prop Overload:** Components with more than 10 props are penalized.
- **Drilling Penalty:** Each detected instance of prop drilling reduces the component's health.

### 2. Coupling Score ($S_{coup}$)
Measures how "tangled" your modules are.
- **Circular Penalty:** Each circular dependency chain reduces the score by 15%.

### 3. Zombie Score ($S_{zom}$)
Measures "dead weight" in the project.
- **Unused Modules:** The score decreases by 2% for every unused module detected.

## Developer Tools: Internal Security Meta-Audit

ReactLens includes an internal command for developers to verify the tool's own integrity:

### `reactlens audit`
This command is used during development to perform a self-audit of the ReactLens codebase:
- **Supply Chain Check:** Analyzes internal dependencies for known vulnerabilities.
- **Pattern Scanning:** Scans for suspicious logic patterns in the engine.

*Note: This command is intended for contributors and is not required for general application analysis.*

---
*Technical Reference - ReactLens Engineering Team.*
