# Bylight

Bylight allows you to highlight code using special links in nearby text, making technical concepts more tangible when explaining code.

## Basic Usage

To use Bylight in your project, follow these steps:

1. Install the package:

   ```bash
   npm install bylight
   ```

2. Import Bylight and its styles:

   ```javascript
   import bylight from 'bylight';
   import 'bylight/styles';
   ```

3. Initialize Bylight:

   ```javascript
   bylight();
   ```

4. Add Bylight links to your HTML. There are two main ways to specify what to highlight:

   a. Use the link text as the pattern:

   ```html
   <a href="bylight:function">Highlight functions</a>
   <pre>
     function example(a, b) {
       return a + b;
     }
   </pre>
   ```

   b. Use the `match` parameter in the URL:

   ```html
   <a href="bylight:?match=function">Highlight functions</a>
   <pre>
     function example(a, b) {
       return a + b;
     }
   </pre>
   ```

Bylight will process the links and highlight the corresponding patterns in nearby `<pre>` elements.

