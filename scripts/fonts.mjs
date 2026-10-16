import path from 'node:path';import {prepareFonts} from '../lib/fonts.mjs';
await prepareFonts(path.resolve(process.env.DECK_DATA_DIR||'.local','fonts'));
console.log('阿里巴巴普惠体2.0 四个字重已准备好；原字体保存在本机。');
