// Patch window.fetch to support setters if the environment has a read-only fetch getter.
// This must stand as its own side-effect import and be imported first in the entry point.
try {
  const originalFetch = window.fetch;
  let customFetch = originalFetch;
  Object.defineProperty(window, 'fetch', {
    get() {
      return customFetch;
    },
    set(val) {
      customFetch = val;
    },
    configurable: true,
    enumerable: true,
  });
} catch (e) {
  console.warn("Could not patch window.fetch setter: ", e);
}
