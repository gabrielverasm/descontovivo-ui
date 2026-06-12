import { Comment } from '../models/comment.model';
import { PROMOTIONS_MOCK } from './promotions.mock';

const SEEDED_COMMENTS_MOCK: Comment[] = [
  {
    id: 'comment-fone-1',
    promotionId: 'fone-bluetooth-aura',
    author: {
      id: 'user-marina',
      name: 'Marina Costa',
      role: 'user'
    },
    content: 'Muito bom preço, comprei ontem e chegou rápido. O cancelamento de ruído surpreendeu pelo valor.',
    createdAt: '2026-05-28T15:34:00.000Z',
    likesCount: 18,
    dislikesCount: 1
  },
  {
    id: 'comment-fone-2',
    promotionId: 'fone-bluetooth-aura',
    author: {
      id: 'user-rafa',
      name: 'Rafa Lima',
      role: 'user'
    },
    content: 'Aqui apareceu frete grátis acima de R$ 299, vale conferir se muda por região antes de fechar.',
    createdAt: '2026-05-28T16:12:00.000Z',
    likesCount: 11,
    dislikesCount: 0
  },
  {
    id: 'comment-fone-3',
    promotionId: 'fone-bluetooth-aura',
    author: {
      id: 'user-ana',
      name: 'Ana Souza',
      role: 'moderator'
    },
    content: 'Oferta revisada. Loja e vendedor batem com as informações publicadas, mas confirmem prazo no checkout.',
    createdAt: '2026-05-28T17:02:00.000Z',
    likesCount: 24,
    dislikesCount: 0
  },
  {
    id: 'reply-fone-1-1',
    promotionId: 'fone-bluetooth-aura',
    parentCommentId: 'comment-fone-1',
    author: {
      id: 'user-lucas',
      name: 'Lucas Andrade',
      role: 'user'
    },
    content: 'Também peguei esse valor. Para mim o prazo ficou em dois dias úteis.',
    createdAt: '2026-05-28T18:20:00.000Z',
    likesCount: 5,
    dislikesCount: 0
  },
  {
    id: 'comment-echo-1',
    promotionId: 'echo-dot-amazon-prime',
    author: {
      id: 'user-joao',
      name: 'João Martins',
      role: 'user'
    },
    content: 'Para quem usa Alexa todo dia, esse valor está bem interessante. Peguei com Prime e o prazo ficou ótimo.',
    createdAt: '2026-05-29T11:05:00.000Z',
    likesCount: 16,
    dislikesCount: 2
  },
  {
    id: 'comment-cafeteira-1',
    promotionId: 'cafeteira-compacta',
    author: {
      id: 'user-bruno',
      name: 'Bruno Freitas',
      role: 'user'
    },
    content: 'Boa opção compacta para cozinha pequena. Só recomendo medir a bancada antes porque o vaporizador ocupa espaço.',
    createdAt: '2026-05-29T10:08:00.000Z',
    likesCount: 7,
    dislikesCount: 0
  }
];

const generatedAuthors = [
  { id: 'user-nina', name: 'Nina Melo', role: 'user' as const },
  { id: 'user-gui', name: 'Gui Barros', role: 'user' as const },
  { id: 'user-lu', name: 'Lu Fernandes', role: 'user' as const },
  { id: 'user-bia', name: 'Bia Torres', role: 'user' as const },
  { id: 'user-pedro', name: 'Pedro Rocha', role: 'user' as const }
];

const commentTemplates = [
  'Alguém conseguiu chegar nesse preço hoje? Aqui ainda apareceu disponível.',
  'Achei interessante pelo histórico de preço, mas vale conferir frete antes de fechar.',
  'Para mim o prazo ficou bom no carrinho. O valor final continuou parecido.',
  'Boa oferta para quem já estava acompanhando esse produto.',
  'Conferi agora e ainda aparece ativo por aqui.'
];

const generatedComments = PROMOTIONS_MOCK.flatMap((promotion) => {
  const seededCount = SEEDED_COMMENTS_MOCK.filter((comment) => comment.promotionId === promotion.id).length;
  const commentsToCreate = Math.max(0, promotion.commentsCount - seededCount);
  const baseTime = new Date(promotion.createdAt).getTime();

  return Array.from({ length: commentsToCreate }, (_,index): Comment => {
    const author = generatedAuthors[index % generatedAuthors.length];
    const content = commentTemplates[index % commentTemplates.length];

    return {
      id: `comment-${promotion.id}-${index + 1}`,
      promotionId: promotion.id,
      author,
      content,
      createdAt: new Date(baseTime + (index + seededCount + 1) * 23 * 60 * 1000).toISOString(),
      likesCount: Math.max(0, Math.round(promotion.likesCount / 18) - (index % 3)),
      dislikesCount: index % 5 === 0 ? 1 : 0
    };
  });
});

export const COMMENTS_MOCK: Comment[] = [...SEEDED_COMMENTS_MOCK, ...generatedComments];

export function getPromotionComments(promotionId: string) {
  return COMMENTS_MOCK.filter((comment) => comment.promotionId === promotionId).sort(
    (firstComment, secondComment) =>
      new Date(secondComment.createdAt).getTime() - new Date(firstComment.createdAt).getTime()
  );
}

export function getRootPromotionComments(promotionId: string) {
  return getPromotionComments(promotionId).filter((comment) => !comment.parentCommentId);
}

export function getPromotionCommentCount(promotionId: string) {
  return getPromotionComments(promotionId).length;
}

export function getLatestPromotionComment(promotionId: string) {
  return getPromotionComments(promotionId)[0];
}
