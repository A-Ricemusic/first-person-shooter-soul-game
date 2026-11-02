import original from '../vite.config.js';
export default {...original,plugins:[],build:{...original.build,emptyOutDir:false}};
