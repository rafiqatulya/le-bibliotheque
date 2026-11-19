import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function loadPdfDocument(arrayBuffer) {
  const copied = arrayBuffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: copied });
  return await loadingTask.promise;
}

export async function extractPdfMeta(arrayBuffer) {
  const pdf = await loadPdfDocument(arrayBuffer);
  const totalPages = pdf.numPages;
  let coverDataUrl = '';

  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.75 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#F2E8D5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    coverDataUrl = canvas.toDataURL('image/jpeg', 0.78);
  } catch (err) {
    console.warn('Gagal ekstrak cover PDF:', err);
  }

  return { totalPages, coverDataUrl };
}
