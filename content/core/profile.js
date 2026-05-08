(function (root) {
  function readImg(selector) {
    if (!selector || typeof document === 'undefined') return null;
    var img = document.querySelector(selector);
    if (!img || !img.src) return null;
    return { url: img.src, alt: img.alt || '' };
  }

  function readText(selector) {
    if (!selector || typeof document === 'undefined') return null;
    var el = document.querySelector(selector);
    if (!el) return null;
    var t = (el.textContent || '').trim();
    return t || null;
  }

  function extract(adapter) {
    if (!adapter) return null;
    var img = readImg(adapter.avatarSelector);
    var name = readText(adapter.nameSelector) || (img && img.alt) || null;
    if (!img && !name) return null;
    return {
      avatarUrl: img ? img.url : null,
      displayName: name
    };
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.profile = { extract: extract };
})(typeof globalThis !== 'undefined' ? globalThis : this);
