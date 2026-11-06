// Resolved cover state is independent of rendering and target queries.
const stopped = new WeakMap();
export function rememberCoverStop(g) {
  stopped.set(g,{impact:g.rifleImpact,time:g.runTime});
}
export const coverStop = g => stopped.get(g);
export const forgetCoverStop = g => stopped.delete(g);
