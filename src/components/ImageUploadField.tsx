"use client";

import { useState } from "react";
import Image from "next/image";
import { readImageAsDataUrl } from "@/lib/images";
import { Label, inputCls } from "@/components/ui";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  alt: string;
};

export function ImageUploadField({ label, value, onChange, alt }: Props) {
  const [inputKey, setInputKey] = useState(0);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    try {
      onChange(await readImageAsDataUrl(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cargar la imagen");
      e.currentTarget.value = "";
    }
  }

  function removeImage() {
    onChange("");
    setInputKey((key) => key + 1);
  }

  return (
    <div>
      <Label>{label}</Label>
      <input
        key={`${inputKey}-${value ? "has" : "empty"}`}
        className={inputCls}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />
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
