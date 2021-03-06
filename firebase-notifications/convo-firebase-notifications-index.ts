import { ConvoService, Message, NotificationDevice, ServiceProcessCtx } from '@iyio/convo';
import firebase, { messaging } from 'firebase-admin';


export const defaultMessageDocumentPath='conversations/{convoId}/messages/{messageId}';
export const defaultDevicesCollection='notificationDevices';

export interface FirebaseNotificationServiceConfig
{
    messageDocumentPath?:string;
    devicesCollection?:string;
    getData?:(message:Message,device:NotificationDevice)=>{[key:string]:string},
    configureMessage?:(msg:messaging.TokenMessage)=>void;
    resolveUriAsync?:(uri:string,message:Message,device:NotificationDevice)=>Promise<string|null>;
}

export class FirebaseNotificationService implements ConvoService
{
    public readonly name:string="FirebaseNotificationService"

    public readonly supportsParallelProcessing:boolean=true;

    private readonly db:firebase.firestore.Firestore;

    public readonly tags:string[]=[];

    private readonly config:FirebaseNotificationServiceConfig;

    public constructor(
        db:firebase.firestore.Firestore,
        config:FirebaseNotificationServiceConfig)
    {
        this.db=db;
        this.config=config;
    }

    public async processMessageAsync({
        message,
        mgr,
    }: ServiceProcessCtx): Promise<void>
    {
        if(message.notify?.length && (message.text || message.contentThumbnailUrl)){

            const {
                //messageDocumentPath=defaultMessageDocumentPath,
                devicesCollection=defaultDevicesCollection,
                getData,
                configureMessage,
                resolveUriAsync,
            }=this.config;

            const devices=await this.db.collection(devicesCollection)
                .where('userId','in',message.notify)
                .get();

            if(!devices.size){
                return;
            }

            const sentTo:{[id:string]:true}={};

            await Promise.all(devices.docs.map(async (d)=>{
                
                try{
                    const device=d.data() as NotificationDevice;

                    if(sentTo[device.deviceId]){
                        return;
                    }
                    sentTo[device.deviceId]=true;

                    if(device.deviceId){
                        
                        let uri=message.contentThumbnailUrl;
                        if(uri && resolveUriAsync){
                            uri=(await resolveUriAsync(uri,message,device))||undefined;
                        }

                        const msg:messaging.TokenMessage={
                            token:device.deviceId,
                            notification:{
                                title:message.senderName?`Message from ${message.senderName}`:'New Message',
                                body:message.text,
                                imageUrl:uri
                            }
                        }
                        const data=getData?.(message,device);
                        if(data){
                            msg.data=data;
                        }
                        if(message.data){
                            if(!msg.data){
                                msg.data={}
                            }
                            for(const e in message.data){
                                msg.data[e]=message.data[e];
                            }
                        }
                        configureMessage?.(msg);
                        await firebase.messaging().send(msg);
                    }
                }catch(ex:any){
                    console.error(`error sending notification to device. device:${d.id}, message:${message.id}`)
                }
            }))
        }
    }
}