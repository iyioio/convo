import type { Convo, ConvoInfo, ConvoUserId, DateTimeValue, Message, MessageListPointer } from "./convo-types";


export type ConvoNoId=Omit<Convo,'id'>;

export type MessageNoId=Omit<Message,'id'>;

export interface ConvoProvider
{

    /**
     * Starts a new conversation with the given users
     * @param creatorId Id of the user that started the conversation
     * @param memberIds All users in the conversation, including the creator
     */
    startConversationAsync(convoNoId:ConvoNoId,setNameToId:boolean): Promise<Convo>;

    /**
     * Returns basic info for all conversations for a user
     * @param userId Id of the user to return conversations for
     */
    getConversationsAsync(userId:ConvoUserId): Promise<ConvoInfo[]>;

    /**
     * Returns messages for the given convo
     * @param convoId Id of the conversation
     * @param count Number of messages to return
     * @param startDate The starting date from where to get messages from 
     */
    getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message[]>;

    /**
     * Returns a conversation by id
     */
    getConversationAsync(convoId:string): Promise<Convo|null>;

    /**
     * Sends a message in a conversation
     */
    sendMessageAsync(messageNoId:MessageNoId): Promise<Message>;


    /**
     * Returns a message list pointer that is updated in realtime
     */
    getMessageListPointer(convoId:string, userId:ConvoUserId): MessageListPointer;
}