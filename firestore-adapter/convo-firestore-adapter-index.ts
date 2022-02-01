import { cloneObjSkipUndefined, Convo, ConvoServiceAdapter, MemberData, Message, MessageNoId, newId } from "@iyio/convo";
import { firestore } from 'firebase-admin';

export interface FirestoreConvoServiceAdapterOptions
{
    convoCollection:string;
    messagesSubCollectionName?:string;
    memberDataCollection?:string;
}

export class FirestoreConvoServiceAdapter implements ConvoServiceAdapter
{
    // name of the collection to store conversations in
    private readonly cn:string;

    private readonly msgCn:string;

    private readonly memberDataCollection:string;

    private db:firestore.Firestore;

    private get conversations(){return this.db.collection(this.cn)}

    public constructor(db:firestore.Firestore,{
        convoCollection,
        messagesSubCollectionName='messages',
        memberDataCollection='convoMemberData'

    }:FirestoreConvoServiceAdapterOptions){
        this.db=db;
        this.cn=convoCollection;
        this.msgCn=messagesSubCollectionName;
        this.memberDataCollection=memberDataCollection;
    }

    public async getMemberDataAsync(memberId:string): Promise<MemberData|null>
    {
        const doc=await this.db.doc(`${this.memberDataCollection}/${memberId}`).get();
        return doc.exists?doc.data() as MemberData:null;
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
}