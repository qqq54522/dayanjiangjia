import {exportTeamConfig,importTeamConfig} from '../lib/team-config.mjs';

const [action,file]=process.argv.slice(2);
if(action==='export'){
 const output=exportTeamConfig(file?{output:file}:{});
 console.log(`公司发布配置已导出到 ${output}。文件包含发布密钥，只通过公司内部渠道发送，不上传 GitHub。`);
}else if(action==='import'){
 if(!file)throw Error('请指定收到的公司发布配置文件路径');
 const result=importTeamConfig({source:file});
 if(result.state==='already-configured')console.log('本机已有发布配置，未覆盖。');
 else if(result.state==='imported')console.log('公司发布配置已导入本机 .local/。');
 else throw Error('找不到指定的公司发布配置文件');
}else throw Error('用法：npm run team-config -- export [输出路径] 或 npm run team-config -- import <文件路径>');
