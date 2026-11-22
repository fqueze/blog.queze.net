/**
 * Review Mode — Inline commenting system for article previews.
 *
 * Structure:
 *  - init: entry point, fetches comments, applies highlights, wires events
 *  - Anchor creation: createAnchor (from a live Selection)
 *  - Anchor resolution: findAnchorRange (from a stored anchor back to a DOM Range)
 *  - Highlight rendering: applyHighlight / removeHighlight / wrapRangeInMarks
 *  - Panel management: showPanel / buildPanel / removePanel / autoSaveAndClose
 *  - Comment CRUD: saveNewComment / saveCommentEdit / deleteComment
 *  - Server sync: persistComments
 *  - Export: exportComments
 *  - Publication: publishDraft
 *
 * Adapted from combien-consomme.fr's draft/review-mode.js.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const CONTEXT_CHARS = 50;
  const SELECTION_SETTLE_MS = 200;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let comments = [];
  const draftSlug = location.pathname.match(/\/draft\/([^/]+)/)[1];
  const article = document.querySelector('.post');
  let pendingSelection = null;
  let selectionTimer = null;
  let mouseDown = false;
  let shiftHeld = false;

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  async function init() {
    try {
      const r = await fetch(`/api/draft/${draftSlug}/data`);
      comments = (await r.json()).comments || [];
    } catch (_) {
      comments = [];
    }

    for (const comment of comments) {
      const range = findAnchorRange(comment.anchor);
      if (!range) {
        console.warn('[Review] Anchor not found for comment', comment.id);
        continue;
      }
      applyHighlight(range, comment.id);
    }
    updateBannerCount();
    document.querySelector('.review-comment-count')
      .addEventListener('click', () => exportComments(comments, false));
    document.querySelector('.review-export-new-btn')
      .addEventListener('click', () => exportComments(comments.filter(c => !c.exported), true));
    document.querySelector('.review-publish-btn').addEventListener('click', publishDraft);

    document.addEventListener('mousedown', () => { mouseDown = true; });
    document.addEventListener('mouseup', () => {
      mouseDown = false;
      scheduleSelection();
    });
    document.addEventListener('selectionchange', () => {
      if (!mouseDown) scheduleSelection();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Shift') shiftHeld = true;
      if (e.key === 'Escape') removePanel();
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Shift') { shiftHeld = false; scheduleSelection(); }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.review-comment-ui, .review-export-banner, mark.review-highlight'))
        autoSaveAndClose();
    });
  }

  // ---------------------------------------------------------------------------
  // Content helpers (shared by anchor creation & resolution)
  // ---------------------------------------------------------------------------

  /**
   * Walk text nodes of `root`, calling `fn(node)`.
   * If `fn` returns a truthy value, stop and return that value.
   */
  function walkTextNodes(root, fn) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const result = fn(node);
      if (result) return result;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Anchor creation (live Selection → serialisable anchor)
  // ---------------------------------------------------------------------------

  function createAnchor(range) {
    const exact = range.cloneContents().textContent;
    const fullText = article.textContent;

    let charPos = 0;
    let selStart = -1;
    walkTextNodes(article, node => {
      if (node === range.startContainer) {
        selStart = charPos + range.startOffset;
        return true;
      }
      charPos += node.textContent.length;
      return false;
    });

    if (selStart === -1) selStart = fullText.indexOf(exact);

    const selEnd = selStart + exact.length;
    return {
      prefix: fullText.substring(Math.max(0, selStart - CONTEXT_CHARS), selStart),
      exact,
      suffix: fullText.substring(selEnd, Math.min(fullText.length, selEnd + CONTEXT_CHARS))
    };
  }

  // ---------------------------------------------------------------------------
  // Anchor resolution (stored anchor → DOM Range)
  // ---------------------------------------------------------------------------

  /**
   * Given a comment anchor, return a DOM Range spanning the exact text,
   * or null if not found.
   *
   * Strategies: 1) exact prefix+exact+suffix match, 2) whitespace-normalised
   * match, 3) just `exact`.
   */
  function findAnchorRange(anchor, root = article) {
    const fullText = root.textContent;
    const pattern = anchor.prefix + anchor.exact + anchor.suffix;

    let exactStart = -1;
    let exactEnd = -1;

    // Strategy 1 — exact match
    const pos = fullText.indexOf(pattern);
    if (pos !== -1) {
      exactStart = pos + anchor.prefix.length;
      exactEnd = exactStart + anchor.exact.length;
    }

    // Strategy 2 — whitespace-normalised match
    if (exactStart === -1) {
      const strip = s => s.replace(/\s+/g, '');
      const fullStripped = strip(fullText);
      const posStripped = fullStripped.indexOf(strip(pattern));
      if (posStripped !== -1) {
        const startStripped = posStripped + strip(anchor.prefix).length;
        const endStripped = startStripped + strip(anchor.exact).length;
        exactStart = mapStrippedIndex(fullText, startStripped);
        exactEnd = mapStrippedIndex(fullText, endStripped - 1) + 1;
      }
    }

    // Strategy 3 — just `exact`
    if (exactStart === -1) {
      const pos2 = fullText.indexOf(anchor.exact);
      if (pos2 !== -1) {
        exactStart = pos2;
        exactEnd = pos2 + anchor.exact.length;
      }
    }

    if (exactStart === -1) return null;
    return charOffsetToRange(root, exactStart, exactEnd);
  }

  function mapStrippedIndex(original, strippedIdx) {
    let count = 0;
    for (let i = 0; i < original.length; i++) {
      if (!/\s/.test(original[i])) {
        if (count === strippedIdx) return i;
        count++;
      }
    }
    return original.length;
  }

  function charOffsetToRange(root, startPos, endPos) {
    let charCount = 0;
    let startNode, startOffset, endNode, endOffset;

    walkTextNodes(root, node => {
      const len = node.textContent.length;
      if (!startNode && charCount + len > startPos) {
        startNode = node;
        startOffset = startPos - charCount;
      }
      if (startNode && charCount + len >= endPos) {
        endNode = node;
        endOffset = endPos - charCount;
        return true;
      }
      charCount += len;
      return false;
    });

    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  // ---------------------------------------------------------------------------
  // Highlight rendering
  // ---------------------------------------------------------------------------

  /**
   * Wrap a Range in <mark> elements.  Tries surroundContents first (fast path
   * for single-text-node ranges), falls back to multi-node wrapping.
   */
  function applyHighlight(range, commentId) {
    try {
      const mark = createMark(commentId);
      range.surroundContents(mark);
      bindMarkEvents(mark, commentId);
    } catch (_) {
      wrapRangeInMarks(range, commentId);
      document.querySelectorAll(`mark[data-comment-id="${commentId}"]`)
        .forEach(m => bindMarkEvents(m, commentId));
    }
  }

  /** Remove all <mark> elements for a given comment ID. */
  function removeHighlight(commentId) {
    document.querySelectorAll(`mark.review-highlight[data-comment-id="${commentId}"]`)
      .forEach(unwrapMark);
  }

  function createMark(commentId) {
    const mark = document.createElement('mark');
    mark.className = 'review-highlight';
    if (commentId) mark.dataset.commentId = commentId;
    return mark;
  }

  function bindMarkEvents(mark, commentId) {
    mark.addEventListener('mouseenter', () => showPanel(commentId, mark));
    mark.addEventListener('click', () => {
      const existing = document.querySelector('.review-comment-ui');
      if (existing && existing.dataset.commentId === commentId) {
        existing.querySelector('.review-comment-input')?.focus();
        return;
      }
      showPanel(commentId, mark);
      requestAnimationFrame(() => {
        document.querySelector('.review-comment-ui .review-comment-input')?.focus();
      });
    });
  }

  function wrapRangeInMarks(range, commentId) {
    const { startContainer, endContainer, startOffset, endOffset,
            commonAncestorContainer } = range;

    const nodes = [];
    walkTextNodes(commonAncestorContainer, node => {
      if (node === startContainer || node === endContainer) {
        nodes.push(node);
        return false;
      }
      const beforeStart = startContainer.compareDocumentPosition(node) &
                          Node.DOCUMENT_POSITION_PRECEDING;
      const afterEnd = endContainer.compareDocumentPosition(node) &
                       Node.DOCUMENT_POSITION_FOLLOWING;
      if (!beforeStart && !afterEnd) nodes.push(node);
      return false;
    });

    nodes.forEach(node => {
      const isStart = node === startContainer;
      const isEnd = node === endContainer;
      const text = node.textContent;
      const parent = node.parentNode;

      const sliceStart = isStart ? startOffset : 0;
      const sliceEnd = isEnd ? endOffset : text.length;

      const before = text.substring(0, sliceStart);
      const middle = text.substring(sliceStart, sliceEnd);
      const after = text.substring(sliceEnd);

      if (before) parent.insertBefore(document.createTextNode(before), node);

      const mark = createMark(commentId);
      mark.textContent = middle;
      parent.insertBefore(mark, node);

      if (after) parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
    });
  }

  function unwrapMark(mark) {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  }

  // ---------------------------------------------------------------------------
  // Panel management (comment creation & editing)
  // ---------------------------------------------------------------------------

  function showPanel(commentId, anchorElement) {
    const existing = document.querySelector('.review-comment-ui');
    if (existing && existing.dataset.commentId === commentId) return;
    autoSaveAndClose();

    const comment = commentId ? comments.find(c => c.id === commentId) : null;
    const rect = anchorElement.getBoundingClientRect();

    buildPanel({
      position: {
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.bottom + window.scrollY
      },
      commentId: commentId || undefined,
      initialText: comment ? comment.text : '',
      hint: comment
        ? '<span>↵ Save</span><span>Empty+↵ Delete</span><span>Esc Close</span>'
        : '<span>↵ Save</span><span>⇧↵ New line</span><span>Esc Cancel</span>'
    });
  }

  function buildPanel({ position, commentId, initialText = '', hint }) {
    const panel = document.createElement('div');
    panel.className = 'review-comment-ui';
    if (commentId) panel.dataset.commentId = commentId;

    panel.innerHTML =
      `<textarea class="review-comment-input" placeholder="Your comment..." rows="3"></textarea>` +
      `<div class="review-comment-hint">${hint}</div>`;

    const textarea = panel.querySelector('.review-comment-input');
    textarea.value = initialText;

    Object.assign(panel.style, {
      position: 'absolute',
      left: (position.x - 160) + 'px',
      top: (position.y + 10) + 'px',
      zIndex: '10001'
    });

    document.body.appendChild(panel);

    if (commentId) {
      panel.addEventListener('mouseleave', e => {
        if (document.activeElement === textarea) return;
        const toMark = e.relatedTarget &&
          e.relatedTarget.classList &&
          e.relatedTarget.classList.contains('review-highlight') &&
          e.relatedTarget.dataset.commentId === commentId;
        if (!toMark) panel.remove();
      });
    }

    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textarea.value.trim();
        if (text) {
          commentId ? saveCommentEdit(commentId, text) : saveNewComment(text);
        } else {
          commentId ? deleteComment(commentId) : removePanel();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        removePanel();
      }
    });

    textarea.focus();
  }

  /** Remove the panel and clean up any temporary highlights. */
  function removePanel() {
    const panel = document.querySelector('.review-comment-ui');
    if (panel) panel.remove();
    document.querySelectorAll('mark.review-highlight-temp').forEach(unwrapMark);
    pendingSelection = null;
  }

  /**
   * Auto-save or delete based on panel state, then close.
   * - New comment with text → save
   * - Existing comment with changed text → save edit
   * - Existing comment with empty text → delete
   * - Otherwise → just close
   */
  function autoSaveAndClose() {
    const panel = document.querySelector('.review-comment-ui');
    if (!panel) return;

    const text = panel.querySelector('.review-comment-input').value.trim();
    const editId = panel.dataset.commentId;

    if (editId) {
      if (!text) {
        deleteComment(editId);
      } else {
        const comment = comments.find(c => c.id === editId);
        if (comment && text !== comment.text) {
          saveCommentEdit(editId, text);
        } else {
          removePanel();
        }
      }
    } else if (text) {
      saveNewComment(text);
    } else {
      removePanel();
    }
  }

  // ---------------------------------------------------------------------------
  // Comment CRUD
  // ---------------------------------------------------------------------------

  async function saveNewComment(text) {
    if (!pendingSelection) return;

    const comment = {
      id: 'c' + Date.now(),
      text,
      anchor: pendingSelection.anchor,
      selectedText: pendingSelection.displayText,
      timestamp: new Date().toISOString()
    };

    comments.push(comment);

    // Promote temp highlight to permanent
    document.querySelectorAll('mark.review-highlight-temp').forEach(mark => {
      mark.classList.remove('review-highlight-temp');
      mark.dataset.commentId = comment.id;
      bindMarkEvents(mark, comment.id);
    });

    const panel = document.querySelector('.review-comment-ui');
    if (panel) panel.remove();
    pendingSelection = null;
    updateBannerCount();

    try {
      await persistComments();
    } catch (err) {
      console.error('[Review] Save failed:', err);
      comments.pop();
      removeHighlight(comment.id);
      updateBannerCount();
      alert('Failed to save the comment');
    }
  }

  async function saveCommentEdit(commentId, newText) {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const oldText = comment.text;
    comment.text = newText;
    const panel = document.querySelector('.review-comment-ui');
    if (panel) panel.remove();

    try {
      await persistComments();
    } catch (err) {
      console.error('[Review] Edit failed:', err);
      comment.text = oldText;
      alert('Failed to edit the comment');
    }
  }

  async function deleteComment(commentId) {
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx === -1) return;
    comments.splice(idx, 1);
    removePanel();
    removeHighlight(commentId);
    updateBannerCount();

    try {
      await persistComments();
    } catch (err) {
      console.error('[Review] Delete failed:', err);
      alert('Failed to delete the comment');
    }
  }

  // ---------------------------------------------------------------------------
  // Server sync
  // ---------------------------------------------------------------------------

  async function persistComments() {
    const r = await fetch(`/api/draft/${draftSlug}/comments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  }

  // ---------------------------------------------------------------------------
  // Export banner
  // ---------------------------------------------------------------------------

  function updateBannerCount() {
    const total = comments.length;
    const newCount = comments.filter(c => !c.exported).length;
    document.querySelector('.review-comment-count').textContent =
      `${total} comment${total !== 1 ? 's' : ''}`;

    const newBtn = document.querySelector('.review-export-new-btn');
    if (newCount > 0) {
      newBtn.hidden = false;
      newBtn.textContent = newCount < total
        ? `📋 Copy ${newCount} new`
        : '📋 Copy';
    } else {
      newBtn.hidden = true;
    }
  }

  async function exportComments(subset, markExported) {
    if (!subset.length) { alert('No comment to export'); return; }

    const lines = subset.map((c, i) => {
      const quoted = c.selectedText || c.anchor.exact;
      const before = c.anchor.prefix ? `...${c.anchor.prefix}` : '';
      const after = c.anchor.suffix ? `${c.anchor.suffix}...` : '';
      return `${i + 1}. Re: "${before}[[${quoted}]]${after}"\n   ${c.text}`;
    });

    const prompt = `Please address these review comments on the draft post draft/${draftSlug}/index.md:\n\n` +
                   lines.join('\n\n') + '\n';

    try {
      await navigator.clipboard.writeText(prompt);
    } catch (err) {
      console.error('[Review] Clipboard failed:', err);
      alert('Failed to copy to the clipboard');
      return;
    }

    if (markExported) {
      subset.forEach(c => { c.exported = true; });
      await persistComments();
      updateBannerCount();
    }

    // Flash feedback on whichever button was clicked
    const btn = markExported
      ? document.querySelector('.review-export-new-btn')
      : document.querySelector('.review-comment-count');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.backgroundColor = '#4caf50';
    setTimeout(() => { btn.textContent = orig; btn.style.backgroundColor = ''; }, 2000);
  }

  // ---------------------------------------------------------------------------
  // Publication
  // ---------------------------------------------------------------------------

  async function publishDraft() {
    const unexported = comments.filter(c => !c.exported).length;
    if (!confirm(unexported ? `${unexported} comment(s) not addressed yet. Publish anyway?`
                            : 'Publish this draft now?'))
      return;

    const results = document.querySelector('.review-publish-results');
    const r = await fetch(`/api/draft/${draftSlug}/publish`, { method: 'POST' });
    const data = await r.json();
    results.hidden = false;
    results.textContent = '';
    if (!r.ok) {
      results.textContent = `Publication failed: ${data.error}`;
      return;
    }
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = data.url;
    link.textContent = data.url;
    p.append(`Written to ${data.post}, to be shown at `, link, '. To push it:');
    const pre = document.createElement('pre');
    pre.textContent = data.gitCommands.join('\n');
    results.append(p, pre);
  }

  // ---------------------------------------------------------------------------
  // Global event handlers
  // ---------------------------------------------------------------------------

  function scheduleSelection() {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(handleSelection, SELECTION_SETTLE_MS);
  }

  function handleSelection() {
    if (shiftHeld) { scheduleSelection(); return; }

    const sel = window.getSelection();
    const text = sel.toString().trim();
    if (!text) return;

    let anchor = sel.anchorNode;
    if (anchor.nodeType === Node.TEXT_NODE) anchor = anchor.parentNode;
    if (!article.contains(anchor) ||
        anchor.closest('.review-comment-ui, .review-export-banner') ||
        anchor.closest('mark.review-highlight')) return;

    const hadTemp = document.querySelectorAll('mark.review-highlight-temp').length > 0;
    if (hadTemp) {
      document.querySelectorAll('mark.review-highlight-temp').forEach(unwrapMark);
      if (!window.getSelection().toString().trim()) return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    pendingSelection = {
      anchor: createAnchor(range.cloneRange()),
      displayText: text,
      position: {
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.bottom + window.scrollY
      }
    };

    try {
      const mark = document.createElement('mark');
      mark.className = 'review-highlight review-highlight-temp';
      range.surroundContents(mark);
    } catch (_) {
      wrapRangeInMarks(range, null);
      document.querySelectorAll('mark.review-highlight:not([data-comment-id])')
        .forEach(m => m.classList.add('review-highlight-temp'));
    }

    const existing = document.querySelector('.review-comment-ui');
    if (existing) existing.remove();
    buildPanel({
      position: pendingSelection.position,
      hint: '<span>↵ Save</span><span>⇧↵ New line</span><span>Esc Cancel</span>'
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
