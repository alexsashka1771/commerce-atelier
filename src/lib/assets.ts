const productIds = [
  "linen-shirt",
  "studio-trouser",
  "wrap-dress",
  "knit-vest",
  "cotton-tee",
  "weekend-jacket",
];

export const productAssets = [
  ...productIds.map((id) => `/images/photo-${id}.webp`),
  ...productIds.map((id) => `/images/${id}.svg`),
];
