/**
 * Same-origin image proxy used only by the admin story canvas.
 * The fixed allowlist prevents this endpoint from becoming an open proxy or SSRF vector.
 */

interface PagesFunctionContext {
  request: Request;
}

const ALLOWED_IMAGE_HOST = 'img.descontovivo.com.br';

function errorResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'allow': 'GET' },
    });
  }

  const requestUrl = new URL(context.request.url);
  const rawImageUrl = requestUrl.searchParams.get('url');
  if (!rawImageUrl) return errorResponse('Missing image URL', 400);

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawImageUrl);
  } catch {
    return errorResponse('Invalid image URL', 400);
  }

  if (
    imageUrl.protocol !== 'https:' ||
    imageUrl.hostname !== ALLOWED_IMAGE_HOST ||
    (imageUrl.port && imageUrl.port !== '443') ||
    imageUrl.username ||
    imageUrl.password
  ) {
    return errorResponse('Image host not allowed', 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl.toString(), {
      headers: { 'accept': 'image/*' },
      redirect: 'manual',
    });
  } catch {
    return errorResponse('Unable to fetch image', 502);
  }

  if (upstream.status === 404) return errorResponse('Image not found', 404);
  if (!upstream.ok) return errorResponse('Unable to fetch image', 502);

  // A redirect could escape the allowlist, so redirects are never followed.
  const contentType = upstream.headers.get('content-type')?.split(';')[0].trim() || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    return errorResponse('Upstream response is not an image', 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*',
      'x-content-type-options': 'nosniff',
    },
  });
}
