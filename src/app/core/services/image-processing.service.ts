import { Injectable } from '@angular/core';

export interface ProcessedImage {
  blob: Blob;
  previewUrl: string;
  sizeKB: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 300;
const WEBP_QUALITY = 0.75;

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formato inválido. Use JPG, PNG ou WebP.';
    }
    if (file.size > MAX_INPUT_SIZE) {
      return 'Arquivo muito grande. Máximo 5 MB.';
    }
    return null;
  }

  process(file: File): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao converter imagem.'));
              return;
            }
            resolve({
              blob,
              previewUrl: URL.createObjectURL(blob),
              sizeKB: Math.round(blob.size / 1024),
            });
          },
          'image/webp',
          WEBP_QUALITY,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível carregar a imagem.'));
      };
      img.src = url;
    });
  }
}
