import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/lib/store';
import { mergeCartBatch, outfitItems, restoreSaved, toggleSaved } from '../src/lib/wardrobe';

test('an outfit keeps selected sizes and exact product prices', () => {
 const store=new Store(':memory:');const pieces=[store.product('linen-shirt')!,store.product('studio-trouser')!];
 const selections=Object.fromEntries(pieces.map(p=>[p.id,p.variants.find(v=>v.size==='L')!.id]));
 const items=outfitItems(pieces,selections);assert.equal(items.length,2);assert.ok(items.every(i=>i.size==='L'));assert.equal(items.reduce((n,i)=>n+i.price,0),20000);store.db.close();
});
test('a sold out or unknown selection cannot partially add an outfit', () => {
 const store=new Store(':memory:');const p=store.product('linen-shirt')!;const v=p.variants[0];
 assert.throws(()=>outfitItems([p],{[p.id]:'missing'}),/selection/i);
 assert.throws(()=>outfitItems([{...p,variants:[{...v,stock:0}]}],{[p.id]:v.id}),/stock/i);store.db.close();
});
test('batch cart additions reject overstock atomically and combine duplicates', () => {
 const store=new Store(':memory:');const p=store.product('linen-shirt')!;const item=outfitItems([p],{[p.id]:p.variants[0].id})[0];
 const current=[{...item,stock:2,quantity:1}];assert.throws(()=>mergeCartBatch(current,[{...item,stock:2,quantity:2}]),/stock/i);assert.equal(current[0].quantity,1);
 assert.equal(mergeCartBatch([],[item,item])[0].quantity,2);store.db.close();
});
test('saved pieces tolerate corrupt storage, deduplicate and enforce a bounded list', () => {
 assert.deepEqual(restoreSaved('bad json'),[]);assert.deepEqual(restoreSaved('["linen-shirt","linen-shirt",5]'),['linen-shirt']);
 assert.deepEqual(toggleSaved(['linen-shirt'],'linen-shirt'),[]);assert.equal(restoreSaved(JSON.stringify(Array.from({length:500},(_,i)=>'p-'+i))).length,100);
});
