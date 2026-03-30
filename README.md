# ReactLens 🔍

[![NPM Version](https://img.shields.io/npm/v/@mohamed_fadl/reactlens?color=blue&label=NPM&logo=npm)](https://www.npmjs.com/package/@mohamed_fadl/reactlens)
[![NPM Downloads](https://img.shields.io/npm/dm/@mohamed_fadl/reactlens?color=green&logo=npm)](https://www.npmjs.com/package/@mohamed_fadl/reactlens)
[![License: MIT](https://img.shields.io/github/license/reactlens/reactlens?color=yellow)](https://opensource.org/licenses/MIT)
[![Node.js Compatibility](https://img.shields.io/node/v/@mohamed_fadl/reactlens?color=darkgreen&logo=nodedotjs)](https://nodejs.org/)

> [!WARNING]
> **Beta:** We're still refining the algorithms and adding features. Expect changes.

ReactLens is a CLI tool that gives you a deep "X-ray" view of your React and Next.js projects. We use AST analysis to find complexity, circular dependencies, and unused files so you can keep your architecture clean.

## Quick Reference

| Command | What it does | Example |
| :--- | :--- | :--- |
| `analyze` | Full architectural audit | `reactlens analyze ./src` |
| `graph` | Visualizes your dependencies | `reactlens graph ./src --output arch.svg` |

## Installation

```bash
npm install -g @mohamed_fadl/reactlens
```

## How to use it

```bash
# Scan the current folder
reactlens analyze

# Generate a beautiful HTML report
reactlens analyze ./src --html report.html

# Set a quality gate (fails if score is under 80)
reactlens analyze ./src --fail-under 80

# Export raw JSON for your CI/CD
reactlens analyze --json report.json --silent
```

## System Requirements (Graphviz)

If you want to use the `graph` command, you need **Graphviz (2.40+)**:

- **Windows:** `winget install graphviz`
- **macOS:** `brew install graphviz`
- **Linux:** `sudo apt install graphviz`

> [!TIP]
> If `graph` fails, double-check that Graphviz is in your system's PATH.

## Command Details

### `reactlens analyze [path] [options]`
Starts the architectural analysis.

**Options:**
- `--html <file>` : Export a standalone HTML report.
- `-j, --json [file]` : Saves the report as JSON.
- `-s, --silent` : Hides the terminal UI (great for scripts).
- `--fail-under <score>` : Returns an error code if the score is too low.

### HTML Reports (Evidence-Based)
Generate a beautiful, interactive dashboard with `reactlens analyze --html report.html`. 
- **Project Fingerprint:** Every report embeds your project name, path, and a sample of files. You always know exactly what codebase was scanned.
- **Transparent Evidence:** Every architectural warning (like a Zombie Component or oversized file) includes an **Evidence** block showing the exact AST line numbers or module resolution logic that triggered the flag, guaranteeing zero false-positives.

### JSON Schema
If you're piping the JSON into other tools, here's what to look for:
- `summary`: Component and module counts.
- `metrics`: Scores for Complexity, Coupling, and Zombies.
- `insights`: Our suggestions for refactoring.
- `score`: The overall health percentage.

### `reactlens graph [path] --output <file>`
Creates a visual map of your modules. We support `.svg`, `.png`, and `.dot`.

## How we calculate the Score

We look at three main pillars:

1.  **Complexity (40%)**: We check for massive components and "prop-heavy" code.
2.  **Coupling (40%)**: We look for circular dependencies that tangle your codebase.
3.  **Zombies (20%)**: We find files that aren't actually being used.

## Technical Details

If you're curious about the math or how we use Babel AST, check out our [Engineering Reference](ENGINEERING.md).
