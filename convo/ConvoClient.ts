import { convertRequestToMessage, sortTags } from "./common";
import { Convo, ConvoInfo, ConvoNoId, DateTimeValue, ItemPointer, ListPointer, Member, Message, SendMessageRequest, StartConvoRequest } from "./convo-types";
import { ConvoClientAdapter } from "./convo-types-client";

export class ConvoClient
{

    private readonly provider:ConvoClientAdapter;

    public constructor(provider:ConvoClientAdapter)
    {
        this.provider=provider;
    }

    /**
     * Sends a message in a conversation
     */
    public async sendMessageAsync(request:SendMessageRequest):Promise<Message>
    {
        return await this.provider.sendMessageAsync(convertRequestToMessage(request));
    }

    public async getConversationsAsync(userId:string, tags?:string[]): Promise<ConvoInfo[]>
    {
        return await this.provider.getConversationsAsync(userId,sortTags(tags)||null);
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
        return this.provider.getConversationListPointer(userId,sortTags(tags)||null);
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
        
        const members=request.members?request.members.map(m=>(
            {
                ...m,
                tags:sortTags(m.tags)
            }
        )):[];

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
            tags:sortTags(request.tags)
        }
        
        return await this.provider.startConversationAsync(convoNoId,request.name?false:true);
    }

    public async getConversationForMembersAsync(memberIds:string[],primaryUserId?:string,tags?:string[]): Promise<Convo|null>
    {
        if(!memberIds?.length){
            return null;
        }
        memberIds=[...memberIds];
        if(primaryUserId && !memberIds.includes(primaryUserId)){
            memberIds.push(primaryUserId);
        }
        memberIds.sort((a,b)=>a.localeCompare(b));
        return await this.provider.getConversationForMembersAsync(memberIds,sortTags(tags)||null);
    }

    public async markMessageAsReadAsync(convoId:string, messageId:string, userId:string): Promise<void>
    {
        await this.provider.markMessageAsReadAsync(convoId,messageId,userId);
    }

    public async markMessagesForUserReadAsync(messages:Message[], userId:string): Promise<number>
    {
        const unread:Message[]=[];
        for(const m of messages){
            if(m.unread?.includes(userId)){
                unread.push(m);
            }
        }
        if(!unread.length){
            return 0;
        }

        await Promise.all(unread.map(m=>this.provider.markMessageAsReadAsync(m.convoId,m.id,userId)));

        return unread.length;
    }

    public getUnreadMessagesPointer(userId:string): ListPointer<Message>
    {
        return this.provider.getUnreadMessagesPointer(userId);
    }

    public getUnreadMessageCountAsync(userId:string): Promise<number>
    {
        return this.provider.getUnreadMessageCountAsync(userId);
    }
}