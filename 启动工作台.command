#!/bin/bash
cd "$(dirname "$0")" || exit 1
if [ ! -f dist/index.html ]; then npm run setup || exit 1; fi
npm start
