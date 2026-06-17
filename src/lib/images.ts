export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen debe pesar máximo 2 MB");
  }
}

export async function uploadImageFile(file: File): Promise<string> {
  validateImageFile(file);

  const formData = new FormData();
  formData.set("file", file);

  const res = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "No se pudo subir la imagen");
  }

  const body = await res.json();
  return String(body.url);
}
