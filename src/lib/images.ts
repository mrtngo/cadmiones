export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Selecciona una imagen"));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new Error("La imagen debe pesar máximo 2 MB"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}
