import { ConvoFunc, MemberData, Message, MessageNoId, SendMessageRequest } from "./convo-types";
import { ConvoServiceMgr } from "./ConvoServiceMgr";

export interface ConvoServiceMgrConfig
{
    adapter:ConvoServiceAdapter;
    services?:ConvoService[];
    functions?:ConvoFunc[];
}

export interface ConvoServiceAdapter
{

    /**
     * Sends a message in a conversation
     */
    sendMessageAsync(messageNoId:MessageNoId): Promise<Message>;

    /**
     * Returns extended member data for the given member id
     */
    getMemberDataAsync(memberId:string): Promise<MemberData|null>;
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

    readonly name:string;

    /**
     * If defined the service will only process messages with matching service tags
     */
    readonly tags:string[];

    readonly supportsParallelProcessing:boolean;

    processMessageAsync(ctx:ServiceProcessCtx):Promise<ServiceProcessResult|void>|void;
}

export const defaultFunctionSeparator='....';

export const defaultSenderLabelReg=/^\W*(\w+):(.*)/

export interface ProcessTextOptions
{
    /**
     * If true embedded functions will be called. In-order for an embedded function to be called
     * the function must first be registered.
     */
    invokeFunctions?:boolean;

    /**
     * If true the text body will be sent as a message as long as it is not empty.
     */
    sendBodyAsMessage?:boolean;

    /**
     * Default values used when sending the result text body as a message
     */
    sendMessageDefaults?:Partial<SendMessageRequest>;

    /**
     * Returns default SendMessageRequest value for the matched labeled sender.
     */
    getRequestDefaultsForLabelAsync?:(label:string)=>Promise<Partial<SendMessageRequest>>

    /**
     * Character sequence use to separate functions calls from a body of text.
     */
    functionSeparator?:string;

    /**
     * Used to find the sender label in a line of text. Set to null to disable sender labeling.
     */
    senderLabelReg?:RegExp|null;
}

