import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { vertex } from '@ai-sdk/google-vertex';
import type { LanguageModel } from 'ai';
import { env } from '../util/env.ts';

const DEFAULT_MODEL = 'vertex:gemini-2.5-pro';

/**
 * Resolve the language model from the PROSPECTOR_MODEL env var, formatted as
 * `provider:model-id` (e.g. "google:gemini-2.5-pro", "anthropic:claude-opus-4-8",
 * "vertex:gemini-2.5-pro"). Falls back to Gemini 2.5 Pro on Vertex.
 */
export function resolveModel(): LanguageModel {
  const spec = env.PROSPECTOR_MODEL ?? DEFAULT_MODEL;
  const separatorIndex = spec.indexOf(':');
  const provider = spec.slice(0, separatorIndex);
  const modelId = spec.slice(separatorIndex + 1);

  if (provider === 'google') return google(modelId);
  if (provider === 'vertex') return vertex(modelId);
  return anthropic(modelId);
}
