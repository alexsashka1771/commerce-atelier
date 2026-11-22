"use client";
import Link from 'next/link';
import {useSyncExternalStore} from 'react';
import type {Product} from '@/lib/store';
import {restoreSaved,toggleSaved} from '@/lib/wardrobe';
import {ProductCard} from './catalog';
const key='atelier-saved-v1';let memory='';
const subscribe=(callback:()=>void)=>{window.addEventListener('storage',callback);window.addEventListener('atelier-saved',callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener('atelier-saved',callback);};};
const snapshot=()=>{try{return localStorage.getItem(key)||memory;}catch{return memory;}};
function useSaved(){return restoreSaved(useSyncExternalStore(subscribe,snapshot,()=>''));}
export function SavedLink(){const ids=useSaved();return <Link href="/saved" className="saved-link" aria-label={`Saved pieces, ${ids.length} items`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 3h14v19l-7-5-7 5z"/></svg><span>Saved ({ids.length})</span></Link>;}
export function SavePiece({product}:{product:Product}){
 const ids=useSaved();const saved=ids.includes(product.id);
 return <button className="save-piece" aria-label={`${saved?'Unsave':'Save'} ${product.name}`} aria-pressed={saved} onClick={()=>{memory=JSON.stringify(toggleSaved(ids,product.id));try{localStorage.setItem(key,memory);}catch{/* Keep session-only saved pieces when browser storage is unavailable. */}window.dispatchEvent(new Event('atelier-saved'));}}><svg width="16" height="16" viewBox="0 0 24 24" fill={saved?'currentColor':'none'} stroke="currentColor" aria-hidden="true"><path d="M5 3h14v19l-7-5-7 5z"/></svg><span>{saved?'Saved':'Save'}</span></button>;
}
export function SavedPieces({products}:{products:Product[]}){
 const ids=useSaved();const pieces=products.filter(p=>ids.includes(p.id));
 return <section className="section saved-page"><div className="section-heading"><div><h1>A little shortlist.</h1><p>{pieces.length} saved pieces. Kept in this browser, ready when you are.</p></div><Link href="/collections" className="text-link">Continue exploring</Link></div>{pieces.length?<div className="product-grid">{pieces.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="saved-empty"><h2>Keep what catches your eye.</h2><p>Save a piece from the collection to start your shortlist.</p><Link className="button" href="/collections">Explore the collection</Link></div>}</section>;
}
