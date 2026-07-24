/**
 * Report Lazy Render — progressively render inspection report sections
 * using IntersectionObserver for scroll-based lazy loading and pre-rendering.
 *
 * Strategy:
 *  1. On load: immediately render visible sections (first 1-2 sections)
 *  2. Pre-render: render next 3 sections in the background via requestIdleCallback
 *  3. On scroll: render newly visible sections using IntersectionObserver
 *  4. Each section is rendered as a standalone DOM fragment, then inserted
 */

(function () {
  'use strict';

  // ── Parse embedded data (Base64-encoded JSON) ────────────────────
  const dataScript = document.getElementById('report-data');
  if (!dataScript) return;

  let resultData = [];
  try {
    const b64 = dataScript.textContent.trim();
    // Decode Base64 to binary string, then convert to UTF-8
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const jsonStr = new TextDecoder('utf-8').decode(bytes);
    resultData = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[LazyRender] Failed to parse report data:', e);
    return;
  }

  // Build fast lookup: fileNum → data
  const dataMap = new Map();
  for (const item of resultData) {
    dataMap.set(item.fileNum, item);
  }

  // ── Render a single result section ───────────────────────────────
  function renderSection(placeholder) {
    const fileNum = parseInt(placeholder.getAttribute('data-result-num'), 10);
    if (isNaN(fileNum)) return;

    const data = dataMap.get(fileNum);
    if (!data) {
      placeholder.innerHTML = '<p class="text-gray-400 text-sm">(无数据)</p>';
      return;
    }

    // Mark as rendered to avoid double-render
    if (placeholder.dataset.rendered === 'true') return;
    placeholder.dataset.rendered = 'true';

    const fragment = document.createDocumentFragment();

    if (data.error) {
      const p = document.createElement('p');
      p.className = 'text-danger text-sm';
      p.textContent = '错误: ' + data.error + ' (来源: ' + data.fileName + ')';
      fragment.appendChild(p);
    } else if (data.columns) {
      let columns;
      try {
        columns = JSON.parse(data.columns);
      } catch (e) {
        const p = document.createElement('p');
        p.className = 'text-gray-400 text-sm';
        p.textContent = '(数据解析失败)';
        fragment.appendChild(p);
        placeholder.appendChild(fragment);
        return;
      }

      if (!Array.isArray(columns) || columns.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-gray-400 text-sm';
        p.textContent = '(' + data.fileName + ') 无表格数据';
        fragment.appendChild(p);
      } else {
        const table = document.createElement('table');
        const thead = document.createElement('tr');
        for (const col of columns) {
          const th = document.createElement('th');
          th.innerHTML = String(col);
          thead.appendChild(th);
        }
        table.appendChild(thead);

        if (data.rows && data.rows.length > 0) {
          const tbody = document.createDocumentFragment();
          for (const row of data.rows) {
            const tr = document.createElement('tr');
            if (Array.isArray(row)) {
              for (const cell of row) {
                const td = document.createElement('td');
                td.innerHTML = cell === null ? '' : String(cell);
                tr.appendChild(td);
              }
            }
            tbody.appendChild(tr);
          }
          table.appendChild(tbody);
        } else {
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.colSpan = columns.length;
          td.style.textAlign = 'center';
          td.textContent = '无数据';
          tr.appendChild(td);
          table.appendChild(tr);
        }

        fragment.appendChild(table);
      }
    } else {
      const p = document.createElement('p');
      p.className = 'text-gray-400 text-sm';
      p.textContent = '(' + data.fileName + ') 无表格数据';
      fragment.appendChild(p);
    }

    placeholder.appendChild(fragment);
  }

  // ── Find all placeholders ────────────────────────────────────────
  const placeholders = document.querySelectorAll('.result-placeholder');
  if (placeholders.length === 0) return;

  // Render all sections synchronously so DOM tables exist before
  // DOMContentLoaded fires (needed by Chart.js in templates)
  for (let i = 0; i < placeholders.length; i++) {
    renderSection(placeholders[i]);
  }

  // Notify chart code that sections are ready
  window.dispatchEvent(new CustomEvent('sections-ready'));
})();