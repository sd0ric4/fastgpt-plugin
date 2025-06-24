import express from 'express';
import { initOpenAPI } from './contract/openapi';
import { initRouter } from './router';
import { initTool } from '@tool/init';
import { isProd } from './constants';
import fs from 'fs';
import path from 'path';

// 开发环境图标复制功能
async function copyDevIcons() {
  if (isProd) return; // 生产环境跳过

  const toolsDir = path.join(__dirname, '..', 'packages', 'tool', 'packages');
  const tools = fs.readdirSync(toolsDir);

  // 创建目标目录
  const publicImgsDir = path.join(__dirname, '..', 'public', 'imgs', 'tools');
  if (!fs.existsSync(publicImgsDir)) {
    fs.mkdirSync(publicImgsDir, { recursive: true });
  }

  const iconExtensions = ['.svg', '.png', '.jpg', '.ico'];
  const iconNames = ['icon', 'logo'];

  for (const tool of tools) {
    const toolDir = path.join(toolsDir, tool);

    for (const iconName of iconNames) {
      for (const ext of iconExtensions) {
        const iconPath = path.join(toolDir, `${iconName}${ext}`);
        if (fs.existsSync(iconPath)) {
          const iconTarget = path.join(publicImgsDir, `${tool}${ext}`);
          fs.cpSync(iconPath, iconTarget);
          console.log(`📦 Copied dev icon: /imgs/tools/${tool}${ext}`);
          break; // 只复制第一个找到的图标
        }
      }
    }
  }

  console.log(`Dev icons copied, total tools: ${tools.length}`);
}

const app = express().use(
  express.json(),
  express.urlencoded({ extended: true }),
  express.static('public', { maxAge: isProd ? '1d' : '0', etag: true, lastModified: true })
);

initOpenAPI(app);
initRouter(app);

// 开发环境先复制图标，然后初始化工具
await copyDevIcons();
initTool();

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`FastGPT Plugin Service is listening at http://localhost:${PORT}`);
});
