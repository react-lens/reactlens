/**
 * ReactLens Internal Security Audit Rules
 * These rules are designed to scan the tool's own codebase for vulnerabilities.
 */

export const SECURITY_RULES = {
  // 1. Secret Detection: Basic regex to catch common API key patterns
  SECRET_DETECTION: /[a-zA-Z0-9]{24,}/, // Mock basic pattern for now

  // 2. Insecure Regex: Patterns that might cause ReDoS
  INSECURE_REGEX_PATTERNS: [
    /(\[a-zA-Z\]+)*\$/, 
    /(\.\*)+\$/,
  ],

  // 3. Dangerous Sinks: Functions that should be avoided or strictly audited
  DANGEROUS_SINKS: [
    'eval',
    'new Function',
    'child_process.exec',
  ],

  // 4. Input Sanitization: Check for Path Traversal patterns
  PATH_TRAVERSAL_KEYWORDS: [
    '..',
    'require.resolve',
  ],
};
