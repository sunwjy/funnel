import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, toItem } from "@/lib/products";
import { ProductEvents } from "./product-events";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 상품 상세 페이지 (서버 컴포넌트).
 *
 * @remarks
 * - view_item 이벤트는 ProductEvents 클라이언트 컴포넌트에서 마운트 시 자동으로 발생합니다.
 * - add_to_cart는 TrackButton을 통해 사용자 클릭 시 발생합니다.
 * - 체크아웃으로 이동하면 begin_checkout 이벤트가 checkout 페이지에서 추적됩니다.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    notFound();
  }

  const item = toItem(product, 1);

  return (
    <div className="product-detail">
      <Link href="/" className="back-link">
        ← 목록으로
      </Link>

      <Image src={product.imageUrl} alt={product.name} width={600} height={400} />

      <p className="product-category">{product.category}</p>
      <h1>{product.name}</h1>
      <p className="product-description">{product.description}</p>
      <p className="product-price">{product.price.toLocaleString("ko-KR")}원</p>

      {/*
        ProductEvents는 클라이언트 컴포넌트.
        마운트 시 view_item을 track하고, 버튼 클릭 시 add_to_cart를 track합니다.
      */}
      <ProductEvents product={product} item={item} />
    </div>
  );
}
