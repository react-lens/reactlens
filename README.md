# ReactLens

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

# Set a quality gate (fails if score is under 80)
reactlens analyze ./src --fail-under 80

# Export raw JSON for your CI/CD
reactlens analyze --json report.json --silent
```

---

## System Requirements (Graphviz)

If you want to use the `graph` command, you need **Graphviz (2.40+)**:

- **Windows:** `winget install graphviz`
- **macOS:** `brew install graphviz`
- **Linux:** `sudo apt install graphviz`

> [!TIP]
> If `graph` fails, double-check that Graphviz is in your system's PATH.

---

## Command Details

### `reactlens analyze [path] [options]`
Starts the architectural analysis.

**Options:**
- `-j, --json [file]` : Saves the report as JSON.
- `-s, --silent` : Hides the terminal UI (great for scripts).
- `--fail-under <score>` : Returns an error code if the score is too low.

### JSON Schema
If you're piping the JSON into other tools, here's what to look for:
- `summary`: Component and module counts.
- `metrics`: Scores for Complexity, Coupling, and Zombies.
- `insights`: Our suggestions for refactoring.
- `score`: The overall health percentage.

### `reactlens graph [path] --output <file>`
Creates a visual map of your modules. We support `.svg`, `.png`, and `.dot`.

---

## How we calculate the Score

We look at three main pillars:

1.  **Complexity (40%)**: We check for massive components and "prop-heavy" code.
2.  **Coupling (40%)**: We look for circular dependencies that tangle your codebase.
3.  **Zombies (20%)**: We find files that aren't actually being used.

---

## Technical Details

If you're curious about the math or how we use Babel AST, check out our [Engineering Reference](ENGINEERING.md).
