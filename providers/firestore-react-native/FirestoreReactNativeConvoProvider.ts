import { Convo, ConvoInfo, ConvoNoId, ConvoProvider, ConvoUserId, DateTimeValue, Message, MessageListPointer, MessageNoId } from '@iyio/convo';
import { createEvent } from '@iyio/named-events';
import firestore from '@react-native-firebase/firestore';
import { cloneObjSkipUndefined, newId, syncSnapshot } from './util';

const getConfig:any={source:'server'}

export class FirestoreReactNativeConvoProvider implements ConvoProvider
{
    // name of the collection to store conversations in
    private readonly cn:string;

    private get db(){
        const db=firestore();
        //db.settings({host:'192.168.77.159:8199'})
        //db.useEmulator('192.168.77.159',8189)
        return db;    
    }

    private get conversations(){return this.db.collection(this.cn)}

    public constructor(convoCollection:string)
    {
        this.cn=convoCollection;
    }


    public async getConversationsAsync(userId:ConvoUserId): Promise<ConvoInfo[]>
    {
        return (await this.conversations
            .where('memberIds','array-contains',userId)
            .orderBy('lastChanged','desc')
            .get(getConfig))
            .docs.map(d=>d.data() as ConvoInfo);
            
    }

    public async getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message[]>
    {
        const messages=await this.conversations
            .doc(convoId)
            .collection('messages')
            .orderBy('created','desc')
            .where('created','<=',startDate)
            .limit(count)
            .get(getConfig);

        return messages.docs.map(doc=>doc.data()) as Message[];
    }
    
    public async startConversationAsync(convoNoId: ConvoNoId, setNameToId: boolean):Promise<Convo>
    {
        const id=newId();
        const convo:Convo=cloneObjSkipUndefined({
            ...convoNoId,
            id,
            name:setNameToId?id:convoNoId.name
        });

        console.log('create convo',convo)
        
        await this.conversations.doc(id).set(convo);

        console.log('CREATED')

        return convo;

    }
    
    public async getConversationAsync(convoId:string):Promise<Convo|null>
    {
        const convo=await this.conversations.doc(convoId).get(getConfig);
        return convo.exists?convo.data() as Convo:null;
    }

    public async sendMessageAsync(messageNoId:MessageNoId):Promise<Message>
    {
        const msg:Message=cloneObjSkipUndefined({
            ...messageNoId,
            id:newId(),
        });
        
        await this.conversations.doc(msg.convoId).collection('messages').doc(msg.id).set(msg);

        return msg;
    }

    public getMessageListPointer(convoId:string, userId:ConvoUserId): MessageListPointer
    {
        const messages:Message[]=[];

        let limit=100;
        let start:Message|null=null;
        let disposed=false;

        const setStart=(v:Message|null)=>{
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

        const onMessagesChanged=createEvent();

        let releaseSnap:(()=>void)|null=null;
        let updateId=0;
        const update=()=>{

            const id=++updateId;

            releaseSnap?.();
            releaseSnap=null;
            if(disposed){
                return;
            }

            let query=this.conversations
                .doc(convoId).collection('messages')
                .orderBy('created','desc');

            if(start){
                query=query.startAt(start.created);
            }

            releaseSnap=syncSnapshot(
                query.limit(limit),
                messages,
                ()=>id===updateId,
                onMessagesChanged.trigger);
                
        }

        update();


        return {
            convoId,
            userId,
            messages,
            getStart:()=>start,
            setStart,
            getLimit:()=>limit,
            setLimit,
            onMessagesChanged:onMessagesChanged.evt,
            dispose,
        }
    }


}