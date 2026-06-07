import type { Item } from "@sunwjy/funnel-client";

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: string;
  description: string;
  imageUrl: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "shoe-001",
    name: "클래식 스니커즈",
    price: 89000,
    currency: "KRW",
    category: "신발",
    description: "편안하고 스타일리시한 클래식 스니커즈입니다.",
    imageUrl: "https://placehold.co/300x200.png?text=Classic+Sneakers",
  },
  {
    id: "shirt-002",
    name: "린넨 셔츠",
    price: 49000,
    currency: "KRW",
    category: "의류",
    description: "여름에 딱 맞는 시원한 린넨 소재 셔츠입니다.",
    imageUrl: "https://placehold.co/300x200.png?text=Linen+Shirt",
  },
  {
    id: "bag-003",
    name: "가죽 토트백",
    price: 129000,
    currency: "KRW",
    category: "가방",
    description: "고품질 가죽으로 제작된 넉넉한 토트백입니다.",
    imageUrl: "https://placehold.co/300x200.png?text=Leather+Tote",
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function toItem(product: Product, quantity = 1): Item {
  return {
    item_id: product.id,
    item_name: product.name,
    price: product.price,
    quantity,
    item_category: product.category,
  };
}
