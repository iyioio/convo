import { Message, ProcessTextOptions } from "@iyio/convo";
import { CapturedScope, defaultArraySeparator, defaultMaxPromptLength, defaultMaxServiceCalls, defaultMaxSteps, defaultMaxTextLength, defaultOpenAiEngine, ExecuteDebugOptions, ExecutionConfig, ExecutionCtx, Processor, ProcessorCondition, ProcessorScope, ProcessResult, ScopeVars, TextTransformer } from "./openai-types";

export const defaultDocumentSeparator='```';

export function parseProcessors(text:string, documentSeparator:string=defaultDocumentSeparator):Processor[]
{
    text=text.trim();
    if(!text.startsWith(documentSeparator)){
        const obj=JSON.parse(text);
        if(Array.isArray(obj)){
            return obj;
        }else{
            return [obj];
        }
    }

    const processors:Processor[]=[];
    let start=0;
    while(start<text.length){
        const [pro,end]=parseProcessor(start,text,documentSeparator);
        if(!pro || end<=start){
            break;
        }
        processors.push(pro);
        start=end;
    }
    return processors;
}

function parseProcessor(
    start:number,
    text:string,
    documentSeparator:string)
    :[Processor|null,number]
{

    start=text.indexOf('{',start);
    if(start===-1){
        return [null,-1];
    }

    let end=text.indexOf(documentSeparator,start);
    if(end===-1){
        return [null,-1];
    }

    const config=JSON.parse(text.substring(start,end)) as Processor;

    start=end+documentSeparator.length;
    end=text.indexOf(documentSeparator,start);
    if(end===-1){
        end=text.length;
    }
    const prompt=text.substring(start,end).trim();

    if(prompt){
        config.prompt=prompt;
    }

    return [config,end];

}

export function getDefaultProcessTextOptions():ProcessTextOptions
{
    return {
        sendBodyAsMessage:true,
        invokeFunctions:true
    }
}

export function transformText(text:string, transform:TextTransformer, scope:ProcessorScope):string
{
    if(typeof transform === 'string'){
        text=expandString(transform,scope).trim();
    }else if(typeof transform === 'function'){
        text=transform(text);
    }

    return text||'';
}


export function expandString(str:string,scope:Partial<ProcessorScope>):string
{
    const reg=/\{\{([^\}]+)\}\}/g;

    let output='';
    let endIndex=0;
    let matched=false;

    while(true){

        const match=reg.exec(str);
        if(!match){
            break;
        }
        matched=true;

        output+=str.substring(endIndex,match.index);

        output+=getScopeValue(match[1],scope);

        endIndex=match.index+match[0].length;

    }

    if(!matched){
        return str;
    }

    if(endIndex){
        output+=str.substring(endIndex);
    }

    return output;
}


function getScopeValue(exp:string,scope:Partial<ProcessorScope>):string
{

    let [expPath,defaultValue]=exp.split('??',2);
    expPath=expPath.trim();
    if(!defaultValue){
        defaultValue='';
    }else{
        defaultValue=defaultValue.trim();
    }



    let val:any;

    if(expPath.startsWith('$')){
        expPath=expPath.substring(1);
        val=scope;

        const names=expPath.split('.');

        for(const n of names){
            const name=n.trim();
            if(typeof val !== 'object'){
                return defaultValue?getScopeValue(defaultValue,scope):defaultValue;
            }
            if(Array.isArray(val)){
                let num=name;
                let orLast=num.startsWith('+');
                if(orLast){
                    num=num.substring(1);
                }
                let i=Number(num);
                if(isNaN(i)){
                    return defaultValue?getScopeValue(defaultValue,scope):defaultValue;
                }
                if(i<0){
                    i=val.length+i;
                }
                if(orLast && i>=val.length){
                    val=val[val.length-1];
                }else{
                    val=val[i];
                }
            }else{
                val=val[name];
            }
        }
    }else{
        val=expPath;
    }

    
    return val?.toString()||(defaultValue?getScopeValue(defaultValue,scope):defaultValue)
}

export function isConditionTrue(condition:ProcessorCondition, scope:ProcessorScope):string|boolean
{
    const not=condition.not?true:false;
    if(condition.match===true){
        return not?false:true;
    }else if(condition.match===false || condition.match===undefined){
        return not?true:false;
    }

    const reg=typeof condition.match==='string'?new RegExp(condition.match,condition.matchFlags):condition.match;

    let matchInput=scope.output||'';
    if(condition.matchInputTransform){
        matchInput=transformText(matchInput,condition.matchInputTransform,scope);
    }

    const match=reg.exec(matchInput);
    if(!match){
        return not?true:false;
    }
    if(condition.outputCaptureIndex){
        return not?false:match[condition.outputCaptureIndex]||'';
    }else{
        return not?false:true;
    }
}



export function applyScopeVars(vars:ScopeVars,scope:ProcessorScope)
{
    for(const e in vars){
        let key=e.trim();
        const optional=key.endsWith('?');
        if(optional){
            key=key.substring(0,key.length-1).trim();
            if(scope[e]!==undefined){
                continue;
            }
        }
        scope[e]=vars[e];
    }
}

export function applyCondition(condition:ProcessorCondition, scope:ProcessorScope, capture?:string):number|string|false
{

    if(condition.vars){
        applyScopeVars(condition.vars,scope);
    }

    if(capture!==undefined){
        scope.output=capture;
    }

    if(condition.sendOutput!==undefined){
        scope.sendOutput=condition.sendOutput;
    }

    if(condition.outputTransform!==undefined){
        scope.output=transformText(scope.output||'',condition.outputTransform,scope);
    }

    if(condition.textTransform!==undefined){
        scope.text=transformText(scope.text||'',condition.textTransform,scope);
    }

    if(condition.postVars){
        applyScopeVars(condition.postVars,scope);
    }

    if(condition.endEmpty && !scope.output?.trim()){
        return false;
    }

    if(condition.end===true){
        return false;
    }

    if(condition.goto!==undefined){
        return condition.goto;
    }

    if(condition.move!==undefined){
        return condition.move;
    }

    return 1;
}

export function getDefaultExecutionConfig():ExecutionConfig
{
    return {
        maxServiceCalls:defaultMaxServiceCalls,
        maxSteps:defaultMaxServiceCalls,
        maxTextLength:defaultMaxTextLength,
        maxPromptLength:defaultMaxPromptLength,
        engine:defaultOpenAiEngine,
    }
}


const defaultDebugCtxProps:(keyof ExecutionCtx)[]=[
    'scopeCaptures',
    'sendCaptures'
]

function applyConfigToScope(scope:Partial<ProcessorScope>,config:ExecuteDebugOptions|undefined)
{
    if(config?.deleteScopeProps){
        for(const e of config.deleteScopeProps){
            delete scope[e];
        }
    }

    if(config?.deleteLastScopeProps!==false){
        for(const e in scope){
            if(e.startsWith('last')){
                delete scope[e];
            }
        }
    }
}

export async function executeDebugModeAsync(
    ctx:ExecutionCtx,
    message:Message,
    processors:Processor[],
    config?:ExecuteDebugOptions)
    :Promise<ProcessorScope>
{

    const props=config?.ctxProps||defaultDebugCtxProps;

    if(config?.resetCaptures!==false){
        if(props.includes('scopeCaptures')){
            ctx.scopeCaptures=[];
        }
        if(props.includes('sendCaptures')){
            ctx.sendCaptures=[];
        }
        if(props.includes('scopeCapturesMap')){
            ctx.scopeCapturesMap={}
        }
    }

    try{
        return await executeAsync(ctx,message,processors);
    }finally{
        const output:any={}
        for(const prop of props){
            switch(prop){
                
                case 'scope':
                    if(ctx.scope){
                        applyConfigToScope(ctx.scope,config);
                    }
                    break;
                
                case 'scopeCaptures':
                    if(ctx.scopeCaptures){
                        for(const c of ctx.scopeCaptures){
                            applyConfigToScope(c.scope,config);
                        }
                    }
                    break;
                
                case 'scopeCapturesMap':
                    if(ctx.scopeCapturesMap){
                        for(const e in ctx.scopeCapturesMap){
                            delete ctx.scopeCapturesMap[e].processor;
                            applyConfigToScope(ctx.scopeCapturesMap[e],config);
                        }
                    }
                    break;
            }
        
            output[prop]=ctx[prop];
        }
        if(config?.print!==false){
            console.debug('executeDebugModeAsync',JSON.stringify(output,null,4));
        }
    }
}

export async function executeAsync(ctx:ExecutionCtx, message:Message, processors:Processor[]):Promise<ProcessorScope>
{

    const scope:ProcessorScope={
        text:message.text?.trim()||'',
        message:message,
        ...(ctx.scope||{})
    }

    const sendQueue:(()=>Promise<void>)[]=[];

    ctx.serviceCallCount=0;

    let stepCount=0;
    for(let i=0;i<processors.length;){
        if(stepCount>=ctx.config.maxSteps){
            throw new Error(`Max process step count reached. count = ${stepCount}`);
        }
        stepCount++;
        const processor=processors[i];
        const result=await executeSingleAsync(ctx,processor,scope,sendQueue);
        if(ctx.scopeCaptures){
            const sourceCapture:CapturedScope={
                processorName:processor.name,
                result,
                scope:{...scope}
            }
            if(typeof ctx.config.debug === 'object' && ctx.config.debug.captureProcessors){
                sourceCapture.processor=processor;
            }
            ctx.scopeCaptures.push(sourceCapture);
        }
        if(ctx.scopeCapturesMap){
            ctx.scopeCapturesMap[processor.name||'']={...scope}
        }
        if(result===false){
            break;
        }
        if(typeof result === 'string'){
            i=processors.findIndex(p=>p.name===result);
            if(i===-1){
                break;
            }
        }else{
            i+=result;
        }
    }

    for(const send of sendQueue){
        await send();
    }

    return scope;
}

async function executeSingleAsync(
    ctx:ExecutionCtx,
    processor:Processor,
    scope:ProcessorScope,
    sendQueue:(()=>Promise<void>)[])
    :Promise<ProcessResult>
{
    scope.lastPrompt=scope.prompt;
    scope.sendOutput=processor.sendOutput;

    if(processor.inputType==='array'){
        scope.input=(scope.output||'')
            .split(processor.inputArraySeparator||defaultArraySeparator)
            .map(i=>i.trim())
            .filter(i=>i);
        if(scope.input.length===0){
            delete scope.input;
        }
    }else{
        scope.input=scope.output||'';
        if(!scope.input){
            delete scope.input;
        }
    }

    if(processor.vars){
        applyScopeVars(processor.vars,scope);
    }

    if(scope.text.length > ctx.config.maxTextLength){
        scope.text=scope.text.substring(0,ctx.config.maxTextLength);
    }

    const request={...processor.completionConfig}
    request.prompt=expandString(processor.prompt||'',scope);
    scope.prompt=request.prompt;
    if(scope.prompt.length>ctx.config.maxPromptLength){
        return false;
    }

    let completion:string;


    if((processor.completion===undefined && request.prompt.trim()) || processor.completion===true){
        if((ctx.serviceCallCount||0)>=ctx.config.maxServiceCalls){
            throw new Error(`Max service call count reached. count = ${ctx.serviceCallCount}`);
        }
        ctx.serviceCallCount=(ctx.serviceCallCount||0)+1;
        completion=(await ctx.createCompletionAsync(
            processor.engine||ctx.config.engine,request,processor))?.trim()||'';
        
    }else if(typeof processor.completion === 'string'){
        completion=processor.completion.trim();
    }else{
        completion='';
    }
    
    scope.output=completion;

    let result:number|string|false=1;
    let processTransform:TextTransformer|null=null;

    if(processor.conditions){
        for(const cond of processor.conditions){
            const match=isConditionTrue(cond,scope);
            if(match!==false){
                processTransform=cond.processTransform||null;
                result=applyCondition(cond,scope,match===true?undefined:match);
                break;
            }
        }
    }

    if(processor.outputTransform){
        scope.output=transformText(scope.output||'',processor.outputTransform,scope);
    }

    if(processor.textTransform){
        scope.text=transformText(scope.text,processor.textTransform,scope);
    }

    if(processor.endEmpty && !scope.output?.trim()){
        result=false;
    }

    if(scope.output && scope.sendOutput && result!==false){
        let sendOutput=scope.output;
        if(processTransform){
            sendOutput=transformText(sendOutput,processTransform,scope);
        }
        if(processor.processTransform){
            sendOutput=transformText(sendOutput,processor.processTransform,scope);
        }
        
        const sendAsync=async ()=>{
            scope.lastSendOutput=sendOutput;
            if(ctx.sendCaptures){
                ctx.sendCaptures.push(sendOutput);
            }
            if(ctx.mgr && ctx.config.responseOptions){
                await ctx.mgr.processTextAsync(
                    sendOutput,
                    scope.message.convoId,
                    scope.message,
                    ctx.config.responseOptions);
            }
        }

        if(scope.sendOutput==='queue'){
            sendQueue.push(sendAsync);
        }else{
            await sendAsync();
        }
    }

    if(processor.postVars){
        applyScopeVars(processor.postVars,scope);
    }

    return result;
}

export function sanitizeExecutionConfig(config:Partial<ExecutionConfig>):ExecutionConfig
{
    return {
        ...config,
        engine:config.engine||defaultOpenAiEngine,
        // // ensure maxProcessStep is a number. This is very important since the OpenAI API is expensive
        maxServiceCalls:typeof config.maxServiceCalls === 'number'?config.maxServiceCalls:defaultMaxServiceCalls,
        maxSteps:typeof config.maxSteps === 'number'?config.maxSteps:defaultMaxSteps,
        maxTextLength:typeof config.maxTextLength === 'number'?config.maxTextLength:defaultMaxTextLength,
        maxPromptLength:typeof config.maxPromptLength === 'number'?config.maxPromptLength:defaultMaxPromptLength,
    }
    
}