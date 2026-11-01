// Simulation seconds. Only actual grounded in-ring progress replenishes grace.
export const UPLOAD_BUFFER_SECONDS = 1.25;
export function advanceUpload(progress, buffer, inside, dt) {
  if (dt <= 0) return {progress, buffer};
  if (inside) return {progress: progress + dt, buffer: UPLOAD_BUFFER_SECONDS};
  const held = progress > 0 ? Math.min(buffer, dt) : 0;
  return {progress: Math.max(0, progress - (dt - held) * 2), buffer: Math.max(0, buffer - dt)};
}
export function uploadStatus(s, radius) {
  if (s.insideExtraction) return `UPLINK ${Math.min(99,Math.floor((s.extractionProgress||0)*100))}% · ${radius-s.exitDistance<.65?'NEAR EDGE: MOVE INWARD':'MOVE WITHIN THE RING'}`;
  const instruction=s.exitDistance<radius?'LAND INSIDE THE FLOOR RING':'REENTER THE ZONE';
  if (s.extractionProgress>0) return s.extractionBuffer>0
    ? `UPLINK PAUSED · RETURN ${ (Math.ceil(s.extractionBuffer*10)/10).toFixed(1)}s · ${s.exitDistance<radius?'LAND INSIDE THE FLOOR RING':'REENTER'}`
    : `UPLINK DECAYING · ${instruction}`;
  if(s.exitDistance<radius)return instruction;
  return s.exitDistance<8?`ENTER FLOOR RING · ${Math.max(.1,s.exitDistance-radius).toFixed(1)} M TO EDGE`:`REACH THE GREEN BEACON · HOLD ${s.extractionSeconds||6} SECONDS`;
}
