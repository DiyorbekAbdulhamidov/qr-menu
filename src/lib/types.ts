export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: number;
}

export interface Restaurant {
  id: string; // The slug
  name: string;
  ownerId: string;
  logoUrl?: string;
  themeColor?: string;
}