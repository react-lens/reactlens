import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentAnalyzer } from '../analyzer/componentAnalyzer.js';
import { promises as fs } from 'fs';

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('ComponentAnalyzer', () => {
  let analyzer: ComponentAnalyzer;

  beforeEach(() => {
    analyzer = new ComponentAnalyzer();
    vi.clearAllMocks();
  });

  it('should detect functional component and its props', async () => {
    const code = `
      function UserProfile({ name, age }) {
        return <div>{name} is {age}</div>;
      }
    `;
    (fs.readFile as any).mockResolvedValue(code);

    const components = await analyzer.analyzeFile('test.tsx');
    expect(components).toHaveLength(1);
    const component = components[0]!;
    expect(component.name).toBe('UserProfile');
    expect(component.propCount).toBe(2);
    expect(component.props).toContain('name');
    expect(component.props).toContain('age');
  });

  it('should detect arrow function component and props object', async () => {
    const code = `
      const Button = (props) => <button>{props.label}</button>;
    `;
    (fs.readFile as any).mockResolvedValue(code);

    const components = await analyzer.analyzeFile('test.tsx');
    expect(components).toHaveLength(1);
    const component = components[0]!;
    expect(component.name).toBe('Button');
    expect(component.props).toEqual(['props']);
  });

  it('should detect hooks usage within components', async () => {
    const code = `
      function Counter() {
        const [count, setCount] = useState(0);
        useEffect(() => {
          document.title = count;
        }, [count]);
        return <button onClick={() => setCount(count + 1)}>{count}</button>;
      }
    `;
    (fs.readFile as any).mockResolvedValue(code);

    const components = await analyzer.analyzeFile('test.tsx');
    expect(components).toHaveLength(1);
    const component = components[0]!;
    expect(component.hookCount).toBe(2);
    expect(component.hooks).toContain('useState');
    expect(component.hooks).toContain('useEffect');
    expect(component.isClientComponent).toBe(false);
  });

  it('should detect isClientComponent from "use client" directive', async () => {
    const code = `
      "use client";
      export const MyClientComp = () => <div>Client</div>;
    `;
    (fs.readFile as any).mockResolvedValue(code);

    const components = await analyzer.analyzeFile('test.tsx');
    expect(components).toHaveLength(1);
    expect(components[0]!.isClientComponent).toBe(true);
  });

  it('should handle complex destructured props and default values', async () => {
    const code = `
      const UserCard = ({ name: userName = 'Guest', theme = 'dark', ...rest }) => {
        return <div className={theme}>{userName}</div>;
      }
    `;
    (fs.readFile as any).mockResolvedValue(code);

    const components = await analyzer.analyzeFile('test.tsx');
    expect(components).toHaveLength(1);
    const component = components[0]!;
    expect(component.props).toContain('name');
    expect(component.props).toContain('theme');
    // Note: 'rest' if included depends on implementation. My current implementation only takes identifiers.
  });

  it('should return empty array for non-component functions', async () => {
    const code = `
      function helperFunction(a, b) { return a + b; }
      const sum = (x, y) => x + y;
    `;
    (fs.readFile as any).mockResolvedValue(code);

    const components = await analyzer.analyzeFile('test.tsx');
    expect(components).toHaveLength(0);
  });
});
