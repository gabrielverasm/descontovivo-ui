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
      this.loadImage('/brand/Logo-full.svg', 'logo'),
      productImageUrl ? this.loadImage(productImageUrl, productImageUrl.startsWith('/story-image') ? 'produto via proxy' : 'produto direto') : Promise.resolve(null),
    ]);
    if (sequence !== this.renderSequence) return;

    const gradient = context.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#f8fbff');
    gradient.addColorStop(0.55, '#eef5ff');
    gradient.addColorStop(1, '#e8f8f1');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1920);

    context.fillStyle = '#2563eb';
    context.beginPath();
    context.arc(1010, 40, 250, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(16, 185, 129, .13)';
    context.beginPath();
    context.arc(30, 1780, 300, 0, Math.PI * 2);
    context.fill();

    if (logo) {
      this.drawContainedImage(context, logo, 72, 70, 470, 100);
    } else {
      context.fillStyle = '#172033';
      context.font = '800 56px Arial, sans-serif';
      context.fillText('DescontoVivo', 72, 140);
    }
    context.fillStyle = '#526076';
    context.font = '500 27px Arial, sans-serif';
    context.fillText('Ofertas que valem muito mais', 76, 194);

    this.roundedRect(context, 72, 255, 435, 76, 38, '#172033');
    context.fillStyle = '#ffffff';
    context.font = '700 31px Arial, sans-serif';
    context.fillText('OFERTA ENCONTRADA', 112, 305);

    this.roundedRect(context, 72, 380, 936, 720, 54, '#ffffff');
    if (product) {
      this.drawContainedImage(context, product, 132, 435, 816, 610);
    } else {
      this.roundedRect(context, 170, 505, 740, 500, 40, '#f1f5f9');
      context.fillStyle = '#94a3b8';
      context.textAlign = 'center';
      context.font = '600 38px Arial, sans-serif';
      context.fillText('Imagem do produto', 540, 770);
      context.textAlign = 'left';
    }

    context.fillStyle = '#172033';
    context.font = '750 52px Arial, sans-serif';
    this.drawWrappedText(context, this.promotion.title, 72, 1190, 936, 65, 3);

    let priceY = 1435;
    if (this.promotion.originalPrice) {
      context.fillStyle = '#64748b';
      context.font = '500 32px Arial, sans-serif';
      const original = `De ${this.formatBRL(this.promotion.originalPrice)}`;
      context.fillText(original, 74, priceY - 45);
      const width = context.measureText(original).width;
      context.strokeStyle = '#64748b';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(72, priceY - 57);
      context.lineTo(72 + width, priceY - 57);
      context.stroke();
    }
    context.fillStyle = '#059669';
    context.font = '800 92px Arial, sans-serif';
    context.fillText(this.formatBRL(this.promotion.currentPrice), 70, priceY + 50);

    if (this.promotion.storeName) {
      context.fillStyle = '#334155';
      context.font = '650 38px Arial, sans-serif';
      context.fillText(`Em ${this.promotion.storeName}`, 76, priceY + 112);
    }

    let badgeX = 72;
    const badgeY = 1600;
    if (this.promotion.trustSignals?.includes('CURATED_BY_DESCONTOVIVO')) {
      badgeX += this.drawBadge(context, '✓ Curadoria DescontoVivo', badgeX, badgeY, '#e8f8f1', '#047857') + 18;
    }
    if (this.promotion.officialStore || this.promotion.trustSignals?.includes('OFFICIAL_STORE')) {
      this.drawBadge(context, 'Loja oficial', badgeX, badgeY, '#eaf2ff', '#1d4ed8');
    }

    const sellerLine = this.sellerLine();
    if (sellerLine) {
      context.fillStyle = '#526076';
      context.font = '500 29px Arial, sans-serif';
      this.drawWrappedText(context, sellerLine, 76, 1695, 900, 38, 1);
    }

    // Keep this region clear for Instagram's link sticker.
    context.fillStyle = '#334155';
    context.font = '650 28px Arial, sans-serif';
    context.fillText('descontovivo.com', 72, 1902);
    context.textAlign = 'right';
    context.font = '400 23px Arial, sans-serif';
    context.fillText('A compra é feita diretamente na loja.', 1008, 1902);
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
