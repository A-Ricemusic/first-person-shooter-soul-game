import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
const scripts=JSON.parse(readFileSync('package.json')).scripts;
const originals=new Map(readdirSync('docs').filter(n=>n.startsWith('current-')).map(n=>[n,readFileSync('docs/'+n)]));
const out='docs/quality-reviews/build40-suite-artifacts';mkdirSync(out,{recursive:true});const results=[];
for(const name of Object.keys(scripts).filter(n=>n==='test'||n.startsWith('test:')||n==='playtest:controls')){
 const r=spawnSync('npm',['run',name],{encoding:'utf8',env:{...process.env,SOULFALL_ARTIFACT_PREFIX:'build40'},maxBuffer:20e6});writeFileSync(`docs/quality-reviews/build40-${name.replaceAll(':','-')}.log`,r.stdout+r.stderr);results.push({name,status:r.status});console.log(name,r.status);writeFileSync('docs/quality-reviews/build40-suite.json',JSON.stringify(results,null,2));
}
for(const n of readdirSync('docs').filter(n=>n.startsWith('current-'))){writeFileSync(out+'/'+n,readFileSync('docs/'+n));if(originals.has(n))writeFileSync('docs/'+n,originals.get(n));}
