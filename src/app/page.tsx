import Link from "next/link";
import { getStore } from "@/lib/store";
import { ProductCard } from "@/components/catalog";
import { looks } from '@/lib/wardrobe';
import { money } from '@/lib/format';
export const dynamic = "force-dynamic";

export default function Home() {
  const products = getStore().products();
  return (
    <>
      <section className="hero magazine-spread">
        <div className="hero-copy"><div className="spread-rule" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M60 6v108M6 60h108M22 22l76 76M22 98l76-76"/><circle cx="60" cy="60" r="33"/></svg></div>
          <h1>Good clothes.<br /><em>Real life.</em></h1><div className="spread-margin" aria-hidden="true">EVERYDAY, CONSIDERED.</div>
          <p>Easy shapes. Natural textures.<br />A small wardrobe with a point of view.</p>
          <Link className="button" href="/collections">Explore the collection <span aria-hidden="true">↗</span></Link>
          <Link className="hero-product-link" href="/product/linen-shirt">Start with the everyday linen shirt</Link>
        </div>
        <div className="hero-art">
          <img src="/images/look-daily.webp" alt="The oat linen shirt and clay studio trousers, arranged as an everyday outfit" width="800" height="1000" fetchPriority="high" />
          <div className="hero-caption"><span>The daily uniform<br/><small>Linen shirt + studio trouser</small></span><Link href="/lookbook">Shop this look <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>
      <div className="collection-index"><span>Find your next everyday</span>{[...new Set(products.map(p=>p.category))].map(c=><Link key={c} href={`/collections?category=${encodeURIComponent(c)}`}>{c}<small>{products.filter(p=>p.category===c).length} {products.filter(p=>p.category===c).length===1?'piece':'pieces'}</small><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></Link>)}</div>
      <section className="section collection-section">
        <div className="section-heading">
          <div><h2>Your everyday, <em>considered.</em></h2><p>A small wardrobe. Plenty of possibilities.</p></div>
          <Link className="text-link" href="/collections">Shop all pieces <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>
      <section className="ways-section"><div className="section-heading"><div><h2>Wear it your way.</h2><p>Individual pieces. Better together.</p></div><Link className="text-link" href="/lookbook">Open the lookbook</Link></div><div className="look-editorials">{looks.map(look=>{const pieces=look.pieces.map(id=>products.find(p=>p.id===id));if(pieces.some(p=>!p))return null;return <Link href={`/lookbook?look=${look.id}`} key={look.id} className="look-editorial"><div><img src={look.image} alt={look.name} width="500" height="660" loading="lazy"/><span>Shop {look.pieces.length} pieces</span></div><h3>{look.name}</h3><p>{look.description}</p><small>Complete look · {money(pieces.reduce((s,p)=>s+p!.price,0))}</small></Link>;})}</div></section>
      <section className="fabric-journal"><div className="journal-heading"><h2>Feel the difference.</h2><p>A closer look at the materials in the collection.</p><Link className="text-link" href="/about">Inside Atelier</Link></div><div className="fabric-story"><img src="/images/photo-linen-shirt.webp" alt="Linen shirt material and construction" width="450" height="450" loading="lazy"/><div><h3>Linen, with a little life in it.</h3><p>The natural texture is part of the appeal. Airy layers and relaxed shapes, from the everyday shirt to the Sunday wrap dress.</p><Link href="/product/linen-shirt">Explore the linen shirt</Link></div></div><div className="fabric-story"><img src="/images/photo-knit-vest.webp" alt="Butter cotton knit vest" width="450" height="450" loading="lazy"/><div><h3>Soft layers. Easy company.</h3><p>A cotton knit vest brings texture to a simple outfit. Wear it over the tee or with the wrap dress.</p><Link href="/product/knit-vest">Explore the knit vest</Link></div></div></section>
      <section className="shop-help"><h2>The little details.</h2><div><details><summary>Finding your size</summary><p>Each product has a size guide and live size availability. In the lookbook, choose a separate size for every piece.</p><Link href="/lookbook">Build an outfit</Link></details><details><summary>Delivery and payment</summary><p>The bag and checkout show shipping before confirmation. Cash on delivery is available; online card checkout uses the configured Stripe test integration.</p></details><details><summary>Keep a shortlist</summary><p>Use the bookmark on any piece to save it in this browser. Your saved collection stays separate from your shopping bag.</p><Link href="/saved">Open saved pieces</Link></details><details><summary>A question about a piece?</summary><p>The studio contact form saves your inquiry for the administrator to review.</p><Link href="/contact">Contact the studio</Link></details></div></section>
    </>
  );
}
