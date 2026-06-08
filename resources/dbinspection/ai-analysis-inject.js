(function() {
  if (window.__aiAnalysisInjected) return;
  window.__aiAnalysisInjected = true;

  // --- Styles ---
  var style = document.createElement('style');
  style.textContent = [
    '.ai-analyze-btn {',
    '  font-size: 12px; padding: 3px 10px;',
    '  border: 1px solid #3b82f6; border-radius: 4px;',
    '  background: #eff6ff; color: #3b82f6; cursor: pointer;',
    '  transition: all 0.2s; white-space: nowrap;',
    '  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;',
    '}',
    '.ai-analyze-btn:hover { background: #dbeafe; }',
    '.ai-analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }',
    '.ai-analyze-btn.loading { background: #fef3c7; border-color: #f59e0b; color: #92400e; }',
    '.ai-analyze-btn.done { background: #d1fae5; border-color: #10b981; color: #065f46; }',
    '.ai-analyze-btn.error { background: #fee2e2; border-color: #ef4444; color: #991b1b; }',
    '.ai-analyze-wrapper { float: right; position: relative; }',
    // Tooltip appended to body to avoid parent overflow:hidden clipping
    '.ai-tooltip {',
    '  display: none; position: fixed; z-index: 99999;',
    '  background: white; border: 1px solid #e5e7eb;',
    '  border-radius: 8px; padding: 14px 18px; min-width: 320px; max-width: 520px;',
    '  max-height: 400px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.15);',
    '  font-size: 13px; line-height: 1.8; white-space: pre-wrap;',
    '  color: #1f2937; text-align: left; font-weight: normal;',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // --- State ---
  var buttons = {};   // sectionId -> button element
  var tooltips = {};  // sectionId -> tooltip element
  var injected = {};  // sectionId -> true (already injected)

  // --- Listen for AI results from parent ---
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'ai-section-result') return;
    var sectionId = e.data.sectionId;
    var btn = buttons[sectionId];
    var tip = tooltips[sectionId];
    if (!btn) return;

    if (e.data.error) {
      btn.textContent = '\u5206\u6790\u5931\u8d25';
      btn.className = 'ai-analyze-btn error';
      btn.disabled = false;
      btn.title = e.data.error;
      return;
    }

    btn.textContent = '\u5206\u6790\u5b8c\u6210\uff0c\u70b9\u51fb\u67e5\u770b';
    btn.className = 'ai-analyze-btn done';
    btn.disabled = false;
    tip.textContent = e.data.content;

    // Position tooltip near button on show
    btn.addEventListener('mouseenter', function() {
      var rect = btn.getBoundingClientRect();
      tip.style.left = Math.min(rect.left, window.innerWidth - 540) + 'px';
      tip.style.top = (rect.bottom + 6) + 'px';
      tip.style.display = 'block';
    });
    btn.addEventListener('mouseleave', function() {
      setTimeout(function() {
        if (!tip.matches(':hover')) tip.style.display = 'none';
      }, 100);
    });
    tip.addEventListener('mouseenter', function() { tip.style.display = 'block'; });
    tip.addEventListener('mouseleave', function() { tip.style.display = 'none'; });
  });

  // --- Inject AI button into an h3 ---
  function injectButton(h3) {
    var sectionId = h3.getAttribute('data-ai-section-id');
    if (!sectionId || injected[sectionId]) return;
    injected[sectionId] = true;

    // Find all result indices within this section
    var parentSection = h3.closest('.content-section');
    if (!parentSection) return;
    var resultDivs = parentSection.querySelectorAll('.result-section');
    var indices = [];
    for (var i = 0; i < resultDivs.length; i++) {
      var idx = parseInt(resultDivs[i].getAttribute('data-result-index') || '-1', 10);
      if (idx >= 0) indices.push(idx);
    }
    if (indices.length === 0) return;

    var wrapper = document.createElement('span');
    wrapper.className = 'ai-analyze-wrapper';

    var btn = document.createElement('button');
    btn.textContent = 'AI\u5206\u6790';
    btn.className = 'ai-analyze-btn';
    btn.title = '\u70b9\u51fb\u4f7f\u7528AI\u5206\u6790\u8be5\u5de1\u68c0\u70b9';

    // Tooltip goes to body to avoid overflow:hidden clipping
    var tip = document.createElement('div');
    tip.className = 'ai-tooltip';
    document.body.appendChild(tip);

    btn.addEventListener('click', function() {
      if (btn.disabled) return;
      btn.textContent = '\u5206\u6790\u4e2d...';
      btn.disabled = true;
      btn.className = 'ai-analyze-btn loading';
      window.parent.postMessage({
        type: 'ai-analyze-section',
        sectionId: sectionId,
        sectionTitle: h3.textContent.replace(/AI\u5206\u6790|\u5206\u6790\u5b8c\u6210.*/g, '').trim(),
        indices: indices
      }, '*');
    });

    buttons[sectionId] = btn;
    tooltips[sectionId] = tip;
    wrapper.appendChild(btn);
    h3.appendChild(wrapper);
  }

  // --- Lazy injection via IntersectionObserver ---
  function setupObserver() {
    if (!window.IntersectionObserver) {
      // Fallback: inject all at once
      var allH3 = document.querySelectorAll('h3');
      for (var i = 0; i < allH3.length; i++) injectButton(allH3[i]);
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          injectButton(entries[i].target);
          observer.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '200px' });

    var allH3 = document.querySelectorAll('h3');
    for (var i = 0; i < allH3.length; i++) {
      observer.observe(allH3[i]);
    }
  }

  // --- Assign section IDs to h3 elements ---
  function assignSectionIds() {
    var allH3 = document.querySelectorAll('h3');
    for (var i = 0; i < allH3.length; i++) {
      var h3 = allH3[i];
      if (h3.hasAttribute('data-ai-section-id')) continue;
      h3.setAttribute('data-ai-section-id', 'ai-section-' + i);
    }
  }

  // --- Start ---
  function init() {
    assignSectionIds();
    setupObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      requestAnimationFrame(init);
    });
  } else {
    requestAnimationFrame(init);
  }
})();