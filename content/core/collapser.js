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

  function summaryText(n) { return 'Show ' + n + ' older messages'; }

  function applySplit(container, messages, threshold) {
    if (!container) return { collapseCount: 0, keepCount: 0 };
    var split = computeSplit({ messageCount: messages.length, threshold: threshold });
    var desired = split.collapseCount;
    var existing = container.querySelector('details.' + WRAP_CLS);

    if (desired === 0) {
      if (existing) unwrapAll(container);
      return split;
    }

    var doc = container.ownerDocument || document;

    if (!existing) {
      var first = messages[0];
      if (!first || !first.parentNode) return split;
      var wrap = doc.createElement('details');
      wrap.className = WRAP_CLS;
      var s = doc.createElement('summary');
      s.textContent = summaryText(desired);
      wrap.appendChild(s);
      first.parentNode.insertBefore(wrap, first);
      for (var i = 0; i < desired; i++) wrap.appendChild(messages[i]);
      return split;
    }

    var existingCount = existing.children.length - 1; // minus the summary
    if (desired > existingCount) {
      for (var j = existingCount; j < desired; j++) {
        if (messages[j] && messages[j].parentNode !== existing) existing.appendChild(messages[j]);
      }
    } else if (desired < existingCount) {
      // shrink (rare — threshold raised). full re-wrap is simpler.
      unwrapAll(container);
      return applySplit(container, messages, threshold);
    }
    var sum = existing.querySelector('summary');
    var wantedText = summaryText(desired);
    if (sum && sum.textContent !== wantedText) sum.textContent = wantedText;
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
