import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    script = r'''
import { renderMarkdown } from "./frontend/react/src/controller/markdown.js";

function assertContains(html, needle, label) {
  if (!html.includes(needle)) throw new Error(`${label}: missing ${needle} in ${html}`);
}
function assertNotContains(html, needle, label) {
  if (html.includes(needle)) throw new Error(`${label}: unexpected ${needle} in ${html}`);
}

const unsafe = renderMarkdown("hello <script>alert(1)</script> [x](javascript:alert(1))");
assertContains(unsafe, "&lt;script&gt;alert(1)&lt;/script&gt;", "escapes html tags");
assertNotContains(unsafe, "href=\"javascript:", "blocks unsafe link protocols");

const inline = renderMarkdown("Use `a **b** *c* <tag>` then **bold** and *em*.");
assertContains(inline, "<code>a **b** *c* &lt;tag&gt;</code>", "keeps inline code literal");
assertContains(inline, "<strong>bold</strong>", "renders bold outside code");
assertContains(inline, "<em>em</em>", "renders emphasis outside code");
assertNotContains(inline, "<code>a <strong>", "does not parse bold inside inline code");
assertNotContains(inline, "<code>a **b** <em>", "does not parse emphasis inside inline code");

const fenced = renderMarkdown("```js\nconst x = '<tag>';\n");
assertContains(fenced, "<pre><code class=\"language-js\">const x = '&lt;tag&gt;';", "escapes unterminated fenced code content");
assertContains(fenced, "</code></pre>", "closes unterminated fenced code safely");

console.log("markdown renderer escapes untrusted content and preserves code literals");
'''
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    print(result.stdout.strip())


if __name__ == "__main__":
    main()