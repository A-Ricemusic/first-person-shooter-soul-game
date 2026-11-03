// Simulation seconds. Only actual grounded on-deck progress replenishes grace.
export const UPLOAD_BUFFER_SECONDS = 1.25;
export function advanceUpload(progress, buffer, inside, dt) {
  if (dt <= 0) return {progress, buffer};
  if (inside) return {progress: progress + dt, buffer: UPLOAD_BUFFER_SECONDS};
  const held = progress > 0 ? Math.min(buffer, dt) : 0;
  return {progress: Math.max(0, progress - (dt - held) * 2), buffer: Math.max(0, buffer - dt)};
}
export function uploadStatus(s,{compact=false}={}) {
  if(s.custodian?.active&&!s.custodian.dead){
    if(compact)return s.custodian.open?'COILS EXPOSED · FIRE':s.custodian.charging?'CHARGING · TAKE COVER':'ARMORED · WAIT FOR OPENING';
    return `JAMMED · ${s.custodian.open?'OPEN WINDOW — FIND CLEAR COIL COMPONENTS':'SHUTTERS ARMORED — CHIP / WAIT FOR OPENING'}`;
  }
  if(compact){
    if(s.insideExtraction)return `UPLOADING ${Math.min(99,Math.floor((s.extractionProgress||0)*100))}% · ${s.extractionMargin<.65?'MOVE INWARD':'STAY ON DECK'}`;
    if(s.extractionProgress>0)return s.extractionBuffer>0?`PAUSED ${(Math.ceil(s.extractionBuffer*10)/10).toFixed(1)}s · RETURN TO DECK`:`DECAYING · ${s.extractionMargin>0?'LAND ON DECK':'RETURN TO DECK'}`;
    if(s.extractionMargin>0)return 'LAND ON THE DECK';
    return -s.extractionMargin<8?`${Math.max(.1,-s.extractionMargin).toFixed(1)} M TO DECK · ENTER`:`REACH GREEN DECK · UPLOAD ${s.extractionSeconds||6}s`;
  }
  if (s.insideExtraction) return `UPLINK ${Math.min(99,Math.floor((s.extractionProgress||0)*100))}% · ${s.extractionMargin<.65?'NEAR EDGE: MOVE INWARD':'MOVE WITHIN THE DECK'}`;
  const instruction=s.extractionMargin>0?'LAND INSIDE THE DECK':'REENTER THE DECK';
  if (s.extractionProgress>0) return s.extractionBuffer>0
    ? `UPLINK PAUSED · RETURN ${ (Math.ceil(s.extractionBuffer*10)/10).toFixed(1)}s · ${s.extractionMargin>0?'LAND INSIDE THE DECK':'REENTER'}`
    : `UPLINK DECAYING · ${instruction}`;
  if(s.extractionMargin>0)return instruction;
  return -s.extractionMargin<8?`ENTER UPLINK DECK · ${Math.max(.1,-s.extractionMargin).toFixed(1)} M TO EDGE`:`REACH THE GREEN BEACON · HOLD ${s.extractionSeconds||6} SECONDS`;
}
