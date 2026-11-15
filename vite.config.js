import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleAskRequest } from './src/server/aiHandler.js'

function localAiApi(apiKey, model) {
  return {
    name: 'local-gemini-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname;
        if (path !== '/api/ask') return next();

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks);
          const request = new Request('http://localhost/api/ask', {
            method: req.method,
            headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
            body: body.length ? body : undefined,
          });
          const response = await handleAskRequest(request, { apiKey, model });
          res.statusCode = response.status;
          res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/json');
          res.end(await response.text());
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || env.GEMINI_MODEL;

  return {
    plugins: [react(), tailwindcss(), localAiApi(apiKey, model)],
  };
})
