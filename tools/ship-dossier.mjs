import {copyFileSync,existsSync,linkSync,lstatSync,mkdirSync,readdirSync,unlinkSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,sep,join} from 'node:path';

// Evidence media is immutable once recorded. Link those regular files locally
// instead of duplicating gigabytes on every build; editable text stays separate.
// Cross-volume/unsupported links fall back to an ordinary copy for portability.
export function shipDossier(source='docs',destination='dist/docs'){
 const from=resolve(source),to=resolve(destination);
 if(from===to||to.startsWith(from+sep)||from.startsWith(to+sep))throw Error('Dossier source and output must not overlap');
 const stats={linkedMedia:0,copiedFiles:0,linkedBytes:0,copiedBytes:0};
 function visit(relative=''){
  const src=join(from,relative),dst=join(to,relative),s=lstatSync(src);
  if(s.isDirectory()){
   mkdirSync(dst,{recursive:true});
   for(const name of readdirSync(src))visit(join(relative,name));
   return;
  }
  if(!s.isFile())throw Error(`Unsupported dossier entry: ${src}`);
  // Never overwrite through a previous link, including when rebuilding in place.
  if(existsSync(dst))unlinkSync(dst);
  if(relative.startsWith('media'+sep)){
   try{linkSync(src,dst);stats.linkedMedia++;stats.linkedBytes+=s.size;return;}
   catch(e){if(!['EXDEV','EPERM','ENOSYS','ENOTSUP','EOPNOTSUPP'].includes(e.code))throw e;}
  }
  if(relative.endsWith('.html')){const html=readFileSync(src,'utf8').replace(/<img\b([^>]*?)>/gi,(tag,attrs)=>{if(/\bloading\s*=/.test(attrs))return tag;return '<img loading="lazy" decoding="async"'+attrs+'>'});writeFileSync(dst,html)}else copyFileSync(src,dst);stats.copiedFiles++;stats.copiedBytes+=s.size;
 }
 visit();return stats;
}
