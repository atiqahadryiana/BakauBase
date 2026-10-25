const photos = new Map();

export function ref(_storage, path) { return { path }; }

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadBytes(reference, blob) {
  const dataUrl = await blobToDataUrl(blob);
  photos.set(reference.path, dataUrl);
  try { localStorage.setItem(`bakaubase-photo:${reference.path}`, dataUrl); } catch { /* session-only if browser quota is full */ }
  return { ref: reference };
}

export async function getDownloadURL(reference) {
  return photos.get(reference.path) || localStorage.getItem(`bakaubase-photo:${reference.path}`) || '';
}
