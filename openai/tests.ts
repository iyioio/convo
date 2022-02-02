import { deepCompare, Message } from "@iyio/convo";
import util from 'util';
import { ExecutionCtx, Processor } from "./openai-types";
import { defaultDocumentSeparator, executeDebugModeAsync, expandString, getDefaultExecutionConfig, parseProcessors } from "./openai-util";
const fs = require("fs");



const assertExpanded=(expected:string,expression:string,vars:any)=>{
    const expanded=expandString(expression,vars);
    if(expanded!==expected){
        throw new Error(`Expand failed - |${expected}| !== |${expanded}|\nExpression: |${expression}|`)
    }
}

function assertEqual(a:any,b:any){
    if(a!==b){
        throw new Error(`|${a}| !== |${b}|`)
    }
}

function assertSame(name:string,actual:any,expected:any){
    if(!deepCompare(actual,expected)){
        console.info('============ Expected Value ============');
        console.info(util.inspect(expected,{showHidden:false,depth:100,colors:true}));
        console.info('============ Actual Value ============');
        console.info(util.inspect(actual,{showHidden:false,depth:100,colors:true}));
        throw new Error(name+' not same')
    }
}

function assertHasValue<T>(name:string, value:T|null|undefined):T{
    if(!value){
        throw new Error(`${name} has no value`);
    }
    return value;
}

function textExpandString()
{
    assertExpanded('Hi Bob','Hi Bob',{
        
    });

    assertExpanded('Hi Bob','Hi {{ $name }}',{
        name:'Bob'
    });

    assertExpanded('Hi\nBob','Hi\n{{ $name }}',{
        name:'Bob'
    });

    assertExpanded('Hi Bob and Jim','Hi {{ $name }} and {{ $name2 }}',{
        name:'Bob',
        name2:'Jim'
    });

    assertExpanded('Hi Bob','Hi {{ $name ?? $backupName }}',{
        backupName:'Bob'
    });

    assertExpanded('Hi Bob','Hi {{ $obj.main ?? $backupName }}',{
        obj:{a:'No name'},
        backupName:'Bob'
    });

    assertExpanded('Hi Bob','Hi {{ $names.0 }}',{
        names:['Bob','Jim']
    });

    assertExpanded('Hi Jim','Hi {{ $names.1 }}',{
        names:['Bob','Jim']
    });

    assertExpanded('Hi Jim','Hi {{ $names.+2 }}',{
        names:['Bob','Jim']
    });

    assertExpanded('Hi Jim','Hi {{ $names.-1 }}',{
        names:['Bob','Jim']
    });

    assertExpanded('Hi Bob','Hi {{ $names.main }}',{
        names:{
            main:'Bob',
            fallback:'Jim'
        }
    });

    assertExpanded('Hi Jim','Hi {{ $names.fallback }}',{
        names:{
            main:'Bob',
            fallback:'Jim'
        }
    });
}

async function testExecuteAsync()
{
    const processors=assertHasValue(
        "Keyword prompt",
        parseProcessors(fs.readFileSync('./test-prompts/test.prompt').toString()));

    assertEqual(processors.length,2);

    const [keyword,chat]=processors;

    assertHasValue('keyword',keyword);
    assertHasValue('chat',chat);
    assertHasValue('keyword name',keyword.name);
    assertHasValue('chat name',chat.name);

    const message:Message={
        id:'test',
        convoId:'test',
        created:0,
        text:'I want to learn Arabic and Bengali'
    }

    const chatOutput='Arabic and Bengali are both widely spoke languages';
    const keywordOutput='Arabic, Bengali';

    const ctx:ExecutionCtx={
        config:getDefaultExecutionConfig(),
        createCompletionAsync:async (e,r,processor)=>{
            if(processor.name===keyword.name){
                return ' '+keywordOutput+' ';
            }else if(processor.name===chat.name){
                return ' '+chatOutput;
            }else{
                return null;
            }
        }
    }

    await executeDebugModeAsync(
        ctx,
        message,
        [
            keyword,
            chat
        ],
        {
            print:false,
            ctxProps:[
                'scopeCaptures',
                'sendCaptures'
            ]
        }
    );

    assertSame("Captures", ctx.scopeCaptures, [
      {
        processorName: "Keywords",
        result: 1,
        scope: {
          text: "I want to learn Arabic and Bengali",
          message: {
            id: "test",
            convoId: "test",
            created: 0,
            text: "I want to learn Arabic and Bengali",
          },
          sendOutput: "queue",
          stepIndex: 0,
          prompt:
            "Extract keywords that relate to learning how to speak a new language from the messages below.\n" +
            "If no keywords are found respond with (none).\n" +
            "\n" +
            "Message: My son is learning French\n" +
            "Keywords: French\n" +
            "Message: It can be hard to find a tutor that can teach Russian\n" +
            "Keywords: Russian\n" +
            "Message: I would like to learn Italian and Hindi\n" +
            "Keywords: Italian, Hindi\n" +
            "Message: My grandma can speak German\n" +
            "Keywords: German\n" +
            "Message: I think I heard someone speaking Bengali when I was at the coffee shop\n" +
            "Keywords: Bengali\n" +
            "Message: I think riding my bike is fun\n" +
            "Keywords: (none)\n" +
            "Message: I like eating sushi\n" +
            "Keywords: (none)\n" +
            "Message: Can you find my monkey\n" +
            "Keywords: (none)\n" +
            "Message: Do you think we really landed on the moon\n" +
            "Keywords: (none)\n" +
            "Message: I want to learn Arabic and Bengali\n" +
            "Keywords:",
          completion: "Arabic, Bengali",
          output: "Arabic, Bengali",
        },
      },
      {
        processorName: "Chat",
        result: 1,
        scope: {
          text: "I want to learn Arabic and Bengali",
          message: {
            id: "test",
            convoId: "test",
            created: 0,
            text: "I want to learn Arabic and Bengali",
          },
          sendOutput: true,
          stepIndex: 1,
          prompt:
            "The following is a conversation with a tutor and student. The tutor is very intelligent and  kid \n" +
            "friendly and answers questions with facts:\n" +
            "\n" +
            "Student: I'm having problems learning Arabic\n" +
            "Tutor: You can do it, Arabic can be challenging at times but you can learn it if you try.\n" +
            "Student: My mom likes speaking Bengali with her friends\n" +
            "Tutor: Bengali is a widely spoken language\n" +
            "Student: I want to learn Arabic and Bengali\n" +
            "Tutor:",
          completion: "Arabic and Bengali are both widely spoke languages",
          output: "Arabic and Bengali are both widely spoke languages",
          input: ["Arabic", "Bengali"],
          lng1: "French",
          lng2: "Spanish",
        },
      },
    ]);

    assertSame("send values", ctx.sendCaptures, [
      {
        index: 1,
        output: "Arabic and Bengali are both widely spoke languages",
      },
      {
        index: 0,
        output: ".... keywords([ Arabic, Bengali ])",
      },
    ]);
}

function testDocumentParsing()
{
    const processors=parseProcessors(testDoc);
    
    assertEqual(processors.length,1);

    const doc=processors[0];
    assertHasValue('doc',doc);

    //console.info(doc);

    const expected:Processor={
        "name":"Keywords",
        "engine": "text-babbage-001",
        "conditions":[
            {
                "not":true,
                "match":"\\Wnone\\W",
                "matchFlags":"i",
                "sendOutput":true,
                "processTransform":".... keywords([ {{$output}} ])"
            }
        ],
        "completionConfig":{
            "temperature": 0,
            "max_tokens": 60,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0,
            "stop": ["Message:", "Keywords:"]
        },
        prompt:prompt
    }

    assertSame('doc',doc,expected);
}

const prompt=`Extract keywords that relate to learning how to speak a new language from the messages below.
If no keywords are found respond with (none).

Message: My son is learning French
Keywords: French
Message: It can be hard to find a tutor that can teach Russian
Keywords: Russian
Message: I would like to learn Italian and Hindi
Keywords: Italian, Hindi
Message: My grandma can speak German
Keywords: German
Message: I think I heard someone speaking Bengali when I was at the coffee shop
Keywords: Bengali
Message: I think riding my bike is fun
Keywords: (none)
Message: I like eating sushi
Keywords: (none)
Message: Can you find my monkey
Keywords: (none)
Message: Do you think we really landed on the moon
Keywords: (none)
Message: what every get Type
Keywords: ()
Message: {{$text}}
Keywords:`

const testDoc=`${defaultDocumentSeparator} json
{
    "name":"Keywords",
    "engine": "text-babbage-001",
    "conditions":[
        {
            "not":true,
            "match":"\\\\Wnone\\\\W",
            "matchFlags":"i",
            "sendOutput":true,
            "processTransform":".... keywords([ {{$output}} ])"
        }
    ],
    "completionConfig":{
        "temperature": 0,
        "max_tokens": 60,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0,
        "stop": ["Message:", "Keywords:"]
    }
}
${defaultDocumentSeparator}

${prompt} `

const reset = "\x1b[0m";
const red = "\x1b[31m";
const green = "\x1b[32m";
const cyan = "\x1b[36m";

(async ()=>{
    try{

        console.info(cyan+'Expand string'+reset);
        textExpandString();
        console.info(green+'success'+reset);

        console.info(cyan+'Document Parsing'+reset);
        testDocumentParsing();
        console.info(green+'success'+reset);


        console.info(cyan+'Process Execution'+reset);
        await testExecuteAsync();
        console.info(green+'success'+reset);

    }catch(ex:any){
        console.error(red+'Testing failed - '+ex.message+reset,ex);
        process.exit(1);
    }
})();



