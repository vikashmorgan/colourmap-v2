/*
 * Claude runtime shim for the Labs prototypes.
 *
 * The prototypes were first built as claude.ai pages, where `window.claude.use(name)`
 * hands them a shared database, dictation, Claude sampling and connectors. Inside
 * Colour Brain they get a small stand-in: `db` keeps documents on this device
 * (localStorage), and every other capability resolves to null so each page falls
 * back to its own offline behaviour.
 */
(() => {
  if (window.claude) return;

  const PREFIX = 'labs-db:';
  const page = location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  const keyFor = (path) => `${PREFIX}${page}:${path}`;

  function read(path) {
    try {
      const raw = localStorage.getItem(keyFor(path));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function snapshot(path) {
    const value = read(path);
    return { exists: value !== null, data: () => value };
  }

  function doc(path) {
    const listeners = new Set();
    const emit = () => {
      const snap = snapshot(path);
      for (const listener of listeners) listener(snap);
    };
    return {
      get: async () => snapshot(path),
      set: async (value) => {
        localStorage.setItem(keyFor(path), JSON.stringify(value));
        emit();
      },
      update: async (patch) => {
        localStorage.setItem(keyFor(path), JSON.stringify({ ...(read(path) || {}), ...patch }));
        emit();
      },
      onSnapshot: (listener) => {
        listeners.add(listener);
        listener(snapshot(path));
        return () => listeners.delete(listener);
      },
    };
  }

  window.claude = {
    labs: true,
    use: async (name) => (name === 'db' ? { doc } : null),
  };
})();
