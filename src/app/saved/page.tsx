import {getStore} from '@/lib/store';
import {SavedPieces} from '@/components/saved-pieces';
export const dynamic='force-dynamic';
export const metadata={title:'Saved pieces'};
export default function Page(){return <SavedPieces products={getStore().products()}/>;}
