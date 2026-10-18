import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
const project = 'recipes-5a663'
const token = execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command','gcloud auth print-access-token'], {encoding:'utf8'}).trim()
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
async function request(suffix) {
 const response = await fetch(base+suffix,{headers:{Authorization:`Bearer ${token}`,'x-goog-user-project':project},signal:AbortSignal.timeout(30000)})
 if(response.status===404)return null
 if(!response.ok)throw new Error(`Firestore ${response.status}`)
 return response.json()
}
function decode(v){if('stringValue' in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('booleanValue'in v)return v.booleanValue;if('nullValue'in v)return null;if(v.arrayValue)return(v.arrayValue.values??[]).map(decode);if(v.mapValue)return Object.fromEntries(Object.entries(v.mapValue.fields??{}).map(([k,x])=>[k,decode(x)]));return null}
const products=[];let pageToken=''
do{const page=await request('/products?pageSize=100'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):''));products.push(...(page?.documents??[]));pageToken=page?.nextPageToken??''}while(pageToken)
const settings=await request('/shopSettings/default')
await writeFile(new URL('single-tea-import-existing.json',import.meta.url),JSON.stringify({products,settings},null,2))
console.log(JSON.stringify({products:products.map(doc=>({id:doc.name.split('/').at(-1),name:decode(doc.fields.name),sku:decode(doc.fields.sku)})),settings:settings?decode({mapValue:{fields:settings.fields}}):null},null,2))
