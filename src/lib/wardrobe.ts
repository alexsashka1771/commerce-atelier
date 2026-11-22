import type {Product} from './store';
import type {CartItem} from '../components/cart-provider';

export const looks = [
 {id:'daily-uniform',name:'The daily uniform',description:'Linen and cotton, with room to move.',pieces:['linen-shirt','studio-trouser'],image:'/images/look-daily.webp'},
 {id:'slow-sunday',name:'A slower Sunday',description:'Warm color. A soft extra layer.',pieces:['wrap-dress','knit-vest'],image:'/images/look-sunday.webp'},
 {id:'weekend-away',name:'A weekend away',description:'Three familiar pieces, ready to go.',pieces:['weekend-jacket','cotton-tee','studio-trouser'],image:'/images/look-weekend.webp'},
] as const;

export function outfitItems(products:Product[],selection:Record<string,string>):CartItem[]{
 if(!products.length || new Set(products.map(p=>p.id)).size!==products.length)throw new Error('Choose a complete outfit');
 return products.map(p=>{
  const v=p.variants.find(v=>v.id===selection[p.id] && v.active!==0);
  if(!v || p.active===0)throw new Error('Choose a valid size selection for every piece');
  if(v.stock<1)throw new Error('One selected piece is out of stock');
  return {variantId:v.id,productId:p.id,name:p.name,size:v.size,color:v.color,price:p.price,quantity:1,image:p.image,stock:v.stock};
 });
}
export function mergeCartBatch(current:CartItem[],batch:CartItem[]):CartItem[]{
 const next=current.map(i=>({...i}));
 for(const item of batch){
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1||!Number.isSafeInteger(item.stock)||item.stock<1)throw new Error('Invalid stock or quantity');
  const previous=next.find(i=>i.variantId===item.variantId);const quantity=(previous?.quantity??0)+item.quantity;
  if(quantity>item.stock || quantity>20)throw new Error('Selected quantity exceeds available stock');
  if(previous)Object.assign(previous,item,{quantity});else next.push({...item,quantity});
 }
 return next;
}
export function restoreSaved(raw:string|null):string[]{
 try{const parsed=JSON.parse(raw||'[]');return Array.isArray(parsed)?[...new Set(parsed.filter((id):id is string=>typeof id==='string' && /^[a-z0-9-]{1,160}$/.test(id)))].slice(0,100):[];}catch{return [];}
}
export function toggleSaved(ids:string[],id:string):string[]{return ids.includes(id)?ids.filter(x=>x!==id):restoreSaved(JSON.stringify([id,...ids]));}
