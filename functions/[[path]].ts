import csrHtml from '../dist/descontovivo-ui/browser/index.csr.html';
import { handleCsrRoute } from '../src/pages-functions/csr-route-handler';

interface PagesFunctionContext {
  request: Request;
  next: () => Promise<Response>;
}

export function onRequest(context: PagesFunctionContext): Promise<Response> {
  return handleCsrRoute(context.request, csrHtml, context.next);
}
