import { UI_VERSION } from '../app-version';

export interface PageViewParams {
  page_path: string;
  page_title: string;
  ui_version: string;
}

export interface ViewPromotionParams {
  promotion_id: string;
  promotion_slug: string;
  store_name: string;
  current_price: number;
  ui_version: string;
}

export interface ClickStoreParams {
  promotion_id: string;
  promotion_slug: string;
  store_name: string;
  source_component: 'card' | 'detail';
  position?: number;
  ui_version: string;
}

export interface ShareParams {
  method: 'whatsapp' | 'native_share' | 'copy_link' | 'instagram';
  content_type: 'promotion';
  item_id: string;
  store_name: string;
  ui_version: string;
}

export interface PromotionVoteParams {
  promotion_id: string;
  promotion_slug: string;
  vote_type: string;
  ui_version: string;
}

export interface CommentSubmitParams {
  promotion_id: string;
  promotion_slug: string;
  ui_version: string;
}

export function buildPageViewParams(path: string, title: string): PageViewParams {
  return { page_path: path, page_title: title, ui_version: UI_VERSION };
}

export function buildViewPromotionParams(
  id: string,
  slug: string,
  storeName: string,
  currentPrice: number,
): ViewPromotionParams {
  return {
    promotion_id: id,
    promotion_slug: slug,
    store_name: storeName,
    current_price: currentPrice,
    ui_version: UI_VERSION,
  };
}

export function buildClickStoreParams(
  id: string,
  slug: string,
  storeName: string,
  source: 'card' | 'detail',
  position?: number,
): ClickStoreParams {
  const params: ClickStoreParams = {
    promotion_id: id,
    promotion_slug: slug,
    store_name: storeName,
    source_component: source,
    ui_version: UI_VERSION,
  };
  if (position != null) params.position = position;
  return params;
}

export function buildShareParams(
  method: ShareParams['method'],
  itemId: string,
  storeName: string,
): ShareParams {
  return {
    method,
    content_type: 'promotion',
    item_id: itemId,
    store_name: storeName,
    ui_version: UI_VERSION,
  };
}

export function buildPromotionVoteParams(
  id: string,
  slug: string,
  voteType: string,
): PromotionVoteParams {
  return {
    promotion_id: id,
    promotion_slug: slug,
    vote_type: voteType,
    ui_version: UI_VERSION,
  };
}

export function buildCommentSubmitParams(id: string, slug: string): CommentSubmitParams {
  return {
    promotion_id: id,
    promotion_slug: slug,
    ui_version: UI_VERSION,
  };
}
