import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AVATAR_BUCKET, resolveAvatarUrl } from "@/lib/account";
import { friendlyError } from "@/lib/friendly-errors";

const MAX_BYTES = 3 * 1024 * 1024;

type Props = {
  userId: string;
  /** Ruta almacenada en profiles.avatar_url */
  value: string | null;
  onChange: (path: string | null) => void;
  fallbackText?: string;
  required?: boolean;
};

export function AvatarPicker({ userId, value, onChange, fallbackText, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    resolveAvatarUrl(value).then((url) => {
      if (active) setPreview(url);
    });
    return () => {
      active = false;
    };
  }, [value]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen es muy pesada. Usa una de menos de 3 MB.");
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success("Foto actualizada.");
    } catch (error) {
      toast.error(friendlyError(error, "No pudimos subir tu foto. Inténtalo nuevamente."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 border border-border shadow-soft">
        {preview ? <AvatarImage src={preview} alt="Tu foto de perfil" /> : null}
        <AvatarFallback className="bg-primary-soft text-base font-semibold text-primary">
          {(fallbackText ?? "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Camera aria-hidden />
          )}
          {value ? "Cambiar foto" : "Subir foto"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {required ? "Obligatoria para profesionales." : "Opcional."} JPG o PNG, hasta 3 MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
