#!/usr/bin/env python3
"""Build the served copy of this site into dist/.

The source files ARE the spec: index.html and app-post-beta.css carry the editorial history
of nearly every line as comments, and that is ~330KB of gzipped bytes a reader downloads
before first paint (measured 2026-09-07: index.html 141KB -> 33KB gz, app-post-beta.css
279KB -> 53KB gz once the comments are gone). This script copies every committed file into
dist/ verbatim and rewrites just three of them:

  index.html          HTML comments removed (the build refuses to run if one sits inside a
                      real <script>/<style>), blank runs collapsed
  app-post-beta.css   /* comments */ removed (a tiny tokenizer, so a "/*" inside a string
                      or url() survives), blank runs collapsed
  app-post-beta.js    comments removed with terser (no compress, no mangle) when npx is
                      available; copied verbatim otherwise

Nothing else is minified: no whitespace collapsing inside markup (inline whitespace is
typography on this page), no attribute rewriting, no selector restructuring. The output is
the source minus its commentary, byte-for-byte otherwise.

Run:  python3 tools/build-dist.py [--out dist]
The GitHub Pages workflow in .github/workflows/pages.yml runs it on every push to main.
"""
import argparse, os, re, shutil, subprocess, sys

def _code_blocks(html: str):
    """The text inside every real <script>/<style> element, in order (a real parser, so a
    '<script>' mentioned inside an HTML comment does not count)."""
    from html.parser import HTMLParser
    class P(HTMLParser):
        def __init__(self):
            super().__init__(); self.stack = []; self.blocks = []
        def handle_starttag(self, t, a):
            if t in ('script', 'style'): self.stack.append(t)
        def handle_endtag(self, t):
            if self.stack and self.stack[-1] == t: self.stack.pop()
        def handle_data(self, d):
            if self.stack: self.blocks.append(d)
    p = P(); p.feed(html); return p.blocks

def strip_html(src: str) -> str:
    s = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    # A comment marker inside real script/style text would have been eaten too; refuse to
    # ship that rather than guess. (None exist as of 2026-09-07.)
    if _code_blocks(src) != _code_blocks(s):
        sys.exit('build-dist: an HTML comment marker sits inside a <script> or <style>; '
                 'strip_html would change code. Fix the source or teach this script.')
    s = re.sub(r'[ \t]+\n', '\n', s)        # trailing whitespace a comment left behind
    s = re.sub(r'\n{3,}', '\n\n', s)        # collapse blank runs
    return s

def strip_css(src: str) -> str:
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in '"\'':                      # string: copy through the closing quote
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1]); i = j + 1
        elif src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
        else:
            out.append(c); i += 1
    s = ''.join(out)
    s = re.sub(r'[ \t]+\n', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s

def strip_js(src_path: str, dst_path: str) -> str:
    try:
        subprocess.run(['npx', '--yes', 'terser', src_path, '--comments', 'false', '-o', dst_path],
                       check=True, capture_output=True, text=True, timeout=300)
        return 'terser'
    except Exception as e:                   # no node / offline: ship the source as is
        shutil.copyfile(src_path, dst_path)
        return f'copied verbatim ({type(e).__name__})'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='dist')
    args = ap.parse_args()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    files = subprocess.run(['git', 'ls-files'], check=True, capture_output=True, text=True).stdout.split('\n')
    files = [f for f in files if f and os.path.isfile(f)]
    if os.path.isdir(args.out):
        shutil.rmtree(args.out)
    for f in files:
        if f.startswith(('.github/', 'tools/', 'notes/')):
            continue
        d = os.path.join(args.out, f)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copyfile(f, d)
    with open('index.html', encoding='utf-8') as fh:
        html = fh.read()
    with open(os.path.join(args.out, 'index.html'), 'w', encoding='utf-8') as fh:
        fh.write(strip_html(html))
    with open('app-post-beta.css', encoding='utf-8') as fh:
        css = fh.read()
    with open(os.path.join(args.out, 'app-post-beta.css'), 'w', encoding='utf-8') as fh:
        fh.write(strip_css(css))
    how = strip_js('app-post-beta.js', os.path.join(args.out, 'app-post-beta.js'))
    for f in ('index.html', 'app-post-beta.css', 'app-post-beta.js'):
        a, b = os.path.getsize(f), os.path.getsize(os.path.join(args.out, f))
        print(f'{f:20s} {a//1024:5d}K -> {b//1024:5d}K' + (f'  ({how})' if f.endswith('.js') else ''))
    print(f'{len(files)} files -> {args.out}/')

if __name__ == '__main__':
    main()
