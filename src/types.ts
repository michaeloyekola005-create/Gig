export type Layout = 'grid' | 'masonry' | 'large' | 'list';
export type Kind = 'image' | 'video' | 'pdf' | 'file';

export const ROOT = 'root';

export interface Folder {
  id: string;
  title: string;
  parentId: string | null; // null only for the root ("My Drive")
  layout: Layout;
  coverId: string | null; // item shown on the folder's card
  order: string[]; // file ids, in display order
  folderOrder: string[]; // sub-folder ids, in display order
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  folderId: string;
  name: string;
  mime: string;
  kind: Kind;
  size: number;
  width: number; // 0 when unknown
  height: number;
  color: string; // dominant colour, used as a placeholder while loading
  hasThumb: boolean;
  createdAt: number;
}
