/**
 * Thin websocket wrapper: JSON messages, a tiny event emitter, and automatic
 * reconnection that re-joins the same room with the same name.
 */
export function createNet() {
  const handlers = new Map();
  let ws = null;
  let lastJoin = null;
  let attempts = 0;
  let closedByUs = false;
  let reconnectTimer = null;

  function emit(type, payload) {
    for (const fn of handlers.get(type) || []) fn(payload);
  }

  function open() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);

    ws.addEventListener('open', () => {
      const wasRetrying = attempts > 0;
      attempts = 0;
      if (lastJoin) {
        if (wasRetrying) emit('rejoining');
        ws.send(JSON.stringify({ t: 'join', ...lastJoin }));
      }
      emit('open', { wasRetrying });
    });

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg && typeof msg.t === 'string') emit(msg.t, msg);
    });

    ws.addEventListener('close', () => {
      emit('closed');
      if (closedByUs || !lastJoin) return;
      attempts += 1;
      const delay = Math.min(1000 * 2 ** (attempts - 1), 15000);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(open, delay);
    });

    ws.addEventListener('error', () => {
      /* 'close' always follows, which is where reconnection happens. */
    });
  }

  return {
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(fn);
    },
    join(payload) {
      lastJoin = payload;
      closedByUs = false;
      if (!ws || ws.readyState > WebSocket.OPEN) open();
      else if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'join', ...payload }));
    },
    send(payload) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    },
    close() {
      closedByUs = true;
      lastJoin = null;
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
    connect: open,
  };
}
