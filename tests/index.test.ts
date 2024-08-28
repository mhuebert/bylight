import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import bylight, { findMatches, processLinksAndHighlight, addHoverEffect, findRegexMatches, DefaultColors, BylightOptions, PatternObject } from '../src/index'

describe('findMatches', () => {
  const testCases = [
    {
      input: "go(a, b)",
      pattern: "go(...)",
      name: "Simple go(...) match",
      expected: ["go(a, b)"],
    },
    {
      input: "func(a, func2(b, c), d)",
      pattern: "func(...)",
      name: "Nested brackets",
      expected: ["func(a, func2(b, c), d)"],
    },
    {
      input: "go(a, b) go(c, d) go(e, f)",
      pattern: "go(...)",
      name: "Multiple matches",
      expected: ["go(a, b)", "go(c, d)", "go(e, f)"],
    },
    {
      input: "function(a, b)",
      pattern: "go(...)",
      name: "No match",
      expected: [],
    },
    {
      input: "func(a, [b, c], {d: (e, f)})",
      pattern: "func(...)",
      name: "Complex nested brackets",
      expected: ["func(a, [b, c], {d: (e, f)})"],
    },
    {
      input: "func('a(b)', \"c)d\", e\\(f\\))",
      pattern: "func(...)",
      name: "Strings and escaped characters",
      expected: ["func('a(b)', \"c)d\", e\\(f\\))"],
    },
    {
      input: "a b c d e",
      pattern: "a...e",
      name: "Wildcard outside brackets",
      expected: ["a b c d e"],
    },
    {
      input: "goSomewhere()",
      pattern: "go...()",
      name: "Wildcard before brackets",
      expected: ["goSomewhere()"],
    },
    {
      input: "f(a, b, c, x)",
      pattern: "f(...x)",
      name: "Wildcard with specific end",
      expected: ["f(a, b, c, x)"],
    },
    {
      input: "abcdcde",
      pattern: "a...c...e",
      name: "Multiple wildcards",
      expected: ["abcdcde"],
    },
    {
      input: "if (x > 0) {doSomething();}",
      pattern: "if (...) {...}",
      name: "if statement",
      expected: ["if (x > 0) {doSomething();}"],
    },
    {
      input: '"hello"',
      pattern: "...",
      name: "String content",
      expected: ['"hello"'],
    },
    {
      input: "[1, 2, 3]",
      pattern: "[...]",
      name: "Array content",
      expected: ["[1, 2, 3]"],
    },
    {
      input: "func(a, b)",
      pattern: "/func\\(.*?\\)/",
      name: "Regex match",
      expected: ["func(a, b)"],
    },
    {
      input: "func(a, b) func(c, d)",
      pattern: "func(...)",
      name: "Multiple non-nested matches",
      expected: ["func(a, b)", "func(c, d)"],
    },
    {
      input: "func(a, func(b, c), func(d))",
      pattern: "func(...)",
      name: "Nested function calls",
      expected: ["func(a, func(b, c), func(d))"],
    },
    {
      input: "  leadingSpace(a, b)  ",
      pattern: "leadingSpace(...)",
      name: "Leading and trailing whitespace",
      expected: ["leadingSpace(a, b)"],
    },
    {
      input: "func(a, 'b(c)', \"d)e\", f)",
      pattern: "func(...)",
      name: "Function with string arguments containing brackets",
      expected: ["func(a, 'b(c)', \"d)e\", f)"],
    },
    {
      input: "longFunctionName(a, b)",
      pattern: "long...Name(...)",
      name: "Wildcard in function name",
      expected: ["longFunctionName(a, b)"],
    },
    {
      input: "func(a, b) notfunc(c, d)",
      pattern: "/\\bfunc\\(.*?\\)/",
      name: "Regex match with multiple possibilities",
      expected: ["func(a, b)"],
    },
    {
      input: "func(a, [1, 2], {x: 3})",
      pattern: "func(...)",
      name: "Function with complex arguments",
      expected: ["func(a, [1, 2], {x: 3})"],
    },
  ];

  testCases.forEach(({ input, pattern, name, expected }) => {
    it(name, () => {
      const result = findMatches(input, pattern);
      const actualMatches = result.map(([start, end]) =>
        input.slice(start, end)
      );
      expect(actualMatches).toEqual(expected);
    });
  });
});

describe('highlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '<pre id="test-pre">func(a, b) other(x, y)</pre>';
  });

  it('should highlight patterns in a pre element', () => {
    const preElement = document.getElementById('test-pre') as HTMLPreElement;
    
    bylight.highlight(preElement, ['func(...)']);
    
    expect(preElement.innerHTML).toContain('<span class="bylight-code"');
    expect(preElement.innerHTML).toContain('func(a, b)');
    expect(preElement.innerHTML).not.toContain('<span>other(x, y)</span>');
  });

  it('should accept pattern objects', () => {
    const preElement = document.getElementById('test-pre') as HTMLPreElement;
    const patterns: PatternObject[] = [
      { match: 'func(...)', color: '#ff0000' },
      { match: 'other(...)', color: '#00ff00' }
    ];
    
    bylight.highlight(preElement, patterns);
    
    const highlightedSpans = preElement.querySelectorAll('span.bylight-code');
    expect(highlightedSpans.length).toBe(2);
    expect(highlightedSpans[0].style.getPropertyValue('--bylight-color')).toBe('#ff0000');
    expect(highlightedSpans[1].style.getPropertyValue('--bylight-color')).toBe('#00ff00');
  });

  it('should work with a mix of strings and pattern objects', () => {
    const preElement = document.getElementById('test-pre') as HTMLPreElement;
    const patterns: (string | PatternObject)[] = [
      'func(...)',
      { match: 'other(...)', color: '#00ff00' }
    ];
    
    bylight.highlight(preElement, patterns);
    
    const highlightedSpans = preElement.querySelectorAll('span.bylight-code');
    expect(highlightedSpans.length).toBe(2);
    expect(highlightedSpans[0].style.getPropertyValue('--bylight-color')).not.toBe('#00ff00');
    expect(highlightedSpans[1].style.getPropertyValue('--bylight-color')).toBe('#00ff00');
  });
});

// Helper functions
function setupTestEnvironment(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.getElementById('target') as HTMLElement;
}

function checkHighlighting(preElements: NodeListOf<HTMLPreElement>, expectedHighlightedIndices: number[]) {
  preElements.forEach((pre, index) => {
    if (expectedHighlightedIndices.includes(index)) {
      expect(pre.innerHTML).toContain('<span class="bylight-code"');
    } else {
      expect(pre.innerHTML).not.toContain('<span class="bylight-code"');
    }
  });
}

describe('processLinksAndHighlight', () => {
  it('should highlight specific pre element when using "in" parameter with index', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <a href="bylight:?match=func(...)&in=2">Link</a>
        <pre>func(a, b)</pre>
        <pre>func(c, d)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [2]);
  });

  it('should highlight all pre elements when using "in=all" parameter', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <a href="bylight:?match=func(...)&in=all">Link</a>
        <pre>func(a, b)</pre>
        <pre>func(c, d)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [0, 1, 2]);
  });

  it('should handle negative indices in "in" parameter', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <pre>func(a, b)</pre>
        <a href="bylight:?match=func(...)&in=-1">Link</a>
        <pre>func(c, d)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [1]);
  });

  it('should highlight all following pre elements when using "dir=down" parameter', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <a href="bylight:?match=func(...)&dir=down">Link</a>
        <pre>func(a, b)</pre>
        <pre>func(c, d)</pre>
        <pre>func(e, f)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [1, 2, 3]);
  });

  it('should highlight all previous pre elements when using "dir=up" parameter', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <pre>func(a, b)</pre>
        <pre>func(c, d)</pre>
        <a href="bylight:?match=func(...)&dir=up">Link</a>
        <pre>func(e, f)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [0, 1, 2]);
  });

  it('should highlight all pre elements when using "dir=down" at the top', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <a href="bylight:?match=func(...)&dir=down">Link</a>
        <pre>func(x, y)</pre>
        <pre>func(a, b)</pre>
        <pre>func(c, d)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [0, 1, 2]);
  });

  it('should highlight all pre elements when using "dir=up" at the bottom', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <pre>func(a, b)</pre>
        <pre>func(c, d)</pre>
        <a href="bylight:?match=func(...)&dir=up">Link</a>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), [0, 1, 2]);
  });

  it('should not highlight any element when there are no matching pre elements in the specified direction', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>other(x, y)</pre>
        <a href="bylight:?match=func(...)&dir=up">Link Up</a>
        <a href="bylight:?match=func(...)&dir=down">Link Down</a>
        <pre>other(a, b)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    checkHighlighting(targetElement.querySelectorAll('pre'), []);
  });

  it('should convert links to spans', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <a href="bylight:?match=func(...)">Link</a>
        <pre>func(a, b)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    
    const span = targetElement.querySelector('span.bylight-link');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('Link');
    expect(targetElement.querySelector('a')).toBeNull();
  });

  it('should set correct attributes on converted spans', () => {
    const targetElement = setupTestEnvironment(`
      <div id="target">
        <pre>func(x, y)</pre>
        <a href="bylight:?match=func(...)">Link</a>
        <pre>func(a, b)</pre>
      </div>
    `);
    processLinksAndHighlight(targetElement);
    
    const span = targetElement.querySelector('span.bylight-link') as HTMLSpanElement;
    expect(span).not.toBeNull();
    expect(span.dataset.matchId).toBeDefined();
    expect(span.style.getPropertyValue('--bylight-color')).not.toBe('');
  });
});

describe('addHoverEffect', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="target">
        <span data-match-id="test-match">Hover me</span>
        <span data-match-id="test-match">And me</span>
      </div>
    `;
  });

  it('should add hover effect to matching elements', () => {
    const targetElement = document.getElementById('target') as HTMLElement;
    
    addHoverEffect(targetElement);
    
    const firstSpan = targetElement.querySelector('span') as HTMLSpanElement;
    firstSpan.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    
    expect(firstSpan.classList.contains('bylight-hover')).toBe(true);
    expect(targetElement.querySelectorAll('.bylight-hover').length).toBe(2);
    
    firstSpan.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    
    expect(firstSpan.classList.contains('bylight-hover')).toBe(false);
    expect(targetElement.querySelectorAll('.bylight-hover').length).toBe(0);
  });
});

describe('bylight', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="target">
        <a href="bylight:?match=func(...)">Link</a>
        <pre>func(a, b) other(x, y)</pre>
      </div>
    `;
  });

  it('should initialize bylight functionality', () => {
    bylight({ target: '#target' });
    
    const targetElement = document.getElementById('target') as HTMLElement;
    const preElement = targetElement.querySelector('pre') as HTMLPreElement;
    const spanElement = targetElement.querySelector('span.bylight-link') as HTMLSpanElement;
    
    expect(preElement.innerHTML).toContain('<span class="bylight-code"');
    expect(spanElement).not.toBeNull();
    expect(spanElement.classList.contains('bylight-link')).toBe(true);
    
    // Test hover effect
    spanElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(preElement.querySelector('.bylight-hover')).not.toBeNull();
  });
});

it('should correctly find regex matches', () => {
  const text = "func1(a, b) func2(c, d) func3(e, f)";
  const pattern = "func\\d\\(.*?\\)";
  const matches = findRegexMatches(text, pattern);
  expect(matches).toEqual([[0, 11], [12, 23], [24, 35]]);
});

describe('bylight with custom color scheme', () => {
  let testElement: HTMLElement;

  const setupTestEnvironment = (html: string, bylightOptions: BylightOptions = {}) => {
    testElement = document.createElement('div');
    testElement.innerHTML = html;
    document.body.appendChild(testElement);
    bylight({ ...bylightOptions, target: testElement });

    return {
      targetElement: testElement,
      preElement: testElement.querySelector('pre') as HTMLPreElement,
      spanLinkElements: testElement.querySelectorAll("span.bylight-link") as NodeListOf<HTMLSpanElement>,
      codeSpans: testElement.querySelectorAll("span.bylight-code") as NodeListOf<HTMLSpanElement>
    };
  };

  const getColor = (element: HTMLElement) => 
    element.style.getPropertyValue('--bylight-color');

  afterEach(() => {
    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  it('should use custom color scheme when provided', () => {
    const html = `
      <a href="bylight:?match=func(...)">Link 1</a>
      <a href="bylight:?match=other(...)">Link 2</a>
      <pre>func(a, b) other(x, y)</pre>
    `;
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    const { codeSpans, spanLinkElements } = setupTestEnvironment(html, { colorScheme: customColors });
    
    expect(getColor(codeSpans[0])).toBe(customColors[0]);
    expect(getColor(spanLinkElements[0])).toBe(customColors[0]);
    expect(getColor(spanLinkElements[1])).toBe(customColors[1]);
  });

  it('should fall back to default colors if custom scheme is not provided', () => {
    const html = `
      <a href="bylight:?match=func(...)">Link 1</a>
      <a href="bylight:?match=other(...)">Link 2</a>
      <pre>func(a, b) other(x, y)</pre>
    `;
    const { codeSpans, spanLinkElements } = setupTestEnvironment(html);
    
    expect(getColor(codeSpans[0])).toBe(DefaultColors[0]);
    expect(getColor(spanLinkElements[0])).toBe(DefaultColors[0]);
    expect(getColor(spanLinkElements[1])).toBe(DefaultColors[1]);
  });

  it('should cycle through custom colors when more patterns than colors', () => {
    const html = `
      <a href="bylight:?match=func(...)">Link 1</a>
      <a href="bylight:?match=other(...)">Link 2</a>
      <a href="bylight:?match=another(...)">Link 3</a>
      <pre>func(a, b) other(x, y) another(z)</pre>
    `;
    const customColors = ['#ff0000', '#00ff00'];
    const { spanLinkElements } = setupTestEnvironment(html, { colorScheme: customColors });
    
    expect(getColor(spanLinkElements[0])).toBe(customColors[0]);
    expect(getColor(spanLinkElements[1])).toBe(customColors[1]);
    expect(getColor(spanLinkElements[2])).toBe(customColors[0]);
  });
});

describe('bylight with custom color scheme and link color override', () => {
  let testElement: HTMLElement;

  const setupTestEnvironment = (html: string, bylightOptions: BylightOptions = {}) => {
    testElement = document.createElement('div');
    testElement.innerHTML = html;
    document.body.appendChild(testElement);
    bylight({ ...bylightOptions, target: testElement });

    return {
      targetElement: testElement,
      preElement: testElement.querySelector('pre') as HTMLPreElement,
      spanLinkElements: testElement.querySelectorAll("span.bylight-link") as NodeListOf<HTMLSpanElement>,
      codeSpans: testElement.querySelectorAll("span.bylight-code") as NodeListOf<HTMLSpanElement>
    };
  };

  const getColor = (element: HTMLElement) => 
    element.style.getPropertyValue('--bylight-color');

  afterEach(() => {
    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  it('should override link color when color parameter is provided', () => {
    const html = `
      <a href="bylight:?match=func(...)">Link 1</a>
      <a href="bylight:?match=other(...)&color=blue">Link 2</a>
      <a href="bylight:?match=another(...)">Link 3</a>
      <pre>func(a, b) other(x, y) another(z)</pre>
    `;
    const customColors = ['red', 'green', 'yellow'];
    const { spanLinkElements, codeSpans } = setupTestEnvironment(html, { colorScheme: customColors });
    
    expect(getColor(spanLinkElements[0])).toBe(customColors[0]);
    expect(getColor(spanLinkElements[1])).toBe('blue'); // Overridden color
    expect(getColor(spanLinkElements[2])).toBe(customColors[2]);

    // Check that the highlighted code spans use the correct colors
    expect(getColor(codeSpans[0])).toBe(customColors[0]);
    expect(getColor(codeSpans[1])).toBe('blue'); // Overridden color
    expect(getColor(codeSpans[2])).toBe(customColors[2]);
  });
});