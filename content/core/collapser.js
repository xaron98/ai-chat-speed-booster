(function (root) {
  function computeSplit(state) {
    var n = state.messageCount;
    var t = state.threshold;
    if (typeof n !== 'number' || n <= 0) return { collapseCount: 0, keepCount: 0 };
    if (t == null) return { collapseCount: 0, keepCount: n };
    if (n <= t) return { collapseCount: 0, keepCount: n };
    return { collapseCount: n - t, keepCount: t };
  }

  // DOM glue is added in Task 9 below applySplit / unwrapAll.

  root.ACSB = root.ACSB || {};
  root.ACSB.collapser = {
    computeSplit: computeSplit
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
