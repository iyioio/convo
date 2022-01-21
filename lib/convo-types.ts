import { NamedEvent } from "@iyio/named-events";

export type DateTimeValue=number;

export type ConvoUserId=string;

export interface Convo
{
    id:string;

    name:string;

    lastChanged:DateTimeValue;

    created:DateTimeValue;

    lastChangedUserId?:ConvoUserId;

    /**
     * Id of the user that started the conversation
     */
    creatorId?:ConvoUserId;

    /**
     * Members of the conversation
     */
    members:Member[];

    /**
     * user ids of the members that have access to the conversation.
     */
    memberIds:ConvoUserId[];
}

export interface ConvoInfo
{
    id:string;

    name:string;

    created:DateTimeValue;

    lastChanged:DateTimeValue;

    lastChangedUserId?:ConvoUserId;
}

export interface StartConvoRequest
{
    /**
     * An optional name for the conversation. If not defined the id of the conversation will be
     * used as its name
     */
    name?:string;

    /**
     * Members of the conversation 
     */
    members?:Member[];

    /**
     * Additional userIds to grant access to the created conversation
     */
    additionalmemberIds?:ConvoUserId[];

    /**
     * If defined memberIds will overwrite the userIds of members and additionalmemberIds
     */
    memberIds?:ConvoUserId[]

}

export interface Member
{
    id:ConvoUserId;

    name?:string;

    isCreator?:boolean;

    roles?:string[];
}

export type ContentType='image'|'video'|'lottie';

export interface Message
{
    id:string;

    convoId:string;

    senderId?:ConvoUserId;

    created:DateTimeValue;

    text?:string;

    contentType?:ContentType;

    content?:string;

    contentUri?:string;

}

/**
 * Represents a dynamic view of a segment of a list of messages
 */
export interface MessageListPointer
{

    /**
     * Id of the convo the message list is pointed at.
     */
    readonly convoId:string;

    /**
     * Id of the user the message list is relative to.
     */
    readonly userId?:ConvoUserId;

    /**
     * Current view of the message list
     */
    readonly messages:Message[];

    /**
     * Occurs when the messages array changes
     */
    onMessagesChanged:NamedEvent;

    /**
     * Gets the starting message of the list.
     */
    getStart():Message|null;

    /**
     * Sets the starting message of the list. The start message can be used to view messages
     * further back in the history of a conversation.
     */
    setStart(message:Message|null):void;

    /**
     * Gets the current limit
     */
    getLimit():number;

    /**
     * Sets the max number of messages in the list.
     */
    setLimit(limit:number):void;


    /**
     * Disposes of the message list and releases all related resources
     */
    dispose():void;

}

export interface SendMessageRequest
{
    convoId:string;

    senderId?:ConvoUserId;

    created?:DateTimeValue;

    text?:string;

    contentType?:ContentType;

    content?:string;

    contentUri?:string;

}