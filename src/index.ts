// src/bylight.ts
interface BylightOptions {
  target?: string | HTMLElement;
  debugMode?: boolean;
  colorScheme?: string[];
}

interface HighlightOptions {
  matchId?: string;
  colorIndex?: number;
}

// Utility functions
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DefaultColors: string[] = [
  "#59a14f",
  "#b82efe",
  "#007bfe",
  "#6a6a6a",
  "#ff4245",
  "#7c2d00",
  "#76b7b2",
  "#d4af37",
  "#ff9da7",
  "#f28e2c",
];

let debug = false;
const log = (...args: any[]): void => { debug && console.log(...args); };

// Wildcard matching functions
function matchWildcard(
  text: string,
  startIndex: number,
  nextLiteral: string,
): number {
  let index = startIndex;
  let bracketDepth = 0;
  let inString: string | null = null;

  while (index < text.length) {
    if (inString) {
      if (text[index] === inString && text[index - 1] !== "\\") {
        inString = null;
      }
    } else if (text[index] === '"' || text[index] === "'") {
      inString = text[index];
    } else if (bracketDepth === 0 && text[index] === nextLiteral) {
      return index;
    } else if (
      text[index] === "(" ||
      text[index] === "[" ||
      text[index] === "{"
    ) {
      bracketDepth++;
    } else if (
      text[index] === ")" ||
      text[index] === "]" ||
      text[index] === "}"
    ) {
      if (bracketDepth === 0) {
        return index;
      }
      bracketDepth--;
    }
    index++;
  }
  return index;
}

// Matching functions
function findMatches(text: string, pattern: string): [number, number][] {
  const isRegex = pattern.startsWith("/") && pattern.endsWith("/");
  if (isRegex) {
    return findRegexMatches(text, pattern.slice(1, -1));
  }

  let matches: [number, number][] = [];
  let currentPosition = 0;

  while (currentPosition < text.length) {
    const match = findSingleMatch(text, pattern, currentPosition);

    if (match) {
      const [matchStart, matchEnd] = match;
      matches.push([matchStart, matchEnd]);
      currentPosition = matchEnd;
    } else {
      currentPosition++;
    }
  }

  return matches;
}

function findRegexMatches(text: string, pattern: string): [number, number][] {
  const regex = new RegExp(pattern, "g");
  let matches: [number, number][] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.push([match.index, regex.lastIndex]);
  }

  return matches;
}

function findSingleMatch(
  text: string,
  pattern: string,
  startPosition: number,
): [number, number] | null {
  let patternPosition = 0;
  let textPosition = startPosition;
  let matchStart = startPosition;

  while (textPosition < text.length && patternPosition < pattern.length) {
    if (pattern.substr(patternPosition, 3) === "...") {
      // Handle wildcard
      const nextCharacter = pattern[patternPosition + 3] || "";
      textPosition = matchWildcard(text, textPosition, nextCharacter);
      patternPosition += 3;
    } else if (text[textPosition] === pattern[patternPosition]) {
      // Characters match, move to next
      textPosition++;
      patternPosition++;
    } else {
      // No match found
      return null;
    }
  }

  // Check if we've matched the entire pattern
  if (patternPosition === pattern.length) {
    return [matchStart, textPosition];
  }

  return null;
}

// Highlighting functions
function findMatchesForPatterns(
  text: string,
  patterns: string[],
  matchId: string,
): [number, number, string][] {
  return patterns.flatMap((pattern) =>
    findMatches(text, pattern).map(
      (match) => [...match, matchId] as [number, number, string],
    ),
  );
}

function highlightPatterns(
  preElement: HTMLPreElement,
  patterns: string[],
  options: HighlightOptions = {},
  colorScheme: string[] = DefaultColors
): void {
  const text = preElement.textContent || "";
  const { matchId = `match-${Math.random().toString(36).slice(2, 11)}` } = options;
  
  let allMatches: [number, number, string, string][] = [];
  
  patterns.forEach((patternGroup, index) => {
    const subPatterns = patternGroup.split(',').map(p => p.trim());
    const color = colorScheme[index % colorScheme.length];
    const styleString = `--bylight-color: ${color};`;
    
    const groupMatches = findMatchesForPatterns(text, subPatterns, `${matchId}-${index}`);
    const formattedMatches = groupMatches.map(
      match => [...match, styleString] as [number, number, string, string]
    );
    
    allMatches = allMatches.concat(formattedMatches);
  });

  if (allMatches.length === 0) return;

  preElement.innerHTML = `<code>${applyHighlights(text, allMatches)}</code>`;
}

function applyHighlights(
  text: string,
  matches: [number, number, string, string][],
): string {
  // Sort matches in reverse order based on their start index
  matches.sort((a, b) => b[0] - a[0]);

  return matches.reduce((result, [start, end, matchId, styleString]) => {
    const beforeMatch = result.slice(0, start);
    const matchContent = result.slice(start, end);
    const afterMatch = result.slice(end);

    return (
      beforeMatch +
      `<span class="bylight-code" style="${styleString}" data-match-id="${matchId}">` +
      matchContent +
      "</span>" +
      afterMatch
    );
  }, text);
}

// Link processing and hover effect functions
function processLinksAndHighlight(targetElement: HTMLElement, colorScheme: string[] = DefaultColors): void {
  const elements = targetElement.querySelectorAll<
    HTMLPreElement | HTMLAnchorElement
  >('pre, a[href^="bylight"]');

  const preMap = new Map<HTMLPreElement, [number, number, string][]>();
  const linkMap = new Map<
    HTMLAnchorElement,
    {
      targetIndices: number[] | "all" | "up" | "down";
      patterns: string[];
      index: number;
      matchId: string;
      color?: string; // Add color property
    }
  >();
  const colorMap = new Map<string, number>();
  let colorIndex = 0;

  // Process all elements
  elements.forEach((element, index) => {
    if (element.tagName === "PRE") {
      preMap.set(element as HTMLPreElement, []);
    } else if (element.tagName === "A") {
      const anchorElement = element as HTMLAnchorElement;
      const url = new URL(anchorElement.href);
      const matchId = `match-${index}-${Math.random().toString(36).slice(2, 11)}`;
      const inParam = url.searchParams.get("in");
      const dirParam = url.searchParams.get("dir");
      const color = url.searchParams.get("color"); // Get color from URL params

      let targetIndices: number[] | "all" | "up" | "down";
      if (inParam) {
        targetIndices =
          inParam === "all" ? "all" : inParam.split(",").map(Number);
      } else if (dirParam) {
        targetIndices = dirParam as "up" | "down";
      } else {
        targetIndices = [1]; // Default behavior
      }

      linkMap.set(anchorElement, {
        targetIndices,
        patterns: (
          url.searchParams.get("match") ||
          anchorElement.textContent ||
          ""
        ).split(","),
        index,
        matchId,
        color: color ?? undefined, // Use nullish coalescing operator
      });
      colorMap.set(matchId, colorIndex);
      colorIndex = (colorIndex + 1) % colorScheme.length;
      anchorElement.addEventListener("click", (e) => e.preventDefault());
    }
  });

  // Second pass: Process links and find matches in pre elements
  linkMap.forEach(
    ({ targetIndices, patterns, index, matchId, color }, linkElement) => {
      const findMatchingPres = (
        indices: number[] | "all" | "up" | "down",
      ): HTMLPreElement[] => {
        if (indices === "all") {
          return Array.from(preMap.keys());
        }
        if (indices === "up" || indices === "down") {
          const direction = indices === "up" ? -1 : 1;
          const matchingPres: HTMLPreElement[] = [];
          let preCount = 0;
          for (let i = index + direction; i >= 0 && i < elements.length; i += direction) {
            if (elements[i].tagName === "PRE") {
              matchingPres.push(elements[i] as HTMLPreElement);
              preCount++;
              if (preCount === Math.abs(parseInt(indices))) break;
            }
          }
          return matchingPres;
        }
        return indices
          .map((offset) => {
            let preCount = 0;
            const targetIndex = index + (offset > 0 ? 1 : -1);
            for (
              let i = targetIndex;
              i >= 0 && i < elements.length;
              i += Math.sign(offset)
            ) {
              if (elements[i].tagName === "PRE") {
                preCount++;
                if (preCount === Math.abs(offset)) {
                  return elements[i] as HTMLPreElement;
                }
              }
            }
            return null;
          })
          .filter((el): el is HTMLPreElement => el !== null);
      };

      const matchingPres = findMatchingPres(targetIndices);

      matchingPres.forEach((matchingPre) => {
        const text = matchingPre.textContent || "";
        const newMatches = findMatchesForPatterns(text, patterns, matchId);
        preMap.get(matchingPre)?.push(...newMatches);
      });
    },
  );

  // Apply highlights to pre elements
  preMap.forEach((matches, preElement) => {
    if (matches.length > 0) {
      const text = preElement.textContent || "";
      const allMatches = matches.map(
        ([start, end, matchId]) => {
          const linkData = Array.from(linkMap.values()).find(data => data.matchId === matchId);
          const color = linkData?.color || colorScheme[colorMap.get(matchId) || 0];
          return [
            start,
            end,
            matchId,
            `--bylight-color: ${color};`,
          ] as [number, number, string, string];
        }
      );
      preElement.innerHTML = `<code>${applyHighlights(text, allMatches)}</code>`;
    }
  });

  // Process links
  linkMap.forEach((linkData, linkElement) => {
    const { matchId, color } = linkData;
    const finalColor = color || colorScheme[colorMap.get(matchId) || 0];
    
    // Create a new span element
    const spanElement = document.createElement('span');
    spanElement.innerHTML = linkElement.innerHTML;
    spanElement.dataset.matchId = matchId;
    spanElement.classList.add("bylight-link");
    spanElement.style.setProperty("--bylight-color", finalColor);
    
    // Replace the link with the span
    linkElement.parentNode?.replaceChild(spanElement, linkElement);
  });
}

function addHoverEffect(targetElement: HTMLElement): void {
  targetElement.addEventListener("mouseover", (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.matchId) {
      const matchId = target.dataset.matchId;
      const elements = targetElement.querySelectorAll<HTMLElement>(
        `[data-match-id="${matchId}"]`,
      );
      elements.forEach((el) => {
        el.classList.add("bylight-hover");
      });
    }
  });

  targetElement.addEventListener("mouseout", (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.matchId) {
      const matchId = target.dataset.matchId;
      const elements = targetElement.querySelectorAll<HTMLElement>(
        `[data-match-id="${matchId}"]`,
      );
      elements.forEach((el) => {
        el.classList.remove("bylight-hover");
      });
    }
  });
}

// Main bylight function
/**
 * Initializes bylight syntax highlighting and link processing.
 * @param options Configuration options for bylight
 */
function bylight(options: BylightOptions = {}): void {
  const { target = "body", debugMode = false, colorScheme = DefaultColors } = options;
  debug = debugMode;

  const targetElement =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;

  if (!targetElement) {
    console.error(`bylight: Target element not found - ${target}`);
    return;
  }

  processLinksAndHighlight(targetElement, colorScheme);
  addHoverEffect(targetElement);
}

// Attach utility functions to the main bylight function
bylight.highlightPatterns = highlightPatterns;
bylight.processLinksAndHighlight = processLinksAndHighlight;
bylight.addHoverEffect = addHoverEffect;
bylight.findMatches = findMatches;
bylight.findRegexMatches = findRegexMatches;
bylight.escapeRegExp = escapeRegExp;
bylight.DefaultColors = DefaultColors;

// Export the main function as default and as a named export
export { bylight as default, bylight };

// Keep named exports for ESM users
export {
  BylightOptions,
  HighlightOptions,
  highlightPatterns,
  processLinksAndHighlight,
  addHoverEffect,
  findMatches,
  findRegexMatches,
  escapeRegExp,
  DefaultColors,
};

// Add this new function
function highlight(selector: string, patterns: string | string[], options: HighlightOptions = {}, colorScheme: string[] = DefaultColors): void {
  const preElements = document.querySelectorAll<HTMLPreElement>(selector);
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

  preElements.forEach(preElement => {
    highlightPatterns(preElement, patternsArray, options, colorScheme);
  });
}

// Add the new function to the utility functions attached to bylight
bylight.highlight = highlight;

// Add the new function to the named exports
export {
  // ... existing exports ...
  highlight,
};