import { ConvoFunc, ConvoFuncArgType, ParsedConvoFunc, SendMessageRequest } from "./convo-types";

export const tagBot='bot';

export function isServiceMatch(serviceTags:string[], messageTags:string[]|undefined)
{
    if(!Array.isArray(messageTags)){
        messageTags=undefined;
    }

    if(!serviceTags.length){
        return messageTags?true:false;
    }

    if(!messageTags){
        return false;
    }

    for(const tag of messageTags){
        if(serviceTags.includes(tag)){
            return true;
        }
    }

    return false;
}

export function convertRequestToMessage(request:SendMessageRequest)
{
    if(!request.convoId){
        throw new Error('SendMessageRequest must define a convoId')
    }

    let notify=request.notify?[...request.notify]:[];

    if(request.senderId){
        if(request.notifySender){
            if(!notify.includes(request.senderId)){
                notify.push(request.senderId);
            }
        }else{
            if(notify.includes(request.senderId)){
                notify=notify.filter(id=>id!==request.senderId);
            }
        }
    }

    const read:{[memberId:string]:boolean}={}
    for(const n of notify){
        read[n]=false;
    }


    return {
        convoId:request.convoId,
        senderId:request.senderId,
        senderName:request.senderName,
        receiverId:request.receiverId,
        serviceTags:Array.isArray(request.serviceTags)?[...request.serviceTags]:request.serviceTags,
        created:request.created===undefined?Date.now():request.created,
        text:request.text,
        contentType:request.contentType,
        content:request.content,
        contentUri:request.contentUri,
        contentThumbnailUrl:request.contentThumbnailUrl,
        contentData:request.contentData,
        notify:notify,
        tags:sortTags(request.tags),
        data:request.data?{...request.data}:undefined,
        read
    };
}

export function sortTags(tags:string[]|undefined):string[]|undefined
{
    if(!tags){
        return undefined;
    }
    tags=[...tags];
    tags.sort((a,b)=>a.localeCompare(b));
    return tags;
}


/**
 * Creates a new unique Id
 * @see https://github.com/firebase/firebase-js-sdk/blob/6abd6484730971e2390b2b9acbb61800852fb350/packages/firestore/src/util/misc.ts
 */
export function newId(): string {
    // Alphanumeric characters
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    for (let i = 0; i < 20; i++) {
        autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
}

export const cloneObjSkipUndefined=<T>(obj:T, maxDepth=20):T=>
{
    if(maxDepth<0){
        throw new Error('cloneObj max depth reached');
    }
    maxDepth--;
    if(!obj || typeof obj !== 'object'){
        return obj;
    }

    if(Array.isArray(obj)){
        const clone=[];
        for(let i=0;i<obj.length;i++){
            const o=obj[i];
            if(o===undefined){
                continue;
            }
            clone.push(cloneObjSkipUndefined(o,maxDepth));
        }
        return clone as any;
    }else{
        const clone:any={}
        for(const e in obj){
            const o=obj[e];
            if(o===undefined){
                continue;
            }
            clone[e]=cloneObjSkipUndefined(o,maxDepth);
        }
        return clone;
    }

}

export function cloneObj<T>(obj:T, maxDepth=200):T
{
    if(maxDepth<0){
        throw new Error('cloneObj max depth reached');
    }
    maxDepth--;
    if(!obj || typeof obj !== 'object'){
        return obj;
    }

    if(Array.isArray(obj)){
        const clone=[];
        for(let i=0;i<obj.length;i++){
            clone.push(cloneObj(obj[i],maxDepth));
        }
        return clone as any;
    }else{
        const clone:any={}
        for(const e in obj){
            clone[e]=cloneObj(obj[e],maxDepth);
        }
        return clone;
    }
}

export function cloneDeleteUndefinedShallow<T>(obj:T):T
{
    if(typeof obj !== 'object'){
        return obj;
    }

    const n:any={}

    for(const e in obj){
        if(obj[e]!==undefined){
            n[e]=obj[e];
        }
    }

    return n;
}

const funcNameReg=/^(\w+)$/;

export function parseFunc(funcText:string):ParsedConvoFunc|null
{
    const i=funcText.indexOf('(');
    if(i===-1){
        return null;
    }

    const name=funcNameReg.exec(funcText.substring(0,i).trim())?.[1];
    if(!name){
        return null;
    }

    funcText=funcText.substring(i+1).trim();
    if(funcText.endsWith(')')){
        funcText=funcText.substring(0,funcText.length-1).trim();
    }
    return {
        name,
        ...parseConvoFuncArgs(funcText)
    }
}

const allowedArgTypes=[
    'string',
    'number',
    'boolean',
    'null',
    'undefined'
]

/**
 * Parses a sequence of arguments allowing for syntax errors
 */
export function parseConvoFuncArgs(text:string):{argValues:any[],args:ConvoFuncArgType[]}
{
    const argValues:any[]=[];
    const args:ConvoFuncArgType[]=[];

    let inStr:string='';
    let inAry=false;
    let ary:any[]=[];
    let aryType:string|null=null;
    let startC=0;
    let c=0;

    const pushVal=(skipEmpty=false)=>{
        try{
            let val:any=text.substring(startC,c);
            if(skipEmpty && !val.trim()){
                return;
            }
            if(inStr){
                val=(val
                    .split('\\r').join('\r')
                    .split('\\n').join('\n')
                    .split('\\t').join('\t')
                    .split('\\b').join('\b')
                    .split('\\f').join('\f')
                    .split('\\v').join('\v')
                    .split('\\"').join('"')
                    .split("\\'").join("'")
                    .split('\\\\').join('\\')
                )
            }else{
                try{
                    const lVal=val.toLowerCase();
                    val=lVal==='undefined'?undefined:JSON.parse(lVal);
                    if(val!==null && typeof val === 'object'){
                        val=undefined;
                    }
                }catch{
                    val=val.trim();
                }
            }
            let type=val===null?'null':typeof val;
            if(!allowedArgTypes.includes(type)){
                val=undefined;
                type='undefined';
            }

            if(inAry){
                if(aryType===null){
                    aryType=type;
                    ary=[];
                    argValues.push(ary);
                    args.push(type+'[]' as any);
                }
                if(type===aryType){
                    ary.push(val);
                }
            }else{
                argValues.push(val);
                args.push(type as any);
            }
        }finally{
            startC=c+1;
        }
    }

    for(;c<text.length;c++){

        const ch=text[c];
        switch(ch){

            case '\\':
                if(inStr){
                    c++;
                }
                break;

            case ',':
                if(inStr){
                    continue;
                }
                pushVal(true);
                break;

            case "'":
            case '"':
                if(inStr===ch){
                    pushVal();
                    inStr='';
                }else if(!inStr){
                    pushVal(true);
                    inStr=ch;
                }
                break;

            case '[':
                if(!inAry && !inStr){
                    pushVal(true);
                    aryType=null;
                    inAry=true;
                }
                break;

            case ']':
                if(inAry && !inStr){
                    pushVal(true);
                    aryType=null;
                    inAry=false;
                }
                break;
        }
        
    }

    pushVal(true);

    return {argValues,args}
}

export function getFuncMatch(parsed:ParsedConvoFunc,functions:ConvoFunc[]):ConvoFunc|null
{
    const lName=parsed.name.toLowerCase();
    for(const func of functions){
        if(func.name.toLowerCase()==lName){
            if(!func.args){
                if(!parsed.args.length){
                    return func;
                }
                continue;
            }
            if(parsed.args.length!==func.args.length){
                continue;
            }
            let match=true;
            for(let i=0;i<func.args.length;i++){
                if(func.args[i].type!==parsed.args[i]){
                    match=false;
                }
            }
            if(match){
                return func;
            }
        }
    }

    return null;
}


export function deepCompare(a:any, b:any, maxDepth=10, depth=0):boolean
{
    if(maxDepth<0){
        throw new Error('deepCompare max depth reached');
    }
    maxDepth--;
    const type=typeof a;
    if(type !== (typeof b)){
        return false
    }

    if(type !== 'object'){
        return a===b;
    }

    if(Array.isArray(a)){
        if(a.length!==b.length){
            return false;
        }
        for(let i=0;i<a.length;i++){
            if(!deepCompare(a[i],b[i],maxDepth,depth+1))
            {
                return false;
            }
        }
    }else{
        let ac=0;
        for(const e in a){
            ac++;
            if(!deepCompare(a[e],b[e],maxDepth,depth+1))
            {
                return false;
            }
        }
        let dc=0;
        for(const e in b){
            dc++;
        }
        if(ac!==dc){// ;)
            return false;
        }
    }

    return true;


}