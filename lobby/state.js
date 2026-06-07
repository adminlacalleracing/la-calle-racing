// Lobby state — in-memory state synced from Firebase + local simulation
let state = {
  currentPlayer: null,
  players: [],
  messages: [],
  challenges: [],
  connected: false,
  loading: true,
  error: null,
  // Firebase-specific state (merged in lobby/view.js)
  _fbPlayers: [],
  _fbMessages: [],
  _fbChallenges: [],
};

export function getState() { return state; }
export function setState(partial) { state = { ...state, ...partial }; }
export function getCurrentPlayer() { return state.currentPlayer; }
export function setCurrentPlayer(p) { state.currentPlayer = p; }
export function getPlayers() { return state.players; }
export function setPlayers(players) { state.players = players; }
export function getMessages() { return state.messages; }
export function setMessages(messages) { state.messages = messages; }
export function getChallenges() { return state.challenges; }
export function setChallenges(challenges) { state.challenges = challenges; }
export function setConnected(v) { state.connected = v; }
export function setLoading(v) { state.loading = v; }
export function setError(v) { state.error = v; }
