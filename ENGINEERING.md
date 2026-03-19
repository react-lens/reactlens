# Engineering Reference

This is where we dive into how ReactLens actually works.

## How we use Babel AST

We use `@babel/parser` to turn your code into an Abstract Syntax Tree (AST). Our `ComponentAnalyzer` then scans the tree to find:

- **React Components:** We look for functions that return JSX or call `createElement`.
- **Hooks:** We track dependencies and the "use" prefix.
- **Prop Drilling:** We track props passed to children that aren't used in the parent.

## Dependency Resolution

We use **Madge** to build a map of your project's modules.

- **Circular Dependencies:** We use a Depth-First Search (DFS) to find imports that loop back on themselves.
- **Zombies:** These are modules that don't have any incoming links from your entry points (`index.tsx`, etc.) and aren't tests.

## The Scoring Math

The Architectural Integrity Score ($S$) is a weighted average:

$$S = \text{round}(0.4 \cdot S_{comp} + 0.4 \cdot S_{coup} + 0.2 \cdot S_{zom})$$

### 1. Complexity ($S_{comp}$)
We penalize components that are too "heavy":
- **Lines of Code:** Over 300 lines.
- **Prop Count:** Over 10 props.
*   **Prop Drilling:** Each instance detected reduces the health.

### 2. Coupling ($S_{coup}$)
This is about how tangled your files are. Every circular dependency chain drops the score by 15%.

### 3. Zombies ($S_{zom}$)
Dead weight. We drop the score by 2% for every unused module we find.

## For Developers: The `audit` command

We included a `reactlens audit` command for project contributors. It scans our own codebase for:
- **Supply Chain Risks:** Vulnerable dependencies.
- **Logic Patterns:** Suspicious or dangerous code patterns.
