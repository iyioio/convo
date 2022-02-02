import type { ConvoServiceMgr, Message, ProcessTextOptions } from "@iyio/convo";
import type { CreateCompletionRequest } from "openai";

export type ProcessorInputType='string'|'array';

export const defaultArraySeparator=',';

export type TextTransformer=string|((text:string)=>string);

export type ScopeVars={[name:string]:any};

export interface ProcessorCondition
{
    /**
     * Name of processor to goto if the ProcessorCondition is true. Do not use goto and move 
     * together.
     */
    goto?:string;

    /**
     * Number of steps to move if the ProcessorCondition is true. Do not use goto and move 
     * together.
     */
    move?:number;

    /**
     * If a string or regex the match is used as a regex to match against. If true the ProcessorCondition
     * is set to true. If false the ProcessorCondition is set to false.
     */
    match?:string|boolean|RegExp;

    /**
     * Flags used when creating a regex when match is a string;
     */
    matchFlags?:string;

    /**
     * If true then the condition will be true if match is not a match
     */
    not?:boolean;

    /**
     * Used to transform completion text before attempting to match the condition
     */
    matchInputTransform?:TextTransformer;

    /**
     * If the ProcessorCondition is true then the output of the process will be set to the value of
     * of the capture group of match
     */
    outputCaptureIndex?:number;

    /**
     * If the ProcessorCondition is true then to output of the process is transformed using this
     * transformer
     */
    outputTransform?:TextTransformer;

    textTransform?:TextTransformer;

    /**
     * Transforms text sent the ConvoServiceManger.processTextAsync function.
     */
    processTransform?:TextTransformer;

    /**
     * If true and the the ProcessorCondition is true then processing is stopped
     */
    end?:boolean;

    /**
     * If true and output is empty then execution should be ended;
     */
    endEmpty?:boolean;

    /**
     * If true and the the ProcessorCondition and processOutput is defined then the processOutput value
     * of the scope will be set to the value of processOutput
     */
    sendOutput?:boolean|'queue';

    /**
     * scope variables to be set if the condition is true. vars is applied before applying transforms
     */
    vars?:ScopeVars;

    /**
     * scope variables to be set if the condition is true. postVars is applied after applying transforms
     */
    postVars?:ScopeVars;
}

export interface Processor
{
    name?:string;
    
    engine?:string;
    completionConfig:CreateCompletionRequest;
    conditions?:ProcessorCondition[];

    inputType?:ProcessorInputType;
    inputArraySeparator?:string;

    outputTransform?:TextTransformer;
    textTransform?:TextTransformer;
    processTransform?:TextTransformer;
    sendOutput?:boolean|'queue';

    /**
     * If true and output is empty then execution should be ended;
     */
    endEmpty?:boolean;

    /**
     * If defined this value will be used as the completion of the processor instead of calling
     * the context completion function
     */
    completion?:string|boolean;

    /**
     * scope variables to be set before running the process
     */
    vars?:ScopeVars;

    /**
     * scope variables to be set after running the process
     */
    postVars?:ScopeVars;

    prompt?:string;

    /**
     * If true the previous scope will be captured and set as the prevScope property of the current
     * scope
     */
    capturePrevScope?:boolean;
}


export type OpenAiEngine=(
    'text-davinci-001'|
    'text-curie-001'|
    'text-babbage-001'|
    'text-ada-001'
)

export const defaultOpenAiEngine:OpenAiEngine='text-babbage-001';

export const defaultPromptAppendPrefix='\nHuman: '
export const defaultPromptAppendSuffix='\nAI:';

export const defaultMaxServiceCalls=10;

export const defaultMaxTextLength=180;

export const defaultMaxPromptLength=3000;

export const defaultMaxSteps=10000;

export interface ExecutionConfig
{
    /**
     * The maximum number of service calls the the OpenAI API. This prevents the OpenAI API from
     * being called in an infinite loop. Default value is 10
     */
    maxServiceCalls:number;

    /**
     * The max number of process steps to be executed. This prevents infinite loops from being
     * executed. Default value is 10,000
     */
    maxSteps:number;

    /**
     * The max length for text input to be sent to the OpenAI API. Default value is 180
     */
    maxTextLength:number;

    /**
     * The max length of the prompt to be sent to the OpenAI API. The length of the prompt
     * is calculated after all text expansion is complete. Default value is 3,000
     */
    maxPromptLength:number;

    engine:OpenAiEngine;
    
    responseOptions?:ProcessTextOptions;

    /**
     * If true debug output will be printed
     */
    debug?:boolean|ExecuteDebugOptions;
}

export interface OpenAiServiceConfig extends Partial<ExecutionConfig>
{
    apiKey:string;
}

export interface ProcessorScope
{

    /**
     * The index of the current step
     */
    stepIndex?:number;

    /**
     * Text received from the user as input
     */
    text:string;

    /**
     * The message being processed
     */
    message:Message;

    /**
     * The output of the current completion
     */
    output?:string;

    /**
     * The current completion
     */
    completion?:string;

    /**
     * The output of the last completion
     */
    input?:any;

    /**
     * If true the output of the current process should be processed by ConvoServiceMgr.processTextAsync
     */
    sendOutput?:boolean|'queue';

    /**
     * The prompt used by the current process
     */
    prompt?:string;

    /**
     * Set to the previous scope if the current processor's capturePrevScope is true
     */
    prevScope?:ProcessorScope;


    [name:string]:any;
};

export type ProcessResult=number|string|false;

export interface CapturedScope
{
    processor?:Processor;
    processorName?:string;
    scope:ProcessorScope;
    result:ProcessResult;
}

export interface SendCapture
{
    index:number;
    output:string;
}

export interface ExecutionCtx
{
    
    config:ExecutionConfig;

    scope?:Partial<ProcessorScope>;

    createCompletionAsync(engineId: string, createCompletionRequest: CreateCompletionRequest, processor:Processor): Promise<string|null>;
    
    mgr?:ConvoServiceMgr;

    serviceCallCount?:number;

    /**
     * If defined each process with have its scope captured after being executed.
     */
    scopeCaptures?:CapturedScope[];

    /**
     * If defined each process with have its scope captured after being executed.
     */
    scopeCapturesMap?:{[processName:string]:ProcessorScope};

    /**
     * If defined send outputs will be captured
     */
    sendCaptures?:SendCapture[];

    /**
     * Set to true upon a successful execution
     */
    success?:boolean;
}

export interface ExecuteDebugOptions
{
    resetCaptures?:boolean;
    
    ctxProps?:(keyof ExecutionCtx)[];
    /**
     * props to be deleted from each captured scope
     */
    deleteScopeProps?:(keyof ProcessorScope)[];

    print?:boolean;

    /**
     * If true processors will be captured with scopeCaptures
     */
    captureProcessors?:boolean;
}