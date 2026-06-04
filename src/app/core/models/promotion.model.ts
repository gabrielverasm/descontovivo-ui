export interface Promotion {
  id: number;
  store: string;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  discount: string;
  votes: number;
  comments: number;
  postedAt: string;
  featured?: boolean;
}
