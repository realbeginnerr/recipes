import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
const project='recipes-5a663'
const token=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud auth print-access-token'],{encoding:'utf8'}).trim()
const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
const inputIndex = process.argv.indexOf('--input')
const inputFile = inputIndex < 0 ? new URL('single-tea-import-prepared.json',import.meta.url) : process.argv[inputIndex + 1]
const prepared=JSON.parse(await readFile(inputFile,'utf8'))
async function request(suffix, options={}, anonymous=false){
 const response=await fetch(base+suffix,{...options,headers:{'Content-Type':'application/json',...(anonymous?{}:{Authorization:`Bearer ${token}`,'x-goog-user-project':project})},signal:AbortSignal.timeout(30000)})
 if(response.status===404)return null
 if(!response.ok)throw new Error(`Firestore ${response.status}: ${await response.text()}`)
 return response.json()
}
function encode(value){
 if(value===null)return{nullValue:null}
 if(typeof value==='string')return{stringValue:value}
 if(typeof value==='boolean')return{booleanValue:value}
 if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value}
 if(Array.isArray(value))return{arrayValue:{values:value.map(encode)}}
 return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]))}}
}
const existing=[];let pageToken=''
do{const page=await request('/products?pageSize=100'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):''));existing.push(...(page?.documents??[]));pageToken=page?.nextPageToken??''}while(pageToken)
const writes=[]
for(const product of prepared){
 const same=existing.find(doc=>doc.name.endsWith('/'+product.id))
 if(same){if(same.fields.name.stringValue!==product.name)throw new Error('ID collision');continue}
 if(existing.some(doc=>doc.fields.name?.stringValue===product.name && !doc.fields.deleted?.booleanValue))throw new Error(`Name already exists: ${product.name}`)
 const docs=[['products',product.id,product],['productAdmin',product.id,{cost:null}],['productSkus',encodeURIComponent(product.sku.toUpperCase()),{productId:product.id}],['productSlugs',encodeURIComponent(product.seo.slug.toUpperCase()),{productId:product.id}]]
 for(const [collection,id,data]of docs){
  const suffix=`/${collection}/${id}`
  if(await request(suffix))throw new Error(`Existing reservation: ${collection}/${id}`)
  writes.push({update:{name:base.replace('https://firestore.googleapis.com/v1/','')+suffix,fields:encode(data).mapValue.fields},currentDocument:{exists:false}})
 }
}
await writeFile(new URL(`single-tea-import-backup-${Date.now()}.json`,import.meta.url),JSON.stringify({existing,writes},null,2))
console.log(JSON.stringify({prepared:prepared.length,newProducts:writes.length/4,names:prepared.map(p=>p.name)}))
if(process.argv.includes('--apply')&&writes.length){
 await request(':commit',{method:'POST',body:JSON.stringify({writes})})
 console.log(`Atomically created ${writes.length/4} products and matching SKU/slug/private-data records.`)
}
if(process.argv.includes('--apply')){
 for(const product of prepared){
  const actual=await request(`/products/${product.id}`,{},true)
  if(!actual || actual.fields.name.stringValue!==product.name || (actual.fields.pricing.mapValue.fields.regular.nullValue !== undefined ? null : Number(actual.fields.pricing.mapValue.fields.regular.integerValue))!==product.pricing.regular || actual.fields.visibility.stringValue!=='public' || actual.fields.purchaseUrl.stringValue!==product.purchaseUrl || JSON.stringify((actual.fields.teaTags.arrayValue.values ?? []).map(value => value.stringValue))!==JSON.stringify(product.teaTags))throw new Error(`Verification failed: ${product.name}`)
 }
 console.log(`Verified all ${prepared.length} products through anonymous public reads, including names, prices, tags and purchase links.`)
}
