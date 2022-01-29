import { ConvoService, ServiceProcessCtx, tagBot } from "@iyio/convo";

export class OpenAiService implements ConvoService
{
    public readonly supportsParallelProcessing:boolean=true;

    public readonly tags:string[]=[tagBot];

    public async processMessageAsync({
        message,
        mgr,
    }: ServiceProcessCtx): Promise<void>
    {
        console.log('OpenAI do cool stuff here',message);
        await mgr.sendMessageAsync({
            convoId:message.convoId,
            text:'I\'m a robot',
            senderName:'Grbll',
            tags:['bot']
        })
    }
}