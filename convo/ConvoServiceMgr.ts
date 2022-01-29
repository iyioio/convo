import { convertRequestToMessage, isServiceMatch } from "./common";
import { Message, SendMessageRequest } from "./convo-types";
import { ConvoService, ConvoServiceAdapter, ServiceProcessCtx, ServiceProcessResult } from "./convo-types-service";

export class ConvoServiceMgr
{
    private readonly provider:ConvoServiceAdapter;

    private readonly services:ConvoService[];

    private readonly serviceGroups:ConvoService[][];

    public constructor(provider:ConvoServiceAdapter, services:ConvoService[]=[])
    {
        this.provider=provider;
        this.services=services;
        this.serviceGroups=[];

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
            const tasks:Promise<ServiceProcessResult|void>[]=[];
            for(const service of group){

                if(!isServiceMatch(service.tags,message.serviceTags)){
                    continue;
                }

                const task=service.processMessageAsync(ctx);
                if(task){
                    tasks.push(task);
                }
            }

            let stop=false;
            for(const task of tasks){
                const r=await task;
                if(!r){
                    continue;
                }
                if(r.stopProcessing){
                    stop=true;
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
        return await this.provider.sendMessageAsync(convertRequestToMessage(request));
    }

}