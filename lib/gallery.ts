/** Shared DOM behaviour for the editor, player and self-contained HTML exports. */
export function initGallery(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('.gallery-frame img'));
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const enlarged = dialog.querySelector<HTMLImageElement>('img')!;
  let index = 0;
  const show = (delta: number) => {
    index = (index + delta + images.length) % images.length;
    images.forEach((img, i) => img.hidden = i !== index);
    root.querySelectorAll('.gallery-count').forEach(el => el.textContent = `${index + 1} / ${images.length}`);
    if (dialog.open) enlarged.src = images[index].src;
  };
  const click = (event: Event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-gallery]');
    if (!button) return;
    event.stopPropagation();
    const action = button.dataset.gallery;
    if (action === 'open') { enlarged.src = images[index].src; dialog.showModal(); }
    if (action === 'close') dialog.close();
    if (action === 'prev') show(-1);
    if (action === 'next') show(1);
  };
  const keys = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };
  const touch = (e: Event) => e.stopPropagation();
  root.addEventListener('click', click);
  root.addEventListener('keydown', keys);
  root.addEventListener('touchstart', touch);
  root.addEventListener('touchend', touch);
  show(0);
  return () => { dialog.close(); root.removeEventListener('click', click); root.removeEventListener('keydown', keys); root.removeEventListener('touchstart', touch); root.removeEventListener('touchend', touch); };
}
