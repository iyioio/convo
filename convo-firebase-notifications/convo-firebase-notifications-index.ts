import { Message, NotificationDevice } from '@iyio/convo';
import firebase, { messaging } from 'firebase-admin';
import * as functions from "firebase-functions";


export const defaultMessageDocumentPath='conversations/{convoId}/messages/{messageId}';
export const defaultDevicesCollection='notificationDevices';

export interface SendConvoNotificationsOptions
{
    messageDocumentPath?:string;
    devicesCollection?:string;
    getData?:(message:Message,device:NotificationDevice)=>{[key:string]:string},
    configureMessage?:(msg:messaging.TokenMessage)=>void;
    resolveUriAsync?:(uri:string,message:Message,device:NotificationDevice)=>Promise<string|null>;
}

export function sendConvoNotifications(
    db:firebase.firestore.Firestore,
    {
        messageDocumentPath=defaultMessageDocumentPath,
        devicesCollection=defaultDevicesCollection,
        getData,
        configureMessage,
        resolveUriAsync
    }:SendConvoNotificationsOptions)
{
    return functions.firestore
        .document(messageDocumentPath)
        .onCreate(async (snap,context)=>{

            const message=snap.data() as Message;

            if(message.notify?.length && (message.text || message.contentThumbnailUrl)){

                const devices=await db.collection(devicesCollection)
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
        })
}