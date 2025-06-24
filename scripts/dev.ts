import { isProd } from '@/constants';
import { copyToolIcons } from '@tool/utils/icon';
import path from 'path';

async function copyDevIcons() {
  if (isProd) return;

  const toolsDir = path.join(__dirname, '..', 'packages', 'tool', 'packages');
  const publicImgsDir = path.join(__dirname, '..', 'public', 'imgs', 'tools');

  await copyToolIcons({
    toolsDir,
    targetDir: publicImgsDir,
    logPrefix: 'Copied dev icon'
  });
}
await copyDevIcons();
