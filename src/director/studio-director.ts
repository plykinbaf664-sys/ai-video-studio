import {staticFile} from 'remotion';
import {loadEditorialStory} from '../design/scenes/EditorialStory';
import type {EditorialStoryProps} from '../design/scenes/EditorialStory';

export const loadDirectorPreview = async ({props}: {props: EditorialStoryProps}) => {
  if (props.jobId !== 'director-selected') return loadEditorialStory({props});
  const response = await fetch(staticFile('generated/director/selected.json'));
  // Before the first selection, show the existing checked baseline, not invented media.
  if (response.status === 404) return loadEditorialStory({props:{...props,jobId:'dry-irony-tight'}});
  if (!response.ok) throw new Error('Cannot load director preview selection');
  const selected = await response.json();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(selected.jobId) || !/^[a-f0-9]{64}$/.test(selected.jobSha256)) throw new Error('Invalid director preview selection');
  const media = await fetch(staticFile(`generated/jobs/${selected.jobId}/edit.json`));
  if (!media.ok || (await media.json()).jobSha256 !== selected.jobSha256) throw new Error('Director preview is stale; run director:stage again');
  return loadEditorialStory({props:{...props,jobId:selected.jobId}});
};
