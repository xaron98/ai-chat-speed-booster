(function (root) {
  var CLS = 'acsb-msg';

  function virtualize(messages) {
    if (!messages) return 0;
    var added = 0;
    for (var i = 0; i < messages.length; i++) {
      var el = messages[i];
      if (el && el.classList && !el.classList.contains(CLS)) {
        el.classList.add(CLS);
        added++;
      }
    }
    return added;
  }

  function devirtualizeAll(rootEl) {
    var doc = rootEl || (typeof document !== 'undefined' ? document : null);
    if (!doc) return 0;
    var els = doc.querySelectorAll('.' + CLS);
    for (var i = 0; i < els.length; i++) els[i].classList.remove(CLS);
    return els.length;
  }

  function countVirtualized(rootEl) {
    var doc = rootEl || (typeof document !== 'undefined' ? document : null);
    if (!doc) return 0;
    return doc.querySelectorAll('.' + CLS).length;
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.optimizer = {
    CLASS: CLS,
    virtualize: virtualize,
    devirtualizeAll: devirtualizeAll,
    countVirtualized: countVirtualized
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
