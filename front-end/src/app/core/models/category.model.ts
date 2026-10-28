export interface Category {
  id: string;
  userId: number;
  name: string;
  /** Parent category id for subcategorias / grupos */
  parentId: string | null;
}

export interface CategoryCreateDto {
  name: string;
  parentId: string | null;
}

export interface CategoryUpdateDto {
  name: string;
  parentId: string | null;
}
