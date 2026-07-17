/**
 * Utilitário para redimensionar imagens no cliente usando Canvas.
 * Gera versões otimizadas para carrossel e flyer, SEMPRE preservando
 * a proporção original da imagem (sem cortes / sem distorção).
 */

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
 * Redimensiona a imagem para caber dentro de um limite de largura/altura,
 * SEM cortar e SEM esticar. Mantém sempre a proporção original.
 * Só reduz o tamanho (nunca amplia imagens menores que o limite).
 */
function resizeFitWithinBounds(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
) {
  const widthRatio = maxWidth / img.naturalWidth;
  const heightRatio = maxHeight / img.naturalHeight;
  const scale = Math.min(widthRatio, heightRatio, 1); // nunca amplia

  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
}

function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number,
): Promise<File> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(new File([blob!], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Gera versão para carrossel desktop.
 * Cabe dentro de 1920x1080 mantendo a proporção original — sem cortar
 * nada da arte. A exibição na homepage já usa object-contain + fundo
 * desfocado, então a imagem completa sempre aparece corretamente
 * qualquer que seja sua proporção.
 */
export async function resizeForCarousel(file: File): Promise<ResizedImage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");

  resizeFitWithinBounds(canvas, img, 1920, 1080);

  const resized = await canvasToFile(canvas, `carousel_${Date.now()}.jpg`, 0.9);
  return { file: resized, width: canvas.width, height: canvas.height };
}

/**
 * Gera versão para carrossel mobile.
 * Cabe dentro de 828x1472 mantendo a proporção original — sem cortar.
 */
export async function resizeForCarouselMobile(file: File): Promise<ResizedImage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");

  resizeFitWithinBounds(canvas, img, 828, 1472);

  const resized = await canvasToFile(canvas, `carousel_mobile_${Date.now()}.jpg`, 0.9);
  return { file: resized, width: canvas.width, height: canvas.height };
}

/**
 * Gera versão otimizada mantendo o aspect ratio original,
 * limitando a largura máxima. (Usada em outros pontos do app —
 * mantida sem alterações de comportamento.)
 */
export async function resizeKeepAspect(
  file: File,
  maxWidth = 1200,
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
