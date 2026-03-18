import type { IncomingMessage, ServerResponse } from 'node:http';

export function sendJson(res: ServerResponse, data: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function sendError(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req);
  return JSON.parse(raw);
}

export function withJsonBody(
  res: ServerResponse,
  req: IncomingMessage,
  errorPrefix: string,
  handler: (body: Record<string, unknown>) => void,
) {
  readBody(req).then((raw) => {
    try {
      const body = JSON.parse(raw);
      handler(body);
    } catch (err) {
      sendError(res, 500, `${errorPrefix}: ${err}`);
    }
  });
}
