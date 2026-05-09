(function (root) {
  function debounce(fn, ms) {
    var t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn(); }, ms);
    };
  }

  function watch(targetEl, onChange, opts) {
    if (!targetEl || typeof MutationObserver === 'undefined') {
      return { disconnect: function () {} };
    }
    opts = opts || {};
    var debounceMs = typeof opts.debounceMs === 'number' ? opts.debounceMs : 400;
    var subtree = opts.subtree === true;
    var trigger = debounce(onChange, debounceMs);
    var mo = new MutationObserver(function () { trigger(); });
    mo.observe(targetEl, { childList: true, subtree: subtree });
    return { disconnect: function () { mo.disconnect(); } };
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.observer = { watch: watch, _debounce: debounce };
})(typeof globalThis !== 'undefined' ? globalThis : this);
