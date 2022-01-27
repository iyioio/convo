import { ConvoNoId, ConvoProvider, MessageNoId } from "./convo-provider-types";
import { Convo, ConvoInfo, DateTimeValue, ItemPointer, ListPointer, Member, Message, SendMessageRequest, StartConvoRequest } from "./convo-types";

export class ConvoMgr
{

    private readonly provider:ConvoProvider;

    public constructor(provider:ConvoProvider)
    {
        this.provider=provider;
    }

    public async getConversationsAsync(userId:string, tags?:string[]): Promise<ConvoInfo[]>
    {
        return await this.provider.getConversationsAsync(userId,tags||null);
    }

    public async getConversationAsync(convoId:string): Promise<Convo|null>
    {
        return await this.provider.getConversationAsync(convoId);
    }

    public getMessageListPointer(convoId:string, userId:string): ListPointer<Message>
    {
        return this.provider.getMessageListPointer(convoId,userId);
    }

    public getConversationListPointer(userId:string, tags?:string[]): ListPointer<Convo>
    {
        return this.provider.getConversationListPointer(userId,tags||null);
    }

    public getConversationPointer(convoId:string, userId:string): ItemPointer<Convo>
    {
        return this.provider.getConversationPointer(convoId,userId);
    }

    public getKnownMembersAsync(userId:string): Promise<Member[]>
    {
        return this.provider.getKnownMembersAsync(userId);
    }

    /**
     * Returns messages for the given convo
     * @param convoId Id of the conversation
     * @param count Number of messages to return
     * @param startDate The starting date from where to get messages from 
     */
    public async getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message[]>
    {
        return await this.provider.getMessagesAsync(convoId,count,startDate);
    }

    /**
     * Starts a new conversation between the users
     */
    public async startConversationAsync(request:StartConvoRequest):Promise<Convo>
    {
        
        const members=request.members?[...request.members]:[];

        const now=Date.now();

        const memberIds=request.memberIds?
            [...request.memberIds]:
            [...members.map(m=>m.id),...(request.additionalmemberIds||[])];

        memberIds.sort((a,b)=>a.localeCompare(b));

        const convoNoId:ConvoNoId={
            name:request.name||'',
            creatorId:members.find(m=>m.isCreator)?.id,
            lastChanged:now,
            created:now,
            members,
            memberIds,
            tags:request.tags
        }
        
        return await this.provider.startConversationAsync(convoNoId,request.name?false:true);
    }

    /**
     * Sends a message in a conversation
     */
    public async sendMessageAsync(request:SendMessageRequest):Promise<Message>
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


        const messageNoId:MessageNoId={
            convoId:request.convoId,
            senderId:request.senderId,
            senderName:request.senderName,
            receiverId:request.receiverId,
            includeServices:request.includeServices,
            created:request.created===undefined?Date.now():request.created,
            text:request.text,
            contentType:request.contentType,
            content:request.content,
            contentUri:request.contentUri,
            contentThumbnailUrl:request.contentThumbnailUrl,
            contentData:request.contentData,
            notify:notify,
            tags:request.tags,
            read
        };
        return await this.provider.sendMessageAsync(messageNoId);
    }

    public async getConversationForMembersAsync(memberIds:string[],primaryUserId?:string): Promise<Convo|null>
    {
        if(!memberIds?.length){
            return null;
        }
        memberIds=[...memberIds];
        if(primaryUserId && !memberIds.includes(primaryUserId)){
            memberIds.push(primaryUserId);
        }
        memberIds.sort((a,b)=>a.localeCompare(b));
        return await this.provider.getConversationForMembersAsync(memberIds);
    }

    public async markMessageAsReadAsync(convoId:string, messageId:string, userId:string): Promise<void>
    {
        await this.provider.markMessageAsReadAsync(convoId,messageId,userId);
    }

    public async markMessagesForUserReadAsync(messages:Message[], userId:string): Promise<void>
    {
        const unread:Message[]=[];
        for(const m of messages){
            if(m.read?.[userId]===false){
                unread.push(m);
            }
        }
        if(!unread.length){
            return;
        }

        await Promise.all(unread.map(m=>this.provider.markMessageAsReadAsync(m.convoId,m.id,userId)));
    }

    public getUnreadMessagesPointer(userId:string): ListPointer<Message>
    {
        return this.provider.getUnreadMessagesPointer(userId);
    }
}