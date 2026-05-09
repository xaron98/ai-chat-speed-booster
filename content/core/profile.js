(function (root) {
  function readText(selector) {
    if (!selector || typeof document === 'undefined') return null;
    var el = document.querySelector(selector);
    if (!el) return null;
    var t = (el.textContent || '').trim();
    return t || null;
  }

  var GENERIC_ALTS = /^(profile image|profile|avatar|user|user avatar|account)$/i;

  function readImgAlt(selector) {
    if (!selector || typeof document === 'undefined') return null;
    var img = document.querySelector(selector);
    if (!img) return null;
    var alt = (img.alt || '').trim();
    if (!alt || GENERIC_ALTS.test(alt)) return null;
    return alt;
  }

  function extract(adapter) {
    if (!adapter) return null;
    var name = readText(adapter.nameSelector) || readImgAlt(adapter.avatarSelector);
    if (!name) return null;
    return { displayName: name };
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.profile = { extract: extract };
})(typeof globalThis !== 'undefined' ? globalThis : this);
