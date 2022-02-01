import { cloneDeleteUndefinedShallow, convertRequestToMessage, getFuncMatch, isServiceMatch, parseFunc } from "./common";
import type { ConvoFunc, FuncCallCtx, MemberData, Message, SendMessageRequest } from "./convo-types";
import { ConvoService, ConvoServiceAdapter, ConvoServiceMgrConfig, defaultFunctionSeparator, defaultSenderLabelReg, ProcessTextOptions, ServiceProcessCtx, ServiceProcessResult } from "./convo-types-service";

export class ConvoServiceMgr
{
    private readonly adapter:ConvoServiceAdapter;

    private readonly services:ConvoService[];

    private readonly functions:ConvoFunc[];

    private readonly serviceGroups:ConvoService[][];

    public constructor({
        adapter,
        services=[],
        functions=[]
    }:ConvoServiceMgrConfig)
    {
        this.adapter=adapter;
        this.services=services;
        this.serviceGroups=[];
        this.functions=functions;

        let group:ConvoService[]|null=null;
        for(const service of services){
            if(!service.supportsParallelProcessing){
                group=null;
            }
            if(!group){
                group=[];
                this.serviceGroups.push(group);
            }
            group.push(service);
            if(!service.supportsParallelProcessing){
                group=null;
            }
        }
    }

    public getMemberDataAsync(memberId:string): Promise<MemberData|null>
    {
        return this.adapter.getMemberDataAsync(memberId);
    }

    public async callTextFuncAsync(convoId:string|null, message:Message|null, funcText:string):Promise<any>
    {
        const parsed=parseFunc(funcText);
        if(!parsed){
            return;
        }

        const func=getFuncMatch(parsed,this.functions);
        if(!func){
            return;
        }

        const ctx:FuncCallCtx={
            convoId:convoId||undefined,
            message:message||undefined,
            memberId:message?.receiverId,
            func,
            mgr:this
        };

        let r=func.callback(ctx,...parsed.argValues);
        if(r && r.then){
            r=await r;
        }
        return r;
    }

    public async processTextAsync(text:string,convoId:string,message:Message|null,{
        invokeFunctions,
        sendBodyAsMessage,
        sendMessageDefaults,
        getRequestDefaultsForLabelAsync,
        senderLabelReg=defaultSenderLabelReg,
        functionSeparator=defaultFunctionSeparator,
    }:ProcessTextOptions)
    {
        let senderLabel:string|null=null;
        let [body,...functions]=text.split(functionSeparator);
        body=body.trim();
        const senderLabelMatch=senderLabelReg?senderLabelReg.exec(body):null;
        if(senderLabelMatch?.[1] && senderLabelMatch?.[2]){
            senderLabel=senderLabelMatch[1];
            body=senderLabelMatch[2].trim();
        }

        if(sendBodyAsMessage && body){
            const request:SendMessageRequest={
                text:body,
                convoId,
                senderName:senderLabel||undefined,
                senderId:message?.receiverId||senderLabel?'labeled-'+senderLabel:undefined,
                ...(cloneDeleteUndefinedShallow(sendMessageDefaults)||{}),
                ...(((senderLabel && getRequestDefaultsForLabelAsync)?cloneDeleteUndefinedShallow(getRequestDefaultsForLabelAsync(senderLabel)):null)||{})                
            }
            await this.sendMessageAsync(request);
        }

        if(invokeFunctions && functions.length){
            // call functions
            for(const func of functions){
                try{
                    await this.callTextFuncAsync(convoId,message,func);
                }catch(ex:any){
                    console.error(`Error calling func - ${func}`,ex);
                    break;
                }
            }
        }
    }

    public async processMessageAsync(message:Message):Promise<void>
    {
        if(!this.serviceGroups.length){
            return;
        }
        const ctx:ServiceProcessCtx={
            message,
            mgr:this
        }
        for(const group of this.serviceGroups){
            const tasks:[ConvoService,Promise<ServiceProcessResult|void>][]=[];
            for(const service of group){

                if(!isServiceMatch(service.tags,message.serviceTags)){
                    continue;
                }
                try{
                    const task=service.processMessageAsync(ctx);
                    if(task){
                        tasks.push([service,task]);
                    }
                }catch(ex:any){
                    console.error(`Error starting service message processing - ${service.name}`,ex);
                }
            }

            let stop=false;
            for(const [service,task] of tasks){
                try{
                    const r=await task;
                    if(!r){
                        continue;
                    }
                    if(r.stopProcessing){
                        stop=true;
                    }
                }catch(ex:any){
                    console.error(`Error finishing service message processing - ${service.name}`,ex);
                }
            }

            if(stop){
                break;
            }
        }
    }

    /**
     * Sends a message in a conversation
     */
    public async sendMessageAsync(request:SendMessageRequest):Promise<Message>
    {
        return await this.adapter.sendMessageAsync(convertRequestToMessage(request));
    }

}