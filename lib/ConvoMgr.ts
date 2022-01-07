import { ConvoProvider } from "./convo-provider-types";
import { DateTimeValue, Message } from "./convo-types";

export class ConvoMgr
{

    private readonly provider:ConvoProvider;

    public constructor(provider:ConvoProvider)
    {
        this.provider=provider;
    }

    /**
     * Returns messages for the given convo
     * @param convoId Id of the conversation
     * @param count Number of messages to return
     * @param startDate The starting date from where to get messages from 
     */
    public async getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message>
    {
        return await this.provider.getMessagesAsync(convoId,count,startDate);
    }
}