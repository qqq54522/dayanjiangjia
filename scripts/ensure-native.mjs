import {ensureNative,nativeStatus} from '../lib/native-setup.mjs';
import {tool} from '../lib/native-tools.mjs';

ensureNative();
for(const group of nativeStatus())for(const name of group.tools)console.log(`${name} 可用：${tool(name)}`);
