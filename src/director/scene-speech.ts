import type {Caption} from '@remotion/captions';
import {buildCaptionCues} from '../design/caption-layout.ts';
import {normalizeSpeech} from './speech-integrity.ts';
export const sceneSpeechAt=(captions:Caption[],frame:number)=>{
 let cue=buildCaptionCues(captions,15000).find(c=>frame*1000/30>=c.startMs&&frame*1000/30<c.endMs);
 if(cue&&frame>=348){const spoken=cue.words.filter(w=>w.startMs<=frame*1000/30);if(spoken.length)cue={...cue,text:spoken.map(w=>w.text.trim()).join(' '),startMs:spoken[spoken.length-1].startMs};}
 return cue;
};
export const requireEarlierQuote=(captions:Caption[],quote:string,firstDisplayMs:number)=>{
 const heard=normalizeSpeech(captions.filter(w=>w.endMs<=firstDisplayMs).map(w=>w.text).join(' '));
 if(!(` ${heard} `).includes(` ${normalizeSpeech(quote)} `))throw new Error(`Context quote has not been heard: ${quote}`);
};
