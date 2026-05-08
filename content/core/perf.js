(function (root) {
  var STEPS = [30, 50, 100, 200];

  function clampIndex(i) {
    if (i < 0) return 0;
    if (i > STEPS.length - 1) return STEPS.length - 1;
    return i;
  }

  function decideThreshold(state) {
    var jank = state.jankRatio;
    var current = state.currentThreshold;
    var sustained = state.sustainedLowJankSeconds || 0;
    var idx = STEPS.indexOf(current);
    if (idx < 0) idx = 1; // unknown → assume 50

    if (jank > 0.25) {
      return STEPS[clampIndex(idx - 1)];
    }
    if (jank < 0.05 && sustained >= 30) {
      return STEPS[clampIndex(idx + 1)];
    }
    return STEPS[idx];
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.perf = {
    STEPS: STEPS,
    decideThreshold: decideThreshold
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
