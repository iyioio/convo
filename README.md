# convo
A framework for conversations

## Actions

- Start chat - creates a new sub-collection in the /chats collection


## Db Layout

``` ts



interface Chat
{
    uid:string;

    // user ids of the members of the chat group. This array is used grant users access to
    // the chat group
    memberIds:string[];

    messages:SubCollection<Message>;

}

type ContentType='image'|'video'|'lottie';

interface Message
{
    uid:string;

    senderId:string;

    created:number;

    text?:string;

    contentType?:ContentType;

    content?:string;

    contentUri?:string;

}

```