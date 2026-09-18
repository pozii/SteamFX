// Talks to Steam's embedded browser over the Chrome DevTools Protocol.
//
// Every couple of seconds it asks the debugging port for the list of open
// pages, and for each store page it (1) registers the script to run on every
// new document, so later navigations inside the client stay converted, and
// (2) runs it once in the page that is already loaded.
//
// Plain Node module (no Electron imports) so it can be tested on its own.
const { EventEmitter } = require('events');

const DEFAULT_PORT = 8080;
const POLL_MS = 2000;
const COMMAND_TIMEOUT_MS = 5000;

const isStoreUrl = (url) => /^https:\/\/store\.steampowered\.com\//.test(url || '');

class Session {
  constructor(target, ws) {
    this.target = target;
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.scriptId = null;

    this.onEvent = () => {};

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.id) {
        this.onEvent(msg.method);
        return;
      }
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      clearTimeout(waiter.timer);
      if (msg.error) waiter.reject(new Error(msg.error.message));
      else waiter.resolve(msg.result);
    });

    ws.addEventListener('close', () => {
      for (const waiter of this.pending.values()) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error('connection closed'));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, COMMAND_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async apply(source) {
    if (this.scriptId) {
      await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.scriptId }).catch(() => {});
      this.scriptId = null;
    }
    const added = await this.send('Page.addScriptToEvaluateOnNewDocument', { source });
    this.scriptId = added.identifier;
    await this.send('Runtime.evaluate', { expression: source });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // already closed
    }
  }
}

class Injector extends EventEmitter {
  // getSource() returns the script to inject for the current settings.
  constructor({ getSource, port = DEFAULT_PORT, pollMs = POLL_MS, log = () => {} }) {
    super();
    this.getSource = getSource;
    this.port = port;
    this.pollMs = pollMs;
    this.log = log;
    this.sessions = new Map();
    this.attaching = new Set();
    this.seenTargets = new Set();
    this.timer = null;
    this.reachable = false;
    this.polling = false;
  }

  get status() {
    return { reachable: this.reachable, pages: this.sessions.size };
  }

  start() {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), this.pollMs);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    for (const session of this.sessions.values()) session.close();
    this.sessions.clear();
    this.setReachable(false);
  }

  // Settings changed: push the new script into every connected page.
  async refresh() {
    const source = this.getSource();
    await Promise.all(
      [...this.sessions.values()].map((s) =>
        s.apply(source).catch((err) => this.log('refresh failed:', err.message))
      )
    );
  }

  setReachable(value) {
    if (this.reachable === value) return;
    this.reachable = value;
    this.emit('status', this.status);
  }

  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      let targets;
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`, { signal: AbortSignal.timeout(1500) });
        targets = await res.json();
      } catch {
        for (const session of this.sessions.values()) session.close();
        this.sessions.clear();
        this.setReachable(false);
        return;
      }

      this.setReachable(true);

      const live = new Set();
      for (const target of targets) {
        this.logTargetOnce(target);
        if (target.type !== 'page' || !target.webSocketDebuggerUrl) continue;
        live.add(target.id);
        if (!this.sessions.has(target.id) && !this.attaching.has(target.id) && isStoreUrl(target.url)) {
          await this.attach(target);
        }
      }

      let changed = false;
      for (const [id, session] of this.sessions) {
        if (!live.has(id) || session.ws.readyState > 1) {
          session.close();
          this.sessions.delete(id);
          changed = true;
        }
      }
      if (changed) this.emit('status', this.status);
    } finally {
      this.polling = false;
    }
  }

  // What Steam exposes on its debugging port differs between client versions,
  // so the log records each target once (without query strings) to make
  // "it isn't converting" reports easy to diagnose.
  logTargetOnce(target) {
    if (this.seenTargets.has(target.id) || this.seenTargets.size >= 200) return;
    this.seenTargets.add(target.id);
    this.log('target:', target.type, String(target.url || '').split(/[?#]/)[0]);
  }

  async ensureInjected(session) {
    try {
      const res = await session.send('Runtime.evaluate', { expression: '!!window.__steamFx', returnByValue: true });
      if (res.result && res.result.value === false) {
        await session.send('Runtime.evaluate', { expression: this.getSource() });
      }
    } catch (err) {
      this.log('ensureInjected failed:', err.message);
    }
  }

  async attach(target) {
    this.attaching.add(target.id);
    try {
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', () => reject(new Error('websocket error')), { once: true });
      });

      const session = new Session(target, ws);

      // If we connected while a page was still loading, the "run on every new
      // document" script can miss it. Check again once the page has loaded.
      session.onEvent = (method) => {
        if (method === 'Page.domContentEventFired' || method === 'Page.loadEventFired') {
          this.ensureInjected(session);
        }
      };
      await session.send('Page.enable');
      await session.apply(this.getSource());
      this.sessions.set(target.id, session);
      this.log('attached to', target.url);
      this.emit('status', this.status);
    } catch (err) {
      this.log('attach failed:', target.url, err.message);
    } finally {
      this.attaching.delete(target.id);
    }
  }
}

module.exports = { Injector, isStoreUrl, DEFAULT_PORT };
