/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Allow CSS/SCSS side-effect imports (no module value needed)
declare module "*.css" {
  const _: Record<string, string>;
  export default _;
}
declare module "*.scss" {
  const _: Record<string, string>;
  export default _;
}
