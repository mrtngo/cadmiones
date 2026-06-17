"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadImageFile } from "@/lib/images";
import { Label } from "@/components/ui";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  alt: string;
};

export function ImageUploadField({ label, value, onChange, alt }: Props) {
  const [inputKey, setInputKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: File | undefined, resetInput?: () => void) {
    if (!file) return;

    setIsUploading(true);
    try {
      onChange(await uploadImageFile(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cargar la imagen");
      resetInput?.();
    } finally {
      setIsUploading(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadFile(e.currentTarget.files?.[0], () => {
      e.currentTarget.value = "";
    });
  }

  async function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    await uploadFile(e.dataTransfer.files?.[0]);
  }

  function removeImage() {
    onChange("");
    setInputKey((key) => key + 1);
  }

  return (
    <div>
      <Label>{label}</Label>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-3 py-4 text-center text-sm transition",
          isDragging
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400",
          isUploading ? "pointer-events-none opacity-70" : "",
        ].join(" ")}
      >
        <span className="font-medium text-zinc-700 dark:text-zinc-200">
          {isUploading ? "Subiendo imagen..." : "Arrastra una imagen aquí"}
        </span>
        <span className="mt-1 text-xs">o haz clic para seleccionar un archivo</span>
        <input
          key={`${inputKey}-${value ? "has" : "empty"}`}
          className="sr-only"
          type="file"
          accept="image/*"
          disabled={isUploading}
          onChange={handleImageChange}
        />
      </label>
      {value ? (
        <div className="mt-2 flex items-start gap-3">
          <a href={value} target="_blank" rel="noreferrer" className="block shrink-0">
            <Image
              src={value}
              alt={alt}
              width={112}
              height={80}
              unoptimized
              className="h-20 w-28 rounded-md border border-zinc-200 object-cover dark:border-zinc-800"
            />
          </a>
          <button
            type="button"
            onClick={removeImage}
            className="text-xs text-red-600 hover:underline"
          >
            Quitar imagen
          </button>
        </div>
      ) : null}
    </div>
  );
}
