const DB_NAME = 'le_bibliotheque_rafiqatul_ulya';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('annotations')) {
        db.createObjectStore('annotations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTx(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = callback(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllBooks() {
  const list = await runTx('books', 'readonly', (s) => s.getAll());
  return (list || []).sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));
}

export async function saveBook(book, pdfArrayBuffer = null) {
  await runTx('books', 'readwrite', (s) => s.put(book));
  if (pdfArrayBuffer) {
    await runTx('pdfs', 'readwrite', (s) => s.put({ id: book.id, buffer: pdfArrayBuffer }));
  }
}

export async function getPdfBuffer(bookId) {
  const row = await runTx('pdfs', 'readonly', (s) => s.get(bookId));
  return row ? row.buffer : null;
}

export async function deleteBook(bookId) {
  await runTx('books', 'readwrite', (s) => s.delete(bookId));
  await runTx('pdfs', 'readwrite', (s) => s.delete(bookId));
  await runTx('annotations', 'readwrite', (s) => s.delete(bookId));
}

export async function getAnnotations(bookId) {
  const row = await runTx('annotations', 'readonly', (s) => s.get(bookId));
  return (
    row || {
      id: bookId,
      highlights: [],
      strokes: {},
      bookmarks: [],
    }
  );
}

export async function getAllAnnotations() {
  const list = await runTx('annotations', 'readonly', (s) => s.getAll());
  return list || [];
}

export async function saveAnnotations(bookId, data) {
  await runTx('annotations', 'readwrite', (s) =>
    s.put({
      id: bookId,
      highlights: data.highlights || [],
      strokes: data.strokes || {},
      bookmarks: data.bookmarks || [],
    })
  );
}

export async function getCategories() {
  const row = await runTx('meta', 'readonly', (s) => s.get('categories'));
  return (
    row?.value || ['Fiksi', 'Sastra Klasik', 'Pengembangan Diri', 'Catatan', 'Favorit']
  );
}

export async function saveCategories(categories) {
  await runTx('meta', 'readwrite', (s) => s.put({ key: 'categories', value: categories }));
}
