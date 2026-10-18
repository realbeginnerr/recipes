import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import ts from 'typescript'
const helperDir=path.resolve('.product-qa/import-utils')
await fs.mkdir(helperDir,{recursive:true})
for(const name of ['product','shopPolicy','teaCategory']){
 const source=await fs.readFile(`src/utils/${name}.ts`,'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '\.\/(shopPolicy|teaCategory)'/g,"from './$1.mjs'")
 await fs.writeFile(path.join(helperDir,name+'.mjs'),output)
}
const { emptyProduct, validateProduct, validWebUrl, productSlug } = await import('file:///'+path.join(helperDir,'product.mjs').replaceAll('\\','/'))
const { getTeaTags } = await import('file:///'+path.join(helperDir,'teaCategory.mjs').replaceAll('\\','/'))
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1] }
const inputFile = option('--input') ?? 'scripts/single-tea-import-input.json'
const outputFile = option('--output') ?? 'scripts/single-tea-import-prepared.json'
const addedTag = option('--tag')
const rows=JSON.parse((await fs.readFile(inputFile,'utf8')).replace(/^\uFEFF/,''))
const field={name:'\uC0C1\uD488\uBA85',image:'\uB300\uD45C \uC774\uBBF8\uC9C0 url',price:'\uD310\uB9E4\uAC00',tags:'\uD0DC\uADF8',url:'\uAD6C\uB9E4 \uB9C1\uD06C',brand:'\uBE0C\uB79C\uB4DC',description:'\uC0C1\uC138\uC124\uBA85',visibility:'\uB4F1\uB85D\uC0C1\uD0DC'}
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const prepared=rows.map(row=>{
 const product=emptyProduct()
 const hash=crypto.createHash('sha256').update(row[field.name]+'|'+row[field.brand]+'|'+new URL(row[field.url]).pathname).digest('hex').slice(0,16)
 Object.assign(product,{id:'csv-tea-'+hash,sku:'TEA-CSV-'+hash.toUpperCase(),name:row[field.name].trim(),brand:row[field.brand].trim(),description:'<p>'+escape(row[field.description])+'</p>',purchaseUrl:row[field.url].trim(),compositionType:'single',visibility:row[field.visibility]==='\uACF5\uAC1C'?'public':'private',draft:false,version:1,createdAt:Date.now(),updatedAt:Date.now()})
 const tags=[...new Set([...row[field.tags].split(',').map(v=>v.trim()).filter(Boolean), ...(addedTag ? [addedTag] : [])])]
 product.teaTags=getTeaTags({id:product.id,teaTags:tags})
 if(tags.length!==product.teaTags.length)throw new Error(`Invalid tag for ${product.name}`)
 product.images=[{id:'cover',url:row[field.image].trim(),alt:product.name}]
 product.pricing.regular=Number(row[field.price].replaceAll(',',''))
 product.seo={title:product.name,description:row[field.description],slug:productSlug(product.name)}
 const errors=validateProduct(product,null,false)
 delete errors['shipping.fee'];delete errors['shipping.freeThreshold']
 if(Object.keys(errors).length)throw new Error(`Invalid product ${product.name}: ${JSON.stringify(errors)}`)
 if(!validWebUrl(product.purchaseUrl))throw new Error('Invalid purchase link')
 return product
})
if(new Set(prepared.map(p=>p.id)).size!==prepared.length)throw new Error('Duplicate CSV rows')
await fs.writeFile(outputFile,JSON.stringify(prepared,null,2))
console.log(JSON.stringify({count:prepared.length,prepared:prepared.map(p=>({name:p.name,price:p.pricing.regular,tags:p.teaTags,visibility:p.visibility})),databaseWritten:false},null,2))
