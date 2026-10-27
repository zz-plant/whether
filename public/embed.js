/**
 * Whether embed script — renders a live weekly brief block on any page.
 *
 * Usage:
 *   <div data-whether-embed="brief" data-whether-ticker="GOOGL" data-whether-stage="growth"></div>
 *   <script async src="https://whether.work/embed.js"></script>
 *
 * The script finds all [data-whether-embed] elements, fetches the brief from the API,
 * and replaces each element with the rendered HTML.
 */
(function () {
  'use strict';

  /*
   * The API is wherever this script was served from.
   *
   * A hardcoded origin meant every copy of this file talked to production —
   * including the one the preview lane serves, so an embed change could not be
   * checked anywhere before it shipped. `document.currentScript` is set while a
   * classic script runs, `async` included, and reading it at top level is the
   * one moment it is available. Production is the fallback, so a browser that
   * does not give us the tag behaves exactly as before.
   */
  var PRODUCTION_ORIGIN = 'https://whether.work';
  var origin = PRODUCTION_ORIGIN;
  try {
    var scriptTag = document.currentScript;
    if (scriptTag && scriptTag.src) origin = new URL(scriptTag.src, document.baseURI).origin;
  } catch {
    origin = PRODUCTION_ORIGIN;
  }

  var EMBED_API_BASE = origin + '/api/embed';
  var ATTR_EMBED = 'data-whether-embed';
  var ATTR_TICKER = 'data-whether-ticker';
  var ATTR_STAGE = 'data-whether-stage';
  var ATTR_REF = 'data-whether-ref';

  var elements = document.querySelectorAll('[' + ATTR_EMBED + ']');

  if (elements.length === 0) return;

  elements.forEach(function (el) {
    var ticker = el.getAttribute(ATTR_TICKER) || '';
    var stage = el.getAttribute(ATTR_STAGE) || '';
    var ref = el.getAttribute(ATTR_REF) || 'embed-js';
    var embedType = el.getAttribute(ATTR_EMBED) || 'brief';
    var isCallStrip = embedType === 'call-strip';
    var format = 'html';

    var url = EMBED_API_BASE + '?format=' + format + '&ref=' + encodeURIComponent(ref);
    if (ticker) url += '&ticker=' + encodeURIComponent(ticker);
    if (stage) url += '&stage=' + encodeURIComponent(stage);
    if (embedType) url += '&mode=' + encodeURIComponent(embedType);

    // Set a minimum height to prevent layout shift
    if (!el.style.minHeight) {
      el.style.minHeight = isCallStrip ? '38px' : '120px';
    }

    // Show a loading state
    el.innerHTML = isCallStrip
      ? '<div style="padding:8px 12px;font-size:12px;color:rgba(237,240,238,0.6);font-family:-apple-system,sans-serif;">Loading call strip…</div>'
      : '<div style="padding:12px;font-size:12px;color:rgba(237,240,238,0.6);font-family:-apple-system,sans-serif;">Loading weekly brief…</div>';

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Embed fetch failed: ' + res.status);
        return res.text();
      })
      .then(function (html) {
        // Create a container, inject HTML, then replace the placeholder element
        var container = document.createElement('div');
        container.innerHTML = html;
        // Preserve the wrapper and swap contents
        el.innerHTML = '';
        while (container.firstChild) {
          el.appendChild(container.firstChild);
        }
        el.style.minHeight = '';
      })
      .catch(function (err) {
        el.innerHTML = '<div style="padding:12px;font-size:12px;color:rgba(237,240,238,0.7);font-family:-apple-system,sans-serif;border:1px solid rgba(237,240,238,0.10);border-radius:8px;background:#0f1316;">Brief unavailable. <a href="' + origin + '" style="color:#edf0ee;text-decoration:underline;">View on Whether →</a></div>';
        console.warn('[Whether embed]', err.message);
      });
  });
})();