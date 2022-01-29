import { cloneObj, ConvoService, Message, ProcessTextOptions, ServiceProcessCtx, tagBot } from "@iyio/convo";
import { Configuration, CreateCompletionRequest, CreateCompletionResponse, OpenAIApi } from "openai";



export type OpenAiEngine=(
    'text-davinci-001'|
    'text-curie-001'|
    'text-babbage-001'|
    'text-ada-001'
)

export const defaultOpenAiEngine:OpenAiEngine='text-babbage-001';

export const defaultPromptAppendPrefix='\nHuman: '
export const defaultPromptAppendSuffix='\nAI:';

export type CompletionRequestModifier=(message:Message,request:CreateCompletionRequest)=>Promise<boolean>;

export type CompletionResponseModifier=(message:Message,response:CreateCompletionResponse)=>Promise<boolean>;


export interface OpenAiServiceConfig
{
    apiKey:string;
    engine?:OpenAiEngine;
    completionDefaults?:CreateCompletionRequest;
    defaultPrompt?:string;
    modifyCompletionRequestAsync?:CompletionRequestModifier;
    modifyCompletionResultAsync?:CompletionResponseModifier;
    responseOptions?:ProcessTextOptions;
    promptAppendPrefix?:string;
    promptAppendSuffix?:string;
}

export function getDefaultCompletionDefaults():CreateCompletionRequest
{
    return {
        temperature: 0.3,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0.17,
        stop: ["\n", " Human:", " AI:"],
    }
}

export function getDefaultProcessTextOptions():ProcessTextOptions
{
    return {
        sendBodyAsMessage:true,
        invokeFunctions:true
    }
}

export class OpenAiService implements ConvoService
{
    public readonly name:string="OpenAiService";
    
    public readonly supportsParallelProcessing:boolean=true;

    public readonly tags:string[]=[tagBot];

    private readonly openai:OpenAIApi;

    private readonly responseOptions:ProcessTextOptions;

    private readonly promptAppendPrefix:string;

    private readonly promptAppendSuffix:string;
    
    private readonly engine:OpenAiEngine;

    private readonly defaultPrompt?:string;

    private readonly completionDefaults:CreateCompletionRequest;

    private readonly modifyCompletionRequestAsync?:CompletionRequestModifier;

    private readonly modifyCompletionResultAsync?:CompletionResponseModifier

    public constructor({
        apiKey,
        engine=defaultOpenAiEngine,
        completionDefaults=getDefaultCompletionDefaults(),
        modifyCompletionRequestAsync,
        responseOptions=getDefaultProcessTextOptions(),
        promptAppendPrefix=defaultPromptAppendPrefix,
        promptAppendSuffix=defaultPromptAppendSuffix,
        modifyCompletionResultAsync,
        defaultPrompt
    }:OpenAiServiceConfig)
    {
        this.engine=engine;
        this.defaultPrompt=defaultPrompt;
        this.completionDefaults=completionDefaults;
        this.modifyCompletionRequestAsync=modifyCompletionRequestAsync;
        this.modifyCompletionResultAsync=modifyCompletionResultAsync;
        this.responseOptions=responseOptions;
        this.promptAppendPrefix=promptAppendPrefix;
        this.promptAppendSuffix=promptAppendSuffix;
        this.openai=new OpenAIApi(new Configuration({
            apiKey
        }))
    }

    public async processMessageAsync({
        message,
        mgr,
    }: ServiceProcessCtx): Promise<void>
    {
        const msgText=message.text?.trim();
        if(!msgText){
            return;
        }
        const request=cloneObj(this.completionDefaults);
        if(this.defaultPrompt && !request.prompt){
            request.prompt=this.defaultPrompt;
        }
        if(request.prompt){
            request.prompt+=this.promptAppendPrefix+msgText+this.promptAppendSuffix;
        }
        if(this.modifyCompletionRequestAsync){
            const _continue=await this.modifyCompletionRequestAsync(message,request);
            if(!_continue){
                return;
            }
        }
  
        const completion=(await this.openai.createCompletion(this.engine,request))?.data;
        if(this.modifyCompletionResultAsync){
            const _continue=await this.modifyCompletionResultAsync(message,completion);
            if(!_continue){
                return;
            }
        }
        const text=completion?.choices?.[0].text?.trim();
        if(text){
            await mgr.processTextAsync(text,message.convoId,this.responseOptions)
        }
    }
}


