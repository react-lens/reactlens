# ReactLens

[![NPM Version](https://img.shields.io/npm/v/@mohamed_fadl/reactlens?color=blue&label=NPM&logo=npm)](https://www.npmjs.com/package/@mohamed_fadl/reactlens)
[![NPM Downloads](https://img.shields.io/npm/dm/@mohamed_fadl/reactlens?color=green&logo=npm)](https://www.npmjs.com/package/@mohamed_fadl/reactlens)
[![License: MIT](https://img.shields.io/github/license/react-lens/react-lens?color=yellow)](https://opensource.org/licenses/MIT)
[![Node.js Compatibility](https://img.shields.io/node/v/@mohamed_fadl/reactlens?color=darkgreen&logo=nodedotjs)](https://nodejs.org/)

> [!WARNING]
> **Beta:** We're still refining the algorithms and adding features. Expect changes.

ReactLens is a CLI tool that gives you a deep "X-ray" view of your React and Next.js projects. We use AST analysis to find complexity, circular dependencies, and unused files so you can keep your architecture clean.

## Quick Start

You don't need to configure anything. Pick the method that works best for you:

### 1. Try it instantly (No installation)
Ideal for a quick architectural audit right now:
```bash
# Generates a beautiful HTML report of your ./src folder
npx @mohamed_fadl/reactlens analyze ./src --html reactlens-report.html
```

### 2. Add to your Project (Recommended for Teams)
Ideal for standardizing your team's workflow:
```bash
npm install -D @mohamed_fadl/reactlens
```
Add this shortcut to your `package.json`:
```json
"scripts": {
  "lens:report": "reactlens analyze ./src --html reactlens-report.html"
}
```
Now, anyone on your team can generate the report by simply running:
```bash
npm run lens:report
```

### 3. Global Installation
Ideal if you want to use the tool across multiple projects on your personal machine:
```bash
npm install -g @mohamed_fadl/reactlens
reactlens analyze ./src --html report.html
```

## Core Features & Usage

### The HTML Dashboard (Evidence-Based)
Generate an interactive dashboard that proves every warning:
```bash
reactlens analyze ./src --html report.html
```
- **Project Fingerprint:** Every report embeds your project name and a sample of files.
- **Transparent Evidence:** Every architectural warning (like an oversized file) includes an **Evidence block** showing the exact AST line numbers that triggered the flag. Zero false-positives.

### CI/CD Quality Gates
You can block Pull Requests if the codebase health drops below a certain threshold:
```bash
reactlens analyze ./src --fail-under 80
```

### JSON Export
Export raw JSON for your CI/CD pipelines to parse:
```bash
reactlens analyze --json report.json --silent
```

## How we calculate the Score

We look at three main pillars:
1. **Complexity (40%)**: We check for massive components and "prop-heavy" code.
2. **Coupling (40%)**: We look for circular dependencies that tangle your codebase.
3. **Zombies (20%)**: We find files that aren't actually being used.

## Dependency Visualizer

ReactLens can also generate a map of your modules (`.svg`, `.png`, `.dot`):
```bash
reactlens graph ./src --output arch.svg
```

*(Note: The `graph` command requires **Graphviz** (2.40+) to be installed on your system. E.g., `winget install graphviz` on Windows or `brew install graphviz` on macOS).*

## License

This project is open-source and available under the [MIT License](./LICENSE).

Built with passion for clean architecture by [Mohamed Fadl](https://github.com/react-lens). Contributions, issues, and feature requests are welcome!
