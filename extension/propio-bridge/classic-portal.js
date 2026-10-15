(() => {
  'use strict';
  if (window.top !== window || location.origin !== 'https://interpreters.propio-ls.com' || !/^\/portal(?:\/|$)/.test(location.pathname)) return;
  const marker = Symbol.for('pst.original-portal-layout');
  if (window[marker]) return;
  const flag = 'enable-analytics-block-AT-415-interpreter-portal';
  const parse = JSON.parse;
  let enabled = false;
  const own = (object, key) => object && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key);
  function originalLayout(entry) {
    if (!entry || typeof entry !== 'object' || !own(entry, 'value') || typeof entry.value !== 'boolean' ||
        !Number.isInteger(entry.version) || !Number.isInteger(entry.variation)) return;
    const descriptor = Object.getOwnPropertyDescriptor(entry, 'value');
    if (!descriptor?.writable || own(entry, 'toJSON')) return;
    let original = descriptor.value;
    Object.defineProperty(entry, 'value', { enumerable: true, configurable: true,
      get: () => enabled && typeof original === 'boolean' ? false : original,
      set: value => { original = value; } });
    // Serialized flag objects retain the vendor's actual value for native caches.
    Object.defineProperty(entry, 'toJSON', { configurable: true,
      value: () => ({ ...entry, value: original }) });
  }
  // Only the vendor's UI flag is overridden; other flags and portal responses stay intact.
  function restore(value) {
    if (own(value, flag)) originalLayout(value[flag]);
    if (value?.path === '/flags/' && own(value.data, flag)) originalLayout(value.data[flag]);
    if (value?.path === '/flags/' + flag) originalLayout(value.data);
    return value;
  }
  JSON.parse = function (text, reviver) {
    const result = Reflect.apply(parse, this, arguments);
    if (typeof reviver === 'function') return result;
    try { return restore(result); } catch { return result; }
  };
  Object.defineProperty(window, marker, { value: true });
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.protocol !== 'pst-original-portal-layout/v1' ||
        typeof event.data.enabled !== 'boolean') return;
    enabled = event.data.enabled;
  });
})();
