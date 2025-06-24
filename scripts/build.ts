import { $ } from 'bun';
import fs from 'fs';
import path from 'path';
import { copyToolIcons } from '../packages/tool/utils/icon';

// main build
await $`bun --cwd=${__dirname} run build-main`.quiet();

// Build tools
const toolsDir = path.join(__dirname, '..', 'packages', 'tool', 'packages');
const tools = fs.readdirSync(toolsDir);
await Promise.all(tools.map((tool) => $`bun --cwd=${toolsDir}/${tool} run build`.quiet()));

async function moveTool(tool: string) {
  const toolDir = path.join(toolsDir, tool);
  const src = path.join(toolDir, 'dist', 'index.js');
  const targetDir = path.join(__dirname, '..', 'dist', 'tools');
  const targetFile = path.join(targetDir, `${tool}.js`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.cpSync(src, targetFile);
}

await Promise.all(tools.map((tool) => moveTool(tool)));

const publicImgsDir = path.join(__dirname, '..', 'dist', 'public', 'imgs', 'tools');
const copiedCount = await copyToolIcons({
  toolsDir,
  targetDir: publicImgsDir,
  tools,
  logPrefix: 'Copied build icon'
});

console.log(`Tools Build complete, total files: ${tools.length}, icons copied: ${copiedCount}`);
