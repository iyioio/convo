import type { Convo, ConvoInfo, DateTimeValue, ItemPointer, ListPointer, Member, Message } from "./convo-types";


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
    getConversationsAsync(userId:string, tags:string[]|null): Promise<ConvoInfo[]>;

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
    getMessageListPointer(convoId:string, userId:string): ListPointer<Message>;


    /**
     * Returns a conversation list pointer that is updated in realtime
     */
    getConversationListPointer(userId:string, tags:string[]|null): ListPointer<Convo>;

    /**
     * Returns a pointer to a conversation that is updated in realtime
     */
    getConversationPointer(convoId:string, userId:string): ItemPointer<Convo>;

    /**
     * Returns a list of members that the user has conversed with.
     */
    getKnownMembersAsync(userId:string): Promise<Member[]>;

    /**
     * Returns a conversation with matching members
     */
    getConversationForMembersAsync(memberIds:string[],tags:string[]|null): Promise<Convo|null>;

    /**
     * Marks a message read for a given message and user
     */
    markMessageAsReadAsync(convoId:string, messageId:string, userId:string): Promise<void>;

    /**
     * Returns a list pointer to all unread messages of the user
     */
    getUnreadMessagesPointer(userId:string): ListPointer<Message>;
}