import type { DateTimeValue, Message } from "./convo-types";

export interface ConvoProvider
{
    /**
     * Returns messages for the given convo
     * @param convoId Id of the conversation
     * @param count Number of messages to return
     * @param startDate The starting date from where to get messages from 
     */
    getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message>;
}