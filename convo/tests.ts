import { deepCompare, parseConvoFuncArgs } from "./common";


function assertSame(a:any,b:any){
    if(!deepCompare(a,b)){
        throw new Error('Not the same')
    }
}

function testArgParsing()
{
    const args=parseConvoFuncArgs(
        `1, false, true, abc, 'x\\'yz', "abc'd", 'ty"d' [3,, ,]`+
        `[1,false, a string, 2 , ] 'c'"b" fart , ['hi','bye'] , [true, null, false]`+
        `'hi\\tjoe', 'my\\nline', "ok\\""`+
        `,,null,undefined, ending string `);

    console.info(args);

    assertSame(args,{
        argValues: [
            1,               false,
            true,            'abc',
            "x'yz",          "abc'd",
            'ty"d',          [ 3 ],
            [ 1, 2 ],        'c',
            'b',             'fart',
            [ 'hi', 'bye' ], [ true, false ],
            'hi\tjoe',       'my\nline',
            'ok"',           null,
            undefined,       'ending string'
        ],
        args: [
            'number',    'boolean',
            'boolean',   'string',
            'string',    'string',
            'string',    'number[]',
            'number[]',  'string',
            'string',    'string',
            'string[]',  'boolean[]',
            'string',    'string',
            'string',    'null',
            'undefined', 'string'
        ]
    });
}

export const reset = "\x1b[0m"
export const red = "\x1b[31m"
export const green = "\x1b[32m"

try{
    testArgParsing();

    console.info(green+'success'+reset);

}catch(ex:any){
    console.error(red+'Testing failed - '+ex.message+reset);
}