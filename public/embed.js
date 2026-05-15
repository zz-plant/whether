/**
 * Whether embed script — renders a live weekly brief block on any page.
 *
 * Usage:
 *   <div data-whether-embed="brief" data-whether-ticker="GOOGL" data-whether-stage="growth"></div>
 *   <script async src="https://whether.app/embed.js"></script>
 *
 * The script finds all [data-whether-embed] elements, fetches the brief from the API,
 * and replaces each element with the rendered HTML.
 */
(function () {
  'use strict';

  var EMBED_API_BASE = 'https://whether.app/api/embed';
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
    var format = 'html';

    var url = EMBED_API_BASE + '?format=' + format + '&ref=' + encodeURIComponent(ref);
    if (ticker) url += '&ticker=' + encodeURIComponent(ticker);
    if (stage) url += '&stage=' + encodeURIComponent(stage);

    // Set a minimum height to prevent layout shift
    if (!el.style.minHeight) {
      el.style.minHeight = '120px';
    }

    // Show a loading state
    el.innerHTML = '<div style="padding:12px;font-size:12px;color:#64748b;font-family:-apple-system,sans-serif;">Loading weekly brief...</div>';

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
        el.innerHTML = '<div style="padding:12px;font-size:12px;color:#94a3b8;font-family:-apple-system,sans-serif;border:1px solid #e2e8f0;border-radius:8px;">Macro brief unavailable. <a href="https://whether.app" style="color:#0284c7;text-decoration:underline;">Get your own →</a></div>';
        console.warn('[Whether embed]', err.message);
      });
  });
})();