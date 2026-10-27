#!/bin/bash
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/node@24/bin:/usr/local/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

find_brew() {
  if command -v brew >/dev/null 2>&1; then command -v brew; return; fi
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [ -x "$candidate" ]; then echo "$candidate"; return; fi
  done
  return 1
}

ensure_brew() {
  if find_brew >/dev/null; then return; fi
  echo "正在安装 Homebrew；系统可能要求管理员密码。"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  export PATH="/opt/homebrew/opt/node@24/bin:/usr/local/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
  find_brew >/dev/null || { echo "Homebrew 安装后仍不可用，请重新打开终端再运行。"; exit 1; }
}

node_ready() {
  command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 &&
    node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'
}

if ! node_ready; then
  ensure_brew
  "$(find_brew)" install node@24
  export PATH="$("$(find_brew)" --prefix node@24)/bin:$PATH"
  node_ready || { echo "Node.js 24 安装后仍不可用，请重新打开终端再运行。"; exit 1; }
fi

if ! node --input-type=module -e "import {nativeStatus} from './lib/native-setup.mjs'; process.exit(nativeStatus().some(group=>group.missing.length)?1:0)"; then
  ensure_brew
fi

npm run setup
npm start
