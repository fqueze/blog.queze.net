// Clicking an image reduced to fit the column shows it at full size (within
// the window); Escape or a click outside the image closes it.
for (const img of document.querySelectorAll('.post-content img')) {
  if (img.closest('a'))
    continue;
  const update = () => img.classList.toggle('zoomable', img.naturalWidth > img.clientWidth);
  if (img.complete)
    update();
  else
    img.addEventListener('load', update);
  img.addEventListener('click', () => {
    if (!img.classList.contains('zoomable'))
      return;
    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    const full = document.createElement('img');
    full.src = img.currentSrc || img.src;
    full.alt = img.alt;
    dialog.append(full);
    dialog.addEventListener('click', e => { if (e.target == dialog) dialog.close(); });
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  });
}
