#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/opt/node@24/bin:/usr/local/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' || ! command -v npm >/dev/null 2>&1; then
  exec ./安装工作台.command
fi
if [ ! -f dist/index.html ]; then npm run setup || exit 1; fi
npm start
