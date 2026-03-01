# Run this to inject styles.css link into any remaining raw HTML files
import os, re

HTML_DIR = './apps/insighthunter-main/public'
LINK_TAG = '<link rel="stylesheet" href="/styles.css">'

for root, dirs, files in os.walk(HTML_DIR):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
    for f in files:
        if not f.endswith('.html'):
            continue
        path = os.path.join(root, f)
        with open(path, 'r') as fh:
            content = fh.read()
        if 'styles.css' in content:
            print(f'SKIP: {path}')
            continue
        updated = re.sub(r'(</head>)', f'  {LINK_TAG}\n\1', content, count=1, flags=re.IGNORECASE)
        with open(path, 'w') as fh:
            fh.write(updated)
        print(f'INJECTED: {path}')
