(function (root) {
  function roleLabel(role) {
    if (role === 'user') return 'User';
    if (role === 'assistant') return 'Assistant';
    return 'Message';
  }

  function header(meta) {
    var who = meta.host || '';
    var when = new Date().toISOString();
    return '# ' + (meta.title || 'Conversation') + '\n\n' +
           '*Exported from ' + who + ' on ' + when + '*\n\n';
  }

  function toMarkdown(messages, meta) {
    var body = messages.map(function (m) {
      return '## ' + roleLabel(m.role) + '\n\n' + (m.text || '') + '\n';
    }).join('\n');
    return header(meta) + body;
  }

  function toJSON(messages, meta) {
    var doc = {
      host: meta.host || null,
      title: meta.title || null,
      exportedAt: new Date().toISOString(),
      messages: messages
    };
    return JSON.stringify(doc, null, 2);
  }

  function toText(messages) {
    return messages.map(function (m) {
      return '[' + (m.role || 'message').toUpperCase() + ']\n' + (m.text || '');
    }).join('\n---\n\n');
  }

  function serialize(messages, format, meta) {
    meta = meta || {};
    if (format === 'json') return { body: toJSON(messages, meta), mime: 'application/json', ext: 'json' };
    if (format === 'txt')  return { body: toText(messages), mime: 'text/plain', ext: 'txt' };
    return { body: toMarkdown(messages, meta), mime: 'text/markdown', ext: 'md' };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function buildFilename(opts, dateOverride) {
    var d = dateOverride || new Date();
    var slug = (opts.host || 'chat').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    var stamp = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
                '-' + pad(d.getUTCHours()) + pad(d.getUTCMinutes());
    return slug + '-' + stamp + '.' + (opts.ext || 'md');
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.exporter = {
    serialize: serialize,
    buildFilename: buildFilename
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
