import {bundle} from '@remotion/bundler';
import path from 'node:path';
import {root} from './lib/media.mjs';
const outDir=process.argv[2];if(!outDir||!path.isAbsolute(outDir))throw new Error('Absolute local bundle directory required');
await bundle({entryPoint:path.join(root,'src/index.ts'),outDir,publicDir:path.join(path.dirname(outDir),'not-a-public-copy'),enableCaching:false});
