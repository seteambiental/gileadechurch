/**
 * Utilitário para redimensionar imagens no cliente usando Canvas.
 * Gera versões otimizadas para carrossel (16:9) e flyer (4:5 / original).
 */

interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  mode?: "cover" | "contain" | "stretch";
}

interface ResizedImage {
  file: File;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona uma imagem mantendo o aspect ratio desejado (mode=cover),
 * centralizando e cortando o excesso.
 */
function resizeWithCover(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
) {
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;

  const targetRatio = targetWidth / targetHeight;
  const imgRatio = img.naturalWidth / img.naturalHeight;

  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

  if (imgRatio > targetRatio) {
    // Imagem mais larga: cortar laterais
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Imagem mais alta: cortar topo/base
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}

function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number
): Promise<File> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(new File([blob!], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Gera versão para carrossel (1920x1080, 16:9) com cover crop.
 */
export async function resizeForCarousel(file: File): Promise<ResizedImage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");

  const targetW = 1920;
  const targetH = 1080;

  resizeWithCover(canvas, img, targetW, targetH);

  const resized = await canvasToFile(
    canvas,
    `carousel_${Date.now()}.jpg`,
    0.85
  );

  return { file: resized, width: targetW, height: targetH };
}

/**
 * Gera versão para carrossel mobile (828x1472, 9:16) com cover crop.
 */
export async function resizeForCarouselMobile(file: File): Promise<ResizedImage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");

  const targetW = 828;
  const targetH = 1472;

  resizeWithCover(canvas, img, targetW, targetH);

  const resized = await canvasToFile(
    canvas,
    `carousel_mobile_${Date.now()}.jpg`,
    0.85
  );

  return { file: resized, width: targetW, height: targetH };
}

/**
 * Gera versão otimizada mantendo o aspect ratio original, 
 * limitando a largura máxima.
 */
export async function resizeKeepAspect(
  file: File,
  maxWidth = 1200
): Promise<ResizedImage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");

  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (w > maxWidth) {
    h = Math.round((maxWidth / w) * h);
    w = maxWidth;
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const resized = await canvasToFile(canvas, `optimized_${Date.now()}.jpg`, 0.85);
  return { file: resized, width: w, height: h };
}
