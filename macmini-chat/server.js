import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const SESSION_TTL_HOURS = Number.parseInt(process.env.SESSION_TTL_HOURS || '24', 10);
const SESSION_TTL_MS = Math.max(1, SESSION_TTL_HOURS) * 60 * 60 * 1000;

const sessions = new Map();
let nextMessageId = 1;

function setCorsHeaders(res, originHeader = '') {
  const allowOrigin = ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN;
  if (ALLOWED_ORIGIN !== '*' && originHeader && originHeader !== ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

function sendJson(res, status, payload, originHeader = '') {
  setCorsHeaders(res, originHeader);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, originHeader = '') {
  setCorsHeaders(res, originHeader);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function getSession(sessionId) {
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 4000);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function parseJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1_000_000) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

function createSession({ name, email, source = 'website' }) {
  const now = Date.now();
  const id = crypto.randomUUID();
  const session = {
    id,
    name,
    email,
    source,
    createdAt: now,
    updatedAt: now,
    closed: false,
    visitorSeenMessageId: 0,
    agentSeenMessageId: 0,
    messages: [],
  };
  sessions.set(id, session);
  return session;
}

function pushMessage(session, sender, text) {
  const message = {
    id: nextMessageId++,
    sender,
    text,
    at: new Date().toISOString(),
  };
  session.messages.push(message);
  session.updatedAt = Date.now();
  return message;
}

function buildSessionSummary(session) {
  const lastMessage = session.messages[session.messages.length - 1] || null;
  const unreadForAgent = session.messages.filter(
    (item) => item.sender === 'visitor' && item.id > session.agentSeenMessageId,
  ).length;
  const unreadForVisitor = session.messages.filter(
    (item) => item.sender === 'agent' && item.id > session.visitorSeenMessageId,
  ).length;

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    source: session.source,
    closed: session.closed,
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
    unreadForAgent,
    unreadForVisitor,
    lastMessage: lastMessage
      ? {
          sender: lastMessage.sender,
          text: lastMessage.text,
          at: lastMessage.at,
        }
      : null,
  };
}

function isAdminAuthorized(req, urlObj) {
  if (!ADMIN_TOKEN) return true;
  const headerToken = req.headers['x-admin-token'];
  const queryToken = urlObj.searchParams.get('token');
  return headerToken === ADMIN_TOKEN || queryToken === ADMIN_TOKEN;
}

async function serveStatic(res, pathname) {
  const routeMap = {
    '/': 'admin.html',
    '/admin': 'admin.html',
    '/admin/': 'admin.html',
    '/admin.js': 'admin.js',
    '/admin.css': 'admin.css',
  };

  const fileName = routeMap[pathname];
  if (!fileName) return false;

  const fullPath = path.join(publicDir, fileName);
  const content = await readFile(fullPath);
  const contentType =
    fileName.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : fileName.endsWith('.js')
        ? 'application/javascript; charset=utf-8'
        : 'text/css; charset=utf-8';

  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
  return true;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanupExpiredSessions, 5 * 60 * 1000).unref();

const server = http.createServer(async (req, res) => {
  const originHeader = req.headers.origin || '';
  const method = req.method || 'GET';
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (method === 'OPTIONS') {
    setCorsHeaders(res, originHeader);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === '/health' && method === 'GET') {
      sendJson(
        res,
        200,
        {
          ok: true,
          sessions: sessions.size,
          now: new Date().toISOString(),
        },
        originHeader,
      );
      return;
    }

    if (pathname === '/api/chat/session' && method === 'POST') {
      const body = await parseJsonBody(req);
      const name = sanitizeText(body.name);
      const email = sanitizeText(body.email).toLowerCase();
      const source = sanitizeText(body.source) || 'website';

      if (!name || !email) {
        sendJson(res, 400, { error: 'name_and_email_required' }, originHeader);
        return;
      }
      if (!isValidEmail(email)) {
        sendJson(res, 400, { error: 'invalid_email' }, originHeader);
        return;
      }

      const session = createSession({ name, email, source });
      sendJson(
        res,
        200,
        {
          ok: true,
          sessionId: session.id,
          session: buildSessionSummary(session),
        },
        originHeader,
      );
      return;
    }

    if (pathname === '/api/chat/message' && method === 'POST') {
      const body = await parseJsonBody(req);
      const sessionId = sanitizeText(body.sessionId);
      const text = sanitizeText(body.text);
      const session = getSession(sessionId);

      if (!session) {
        sendJson(res, 404, { error: 'session_not_found' }, originHeader);
        return;
      }
      if (session.closed) {
        sendJson(res, 409, { error: 'session_closed' }, originHeader);
        return;
      }
      if (!text) {
        sendJson(res, 400, { error: 'text_required' }, originHeader);
        return;
      }

      const message = pushMessage(session, 'visitor', text);
      sendJson(res, 200, { ok: true, message }, originHeader);
      return;
    }

    if (pathname === '/api/chat/messages' && method === 'GET') {
      const sessionId = sanitizeText(urlObj.searchParams.get('sessionId') || '');
      const after = Number.parseInt(urlObj.searchParams.get('after') || '0', 10);
      const session = getSession(sessionId);

      if (!session) {
        sendJson(res, 404, { error: 'session_not_found' }, originHeader);
        return;
      }

      const messages = session.messages.filter((item) => item.id > (Number.isNaN(after) ? 0 : after));
      const newestId = session.messages[session.messages.length - 1]?.id || 0;
      session.visitorSeenMessageId = Math.max(session.visitorSeenMessageId, newestId);

      sendJson(
        res,
        200,
        {
          ok: true,
          closed: session.closed,
          messages,
        },
        originHeader,
      );
      return;
    }

    if (pathname === '/api/admin/sessions' && method === 'GET') {
      if (!isAdminAuthorized(req, urlObj)) {
        sendJson(res, 401, { error: 'unauthorized' }, originHeader);
        return;
      }

      const list = [...sessions.values()]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((session) => buildSessionSummary(session));

      sendJson(res, 200, { ok: true, sessions: list }, originHeader);
      return;
    }

    if (pathname === '/api/admin/messages' && method === 'GET') {
      if (!isAdminAuthorized(req, urlObj)) {
        sendJson(res, 401, { error: 'unauthorized' }, originHeader);
        return;
      }

      const sessionId = sanitizeText(urlObj.searchParams.get('sessionId') || '');
      const after = Number.parseInt(urlObj.searchParams.get('after') || '0', 10);
      const session = getSession(sessionId);

      if (!session) {
        sendJson(res, 404, { error: 'session_not_found' }, originHeader);
        return;
      }

      const messages = session.messages.filter((item) => item.id > (Number.isNaN(after) ? 0 : after));
      const newestId = session.messages[session.messages.length - 1]?.id || 0;
      session.agentSeenMessageId = Math.max(session.agentSeenMessageId, newestId);

      sendJson(
        res,
        200,
        {
          ok: true,
          closed: session.closed,
          messages,
        },
        originHeader,
      );
      return;
    }

    if (pathname === '/api/admin/message' && method === 'POST') {
      if (!isAdminAuthorized(req, urlObj)) {
        sendJson(res, 401, { error: 'unauthorized' }, originHeader);
        return;
      }

      const body = await parseJsonBody(req);
      const sessionId = sanitizeText(body.sessionId);
      const text = sanitizeText(body.text);
      const session = getSession(sessionId);

      if (!session) {
        sendJson(res, 404, { error: 'session_not_found' }, originHeader);
        return;
      }
      if (session.closed) {
        sendJson(res, 409, { error: 'session_closed' }, originHeader);
        return;
      }
      if (!text) {
        sendJson(res, 400, { error: 'text_required' }, originHeader);
        return;
      }

      const message = pushMessage(session, 'agent', text);
      sendJson(res, 200, { ok: true, message }, originHeader);
      return;
    }

    if (pathname === '/api/admin/session/close' && method === 'POST') {
      if (!isAdminAuthorized(req, urlObj)) {
        sendJson(res, 401, { error: 'unauthorized' }, originHeader);
        return;
      }

      const body = await parseJsonBody(req);
      const sessionId = sanitizeText(body.sessionId);
      const closed = Boolean(body.closed);
      const session = getSession(sessionId);

      if (!session) {
        sendJson(res, 404, { error: 'session_not_found' }, originHeader);
        return;
      }

      session.closed = closed;
      session.updatedAt = Date.now();
      sendJson(res, 200, { ok: true, closed: session.closed }, originHeader);
      return;
    }

    const handledStatic = await serveStatic(res, pathname);
    if (handledStatic) return;

    sendText(res, 404, 'Not Found', originHeader);
  } catch (err) {
    if (err instanceof SyntaxError) {
      sendJson(res, 400, { error: 'invalid_json' }, originHeader);
      return;
    }
    if (err instanceof Error && err.message === 'payload_too_large') {
      sendJson(res, 413, { error: 'payload_too_large' }, originHeader);
      return;
    }
    console.error('Server error:', err);
    sendJson(res, 500, { error: 'internal_error' }, originHeader);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`macmini-chat listening on http://${HOST}:${PORT}`);
  if (!ADMIN_TOKEN) {
    console.warn('ADMIN_TOKEN is not set. Admin API is open to anyone who can access this server.');
  }
});
