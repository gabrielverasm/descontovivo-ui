/**
 * Helper para compartilhar promoção via Web Share API ou clipboard fallback.
 */

import { appendUtmParams, buildShareUtm } from '../../core/analytics/utm.util';

export interface SharePromotionData {
  title: string;
  currentPrice: number;
  slug?: string;
  id: string;
  imageUrl?: string | null;
}

function buildShareUrl(promotion: SharePromotionData): string {
  const path = `/promocoes/${promotion.slug || promotion.id}`;
  return `${window.location.origin}${path}`;
}

function buildShareText(promotion: SharePromotionData): string {
  const price = promotion.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return `Olha essa promoção no DescontoVivo: ${promotion.title} por ${price}`;
}

function buildClipboardText(promotion: SharePromotionData, url: string): string {
  return `${buildShareText(promotion)}\n${url}`;
}

function getImageExtension(mimeType: string): string {
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('gif')) return '.gif';
  return '.jpg';
}

function getImageFileName(promotion: SharePromotionData, blob: Blob): string {
  const slug = promotion.slug || promotion.id;
  const ext = getImageExtension(blob.type);
  return `descontovivo-promocao-${slug}${ext}`;
}

async function buildImageFile(imageUrl: string, promotion: SharePromotionData): Promise<File | null> {
  try {
    const resolvedUrl = new URL(imageUrl, window.location.origin).toString();
    const response = await fetch(resolvedUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const fileName = getImageFileName(promotion, blob);
    return new File([blob], fileName, { type: blob.type });
  } catch {
    return null;
  }
}

/**
 * Detects the share method used based on Web Share API result.
 * Falls back to 'native_share' since Web Share API doesn't expose the target app.
 */
type ShareMethod = 'whatsapp' | 'native_share' | 'copy_link';

/**
 * Compartilha a promoção. Retorna o método usado ou null se cancelado.
 * Tenta incluir imagem quando o navegador suportar.
 * Inclui UTM params no link compartilhado.
 */
export async function sharePromotion(promotion: SharePromotionData): Promise<ShareMethod | null> {
  const baseUrl = buildShareUrl(promotion);
  const text = buildShareText(promotion);

  if (navigator.share) {
    const utmUrl = appendUtmParams(baseUrl, buildShareUtm('native_share'));
    // Tentar compartilhar com imagem
    const imageFile = promotion.imageUrl ? await buildImageFile(promotion.imageUrl, promotion) : null;

    if (imageFile) {
      const dataWithFile: ShareData = { title: promotion.title, text, url: utmUrl, files: [imageFile] };

      if (navigator.canShare?.(dataWithFile)) {
        try {
          await navigator.share(dataWithFile);
          return 'native_share';
        } catch (e: unknown) {
          if (e instanceof DOMException && e.name === 'AbortError') return null;
          // Se falhar com imagem, tenta sem imagem abaixo
        }
      }
    }

    // Compartilhar sem imagem
    try {
      await navigator.share({ title: promotion.title, text, url: utmUrl });
      return 'native_share';
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return null;
    }
  }

  // Clipboard fallback com UTM
  const utmUrl = appendUtmParams(baseUrl, buildShareUtm('copy_link'));
  const clipboardText = buildClipboardText(promotion, utmUrl);

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(clipboardText);
      return 'copy_link';
    } catch {
      // Clipboard falhou
    }
  }

  // Último fallback
  window.prompt('Copie o link da promoção:', utmUrl);
  return 'copy_link';
}
