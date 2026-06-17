import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { MAX_IMAGE_BYTES } from "@/lib/images";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "imagen requerida" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "selecciona una imagen" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "la imagen debe pesar máximo 2 MB" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO uploaded_images (filename, content_type, size_bytes, data)
    VALUES (${file.name}, ${file.type}, ${file.size}, ${bytes})
    RETURNING id
  `;

  return NextResponse.json({ url: `/api/uploads/${row.id}` }, { status: 201 });
}
