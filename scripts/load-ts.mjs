import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

// Small test-only loader for application modules; overrides allow deterministic SDK failures.
export function loadTs(url, overrides = {}, cache = new Map()) {
  const filename = url instanceof URL ? fileURLToPath(url) : url;
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const nativeRequire = createRequire(filename);
  const require = specifier => {
    if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      const target = specifier.startsWith('@/')
        ? path.resolve(fileURLToPath(new URL('../src/', import.meta.url)), specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      return loadTs(`${target}.ts`, overrides, cache);
    }
    return nativeRequire(specifier);
  };
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  new Function('require', 'exports', outputText)(require, exports);
  return exports;
}
