import { Composition, Folder } from "remotion";
import {ReferenceCompositions} from './design/stages/ReferenceCompositions';
import {DryIronyV3,loadEditorialV3} from './design/editorial/DryIronyV3';
import { FirstTest } from "./Composition";
import { calculateSourceMetadata } from "./core/source-metadata";
import { SemanticCut } from "./SemanticCut";
import { calculateEditMetadata } from "./director/load-edit";
import {EditorialStory,loadEditorialStory} from './design/scenes/EditorialStory';
import {loadDirectorPreview} from './director/studio-director';
import {VisualLibraryLab} from './design/scenes/VisualLibraryLab';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="ContextDomesticPhoto" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'context-domestic-003',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="ContextDomesticPhoto002" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'context-domestic-002',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="ContextDomestic" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'context-domestic-001',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="VisualLibraryLab" component={VisualLibraryLab} width={1080} height={1920} fps={30} durationInFrames={360} defaultProps={{styleId:'signal-dynamic'}}/>
      <Composition id="VisualA" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'visual-001-a',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="VisualB" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'visual-001-b',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="DirectorPreview" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'director-selected',edit:null}} calculateMetadata={loadDirectorPreview}/>
      <Composition id="DryIronyTight" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={548} defaultProps={{jobId:'dry-irony-tight',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="DryIronyStory" component={EditorialStory} width={1080} height={1920} fps={30} durationInFrames={930} defaultProps={{jobId:'dry-irony-story',edit:null}} calculateMetadata={loadEditorialStory}/>
      <Composition id="DryIronyV3" component={DryIronyV3} width={1080} height={1920} fps={30} durationInFrames={414} defaultProps={{captions:[],audioMode:'continuous'}} calculateMetadata={loadEditorialV3}/>
      <ReferenceCompositions/>
      <Folder name="Technical-history">
      <Composition
        id="FirstTest"
        component={FirstTest}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
        defaultProps={{
          title: "Первый монтаж",
          source: null,
          sourceError: null,
        }}
        calculateMetadata={calculateSourceMetadata}
      />
      <Composition
        id="SemanticCut"
        component={SemanticCut}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
        defaultProps={{ edit: null, error: null }}
        calculateMetadata={calculateEditMetadata}
      />
      </Folder>
    </>
  );
};
