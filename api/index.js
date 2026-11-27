import { createApp } from '../server/app.js';

const app = createApp();

export default function handler(req, res) {
  return app(req, res);
}
