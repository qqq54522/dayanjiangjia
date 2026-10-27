import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';

export const teamConfigName='company-publish-config.json';

function parseConfig(file){
 const value=JSON.parse(readFileSync(file,'utf8'));
 const url=new URL(value.gatewayUrl);
 if(url.protocol!=='https:'||url.username||url.password||!value.apiKey||typeof value.apiKey!=='string')throw Error('公司发布配置格式无效：需要 HTTPS 网关地址和 API Key');
 return {gatewayUrl:url.href.replace(/\/$/,''),apiKey:value.apiKey};
}

export function exportTeamConfig({dir=process.cwd(),output=path.join(dir,'delivery',teamConfigName)}={}){
 const source=path.join(dir,'.local','publish-config.json');
 if(!existsSync(source))throw Error('本机尚未配置发布网关，无法导出公司发布配置');
 const config=parseConfig(source);
 mkdirSync(path.dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
 return output;
}

export function importTeamConfig({dir=process.cwd(),source=process.env.DECK_TEAM_CONFIG_FILE||path.join(dir,teamConfigName),removeLocalBundle=false}={}){
 const destination=path.join(dir,'.local','publish-config.json');
 if(existsSync(destination))return {state:'already-configured'};
 if(!existsSync(source))return {state:'missing'};
 const config=parseConfig(source);
 mkdirSync(path.dirname(destination),{recursive:true});
 writeFileSync(destination,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
 if(removeLocalBundle&&path.resolve(source)===path.resolve(dir,teamConfigName))rmSync(source);
 return {state:'imported'};
}
