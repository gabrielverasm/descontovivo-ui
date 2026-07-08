import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface UploadResult {
  imageUrl: string;
  imageKey: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  async uploadPromotionImage(blob: Blob): Promise<UploadResult> {
    let presign: PresignResponse;

    // Step 1: Get presigned URL from API
    try {
      presign = await firstValueFrom(
        this.http.post<PresignResponse>(
          `${environment.apiBaseUrl}/uploads/promotion-image/presign`,
          { contentType: 'image/webp', fileSize: blob.size },
        ),
      );
    } catch (err) {
      if (!environment.production) {
        console.error('[UploadService] Presign request failed:', err);
      }
      throw new Error('Falha ao obter URL de upload (presign).');
    }

    // Step 2: PUT file to presigned URL (R2/S3)
    let response: Response;
    try {
      response = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: blob,
      });
    } catch (err) {
      if (!environment.production) {
        console.error('[UploadService] PUT to R2 failed (network/CSP):', err);
        console.error('[UploadService] Upload URL was:', presign.uploadUrl);
      }
      throw new Error('Falha no envio da imagem para storage (PUT).');
    }

    if (!response.ok) {
      if (!environment.production) {
        const body = await response.text().catch(() => '');
        console.error(`[UploadService] PUT returned ${response.status} ${response.statusText}`, body);
      }
      throw new Error(`Upload falhou: ${response.status} ${response.statusText}`);
    }

    return { imageUrl: presign.publicUrl, imageKey: presign.objectKey };
  }
}
