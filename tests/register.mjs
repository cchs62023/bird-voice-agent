import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Node's type stripping lets the pure production modules run without a build.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@cloudflare/voice/client") {
      return { url: new URL("./voice-client.fake.mjs", import.meta.url).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});
