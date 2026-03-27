import heic2any from "heic2any";

const isHeicLike = (value?: string | null) => {
  if (!value) return false;
  return /\.hei(c|f)(\?|$)/i.test(value) || /image\/hei(c|f)/i.test(value);
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const fileToJpeg = async (file: File): Promise<File> => {
  const isHeicFile = isHeicLike(file.name) || isHeicLike(file.type);

  if (isHeicFile) {
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    return new File([jpegBlob as BlobPart], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha ao preparar imagem"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao converter imagem"));
              return;
            }
            resolve(new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const imageUrlToRenderableDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  if (blob.type.includes("text/html")) {
    throw new Error("Resposta inválida ao carregar imagem");
  }

  if (isHeicLike(url) || isHeicLike(blob.type)) {
    const converted = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    return blobToDataUrl(jpegBlob as Blob);
  }

  return blobToDataUrl(blob);
};

export const fitImage = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) => {
  let nextWidth = width;
  let nextHeight = height;

  if (nextWidth > maxWidth) {
    nextHeight = (maxWidth / nextWidth) * nextHeight;
    nextWidth = maxWidth;
  }

  if (nextHeight > maxHeight) {
    nextWidth = (maxHeight / nextHeight) * nextWidth;
    nextHeight = maxHeight;
  }

  return { width: nextWidth, height: nextHeight };
};