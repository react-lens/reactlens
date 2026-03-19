# ReactLens: Advanced Architectural Analysis Engine

[![npm version](https://img.shields.io/npm/v/@mohamed_fadl/reactlens?color=blue&style=flat-square)](https://www.npmjs.com/package/@mohamed_fadl/reactlens)
[![build](https://img.shields.io/github/actions/workflow/status/react-lens/reactlens/ci.yml?style=flat-square)](https://github.com/react-lens/reactlens/actions)
[![license](https://img.shields.io/npm/l/@mohamed_fadl/reactlens?style=flat-square)](LICENSE)

> [!WARNING]
> **Beta Version:** This tool is currently in beta. Features are subject to change, and we are continuously refining our analysis algorithms.

ReactLens is a high-performance tool designed for deep architectural auditing of React and Next.js applications. It uses static AST analysis to give you a clear "X-ray" view of your project's health.

## 🚀 Quick Reference (TL;DR)

| Command | Description | Example |
| :--- | :--- | :--- |
| `analyze` | Full architectural health audit | `reactlens analyze ./src` |
| `graph` | Visual dependency graph (SVG/PNG) | `reactlens graph ./src --output architecture.svg` |

## 📦 Installation

```bash
npm install -g @mohamed_fadl/reactlens
```

## 🛠️ Usage Examples

```bash
# Basic health check
reactlens analyze

# Enforce quality standards (fails if score < 80)
reactlens analyze ./src --fail-under 80

# Export for CI/CD integration
reactlens analyze --json report.json --silent
```

---

## 🔧 System Requirements (Graphviz)

To use the `graph` command, you need **Graphviz (2.40+)** installed:

- **Windows:** `winget install graphviz`
- **macOS:** `brew install graphviz`
- **Linux:** `sudo apt install graphviz`

> [!TIP]
> **Troubleshooting:** If the `graph` command fails, verify that the Graphviz `bin` folder is in your system's `PATH`.

---

## 📊 Detailed Commands

### `reactlens analyze [path] [options]`
Analyze architectural health, complexity, and dependencies.

**Options:**
- `-j, --json [file]` : Output report in JSON format.
- `-s, --silent` : Suppress visual terminal report.
- `--fail-under <score>` : Exit with error if score is below the limit.

### 🧩 JSON Structure
When using `--json`, the output follows this schema:
- `summary`: High-level counts (Modules, Components).
- `metrics`: Scores for Complexity, Coupling, and Zombies.
- `insights`: Detailed findings and refactoring recommendations.
- `score`: The final architectural integrity percentage.

### `reactlens graph [path] --output <file>`
Visualize module relationships. Supports `.svg`, `.png`, and `.dot` formats.

---

## 🧠 Understanding the Score

We calculate project health based on three pillars:

1.  **Complexity (40%)**: Analysis of component size and prop health.
2.  **Coupling (40%)**: Detection of circular dependencies.
3.  **Zombies (20%)**: Identification of unreachable/unused modules.

---

## 📖 Deep Dive

For technical details on algorithms and scoring, visit the [Engineering Reference](ENGINEERING.md).

---
*Maintained by the ReactLens Engineering Team.*
