import {readFile,writeFile,mkdir,rename,access,readdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from '../lib/media.mjs';
const base=await realpath(root),log=[];
const move=async(from,to)=>{
 const a=path.resolve(base,from),b=path.resolve(base,to);if(!a.startsWith(base+path.sep)||!b.startsWith(base+path.sep))throw new Error('Outside workspace');
 try{await access(a);}catch{return;}
 const actual=await realpath(a);if(!actual.startsWith(base+path.sep))throw new Error('Linked source leaves workspace');
 try{await access(b);throw new Error(`Destination exists ${to}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(path.dirname(b),{recursive:true});await rename(a,b);log.push({from,to});
};
await move('build-personal','.cache/history/build-personal-v1');
for(const name of ['prepare-personal.mjs','refine-personal-timing.mjs','render-personal.mjs','preview-personal.mjs','master-personal-outputs.mjs','personal-color-previews.mjs','personal-final-previews.py','personal-gallery.mjs','personal-report.mjs','personal-reference-contact.mjs','check-personal-color.py','verify-personal-media.py'])await move(`scripts/${name}`,`archives/personal-v1-scripts/${name}`);
await move('scripts/lib/personal-audio.mjs','archives/personal-v1-scripts/lib/personal-audio.mjs');
await mkdir('archives/personal-v1-scripts',{recursive:true});await writeFile('archives/personal-v1-scripts/README.md','# Исторические скрипты v1\n\nСохранены как снимок отклонённого этапа. Их относительные пути относятся к прежней структуре; они не являются активными командами и не запускаются из package.json. Текущие команды — корневой README.md, scripts/render-reference-styles.mjs и scripts/prepare-reference-edit.mjs. Данные v1 — artifacts/history/personal-v1.\n');
for(const name of ['import-personal-kit.mjs','fetch-personal-fonts.mjs','reorganize-project.mjs','migrate-active-paths.mjs','write-project-context.mjs','install-scene-directions.mjs','refresh-library-docs.mjs']){
 await move(`scripts/${name}`,`scripts/migrations/${name}`);
 const file=`scripts/migrations/${name}`;let text=await readFile(file,'utf8');text=text.replaceAll("'../lib/","'../lib/").replaceAll('"./lib/','"../lib/');await writeFile(file,text);
}
await writeFile('scripts/migrations/README.md','# Разовые миграции\n\nИстория интеграции, не pipeline монтажа. Они могут заменять документы/пресеты или переносить исторические каталоги; не запускать автоматически при Studio/render. Действующие команды находятся в package.json.\n');
await writeFile('artifacts/project-audit/final-moves.json',JSON.stringify({at:new Date().toISOString(),policy:'No deletion. Legacy executable paths archived; active package commands use current pipeline.',moves:log},null,2)+'\n');
await writeFile('.agent/PLANS.md','# Планы сложных изменений\n\nТекущий проход — .agent/plans/0008-reference-led-rebuild.md. Предыдущие планы описывают историю своих этапов; после пользовательского отклонения v1 не использовать их как запрет на исправление AGENTS/Root/режиссуры.\n\nExecPlan нужен для нескольких подсистем: референсы → сцены → звук → QC, общая временная модель, новые источники. Живой план содержит цель, факты, шаги, проверки/выходы и реальные ограничения; не фиксирует навсегда первую неудачную реализацию.\n');
let ignore=await readFile('.gitignore','utf8');if(!ignore.includes('\narchives/'))ignore+='\n# Private imported kits and historical audiovisual materials\narchives/\n';await writeFile('.gitignore',ignore);
console.log(`Archived ${log.length} obsolete paths; no files deleted`);
