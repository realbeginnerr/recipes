import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../apps-script/account-deletion-notifier/Code.gs',import.meta.url),'utf8');

function response(status,body={}){
 return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(body)};
}

function setup(){
 const created=[],deleted=[],emails=[],requests=[];
 const triggers=[{getHandlerFunction:()=> 'sendPendingAccountDeletionEmails'}];
 const context={
  console,Date,
  ScriptApp:{
   getProjectTriggers:()=>triggers,
   deleteTrigger:trigger=>deleted.push(trigger),
   getOAuthToken:()=> 'oauth-token',
   newTrigger:handler=>{
    const item={handler};
    const builder={timeBased:()=>builder,atHour:value=>(item.hour=value,builder),nearMinute:value=>(item.minute=value,builder),everyDays:value=>(item.days=value,builder),inTimezone:value=>(item.timezone=value,builder),create:()=>created.push(item)};
    return builder;
   },
  },
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  MailApp:{sendEmail:message=>emails.push(message)},
  UrlFetchApp:{fetch:(url,options)=>{
   requests.push({url,options});
   if(options.method==='get')return response(200,{documents:[
    {name:'projects/p/databases/(default)/documents/accountDeletionRequests/a',updateTime:'2026-11-17T00:00:00Z',fields:{status:{stringValue:'requested'},requesterEmail:{stringValue:'a@example.com'},requestedAt:{timestampValue:'2026-11-17T00:00:00Z'}}},
    {name:'projects/p/databases/(default)/documents/accountDeletionRequests/b',updateTime:'2026-11-17T00:00:00Z',fields:{status:{stringValue:'requested'},emailNotifiedAt:{timestampValue:'2026-11-17T01:00:00Z'}}},
    {name:'projects/p/databases/(default)/documents/accountDeletionRequests/c',updateTime:'2026-11-17T00:00:00Z',fields:{status:{stringValue:'done'}}},
   ]});
   return response(200,{});
  }},
 };
 vm.createContext(context);vm.runInContext(source,context);
 return {context,created,deleted,emails,requests};
}

test('installs only two daily Korea-time triggers near 09:00 and 21:00',()=>{
 const mock=setup();mock.context.installAccountDeletionEmailTriggers();
 assert.equal(mock.deleted.length,1);
 assert.deepEqual(mock.created.map(({handler,hour,minute,days,timezone})=>({handler,hour,minute,days,timezone})),[
  {handler:'sendPendingAccountDeletionEmails',hour:9,minute:0,days:1,timezone:'Asia/Seoul'},
  {handler:'sendPendingAccountDeletionEmails',hour:21,minute:0,days:1,timezone:'Asia/Seoul'},
 ]);
});

test('emails only unnotified requests to the fixed admin address and marks them sent',()=>{
 const mock=setup();mock.context.sendPendingAccountDeletionEmails();
 assert.equal(mock.emails.length,1);
 assert.equal(mock.emails[0].to,'hijmjo@gmail.com');
 assert.match(mock.emails[0].body,/a@example.com/);
 assert.equal(mock.requests.filter(request=>request.options.method==='patch').length,1);
 assert.match(mock.requests.find(request=>request.options.method==='patch').url,/emailNotifiedAt/);
});
