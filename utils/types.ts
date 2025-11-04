/* eslint-disable no-unused-vars */
export interface ImageProps {
  id: number;
  height: number;
  width: number;
  public_id: string;
  format: string;
  blurDataUrl?: string;
  album?: string;
  description?: string;
  imageName?: string;
}

export type GalleryUserRole = "admin" | "member";

export interface GalleryUser {
  id: string;
  displayName: string;
  folder: string;
  avatarPublicId?: string;
  avatarUrl?: string;
  pinHint?: string;
  role: GalleryUserRole;
}

export interface SharedModalProps {
  index: number;
  images?: ImageProps[];
  currentPhoto?: ImageProps;
  changePhotoId: (newVal: number) => void;
  closeModal: () => void;
  navigation: boolean;
  direction?: number;
}
