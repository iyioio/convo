import { ConvoNoId, ConvoProvider, MessageNoId } from "./convo-provider-types";
import { Convo, ConvoInfo, ConvoUserId, DateTimeValue, Message, MessageListPointer, SendMessageRequest, StartConvoRequest } from "./convo-types";

export class ConvoMgr
{

    private readonly provider:ConvoProvider;

    public constructor(provider:ConvoProvider)
    {
        this.provider=provider;
    }

    public async getConversationsAsync(userId:ConvoUserId): Promise<ConvoInfo[]>
    {
        return await this.provider.getConversationsAsync(userId);
    }

    public async getConversationAsync(convoId:string): Promise<Convo|null>
    {
        return await this.provider.getConversationAsync(convoId);
    }

    public getMessageListPointer(convoId:string, userId:ConvoUserId): MessageListPointer
    {
        return this.provider.getMessageListPointer(convoId,userId);
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

        let convoNoId:ConvoNoId={
            name:request.name||'',
            creatorId:members.find(m=>m.isCreator)?.id,
            lastChanged:now,
            created:now,
            members,
            memberIds:request.memberIds?
                [...request.memberIds]:
                [...members.map(m=>m.id),...(request.additionalmemberIds||[])]
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

        const messageNoId:MessageNoId={
            convoId:request.convoId,
            senderId:request.senderId,
            created:request.created===undefined?Date.now():request.created,
            text:request.text,
            contentType:request.contentType,
            content:request.content,
            contentUri:request.contentUri,

        };
        return await this.provider.sendMessageAsync(messageNoId);
    }
}