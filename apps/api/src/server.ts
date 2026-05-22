import { buildApp } from './app.js';

const start = async () => {
  const app = buildApp();
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
    app.log.info(`API documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
