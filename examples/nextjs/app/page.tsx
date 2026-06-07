import Image from "next/image";
import Link from "next/link";
import { PRODUCTS } from "@/lib/products";

/**
 * 홈 — 상품 목록 페이지 (서버 컴포넌트).
 *
 * @remarks
 * 이 페이지는 서버 컴포넌트로 렌더링됩니다.
 * page_view 이벤트는 FunnelProvider(클라이언트)에서 usePathname()을 통해 자동으로 추적됩니다.
 * 상품 상세 이동 링크는 Next.js Link 컴포넌트를 사용합니다.
 */
export default function HomePage() {
  return (
    <div>
      <div className="page-header">
        <h1>상품 목록</h1>
        <p>상품을 클릭하면 view_item 이벤트가 기록됩니다.</p>
      </div>

      <div className="product-grid">
        {PRODUCTS.map((product) => (
          <div key={product.id} className="product-card">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={300}
              height={200}
              className="product-image"
            />
            <div className="product-info">
              <p className="product-category">{product.category}</p>
              <h2 className="product-name">{product.name}</h2>
              <p className="product-price">{product.price.toLocaleString("ko-KR")}원</p>
              <div className="product-actions">
                <Link
                  href={`/product/${product.id}`}
                  className="btn-primary"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                  }}
                >
                  상세 보기
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
