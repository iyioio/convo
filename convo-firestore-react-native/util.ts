import { ItemPointer, ListPointer } from '@iyio/convo';
import { createEvent } from '@iyio/named-events';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/**
 * Creates a new unique Id
 * @see https://github.com/firebase/firebase-js-sdk/blob/6abd6484730971e2390b2b9acbb61800852fb350/packages/firestore/src/util/misc.ts
 */
export function newId(): string {
    // Alphanumeric characters
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    for (let i = 0; i < 20; i++) {
        autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
}

export const cloneObjSkipUndefined=<T>(obj:T, maxDepth=20):T=>
{
    if(maxDepth<0){
        throw new Error('cloneObj max depth reached');
    }
    maxDepth--;
    if(!obj || typeof obj !== 'object'){
        return obj;
    }

    if(Array.isArray(obj)){
        const clone=[];
        for(let i=0;i<obj.length;i++){
            const o=obj[i];
            if(o===undefined){
                continue;
            }
            clone.push(cloneObjSkipUndefined(o,maxDepth));
        }
        return clone as any;
    }else{
        const clone:any={}
        for(const e in obj){
            const o=obj[e];
            if(o===undefined){
                continue;
            }
            clone[e]=cloneObjSkipUndefined(o,maxDepth);
        }
        return clone;
    }

}


export function syncSnapshot<T>(
    query:FirebaseFirestoreTypes.Query<T>,
    ary:T[],
    beforeChange?:(snapshot:FirebaseFirestoreTypes.QuerySnapshot<T>)=>boolean,
    onChange?:()=>void):()=>void
{
    let firstSnap=true;
    return query.onSnapshot((snap)=>{
        if(beforeChange?.(snap)===false){
            return;
        }
        if(firstSnap){
            firstSnap=false;
            ary.splice(0,ary.length);
            for(const doc of snap.docs){
                ary.push(doc.data() as T);
            }
        }else{
            for(const change of snap.docChanges()){
                switch(change.type){

                    case 'added':
                        ary.splice(change.newIndex,0,change.doc.data() as T)
                        break;

                    case 'removed':
                        ary.splice(change.oldIndex,1);
                        break;

                    case 'modified':
                        if(change.oldIndex==change.newIndex || change.newIndex===-1 || change.oldIndex===-1){
                            ary[Math.max(change.oldIndex,change.newIndex)]=change.doc.data() as T;
                        }else{
                            ary.splice(change.oldIndex,1);
                            ary.splice(change.newIndex,0,change.doc.data() as T);
                        }
                        break;
                }
            }
        }
        onChange?.();
    },()=>{
        firstSnap=true;
    });
}

export interface CreateListPointerOptions<T>
{
    buildQuery:(start:T|null,limit:number)=>FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData>;
    defaultLimit?:number;
    defaultStart?:T|null;
}

export function createListPointer<T>({
    buildQuery,
    defaultLimit=100,
    defaultStart=null,
}:CreateListPointerOptions<T>):ListPointer<T>{
    
    const list:T[]=[];

    let limit=defaultLimit;
    let start:T|null=defaultStart;
    let disposed=false;

    const setStart=(v:T|null)=>{
        if(v===start){
            return;
        }
        start=v;
        update();
    }

    const setLimit=(v:number)=>{
        if(v<0){
            v=0;
        }
        if(v===limit){
            return;
        }
        limit=v;
        update();

    }

    const dispose=()=>{
        disposed=true;
        update();
    }

    const onListChanged=createEvent();


    const pointer={
        list,
        getStart:()=>start,
        setStart,
        getLimit:()=>limit,
        setLimit,
        onListChanged:onListChanged.evt,
        dispose,
        changeCount:0
    }

    let releaseSnap:(()=>void)|null=null;
    let updateId=0;
    const update=()=>{

        const id=++updateId;

        releaseSnap?.();
        releaseSnap=null;
        if(disposed){
            return;
        }

        const query=buildQuery(start,limit)

        releaseSnap=syncSnapshot(
            query,
            list,
            ()=>id===updateId,
            ()=>{
                (pointer as any).changeCount++;
                onListChanged.trigger()
            });
            
    }

    update();

    return pointer;
}


export interface CreateItemPointerOptions<T>
{
    buildQuery:()=>FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>;
}

export function createItemPointer<T>({
    buildQuery,
}:CreateItemPointerOptions<T>):ItemPointer<T>{
    
    let disposed=false;

    const dispose=()=>{
        disposed=true;
        update();
    }
    const onItemChanged=createEvent();

    const pointer:ItemPointer<T>={
        item:null,
        onItemChanged:onItemChanged.evt,
        dispose,
        changeCount:0
    }


    let releaseSnap:(()=>void)|null=null;
    let updateId=0;
    const update=()=>{

        const id=++updateId;

        releaseSnap?.();
        releaseSnap=null;
        if(disposed){
            return;
        }

        const query=buildQuery()

        releaseSnap=query.onSnapshot((snap)=>{
            if(id!==updateId || !snap){
                return;
            }
            if(snap.exists){
                (pointer as any).item=snap.data();
            }else{
                (pointer as any).item=null;
            }
            (pointer as any).changeCount++;
            onItemChanged.trigger();
        })  
    }

    update();

    return pointer;
}