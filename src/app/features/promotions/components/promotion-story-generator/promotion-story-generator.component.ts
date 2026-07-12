import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Promotion } from '../../../../core/models/promotion.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-promotion-story-generator',
  standalone: true,
  templateUrl: './promotion-story-generator.component.html',
  styleUrl: './promotion-story-generator.component.scss',
})
export class PromotionStoryGeneratorComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) promotion!: Promotion;
  @Input({ required: true }) canonicalUrl = '';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('storyCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  isRendering = true;
  feedback = '';
  private viewReady = false;
  private renderSequence = 0;
  private renderedPngBlob: Blob | null = null;

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.renderStory();
  }

  ngOnChanges(): void {
    if (this.viewReady) void this.renderStory();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closed.emit();
  }

  async copyLink(): Promise<void> {
    await this.copyText(this.canonicalUrl, 'Link copiado.');
  }

  async copyCaption(): Promise<void> {
    await this.copyText(this.buildCaption(), 'Legenda copiada.');
  }

  async shareImage(): Promise<void> {
    if (this.isRendering) return;
    this.feedback = '';
    const blob = await this.canvasToPngBlob();
    if (!blob) return;
    const file = this.buildStoryFile(blob);

    let supportsFileShare = false;
    try {
      supportsFileShare = !!navigator.share && !!navigator.canShare?.({ files: [file] });
    } catch {
      supportsFileShare = false;
    }
    if (!supportsFileShare) {
      this.feedback = 'Compartilhamento de imagem não suportado neste navegador. Use baixar PNG.';
      return;
    }

    try {
      await navigator.share({
        files: [file],
        title: 'Story DescontoVivo',
        text: this.buildCaption(),
      });
      this.feedback = 'Imagem compartilhada.';
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.feedback = 'Não foi possível compartilhar a imagem. Use baixar PNG.';
    }
  }

  async copyImage(): Promise<void> {
    if (this.isRendering) return;
    this.feedback = '';
    const blob = await this.canvasToPngBlob();
    if (!blob) return;

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      this.feedback = 'Copiar imagem não é suportado neste navegador. Use compartilhar ou baixar PNG.';
      return;
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.feedback = 'Imagem copiada.';
    } catch {
      this.feedback = 'Não foi possível copiar a imagem. Use compartilhar ou baixar PNG.';
    }
  }

  async downloadPng(): Promise<void> {
    if (this.isRendering) return;
    this.feedback = '';
    const blob = await this.canvasToPngBlob();
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = this.storyFileName();
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    this.feedback = 'PNG gerado.';
  }

  private async renderStory(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !this.promotion) return;

    const sequence = ++this.renderSequence;
    this.isRendering = true;
    this.renderedPngBlob = null;
    const productImageUrl = this.resolveProductImageUrl(this.promotion.imageUrl);
    const [logo, product] = await Promise.all([
      this.loadImage('/brand/Logo-full-dark.svg', 'logo'),
      productImageUrl ? this.loadImage(productImageUrl, productImageUrl.startsWith('/story-image') ? 'produto via proxy' : 'produto direto') : Promise.resolve(null),
    ]);
    if (sequence !== this.renderSequence) return;

    const gradient = context.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#061224');
    gradient.addColorStop(0.5, '#0b1b34');
    gradient.addColorStop(1, '#101d2d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1920);

    // Decorative shapes only: the first 300 px remain free of critical content
    // for Instagram's account header and a manually positioned link sticker.
    context.fillStyle = 'rgba(37, 99, 235, .18)';
    context.beginPath();
    context.arc(1020, 30, 280, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(0, 205, 230, .08)';
    context.beginPath();
    context.arc(80, 120, 190, 0, Math.PI * 2);
    context.fill();

    if (logo) {
      this.drawContainedImage(context, logo, 72, 330, 420, 78);
    } else {
      context.fillStyle = '#ffffff';
      context.font = '800 52px Arial, sans-serif';
      context.fillText('DescontoVivo', 72, 390);
    }
    context.fillStyle = '#94a3b8';
    context.font = '500 25px Arial, sans-serif';
    context.fillText('Ofertas que valem muito mais', 76, 435);

    context.save();
    context.shadowColor = 'rgba(0, 0, 0, .38)';
    context.shadowBlur = 40;
    context.shadowOffsetY = 18;
    this.roundedRect(context, 72, 485, 936, 610, 48, '#ffffff');
    context.restore();
    if (product) {
      this.drawContainedImage(context, product, 132, 525, 816, 530);
    } else {
      this.roundedRect(context, 170, 555, 740, 470, 40, '#f1f5f9');
      context.fillStyle = '#94a3b8';
      context.textAlign = 'center';
      context.font = '600 38px Arial, sans-serif';
      context.fillText('Imagem do produto', 540, 805);
      context.textAlign = 'left';
    }

    context.fillStyle = '#f8fafc';
    context.font = '750 47px Arial, sans-serif';
    this.drawWrappedText(context, this.promotion.title, 72, 1180, 936, 58, 3);

    const priceY = 1435;
    if (this.promotion.originalPrice) {
      context.fillStyle = '#94a3b8';
      context.font = '500 30px Arial, sans-serif';
      const original = `De ${this.formatBRL(this.promotion.originalPrice)}`;
      context.fillText(original, 74, priceY - 40);
      const width = context.measureText(original).width;
      context.strokeStyle = '#94a3b8';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(72, priceY - 51);
      context.lineTo(72 + width, priceY - 51);
      context.stroke();
    }
    context.fillStyle = '#34d399';
    context.font = '800 88px Arial, sans-serif';
    context.fillText(this.formatBRL(this.promotion.currentPrice), 70, priceY + 50);

    const contextParts = [this.promotion.storeName ? `Em ${this.promotion.storeName}` : '', this.promotion.category || ''].filter(Boolean);
    if (contextParts.length) {
      context.fillStyle = '#cbd5e1';
      context.font = '650 34px Arial, sans-serif';
      context.fillText(contextParts.join('  ·  '), 76, priceY + 108);
    }

    let badgeX = 72;
    const badgeY = 1605;
    if (this.promotion.trustSignals?.includes('CURATED_BY_DESCONTOVIVO')) {
      badgeX += this.drawBadge(context, '✓ Curadoria DescontoVivo', badgeX, badgeY, '#123b35', '#6ee7b7') + 18;
    }
    if (this.promotion.officialStore || this.promotion.trustSignals?.includes('OFFICIAL_STORE')) {
      this.drawBadge(context, 'Loja oficial', badgeX, badgeY, '#172f56', '#93c5fd');
    }

    const sellerLine = this.sellerLine();
    if (sellerLine) {
      context.fillStyle = '#94a3b8';
      context.font = '500 27px Arial, sans-serif';
      this.drawWrappedText(context, sellerLine, 76, 1705, 900, 36, 1);
    }

    context.strokeStyle = 'rgba(148, 163, 184, .22)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(72, 1845);
    context.lineTo(1008, 1845);
    context.stroke();
    context.fillStyle = '#cbd5e1';
    context.font = '650 26px Arial, sans-serif';
    context.fillText('descontovivo.com', 72, 1895);
    context.textAlign = 'right';
    context.fillStyle = '#64748b';
    context.font = '400 21px Arial, sans-serif';
    context.fillText('A compra é feita diretamente na loja.', 1008, 1895);
    context.textAlign = 'left';
    this.isRendering = false;
  }

  private resolveProductImageUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;
    try {
      const imageUrl = new URL(rawUrl, window.location.origin);
      if (imageUrl.protocol === 'https:' && imageUrl.hostname === 'img.descontovivo.com.br') {
        return `/story-image?url=${encodeURIComponent(imageUrl.toString())}`;
      }
      return imageUrl.toString();
    } catch {
      if (!environment.production) console.warn('[StoryGenerator] URL inválida da imagem do produto.');
      return null;
    }
  }

  private loadImage(src: string, label: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => {
        if (!environment.production) console.warn(`[StoryGenerator] Falha ao carregar ${label}: ${src}`);
        resolve(null);
      };
      image.src = src;
    });
  }

  private drawContainedImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  private roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string): void {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fillStyle = fill;
    context.fill();
  }

  private drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): void {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      let last = visible[maxLines - 1];
      while (context.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
      visible[maxLines - 1] = `${last.trim()}…`;
    }
    visible.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
  }

  private drawBadge(context: CanvasRenderingContext2D, text: string, x: number, y: number, background: string, color: string): number {
    context.font = '700 26px Arial, sans-serif';
    const width = context.measureText(text).width + 52;
    this.roundedRect(context, x, y, width, 58, 29, background);
    context.fillStyle = color;
    context.fillText(text, x + 26, y + 38);
    return width;
  }

  private sellerLine(): string {
    const soldBy = this.promotion.soldBy?.trim();
    const deliveredBy = this.promotion.deliveredBy?.trim();
    if (soldBy && deliveredBy && soldBy === deliveredBy) return `Vendido e entregue por ${soldBy}`;
    if (soldBy && deliveredBy) return `Vendido por ${soldBy} · Entregue por ${deliveredBy}`;
    if (soldBy) return `Vendido por ${soldBy}`;
    if (deliveredBy) return `Entregue por ${deliveredBy}`;
    return '';
  }

  private formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private buildCaption(): string {
    const store = this.promotion.storeName ? ` em ${this.promotion.storeName}` : '';
    return `Olha essa promoção no DescontoVivo: ${this.promotion.title} por ${this.formatBRL(this.promotion.currentPrice)}${store}. Confira pelo link do story.`;
  }

  private async canvasToPngBlob(): Promise<Blob | null> {
    if (this.renderedPngBlob) return this.renderedPngBlob;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || this.isRendering) {
      this.feedback = 'A imagem ainda não está pronta.';
      return null;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        this.feedback = 'Não foi possível gerar a imagem.';
        return null;
      }
      this.renderedPngBlob = blob;
      return blob;
    } catch {
      this.feedback = 'Não foi possível gerar a imagem.';
      return null;
    }
  }

  private storyFileName(): string {
    return `descontovivo-story-${this.safeSlug()}.png`;
  }

  private buildStoryFile(blob: Blob): File {
    return new File([blob], this.storyFileName(), { type: 'image/png' });
  }

  private safeSlug(): string {
    return (this.promotion.slug || this.promotion.id || 'promocao')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'promocao';
  }

  private async copyText(text: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.feedback = successMessage;
    } catch {
      this.feedback = 'Não foi possível copiar automaticamente.';
    }
  }
}
