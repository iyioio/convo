import { NamedEvent } from "@iyio/named-events";

export type DateTimeValue=number;

export interface Convo
{
    id:string;

    name:string;

    lastChanged:DateTimeValue;

    created:DateTimeValue;

    lastChangedUserId?:string;

    /**
     * Id of the user that started the conversation
     */
    creatorId?:string;

    /**
     * Members of the conversation
     */
    members:Member[];

    /**
     * user ids of the members that have access to the conversation.
     */
    memberIds:string[];

    /**
     * The last message of the conversation
     */
    lastMessage?:Message;
}

export interface ConvoInfo
{
    id:string;

    name:string;

    created:DateTimeValue;

    lastChanged:DateTimeValue;

    lastChangedUserId?:string;
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
    additionalmemberIds?:string[];

    /**
     * If defined memberIds will overwrite the userIds of members and additionalmemberIds
     */
    memberIds?:string[]

}

export interface Member
{
    id:string;

    name?:string;

    isCreator?:boolean;

    roles?:string[];
}

export type ContentType='image'|'video'|'lottie';

export interface Message
{
    id:string;

    convoId:string;

    senderId?:string;

    senderName?:string;

    created:DateTimeValue;

    text?:string;

    contentType?:ContentType;

    content?:string;

    contentUri?:string;

    /**
     * Array of user ids of users to notify of the message
     */
    notify?:string[];

    /**
     * A lookup of users that have read the message
     */
    read?:{[memberId:string]:boolean}

}

export interface SendMessageRequest
{
    convoId:string;

    senderId?:string;

    senderName?:string;

    created?:DateTimeValue;

    text?:string;

    contentType?:ContentType;

    content?:string;

    contentUri?:string;

    /**
     * Array of user ids of users to notify of the message
     */
    notify?:string[];

    notifySender?:boolean;

}

export interface NotificationDevice
{
    uid:string;

    id?:string;

    type:string;

    deviceId:string;

    created?:number;

    data?:string;

    userId?:string;

    isPrimary?:boolean;

    name?:string;
}

/**
 * Represents a dynamic view of a item that is updated in realtime
 */
export interface ItemPointer<T>
{
    /**
     * Current view of the list
     */
    readonly item:T|null;

    /**
     * Occurs when the list changes
     */
    onItemChanged:NamedEvent;

    /**
     * The number of changes that have occurred
     */
    readonly changeCount:number;


    /**
     * Disposes of the list and releases all related resources
     */
    dispose():void;
}

/**
 * Represents a dynamic view of a segment of a list of objects update in realtime
 */
export interface ListPointer<T>
{

    /**
     * Current view of the list
     */
    readonly list:T[];

    /**
     * Occurs when the list changes
     */
    onListChanged:NamedEvent;

    /**
     * The number of changes that have occurred
     */
    readonly changeCount:number;

    /**
     * Gets the starting item of the list
     */
    getStart():T|null;

    /**
     * Sets the starting item of the list. The starting item can be used to view item
     * further back in the history
     */
    setStart(item:T|null):void;

    /**
     * Gets the current limit
     */
    getLimit():number;

    /**
     * Sets the max number of items in the list.
     */
    setLimit(limit:number):void;


    /**
     * Disposes of the list and releases all related resources
     */
    dispose():void;

}