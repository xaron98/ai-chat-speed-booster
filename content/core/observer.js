(function (root) {
  function debounce(fn, ms) {
    var t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn(); }, ms);
    };
  }

  function watch(targetEl, onChange) {
    if (!targetEl || typeof MutationObserver === 'undefined') {
      return { disconnect: function () {} };
    }
    var trigger = debounce(onChange, 100);
    var mo = new MutationObserver(function () { trigger(); });
    mo.observe(targetEl, { childList: true, subtree: true });
    return { disconnect: function () { mo.disconnect(); } };
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.observer = { watch: watch, _debounce: debounce };
})(typeof globalThis !== 'undefined' ? globalThis : this);
