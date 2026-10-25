import {Composition,staticFile} from 'remotion';
import {ReferenceCut} from './ReferenceCut';
import type {ReferenceProps} from './ReferenceCut';
import type {StageVariant} from '../../director/scene-direction';
import {requireEarlierQuote} from '../../director/scene-speech';
export const ReferenceCompositions=()=> <>{(['editorial','signal','paper'] as StageVariant[]).map(variant=><Composition key={variant} id={`Reference-${variant}`} component={ReferenceCut} width={1080} height={1920} fps={30} durationInFrames={450} defaultProps={{variant,captions:[]} as ReferenceProps} calculateMetadata={async({props})=>{
 const response=await fetch(staticFile('generated/reference-edit/edit.json'));
 if(!response.ok)throw new Error('Run npm run prepare:edit');const edit=await response.json();
 if(edit.timeline.durationInFrames!==450||edit.outputCaptions.length!==22)throw new Error('Unexpected real transcript/EDL');
 if(props.variant==='signal'){requireEarlierQuote(edit.outputCaptions,'Не позволял',3600);requireEarlierQuote(edit.outputCaptions,'Сам решил',8900);}
 return {props:{...props,captions:edit.outputCaptions}};
 }}/>)}</>;
