/**
 * GenCraft Pro — AI Service (Frontend API Client)
 * 
 * Communicates with the backend AI agent API
 * for refactoring, test generation, autofix, and code explanation.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface AISession {
  id: string;
  scenario: string;
  model: string;
  maxTokens: number;
  status: string;
}

interface AIResponse {
  sessionId: string;
  content: string;
  toolCalls: unknown[];
  toolResults: unknown[];
  tokensUsed: number;
  codeBlocks: { language: string; code: string }[];
}

interface RefactorSuggestion {
  id: string;
  type: 'performance' | 'readability' | 'security' | 'modernize' | 'cleanup';
  title: string;
  description: string;
  file: string;
  lineRange: [number, number];
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

interface GeneratedTest {
  id: string;
  type: 'unit' | 'integration' | 'edge-case' | 'snapshot';
  name: string;
  description: string;
  code: string;
  framework: string;
}

interface AutofixSuggestion {
  id: string;
  errorId: string;
  title: string;
  description: string;
  confidence: number;
  diff: { before: string; after: string };
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}

/**
 * Create an AI session
 */
async function createSession(
  scenario: string,
  options: { projectId?: string; model?: string; context?: Record<string, unknown> } = {}
): Promise<AISession> {
  return apiRequest<AISession>('/api/ai/session', {
    method: 'POST',
    body: JSON.stringify({ scenario, ...options }),
  });
}

/**
 * Chat with AI agent
 */
async function chat(
  sessionId: string,
  message: string,
  options: { files?: { path: string; content: string; language?: string }[] } = {}
): Promise<AIResponse> {
  return apiRequest<AIResponse>(`/api/ai/session/${sessionId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, files: options.files }),
  });
}

/**
 * End an AI session
 */
async function endSession(sessionId: string): Promise<void> {
  await apiRequest(`/api/ai/session/${sessionId}`, { method: 'DELETE' });
}

/**
 * Analyze code for refactoring suggestions
 */
export async function analyzeForRefactoring(
  code: string,
  fileName: string
): Promise<RefactorSuggestion[]> {
  try {
    const session = await createSession('refactor', {
      context: { language: detectLanguage(fileName) },
    });

    const response = await chat(session.id, 
      `Analyze this code and suggest refactoring improvements. Return a JSON array of suggestions, each with: id, type (performance|readability|security|modernize|cleanup), title, description, file, lineRange [start, end], before (original code snippet), after (improved code snippet), impact (high|medium|low).\n\nFile: ${fileName}\n\`\`\`\n${code}\n\`\`\``
    );

    await endSession(session.id);

    // Parse suggestions from AI response
    const suggestions = parseJSONFromResponse<RefactorSuggestion[]>(response.content);
    return suggestions || generateRefactoringsFromCode(code, fileName);
  } catch (err) {
    console.warn('[AI] Refactor analysis failed, using code analysis fallback:', err);
    return generateRefactoringsFromCode(code, fileName);
  }
}

/**
 * Generate tests for code
 */
export async function generateTests(
  code: string,
  fileName: string,
  framework: string = 'vitest'
): Promise<GeneratedTest[]> {
  try {
    const session = await createSession('test', {
      context: { language: detectLanguage(fileName), framework },
    });

    const response = await chat(session.id,
      `Generate comprehensive tests for this code using ${framework}. Return a JSON array of tests, each with: id, type (unit|integration|edge-case|snapshot), name, description, code (the complete test code), framework.\n\nFile: ${fileName}\n\`\`\`\n${code}\n\`\`\``
    );

    await endSession(session.id);

    const tests = parseJSONFromResponse<GeneratedTest[]>(response.content);
    return tests || generateTestsFromCode(code, fileName, framework);
  } catch (err) {
    console.warn('[AI] Test generation failed, using code analysis fallback:', err);
    return generateTestsFromCode(code, fileName, framework);
  }
}

/**
 * Analyze errors and suggest fixes
 */
export async function analyzeErrors(
  errors: { id: string; file: string; line: number; message: string; severity: string; code?: string }[]
): Promise<AutofixSuggestion[]> {
  try {
    const session = await createSession('debug', {});

    const errorList = errors.map(e =>
      `[${e.severity.toUpperCase()}] ${e.file}:${e.line} — ${e.message}${e.code ? `\nCode: ${e.code}` : ''}`
    ).join('\n\n');

    const response = await chat(session.id,
      `Analyze these errors and suggest fixes. Return a JSON array of fix suggestions, each with: id, errorId, title, description, confidence (0-100), diff: { before, after }.\n\nErrors:\n${errorList}`
    );

    await endSession(session.id);

    const suggestions = parseJSONFromResponse<AutofixSuggestion[]>(response.content);
    return suggestions || generateFixesFromErrors(errors);
  } catch (err) {
    console.warn('[AI] Error analysis failed, using pattern-based fallback:', err);
    return generateFixesFromErrors(errors);
  }
}

// ──────── Smart Fallbacks (code-analysis based, not hardcoded) ────────

function generateRefactoringsFromCode(code: string, fileName: string): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];
  const lines = code.split('\n');
  let idCounter = 1;

  // Detect unused imports
  const importRegex = /^import\s+\{([^}]+)\}\s+from/;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const match = lines[i].match(importRegex);
    if (match) {
      const imports = match[1].split(',').map(s => s.trim());
      const restOfCode = lines.slice(i + 1).join('\n');
      const unused = imports.filter(imp => {
        const name = imp.split(' as ').pop()!.trim();
        return !new RegExp(`\\b${name}\\b`).test(restOfCode);
      });
      if (unused.length > 0) {
        suggestions.push({
          id: `ref_${idCounter++}`, type: 'cleanup',
          title: `Remove ${unused.length} unused import${unused.length > 1 ? 's' : ''}`,
          description: `Unused: ${unused.join(', ')}. Removing them reduces bundle size.`,
          file: fileName, lineRange: [i + 1, i + 1], impact: 'low',
          before: lines[i],
          after: lines[i].replace(
            match[1],
            imports.filter(imp => !unused.includes(imp)).join(', ')
          ),
        });
      }
    }
  }

  // Detect missing useMemo/useCallback
  for (let i = 0; i < lines.length; i++) {
    if (/const\s+\w+\s*=\s*\[.*\]\.map\(/.test(lines[i]) || /const\s+\w+\s*=\s*\w+\.filter\(/.test(lines[i])) {
      const varMatch = lines[i].match(/const\s+(\w+)/);
      if (varMatch) {
        suggestions.push({
          id: `ref_${idCounter++}`, type: 'performance',
          title: `Memoize computed value: ${varMatch[1]}`,
          description: 'This array transformation runs on every render. Consider wrapping with useMemo.',
          file: fileName, lineRange: [i + 1, i + 1], impact: 'medium',
          before: lines[i].trim(),
          after: `const ${varMatch[1]} = useMemo(() => ${lines[i].trim().replace(/^const\s+\w+\s*=\s*/, '')}, [deps]);`,
        });
      }
    }
  }

  // Detect dangerouslySetInnerHTML
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('dangerouslySetInnerHTML')) {
      suggestions.push({
        id: `ref_${idCounter++}`, type: 'security',
        title: 'Sanitize dangerouslySetInnerHTML',
        description: 'Using dangerouslySetInnerHTML without sanitization can lead to XSS attacks.',
        file: fileName, lineRange: [i + 1, i + 1], impact: 'high',
        before: lines[i].trim(),
        after: lines[i].trim().replace(
          /\{\{__html:\s*(\w+)\s*\}\}/,
          '{{__html: DOMPurify.sanitize($1)}}'
        ),
      });
    }
  }

  // Detect verbose null checks that could use optional chaining
  for (let i = 0; i < lines.length; i++) {
    if (/\w+\s*&&\s*\w+\.\w+\s*&&\s*\w+\.\w+\.\w+/.test(lines[i])) {
      suggestions.push({
        id: `ref_${idCounter++}`, type: 'modernize',
        title: 'Use optional chaining',
        description: 'Replace verbose null checks with optional chaining for cleaner code.',
        file: fileName, lineRange: [i + 1, i + 1], impact: 'low',
        before: lines[i].trim(),
        after: lines[i].trim().replace(/(\w+)\s*&&\s*\1\.(\w+)\s*&&\s*\1\.\2\.(\w+)/, '$1?.$2?.$3'),
      });
    }
  }

  return suggestions;
}

function generateTestsFromCode(code: string, fileName: string, framework: string): GeneratedTest[] {
  const tests: GeneratedTest[] = [];
  const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/);
  const componentName = componentMatch ? componentMatch[1] : 'Component';
  const isReact = code.includes('React') || code.includes('useState') || code.includes('jsx');
  const fw = framework as 'vitest' | 'jest' | 'testing-library';

  if (isReact) {
    tests.push({
      id: 'test_1', type: 'unit', name: `${componentName} renders without crashing`,
      description: `Verifies ${componentName} mounts successfully with default props`,
      framework: fw,
      code: `import { render } from '@testing-library/react';\nimport ${componentName} from './${fileName.replace(/\.\w+$/, '')}';\n\ndescribe('${componentName}', () => {\n  it('renders without crashing', () => {\n    const { container } = render(<${componentName} />);\n    expect(container).toBeTruthy();\n  });\n});`,
    });
  }

  // Detect exported functions and generate tests for each
  const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    const funcName = match[1];
    const params = match[2];
    tests.push({
      id: `test_${tests.length + 1}`, type: 'unit', name: `${funcName} returns expected result`,
      description: `Tests ${funcName} with valid inputs`,
      framework: fw,
      code: `import { ${funcName} } from './${fileName.replace(/\.\w+$/, '')}';\n\ndescribe('${funcName}', () => {\n  it('returns expected result', () => {\n    const result = ${funcName}(${params ? '/* provide args */' : ''});\n    expect(result).toBeDefined();\n  });\n\n  it('handles edge cases', () => {\n    ${params.includes(',') ? `expect(() => ${funcName}()).toThrow();` : `const result = ${funcName}(${params ? 'null' : ''});\n    expect(result).toBeDefined();`}\n  });\n});`,
    });
  }

  if (tests.length === 0) {
    tests.push({
      id: 'test_1', type: 'unit', name: 'module exports are defined',
      description: 'Verifies the module exports expected values',
      framework: fw,
      code: `import * as mod from './${fileName.replace(/\.\w+$/, '')}';\n\ndescribe('${fileName}', () => {\n  it('exports are defined', () => {\n    expect(mod).toBeDefined();\n    expect(Object.keys(mod).length).toBeGreaterThan(0);\n  });\n});`,
    });
  }

  return tests;
}

function generateFixesFromErrors(
  errors: { id: string; file: string; line: number; message: string; code?: string }[]
): AutofixSuggestion[] {
  return errors.slice(0, 5).map((err, i) => {
    let title = `Fix: ${err.message.slice(0, 60)}`;
    let description = `Suggested fix for error at ${err.file}:${err.line}`;
    let confidence = 60;
    let before = err.code || `// Line ${err.line}`;
    let after = `// Fixed version of line ${err.line}`;

    // Pattern-based fix suggestions
    if (err.message.includes('is not defined')) {
      const varMatch = err.message.match(/'(\w+)' is not defined/);
      if (varMatch) {
        title = `Import or declare '${varMatch[1]}'`;
        description = `'${varMatch[1]}' is used but not imported or declared.`;
        after = `import { ${varMatch[1]} } from './${varMatch[1].toLowerCase()}';`;
        confidence = 75;
      }
    } else if (err.message.includes('Cannot read properties of')) {
      title = 'Add null check';
      description = 'Accessing properties of potentially null/undefined value.';
      after = before.replace(/(\w+)\.(\w+)/, '$1?.$2');
      confidence = 85;
    } else if (err.message.includes('missing return')) {
      title = 'Add missing return statement';
      confidence = 80;
    }

    return {
      id: `fix_${i + 1}`,
      errorId: err.id,
      title,
      description,
      confidence,
      diff: { before, after },
    };
  });
}

// ──────── Utilities ────────

function parseJSONFromResponse<T>(content: string): T | null {
  // Try to find JSON in the response
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  // Try parsing the entire content
  try {
    return JSON.parse(content);
  } catch {}

  // Try finding array brackets
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  return null;
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    css: 'css', html: 'html', json: 'json',
  };
  return map[ext || ''] || 'plaintext';
}

const aiService = {
  createSession,
  chat,
  endSession,
  analyzeForRefactoring,
  generateTests,
  analyzeErrors,
};

export default aiService;
