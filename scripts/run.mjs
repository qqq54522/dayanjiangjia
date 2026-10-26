import {spawn} from 'node:child_process';

let stopping=false,child;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;child?.kill(signal)});
do{
 child=spawn(process.execPath,['server.mjs'],{stdio:'inherit',env:{...process.env,DECK_SUPERVISED:'1'}});
 const code=await new Promise(resolve=>child.on('exit',resolve));
 if(stopping)process.exit(0);
 if(code!==75)process.exit(code||0);
 console.log('工作台更新完成，正在重启…');
}while(true);
