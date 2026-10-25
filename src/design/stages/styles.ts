import editorial from '../../../style-presets/runtime/personal-editorial-focus.json';
import signal from '../../../style-presets/runtime/personal-signal-dynamic.json';
import paper from '../../../style-presets/runtime/personal-dry-irony.json';
import type {StyleContract} from '../../styles/contract';
import {assertSupportedStyle} from '../../styles/contract';
import type {StageVariant} from '../../director/scene-direction';
export const stageStyles:Record<StageVariant,StyleContract>={editorial:editorial as StyleContract,signal:signal as StyleContract,paper:paper as StyleContract};
Object.values(stageStyles).forEach(assertSupportedStyle);
export const stageSlugs:Record<StageVariant,string>={editorial:'editorial-focus',signal:'signal-dynamic',paper:'dry-irony'};
