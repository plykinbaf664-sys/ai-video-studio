import {access,readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const mustExist=['AGENTS.md','README.md','docs/PROJECT_CONTEXT.md','docs/ARCHITECTURE.md','docs/SYSTEM_MAP.md','docs/VERIFICATION.md','docs/DECISIONS.md','docs/AGENT_WORK_STYLE.md','docs/EDITING_CONTRACT.md','docs/STYLE_SYSTEM.md','docs/REFERENCE_AUDIT.md','docs/COLOR_WORKFLOW.md','instructions/editing/README.md','instructions/editing/director.md','instructions/editing/visual-designer.md','instructions/editing/sound-editor.md','instructions/editing/qc-reviewer.md','src/design/stages/ReferenceCut.tsx','src/legacy/personal-v1/PersonalCut.tsx','archives/personal-design-kit-v1/FILE_MANIFEST.json'];
mustExist.push('src/design/editorial/DryIronyV3.tsx','src/design/editorial/PortraitWindow.tsx','src/design/editorial/SpeechTypography.tsx','src/director/editorial-v3.ts','style-presets/directions/dry-irony-v3.json');
mustExist.push('src/design/scenes/EditorialStory.tsx','src/design/scenes/SceneLibrary.tsx','src/director/editorial-job.ts','style-presets/grammars/dry-irony.json','edits/dry-irony-story.json','docs/REUSABLE_EDITING.md');
for(const p of mustExist)await access(p);
for(const p of ['docs/CONTEXT_INDEX.md','docs/PRESENTER_FRAMING.md','.agent/plans/0019-presenter-and-clean-photos.md','scripts/prepare-presenter-accents.mjs','edits/context-domestic-003.json','tests/presenter-framing.test.mjs','scripts/review-editorial-color.py','scripts/lib/editorial_grade.py','tests/editorial-grade.test.py']){await access(p);mustExist.push(p);}
// Keep the progressive-discovery index navigable as documents move.
const contextIndex=await readFile('docs/CONTEXT_INDEX.md','utf8');
for(const match of contextIndex.matchAll(/\]\(([^)]+)\)/g)){
 const target=match[1].split('#')[0];
 if(!target||/^[a-z]+:/i.test(target))continue;
 const resolved=path.resolve('docs',target);
 if(!resolved.startsWith(path.resolve('.')+path.sep))throw Error(`Context index escapes repository: ${target}`);
 await access(resolved);
}
for(const p of ['docs/DIRECTOR_WORKFLOW.md','src/director/semantic-director.ts','src/director/provider.ts','src/director/studio-director.ts','contracts/director-response.schema.json','scripts/director.mjs','instructions/editing/director-system.md']){await access(p);mustExist.push(p);}
for(const p of ['docs/QWEN_SETUP.md','.env.qwen.example','scripts/lib/qwen-config.mjs','scripts/lib/qwen-provider.mjs','scripts/lib/qwen-workflow.mjs']){await access(p);mustExist.push(p);}
const agents=await readFile('AGENTS.md','utf8');
for(const p of ['docs/DOMESTIC_PHOTO_STORY.md','src/director/domestic-storyboard.ts','scripts/prepare-domestic-storyboard.mjs','style-presets/policies/domestic-counterpoint.json','edits/briefs/domestic-counterpoint.json']){await access(p);mustExist.push(p);}
for(const p of ['docs/CONTEXTUAL_VISUAL_LIBRARY.md','src/director/visual-plan.ts','src/design/scenes/VisualComponents.tsx','src/design/scenes/VisualLibraryLab.tsx','scripts/lib/visual-library.mjs','scripts/visual-library.mjs','scripts/prepare-context-demo.mjs','scripts/preview-visual-library.mjs','scripts/build-visual-library-gallery.mjs']){await access(p);mustExist.push(p);}
await access('scripts/lib/visual-person-guard.mjs');mustExist.push('scripts/lib/visual-person-guard.mjs');
for(const p of ['docs/VISUAL_UNDERSTANDING.md','docs/QWEN_AMENDMENT_AUDIT.md','contracts/visual-analysis.schema.json','instructions/editing/visual-understanding.md','scripts/sample-visual-source.py','scripts/visual-director.mjs','scripts/visual-report.mjs','scripts/compare-visual-ab.mjs','scripts/lib/visual-understanding.mjs','scripts/lib/visual-job-compiler.mjs','src/design/scenes/SignalInfographics.tsx','style-presets/policies/visual-understanding.json','style-presets/grammars/signal-dynamic.json','style-presets/grammars/editorial-focus.json']){await access(p);mustExist.push(p);}
for(const stale of ['каталоги пока пусты','brandbooks/catalog.json и reference-library/catalog.json пока пусты','Компоненты src/design — baseline-unbranded'])if(agents.includes(stale))throw new Error('Stale Codex instructions');
for(const name of await readdir('out')){
 const info=await stat(`out/${name}`);if(info.isFile()&&(!/\.mp4$/i.test(name)||/pending/i.test(name)))throw new Error(`Working file in delivery directory: ${name}`);
 if(info.isDirectory()&&(await readdir(`out/${name}`)).length)throw new Error(`Nonempty work directory in out: ${name}`);
}
const pkg=JSON.parse(await readFile('package.json','utf8'));
if(pkg.scripts.render!=='node scripts/render-editorial-job.mjs'||pkg.scripts['render:tight']!==pkg.scripts.render||pkg.scripts['render:story']!=='node scripts/render-editorial-job.mjs --job dry-irony-story'||pkg.scripts['render:v3']!=='node scripts/render-editorial-v3.mjs'||pkg.scripts['render:styles']!=='node scripts/render-reference-styles.mjs')throw new Error('Current job/history render routes disagree');
for(const cmd of Object.values(pkg.scripts)){const match=/^node (scripts\/\S+\.mjs)/.exec(cmd);if(match)await access(match[1]);}
const assets=JSON.parse(await readFile('assets/catalog.json','utf8'));for(const file of ['mixkit-feedback-dreams-588.mp3','mixkit-hip-hop-02-738.mp3','mixkit-relax-beat-292.mp3','mixkit-vastness-184.mp3'])if(!assets.items.some(a=>a.path.endsWith(file)))throw new Error('Provided music absent from canonical catalog');
console.log(JSON.stringify({status:'passed',instructionRouting:'Codex + four distinct editing-role contracts',activeStudio:'src/index.ts → src/Root.tsx',delivery:'Only final MP4 in out',music:'Four actual files registered',checkedPaths:mustExist.length},null,2));
