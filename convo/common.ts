import { SendMessageRequest } from "./convo-types";

export const tagBot='bot';

export function isServiceMatch(serviceTags:string[], messageTags:string[]|undefined)
{
    if(!Array.isArray(messageTags)){
        messageTags=undefined;
    }

    if(!serviceTags.length){
        return messageTags?.length?false:true;
    }

    if(!messageTags){
        return false;
    }

    for(const tag of messageTags){
        if(serviceTags.includes(tag)){
            return true;
        }
    }

    return false;
}

export function convertRequestToMessage(request:SendMessageRequest)
{
    if(!request.convoId){
        throw new Error('SendMessageRequest must define a convoId')
    }

    let notify=request.notify?[...request.notify]:[];

    if(request.senderId){
        if(request.notifySender){
            if(!notify.includes(request.senderId)){
                notify.push(request.senderId);
            }
        }else{
            if(notify.includes(request.senderId)){
                notify=notify.filter(id=>id!==request.senderId);
            }
        }
    }

    const read:{[memberId:string]:boolean}={}
    for(const n of notify){
        read[n]=false;
    }


    return {
        convoId:request.convoId,
        senderId:request.senderId,
        senderName:request.senderName,
        receiverId:request.receiverId,
        serviceTags:Array.isArray(request.serviceTags)?[...request.serviceTags]:request.serviceTags,
        created:request.created===undefined?Date.now():request.created,
        text:request.text,
        contentType:request.contentType,
        content:request.content,
        contentUri:request.contentUri,
        contentThumbnailUrl:request.contentThumbnailUrl,
        contentData:request.contentData,
        notify:notify,
        tags:sortTags(request.tags),
        data:request.data?{...request.data}:undefined,
        read
    };
}

export function sortTags(tags:string[]|undefined):string[]|undefined
{
    if(!tags){
        return undefined;
    }
    tags=[...tags];
    tags.sort((a,b)=>a.localeCompare(b));
    return tags;
}


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
