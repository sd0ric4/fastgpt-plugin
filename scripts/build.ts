import { $ } from 'bun';
import fs from 'fs';
import path from 'path';

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

  // 处理图标文件 - 复制到 public/imgs
  const publicImgsDir = path.join(__dirname, '..', 'dist', 'public', 'imgs', 'tools');
  if (!fs.existsSync(publicImgsDir)) {
    fs.mkdirSync(publicImgsDir, { recursive: true });
  }

  const iconExtensions = ['.svg', '.png', '.jpg', '.ico'];
  const iconNames = ['icon', 'logo'];

  for (const iconName of iconNames) {
    for (const ext of iconExtensions) {
      const iconPath = path.join(toolDir, `${iconName}${ext}`);
      if (fs.existsSync(iconPath)) {
        const iconTarget = path.join(publicImgsDir, `${tool}${ext}`);
        fs.cpSync(iconPath, iconTarget);
        console.log(`📦 Copied icon: /imgs/tools/${tool}${ext}`);
        break; // 只复制第一个找到的图标
      }
    }
  }
}
await Promise.all(tools.map((tool) => moveTool(tool)));

console.log(`Tools Build complete, total files: ${tools.length}`);
