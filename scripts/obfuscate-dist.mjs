import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(projectRoot, "dist");

const options = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  sourceMap: false,
  splitStrings: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.35,
  target: "browser",
  unicodeEscapeSequence: false,
};

await assertDirectory(distDir);

const jsFiles = await findJavaScriptFiles(distDir);

if (jsFiles.length === 0) {
  throw new Error("No JavaScript files found in dist/. Run vite build first.");
}

let beforeBytes = 0;
let afterBytes = 0;

for (const filePath of jsFiles) {
  const source = await readFile(filePath, "utf8");
  beforeBytes += Buffer.byteLength(source);

  const result = JavaScriptObfuscator.obfuscate(source, options);
  const obfuscated = result.getObfuscatedCode();

  afterBytes += Buffer.byteLength(obfuscated);
  await writeFile(filePath, obfuscated, "utf8");
}

console.log(
  `Obfuscated ${jsFiles.length} JavaScript file(s): ${formatBytes(
    beforeBytes,
  )} -> ${formatBytes(afterBytes)}`,
);

async function findJavaScriptFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        return findJavaScriptFiles(entryPath);
      }

      if (entry.isFile() && entry.name.endsWith(".js")) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat();
}

async function assertDirectory(dirPath) {
  const stats = await stat(dirPath).catch(() => null);

  if (!stats?.isDirectory()) {
    throw new Error(`Missing build directory: ${dirPath}`);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} kB`;
}
