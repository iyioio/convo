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
}

export function sendConvoNotifications(
    db:firebase.firestore.Firestore,
    {
        messageDocumentPath=defaultMessageDocumentPath,
        devicesCollection=defaultDevicesCollection,
        getData,
        configureMessage
    }:SendConvoNotificationsOptions)
{
    return functions.firestore
        .document(messageDocumentPath)
        .onCreate(async (snap,context)=>{

            const message=snap.data() as Message;

            if(message.notify?.length && message.text){

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
                            const msg:messaging.TokenMessage={
                                token:device.deviceId,
                                notification:{
                                    title:message.senderName?`Message from ${message.senderName}`:'New Message',
                                    body:message.text
                                }
                            }
                            const data=getData?.(message,device);
                            if(data){
                                msg.data=data;
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