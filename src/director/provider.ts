import type {DirectorResponse, DirectorContext} from './semantic-director.ts';

/** General provider boundary. The Node-only Qwen Cloud transport lives in
 * scripts/lib/qwen-provider.mjs and qwen-workflow.mjs; it requires explicit
 * configuration and approval of the exact text payload. No SDK in Studio. */
export type DirectingProvider = {
  id: string;
  transport: 'local' | 'external';
  modalities: ('text' | 'image' | 'audio' | 'video')[];
  propose: (input: {context: DirectorContext; contextSha256: string; systemPrompt: string; responseSchema: unknown; signal: AbortSignal}) => Promise<DirectorResponse>;
};

export const requireDirectingProvider = (provider: DirectingProvider | null): DirectingProvider => {
  if (!provider) throw new Error('PROVIDER_NOT_CONFIGURED: prepare/review/select are available locally; automatic directing has not run.');
  return provider;
};
