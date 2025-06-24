import express from 'express';
import { initOpenAPI } from './contract/openapi';
import { initRouter } from './router';
import { initTool } from '@tool/init';
import { isProd } from './constants';

const app = express().use(
  express.json(),
  express.urlencoded({ extended: true }),
  express.static('public', { maxAge: isProd ? '1d' : '0', etag: true, lastModified: true })
);

initOpenAPI(app);
initRouter(app);

initTool();

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`FastGPT Plugin Service is listening at http://localhost:${PORT}`);
});
