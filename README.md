# Bylight

Bylight creates visual links between words in prose and patterns in nearby code snippets, making technical concepts more tangible when explaining code.


## Usage

To use Bylight in your project, follow these steps:

1. Install the package:

   ```bash
   npm install bylight
   ```

2. Import the necessary functions and styles:

   ```javascript
   import { bylight } from 'bylight';
   import 'bylight/styles';
   ```

3. Initialize Bylight:

   ```javascript
   bylight({
     target: '#your-target-element', // CSS selector or HTMLElement, default = body
   });
   ```

4. Add Bylight links to your HTML. There are two ways to specify the pattern:

   a. Use the link text as the pattern:

   ```html
   <a href="bylight:">function(...)</a>
   <pre>
     function example(a, b) {
       return a + b;
     }
   </pre>
   ```

   b. Specify the pattern using the `match` URL parameter:

   ```html
   <a href="bylight:?match=function(...)">Link to function calls</a>
   <pre>
     function example(a, b) {
       return a + b;
     }
   </pre>
   ```

Bylight will process the links and highlight the corresponding code patterns in the nearby `<pre>` elements.

### Matching behavior

Bylight uses a flexible pattern matching system that allows for both simple and complex matches:

1. **Exact matches**: Simple strings will match exactly.
   Example: `function` will match the word "function" in the code.

2. **Wildcards**: Use `...` to match any sequence of characters.
   Example: `function(...)` will match any function call with any number of arguments.

3. **Regular expressions**: Enclose your pattern in forward slashes to use a regular expression.
   Example: `/function\s+\w+/` will match "function" followed by one or more spaces and then one or more word characters.

4. **Nested structures**: Bylight can handle nested parentheses, brackets, and braces.
   Example: `func(...)` will correctly match `func(a, [b, c], {d: e})`.

5. **String awareness**: Bylight ignores brackets and parentheses inside strings.
   Example: `func(...)` will correctly match `func("a(b)", 'c(d)')`.

### Customization 

The default color scheme is derived from 