export type Layout = 'masonry' | 'grid' | 'showcase';
export type Kind = 'image' | 'video' | 'pdf' | 'file';

export interface Project {
  id: string;
  title: string;
  description: string;
  client: string;
  tags: string[];
  layout: Layout;
  coverId: string | null;
  order: string[]; // item ids, in display order
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  projectId: string;
  name: string;
  mime: string;
  kind: Kind;
  size: number;
  width: number; // 0 when unknown
  height: number;
  color: string; // dominant colour, used as a placeholder while loading
  caption: string;
  hasThumb: boolean;
  createdAt: number;
}
