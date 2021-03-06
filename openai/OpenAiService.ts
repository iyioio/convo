import { ConvoService, ServiceProcessCtx, tagBot } from "@iyio/convo";
import { Configuration, OpenAIApi } from "openai";
import { ExecuteDebugOptions, ExecutionConfig, ExecutionCtx, OpenAiServiceConfig, Processor } from "./openai-types";
import { executeAsync, executeDebugModeAsync, parseProcessors, sanitizeExecutionConfig } from "./openai-util";



export class OpenAiService implements ConvoService
{
    public readonly name:string="OpenAiService";
    
    public readonly supportsParallelProcessing:boolean=true;

    public readonly tags:string[]=[tagBot];

    private readonly openai:OpenAIApi;

    private readonly executionConfig:ExecutionConfig;

    public constructor({
        apiKey,
        ...config
    }:OpenAiServiceConfig)
    {
        this.executionConfig=sanitizeExecutionConfig(config);
        this.openai=new OpenAIApi(new Configuration({
            apiKey
        }))
    }

    public async processMessageAsync({
        message,
        mgr,
    }: ServiceProcessCtx): Promise<void>
    {
        if(!message.text?.trim() || !message.receiverId){
            return;
        }

        const data=await mgr.getMemberDataAsync(message.receiverId);
        if(!data){
            return;
        }

        const processorData=data['openAiProcessors'] as (Processor|string)[];
        if(!Array.isArray(processorData)){
            return;
        }

        const processors:Processor[]=[];

        for(let i=0;i<processorData.length;i++){
            const pro=processorData[i];
            if(typeof pro === 'string'){
                const pros=parseProcessors(pro);
                for(const p of pros){
                    processors.push(p);
                }
            }else{
                processors.push(pro);
            }
        }

        let debug=(
            (data['openAiDebug'] as (string|boolean|ExecuteDebugOptions|undefined)) ||
            this.executionConfig.debug
        );

        if(typeof debug === 'string'){
            debug=JSON.parse(debug) as ExecuteDebugOptions;
        }

        const ctx:ExecutionCtx={
            config:{...this.executionConfig,debug},
            mgr,
            createCompletionAsync:async (engineId, request)=>{
                return (await this.openai.createCompletion(engineId,request)).data?.choices?.[0].text||null;
            }
        };

        if(debug){
            await executeDebugModeAsync(
                ctx,message,processors as Processor[],
                debug===true?undefined:debug);
        }else{
            await executeAsync(ctx,message,processors as Processor[]);
        }

    }
}


