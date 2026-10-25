import {visualPreflight,generateVisualAnalysis} from './lib/visual-understanding.mjs';
const args=process.argv.slice(2),command=args[0],get=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const run=get('--run');if(!run)throw Error('Use --run <id>');
if(command==='preflight')console.log(JSON.stringify((await visualPreflight(run)).summary,null,2));
else if(command==='analyze')console.log(JSON.stringify(await generateVisualAnalysis(run,get('--approve-image-payload')),null,2));
else throw Error('Use preflight | analyze');
