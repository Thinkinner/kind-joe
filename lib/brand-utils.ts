export function getArticleLink(article: { slug: string; category?: string | null }) {
  const isVentura = article.category?.toLowerCase().includes("ventura");
  return isVentura ? `/ventura/${article.slug}` : `/news/${article.slug}`;
}

export function getBrandTheme(category?: string | null) {
  const isVentura = category?.toLowerCase().includes("ventura");
  return {
    primary: isVentura ? "bg-orange-600" : "bg-red-600",
    text: isVentura ? "text-orange-600" : "text-red-600",
    hoverText: isVentura ? "hover:text-orange-700" : "hover:text-blue-900",
    border: isVentura ? "border-orange-100" : "border-neutral-100",
    name: isVentura ? "Joe Knows Ventura" : "The Kind Joe",
    logo: isVentura 
      ? "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691ccd8896e2873808164bed.png"
      : "https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/691cf02c6a5d3b0cfda50cf9.png"
  };
}