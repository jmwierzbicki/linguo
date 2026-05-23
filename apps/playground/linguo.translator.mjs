// AI-assisted translation for `linguo-extract translate`, backed by Google
// Gemini. ng-linguo builds the prompt (context, slot tags, MessageFormat 2
// rules) and merges the reply; this module only forwards the prompt to Gemini
// and returns its answer. The API key is yours — kept in .env, never committed.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoogleGenAI } from '@google/genai';

// Load apps/playground/.env (next to this file) no matter which directory the
// CLI runs from. process.loadEnvFile is built into Node 20.12+/22 — no dotenv.
const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

/** Gemini sometimes wraps its answer in a ```…``` fence despite instructions. */
function stripCodeFence(text) {
  const fenced = text.trim().match(/^```(?:po|gettext)?\s*\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1] : text;
}

/**
 * @param {{ prompt: string, targetLocale: string, targetLabel: string, sourceLocale: string }} req
 * @returns {Promise<string>} the translated .po catalog
 */
export async function translate(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to apps/playground/.env ' +
        '(get a key at https://aistudio.google.com/apikey).',
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: req.prompt,
    config: { temperature: 0 }, // deterministic catalogs
  });

  const reply = response.text;
  if (!reply || reply.trim() === '') {
    throw new Error(`Gemini returned an empty reply translating ${req.targetLabel}.`);
  }
  return stripCodeFence(reply);
}
