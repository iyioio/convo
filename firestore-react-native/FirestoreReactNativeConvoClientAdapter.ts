import { cloneObjSkipUndefined, Convo, ConvoClientAdapter, ConvoInfo, ConvoNoId, DateTimeValue, ItemPointer, ListPointer, Member, Message, MessageNoId, newId } from '@iyio/convo';
import firestore from '@react-native-firebase/firestore';
import { createItemPointer, createListPointer, getQueryCountAsync } from './util';

export interface FirestoreReactNativeConvoClientAdapterOptions
{
    convoCollection:string;
    messagesSubCollectionName?:string;
    emulatorAddress?:string;
    emulatorPort?:number;
}

export class FirestoreReactNativeConvoClientAdapter implements ConvoClientAdapter
{
    // name of the collection to store conversations in
    private readonly cn:string;

    private readonly msgCn:string;

    private readonly emulatorAddress?:string;
    private readonly emulatorPort:number;

    private get db(){
        const db=firestore();
        if(this.emulatorAddress){
            db.useEmulator(this.emulatorAddress,this.emulatorPort);
        }
        return db;    
    }

    private get conversations(){return this.db.collection(this.cn)}

    public constructor({
        convoCollection,
        messagesSubCollectionName='messages',
        emulatorAddress,
        emulatorPort=8080

    }:FirestoreReactNativeConvoClientAdapterOptions){
        this.cn=convoCollection;
        this.msgCn=messagesSubCollectionName;
        this.emulatorAddress=emulatorAddress;
        this.emulatorPort=emulatorPort
    }


    public async getConversationsAsync(userId:string, tags:string[]|null): Promise<ConvoInfo[]>
    {
        let query=this.conversations
            .where('memberIds','array-contains',userId);

        if(tags){
            query=query.where('tags','==',tags);
        }

        return (await query
            .orderBy('lastChanged','desc')
            .get())
            .docs.map(d=>d.data() as ConvoInfo);
            
    }

    public async getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message[]>
    {
        const messages=await this.conversations
            .doc(convoId)
            .collection(this.msgCn)
            .orderBy('created','desc')
            .where('created','<=',startDate)
            .limit(count)
            .get();

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
        
        await this.conversations.doc(id).set(convo);

        return convo;

    }
    
    public async getConversationAsync(convoId:string):Promise<Convo|null>
    {
        const convo=await this.conversations.doc(convoId).get();
        return convo.exists?convo.data() as Convo:null;
    }

    public async sendMessageAsync(messageNoId:MessageNoId):Promise<Message>
    {
        const msg:Message=cloneObjSkipUndefined({
            ...messageNoId,
            id:newId()
        });


        const batch=this.db.batch();

        const convo:Partial<Convo>={
            lastChanged:Date.now(),
            lastMessage:msg,
        };
    
        batch.set(this.conversations.doc(msg.convoId).collection(this.msgCn).doc(msg.id),msg);
        batch.update(this.conversations.doc(msg.convoId),convo);

        await batch.commit();

        return msg;
    }

    public getMessageListPointer(convoId:string, userId:string): ListPointer<Message>
    {
        return createListPointer<Message>({
            buildQuery:(start,limit)=>{
                let query=this.conversations
                    .doc(convoId).collection(this.msgCn)
                    .orderBy('created','desc');

                if(start){
                    query=query.startAt(start.created);
                }

                return query.limit(limit);
            }
        });
    }

    public getConversationListPointer(userId:string, tags:string[]|null): ListPointer<Convo>
    {
        return createListPointer<Convo>({
            buildQuery:(start,limit)=>{
                let query=this.conversations
                    .where('memberIds','array-contains',userId);

                if(tags){
                    query=query.where('tags','==',tags);
                }

                query=query.orderBy('lastChanged','desc');

                if(start){
                    query=query.startAt(start.created);
                }

                return query.limit(limit);
            }
        })
    }

    public getConversationPointer(convoId:string, userId:string):ItemPointer<Convo>
    {
        return createItemPointer<Convo>({
            buildQuery:()=>this.conversations.doc(convoId)
        })
    }

    public async getKnownMembersAsync(userId:string): Promise<Member[]>
    {
        const convoDocs=await this.conversations
            .where('memberIds','array-contains',userId)
            .get();

        const added:{[id:string]:true}={}
        const members:Member[]=[];

        for(const convoDoc of convoDocs.docs){
            const convo=convoDoc.data() as Convo;
            if(convo.members){
                for(const m of convo.members){
                    if(!added[m.id]){
                        added[m.id]=true;
                        members.push(m);
                    }
                }
            }
        }

        return members;
            
    }

    public async getConversationForMembersAsync(memberIds: string[], tags:string[]|null): Promise<Convo | null>
    {

        if(!memberIds?.length){
            return null;
        }

        let query=this.conversations.where('visibleMemberIds','==',memberIds);

        if(tags){
            query=query.where('tags','==',tags);
        }

        const convoDocs=await query.limit(1).get();

        return convoDocs.size?convoDocs.docs[0].data() as Convo:null;
    }

    public async markMessageAsReadAsync(convoId:string, messageId:string, userId:string): Promise<void>
    {
        await this.db
            .doc(`${this.cn}/${convoId}/messages/${messageId}`)
            .update({unread:firestore.FieldValue.arrayRemove(userId)});

    }

    public getUnreadMessagesPointer(userId:string): ListPointer<Message>
    {
        return createListPointer<Message>({
            buildQuery:(start,limit)=>{
                let query=this.db.collectionGroup(this.msgCn)
                    .where('unread','array-contains',userId)
                    .orderBy('created','desc');

                if(start){
                    query=query.startAt(start.created);
                }

                return query.limit(limit);
            }
        });
    }

    public async getUnreadMessageCountAsync(userId:string): Promise<number>
    {
        return await getQueryCountAsync(
            'id',
            this.db.collectionGroup(this.msgCn)
                .where('unread','array-contains',userId));
            
    }
}