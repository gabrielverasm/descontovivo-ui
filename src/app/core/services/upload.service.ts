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
    const presign = await firstValueFrom(
      this.http.post<PresignResponse>(
        `${environment.apiBaseUrl}/uploads/promotion-image/presign`,
        { contentType: 'image/webp', fileSize: blob.size },
      ),
    );

    const response = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Upload falhou: ${response.status} ${response.statusText}`);
    }

    return { imageUrl: presign.publicUrl, imageKey: presign.objectKey };
  }
}
