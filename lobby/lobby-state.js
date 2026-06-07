// Lobby-specific persistent state — stores sent messages so the sender
// always sees their own messages, independent of Firebase or sim timing.

const LOBBY_MSGS_KEY = 'lobbyMsgs';
const MAX_LOCAL_MESSAGES = 150;
const LOCAL_MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes — keeps chat fresh on reconnect

let lobbyMsgs = [];

export async function initLobbyMsgs() {
  try {
    const raw = await window.miniappsAI.storage.getItem(LOBBY_MSGS_KEY);
    lobbyMsgs = raw ? JSON.parse(raw) : [];
    cleanupOldLobbyMsgs(); // Always purge stale messages on load
  } catch {
    lobbyMsgs = [];
  }
}

export function getLobbyMsgs() {
  return lobbyMsgs;
}

export function addLobbyMsg(msg) {
  lobbyMsgs.push(msg);
  if (lobbyMsgs.length > MAX_LOCAL_MESSAGES) {
    lobbyMsgs = lobbyMsgs.slice(-MAX_LOCAL_MESSAGES);
  }
  saveLobbyMsgs();
}

function saveLobbyMsgs() {
  window.miniappsAI.storage.setItem(LOBBY_MSGS_KEY, JSON.stringify(lobbyMsgs)).catch(() => {});
}

export function cleanupOldLobbyMsgs() {
  const now = Date.now();
  const before = lobbyMsgs.length;
  lobbyMsgs = lobbyMsgs.filter(m => (now - (m.time || 0)) < LOCAL_MESSAGE_TTL);
  if (lobbyMsgs.length !== before) saveLobbyMsgs();
}

export function clearLobbyMsgs() {
  lobbyMsgs = [];
  window.miniappsAI.storage.removeItem(LOBBY_MSGS_KEY).catch(() => {});
}
