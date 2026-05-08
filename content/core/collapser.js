(function (root) {
  var WRAP_CLS = 'acsb-collapsed';

  function computeSplit(state) {
    var n = state.messageCount;
    var t = state.threshold;
    if (typeof n !== 'number' || n <= 0) return { collapseCount: 0, keepCount: 0 };
    if (t == null) return { collapseCount: 0, keepCount: n };
    if (n <= t) return { collapseCount: 0, keepCount: n };
    return { collapseCount: n - t, keepCount: t };
  }

  function unwrapAll(container) {
    if (!container) return 0;
    var wrappers = container.querySelectorAll('details.' + WRAP_CLS);
    var count = 0;
    for (var i = 0; i < wrappers.length; i++) {
      var w = wrappers[i];
      var summary = w.querySelector('summary');
      while (w.firstChild) {
        if (w.firstChild === summary) { w.removeChild(summary); continue; }
        w.parentNode.insertBefore(w.firstChild, w);
      }
      w.parentNode.removeChild(w);
      count++;
    }
    return count;
  }

  function applySplit(container, messages, threshold) {
    if (!container) return { collapseCount: 0, keepCount: 0 };
    unwrapAll(container);
    var split = computeSplit({ messageCount: messages.length, threshold: threshold });
    if (split.collapseCount === 0) return split;

    var doc = container.ownerDocument || document;
    var wrap = doc.createElement('details');
    wrap.className = WRAP_CLS;
    var summary = doc.createElement('summary');
    summary.textContent = 'Show ' + split.collapseCount + ' older messages';
    wrap.appendChild(summary);

    var first = messages[0];
    if (!first || !first.parentNode) return split;
    first.parentNode.insertBefore(wrap, first);
    for (var i = 0; i < split.collapseCount; i++) {
      wrap.appendChild(messages[i]);
    }
    return split;
  }

  function countCollapsed(container) {
    if (!container) return 0;
    var wrappers = container.querySelectorAll('details.' + WRAP_CLS);
    var total = 0;
    for (var i = 0; i < wrappers.length; i++) {
      total += wrappers[i].children.length - 1; // minus the summary
    }
    return total;
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.collapser = {
    WRAP_CLASS: WRAP_CLS,
    computeSplit: computeSplit,
    applySplit: applySplit,
    unwrapAll: unwrapAll,
    countCollapsed: countCollapsed
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
