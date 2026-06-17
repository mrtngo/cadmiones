import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type UploadedImage = {
  filename: string;
  content_type: string;
  data: Uint8Array;
};

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await sql<UploadedImage[]>`
    SELECT filename, content_type, data
    FROM uploaded_images
    WHERE id = ${Number(id)}
  `;

  if (!row) {
    return NextResponse.json({ error: "no existe" }, { status: 404 });
  }

  return new Response(bytesToArrayBuffer(row.data), {
    headers: {
      "Content-Type": row.content_type,
      "Content-Disposition": `inline; filename="${row.filename.replaceAll('"', "")}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
