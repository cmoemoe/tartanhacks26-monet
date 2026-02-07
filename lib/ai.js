import { askDaedalus, isDaedalusConfigured } from "./daedalus.js";
import { askFlowise, isFlowiseConfigured } from "./flowise.js";

/** True if either Dedalus or Flowise is configured. */
export function isAIConfigured() {
  return isDaedalusConfigured() || isFlowiseConfigured();
}

/** Which backend is active: "dedalus" | "flowise" | null */
export function getAIBackend() {
  if (isDaedalusConfigured()) return "dedalus";
  if (isFlowiseConfigured()) return "flowise";
  return null;
}

/**
 * Ask the configured AI (Dedalus preferred when API key is set, else Flowise). Returns { text, error }.
 * @param {string} question - User's question or request
 * @param {{ beautyReport?: object }} [options] - Optional: user's beauty_report from profile for personalized recommendations
 */
export async function askAI(question, options = {}) {
  if (isDaedalusConfigured()) return askDaedalus(question, options);
  if (isFlowiseConfigured()) return askFlowise(question);
  return {
    error:
      "No AI configured. Set VITE_DAEDALUS_API_KEY (Dedalus) or VITE_FLOWISE_API_URL + VITE_FLOWISE_CHATFLOW_ID (Flowise) in .env.",
  };
}
