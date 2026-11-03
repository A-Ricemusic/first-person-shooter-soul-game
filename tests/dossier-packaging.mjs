import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,statSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {shipDossier} from '../tools/ship-dossier.mjs';
const root=mkdtempSync(join(tmpdir(),'soulfall-dossier-packaging-'));
try{
 const src=join(root,'docs'),dst=join(root,'dist-docs');mkdirSync(join(src,'media'),{recursive:true});mkdirSync(join(src,'quality-reviews'));
 writeFileSync(join(src,'human.html'),'original report');writeFileSync(join(src,'quality-reviews','report.json'),'{}');writeFileSync(join(src,'media','frame.jpg'),Buffer.from([1,2,3,4]));
 const first=shipDossier(src,dst);assert.equal(first.linkedMedia,1);assert.equal(first.copiedFiles,2);
 assert.equal(statSync(join(src,'media','frame.jpg')).ino,statSync(join(dst,'media','frame.jpg')).ino);
 assert.notEqual(statSync(join(src,'human.html')).ino,statSync(join(dst,'human.html')).ino);
 writeFileSync(join(dst,'human.html'),'output edit');assert.equal(readFileSync(join(src,'human.html'),'utf8'),'original report');
 writeFileSync(join(src,'human.html'),'revised report');shipDossier(src,dst);assert.equal(readFileSync(join(dst,'human.html'),'utf8'),'revised report');
 assert.throws(()=>shipDossier(src,src));assert.throws(()=>shipDossier(src,join(src,'nested')));
 rmSync(dst,{recursive:true});assert.deepEqual([...readFileSync(join(src,'media','frame.jpg'))],[1,2,3,4]);
 symlinkSync(join(src,'human.html'),join(src,'link.html'));assert.throws(()=>shipDossier(src,dst),/Unsupported dossier entry/);
 console.log('PASS: shared immutable media, independent editable text, safe rebuild/cleanup, overlap and symlink rejection.');
}finally{rmSync(root,{recursive:true,force:true})}
