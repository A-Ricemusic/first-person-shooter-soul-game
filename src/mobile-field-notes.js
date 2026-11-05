// Secondary field advice stays available while the live visor gives combat priority.
export function installFieldNotes(){
 const panel=document.querySelector('.pause-panel'),details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ol');
 details.id='touch-field-notes';summary.textContent='FIELD MESSAGES (0)';list.setAttribute('aria-label','Recent field messages, newest first');details.append(summary,list);panel.append(details);
 let entries=[],focusUntil=0;
 const paint=()=>{summary.textContent=`FIELD MESSAGES (${entries.length})`;list.replaceChildren(...entries.map(({text,time})=>{const item=document.createElement('li'),stamp=document.createElement('time'),copy=document.createElement('span');stamp.textContent=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;copy.textContent=text;item.append(stamp,copy);return item}));};
 return{
  record(text,time,repeat=false){if(!repeat&&entries[0]?.text===text)return;entries.unshift({text,time:Math.max(0,time||0)});entries=entries.slice(0,6);paint()},
  reset(){entries=[];focusUntil=0;details.open=false;paint()},
  focused(phase,time,active){if(phase==='playing'&&active)focusUntil=time+.7;return phase==='playing'&&(active||time<focusUntil)}
 };
}
