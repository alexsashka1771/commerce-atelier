import {getStore} from '@/lib/store';
import {Lookbook} from '@/components/lookbook';
export const dynamic='force-dynamic';
export const metadata={title:'The lookbook'};
export default async function Page({searchParams}:{searchParams:Promise<{look?:string}>}){const {look}=await searchParams;return <Lookbook products={getStore().products()} initialLook={look}/>;}
