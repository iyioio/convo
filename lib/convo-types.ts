
export type DateTimeValue=number;

export interface Convo
{
    uid:string;

    // user ids of the members of the chat group. This array is used grant users access to
    // the chat group
    memberIds:string[];
}

export type ContentType='image'|'video'|'lottie';

export interface Message
{
    id:string;

    senderId:string;

    created:DateTimeValue;

    text?:string;

    contentType?:ContentType;

    content?:string;

    contentUri?:string;

}