import { ConvoProvider, DateTimeValue, Message } from '@iyio/convo';
import firestore from '@react-native-firebase/firestore';

export class FirestoreReactNativeProvider implements ConvoProvider
{

    // name of the collection to store conversations in
    private readonly cn:string;

    private get db(){return firestore()}

    public constructor(convoCollection:string)
    {
        this.cn=convoCollection;
    }

    public async getMessagesAsync(convoId:string, count:number, startDate:DateTimeValue): Promise<Message>
    {
        return {
            id:'',
            senderId:'',
            created:0
        }
    }
}