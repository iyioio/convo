import { Convo, ConvoClient, ItemPointer, ListPointer, Member, Message } from '@iyio/convo';
import { useEffect, useState } from 'react';

export function useConversationList(
    client:ConvoClient|null|undefined,
    userId:string|null|undefined,
    tags?:string[]|null)
{
    tags=useTagList(tags);
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ListPointer<Convo>|null>();
    useEffect(()=>{
        if(!client || !userId){
            setPointer(null);
            return;
        }
        const pointer=client.getConversationListPointer(userId,tags||undefined);
        setPointer(pointer);
        pointer.onListChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[client,userId,tags]);

    return pointer;
}

export function useConvo(
    client:ConvoClient|null|undefined,
    convoId:string|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ItemPointer<Convo>|null>();
    useEffect(()=>{
        if(!client || !convoId || !userId){
            setPointer(null);
            return;
        }
        const pointer=client.getConversationPointer(convoId,userId);
        setPointer(pointer);
        pointer.onItemChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[convoId,client,userId]);

    return pointer;
}

export function useMessageList(
    client:ConvoClient|null|undefined,
    convoId:string|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ListPointer<Message>|null>();
    useEffect(()=>{
        if(!client || !convoId || !userId){
            setPointer(null);
            return;
        }
        const pointer=client.getMessageListPointer(convoId,userId);
        setPointer(pointer);
        pointer.onListChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[convoId,client,userId]);

    return pointer;
}

export function useUnreadMessageList(
    client:ConvoClient|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ListPointer<Message>|null>();
    useEffect(()=>{
        if(!client || !userId){
            setPointer(null);
            return;
        }
        const pointer=client.getUnreadMessagesPointer(userId);
        setPointer(pointer);
        pointer.onListChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[client,userId]);

    return pointer;
}

export function useKnownConvoMembers(
    client:ConvoClient|null|undefined,
    userId:string|null|undefined)
{
    const [members,setMembers]=useState<Member[]|null>(null);

    useEffect(()=>{
        if(!client || !userId){
            return;
        }
        let m=true;
        (async ()=>{
            const members=await client.getKnownMembersAsync(userId);
            if(m){
                setMembers(members);
            }
        })()
        return ()=>{m=false};
    },[client,userId]);

    return members;
}

export function useConversationForMembers(
    client:ConvoClient|null|undefined,
    memberIds:string[]|null|undefined,
    additionalUserId?:string|null,
    tags?:string[])
{
    const [convo,setConvo]=useState<Convo|null>(null);

    tags=useTagList(tags);

    useEffect(()=>{
        if(!client || !memberIds?.length){
            return;
        }
        let m=true;
        (async ()=>{
            const convo=await client.getConversationForMembersAsync(memberIds,additionalUserId||undefined,tags||undefined);
            if(m){
                setConvo(convo);
            }
        })()
        return ()=>{m=false};
    },[client,memberIds,additionalUserId,tags]);

    return convo;
}

/**
 * Returns a merged copy of the tags.
 */
export function useTagList(tags:string[]|null|undefined):string[]|undefined
{
    tags=tags?[...tags]:undefined;
    tags?.sort((a,b)=>a.localeCompare(b));
    const [tagCopy,setTagCopy]=useState(tags||undefined);

    useEffect(()=>{
        if(!tags){
            if(tagCopy){
                setTagCopy(undefined);
            }
        }else if(!tagCopy || tags.length!==tagCopy?.length){
            setTagCopy(tags);
        }else{
            for(let i=0;i<tags.length;i++){
                if(tags[i]!==tagCopy[i]){
                    setTagCopy(tags);
                    break;
                }
            }
        }
    },[tags,tagCopy]);


    return tagCopy;


}