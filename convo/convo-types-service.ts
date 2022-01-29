import { Message, MessageNoId } from "./convo-types";
import { ConvoServiceMgr } from "./ConvoServiceMgr";

export interface ConvoServiceAdapter
{

    /**
     * Sends a message in a conversation
     */
    sendMessageAsync(messageNoId:MessageNoId): Promise<Message>;
}

export interface ServiceProcessResult
{
    stopProcessing?:boolean;
}

export interface ServiceProcessCtx
{
    message:Message;
    mgr:ConvoServiceMgr;
}

export interface ConvoService
{

    readonly supportsParallelProcessing:boolean;

    /**
     * If defined the service will only process messages with matching service tags
     */
    readonly tags:string[];

    processMessageAsync(ctx:ServiceProcessCtx):Promise<ServiceProcessResult|void>|void;
}