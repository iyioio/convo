import { Convo, ConvoMgr, ItemPointer, ListPointer, Member, Message } from '@iyio/convo';
import { useEffect, useState } from 'react';

export function useConversationList(
    mgr:ConvoMgr|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ListPointer<Convo>|null>();
    useEffect(()=>{
        if(!mgr || !userId){
            setPointer(null);
            return;
        }
        const pointer=mgr.getConversationListPointer(userId);
        setPointer(pointer);
        pointer.onListChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[mgr,userId]);

    return pointer;
}

export function useConvo(
    mgr:ConvoMgr|null|undefined,
    convoId:string|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ItemPointer<Convo>|null>();
    useEffect(()=>{
        if(!mgr || !convoId || !userId){
            setPointer(null);
            return;
        }
        const pointer=mgr.getConversationPointer(convoId,userId);
        setPointer(pointer);
        pointer.onItemChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[convoId,mgr,userId]);

    return pointer;
}

export function useMessageList(
    mgr:ConvoMgr|null|undefined,
    convoId:string|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ListPointer<Message>|null>();
    useEffect(()=>{
        if(!mgr || !convoId || !userId){
            setPointer(null);
            return;
        }
        const pointer=mgr.getMessageListPointer(convoId,userId);
        setPointer(pointer);
        pointer.onListChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[convoId,mgr,userId]);

    return pointer;
}

export function useUnreadMessageList(
    mgr:ConvoMgr|null|undefined,
    userId:string|null|undefined)
{
    const [,render]=useState(0)
    const [pointer,setPointer]=useState<ListPointer<Message>|null>();
    useEffect(()=>{
        if(!mgr || !userId){
            setPointer(null);
            return;
        }
        const pointer=mgr.getUnreadMessagesPointer(userId);
        setPointer(pointer);
        pointer.onListChanged(()=>{
            render(v=>v+1);
        })
        return ()=>{
            pointer.dispose();
        }
    },[mgr,userId]);

    return pointer;
}

export function useKnownConvoMembers(
    mgr:ConvoMgr|null|undefined,
    userId:string|null|undefined)
{
    const [members,setMembers]=useState<Member[]|null>(null);

    useEffect(()=>{
        if(!mgr || !userId){
            return;
        }
        let m=true;
        (async ()=>{
            const members=await mgr.getKnownMembersAsync(userId);
            if(m){
                setMembers(members);
            }
        })()
        return ()=>{m=false};
    },[mgr,userId]);

    return members;
}

export function useConversationForMembers(
    mgr:ConvoMgr|null|undefined,
    memberIds:string[]|null|undefined,
    additionalUserId?:string|null)
{
    const [convo,setConvo]=useState<Convo|null>(null);

    useEffect(()=>{
        if(!mgr || !memberIds?.length){
            return;
        }
        let m=true;
        (async ()=>{
            const convo=await mgr.getConversationForMembersAsync(memberIds,additionalUserId||undefined);
            if(m){
                setConvo(convo);
            }
        })()
        return ()=>{m=false};
    },[mgr,memberIds,additionalUserId]);

    return convo;
}