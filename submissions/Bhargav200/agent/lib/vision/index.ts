import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import type { VisionProvider } from "./provider";

/**
 * Picks the vision model from VISION_PROVIDER: "ollama" (local, default) or "gemini" (hosted,
 * used by the deployed app). Both are blind to the PO and make one call per unit.
 */
export function visionProvider(name = process.env.VISION_PROVIDER || "ollama"): VisionProvider {
  switch (name) {
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unknown VISION_PROVIDER "${name}" (use "ollama" or "gemini")`);
  }
}
