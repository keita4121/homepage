const TOKEN_KEY = 'macmini_chat_admin_token';
const SESSIONS_INTERVAL_MS = 5000;
const MESSAGES_INTERVAL_MS = 2000;

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  sessions: [],
  activeSessionId: '',
  lastMessageId: 0,
  sessionsTimer: null,
  messagesTimer: null,
};

const tokenInput = document.getElementById('adminToken');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const refreshBtn = document.getElementById('refreshBtn');
const sessionListEl = document.getElementById('sessionList');
const sessionCountEl = document.getElementById('sessionCount');
const chatMetaEl = document.getElementById('chatMeta');
const chatLogEl = document.getElementById('chatLog');
const replyForm = document.getElementById('replyForm');
const replyInput = document.getElementById('replyInput');
const replySendBtn = document.getElementById('replySendBtn');
const toggleCloseBtn = document.getElementById('toggleCloseBtn');

tokenInput.value = state.token;

function toLocalTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP', { hour12: false });
}

function trimPreview(text) {
  if (!text) return '(no messages)';
  return text.length > 56 ? `${text.slice(0, 56)}...` : text;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (state.token) headers.set('X-Admin-Token', state.token);

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body || null,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(payload?.error || `http_${res.status}`);
  }
  return payload || {};
}

function getActiveSession() {
  return state.sessions.find((item) => item.id === state.activeSessionId) || null;
}

function renderSessions() {
  sessionCountEl.textContent = String(state.sessions.length);
  sessionListEl.innerHTML = state.sessions
    .map((session) => {
      const isActive = session.id === state.activeSessionId;
      const unreadBadge =
        session.unreadForAgent > 0 ? `<span class="unread">+${session.unreadForAgent}</span>` : '<span></span>';
      const closedLabel = session.closed ? '[closed]' : '';
      const preview = escapeHtml(trimPreview(session.lastMessage?.text || ''));

      return `
        <li class="session-item ${isActive ? 'active' : ''}" data-session-id="${session.id}">
          <div class="session-name">
            <span>${escapeHtml(session.name)} ${closedLabel}</span>
            ${unreadBadge}
          </div>
          <div class="session-email">${escapeHtml(session.email)}</div>
          <div class="session-preview">${preview}</div>
          <div class="session-meta">${toLocalTime(session.updatedAt)}</div>
        </li>
      `;
    })
    .join('');
}

function renderMeta() {
  const session = getActiveSession();
  if (!session) {
    chatMetaEl.textContent = 'セッションを選択してください';
    replySendBtn.disabled = true;
    toggleCloseBtn.disabled = true;
    return;
  }

  chatMetaEl.textContent =
    `${session.name} / ${session.email} / ${session.id.slice(0, 8)}... / updated: ${toLocalTime(session.updatedAt)}`;
  replySendBtn.disabled = session.closed;
  toggleCloseBtn.disabled = false;
  toggleCloseBtn.textContent = session.closed ? 'Reopen Session' : 'Close Session';
  toggleCloseBtn.dataset.closed = session.closed ? 'true' : 'false';
}

function appendMessages(messages) {
  for (const message of messages) {
    const row = document.createElement('div');
    const senderClass = message.sender === 'agent' ? 'agent' : 'visitor';
    row.className = `msg-row ${senderClass}`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = message.text;

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = toLocalTime(message.at);

    row.appendChild(bubble);
    row.appendChild(time);
    chatLogEl.appendChild(row);
    state.lastMessageId = Math.max(state.lastMessageId, message.id || 0);
  }

  if (messages.length > 0) {
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }
}

function resetChatLog() {
  chatLogEl.innerHTML = '';
  state.lastMessageId = 0;
}

async function refreshSessions() {
  const payload = await api('/api/admin/sessions');
  state.sessions = payload.sessions || [];
  renderSessions();
  renderMeta();
}

async function refreshMessages() {
  if (!state.activeSessionId) return;
  const params = new URLSearchParams({
    sessionId: state.activeSessionId,
    after: String(state.lastMessageId),
  });
  const payload = await api(`/api/admin/messages?${params.toString()}`);
  appendMessages(payload.messages || []);
}

function startTimers() {
  if (!state.sessionsTimer) {
    state.sessionsTimer = setInterval(() => {
      refreshSessions().catch((err) => {
        console.error('refreshSessions failed:', err);
      });
    }, SESSIONS_INTERVAL_MS);
  }

  if (!state.messagesTimer) {
    state.messagesTimer = setInterval(() => {
      refreshMessages().catch((err) => {
        console.error('refreshMessages failed:', err);
      });
    }, MESSAGES_INTERVAL_MS);
  }
}

function bindSessionClick() {
  sessionListEl.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest('.session-item');
    if (!item) return;

    const sessionId = item.getAttribute('data-session-id') || '';
    if (!sessionId || sessionId === state.activeSessionId) return;

    state.activeSessionId = sessionId;
    resetChatLog();
    renderSessions();
    renderMeta();
    await refreshMessages();
  });
}

saveTokenBtn.addEventListener('click', async () => {
  state.token = tokenInput.value.trim();
  localStorage.setItem(TOKEN_KEY, state.token);
  await refreshSessions();
});

refreshBtn.addEventListener('click', async () => {
  await refreshSessions();
  await refreshMessages();
});

replyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.activeSessionId) return;
  const text = replyInput.value.trim();
  if (!text) return;

  replySendBtn.disabled = true;
  try {
    const payload = await api('/api/admin/message', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: state.activeSessionId,
        text,
      }),
    });
    replyInput.value = '';
    appendMessages(payload.message ? [payload.message] : []);
    await refreshSessions();
  } catch (err) {
    console.error('send reply failed:', err);
    alert(`返信に失敗しました: ${err instanceof Error ? err.message : 'unknown'}`);
  } finally {
    const session = getActiveSession();
    replySendBtn.disabled = Boolean(session?.closed);
  }
});

toggleCloseBtn.addEventListener('click', async () => {
  const session = getActiveSession();
  if (!session) return;
  try {
    await api('/api/admin/session/close', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: session.id,
        closed: !session.closed,
      }),
    });
    await refreshSessions();
  } catch (err) {
    console.error('toggle close failed:', err);
    alert(`更新に失敗しました: ${err instanceof Error ? err.message : 'unknown'}`);
  }
});

bindSessionClick();

(async () => {
  try {
    await refreshSessions();
    startTimers();
  } catch (err) {
    console.error('admin init failed:', err);
    alert(`初期化に失敗しました: ${err instanceof Error ? err.message : 'unknown'}`);
  }
})();
