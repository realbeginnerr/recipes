import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import * as core from '../src/core.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const terms=core.normalizeCatalog(JSON.parse(await readFile(new URL('../public/terms.json',import.meta.url),'utf8')));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup({cards=terms,state,hash='',motion=false,authenticated=true,cloudState}={}){
 const win=new Window({url:'http://localhost:5174/'+hash,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const animations=[];
 win.matchMedia=()=>({matches:!motion});
 if(motion)win.HTMLElement.prototype.animate=function(keyframes,options){let resolve;const finished=new Promise(r=>resolve=r);animations.push({keyframes,options,finish:resolve});return {finished};};
 win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 if(state!==undefined)win.localStorage.setItem(core.STORE_KEY,typeof state==='string'?state:JSON.stringify(state));
 win.scrollTo=()=>{};win.confirm=()=>true;win.alert=()=>{};let admin=false,saved=null,clipboardText='';
 Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{clipboardText=text;}}});
 let user=authenticated?{uid:'approved-user',email:'approved@example.com',emailVerified:true}:null,passwordSetupEmail=null,savedCloudState=cloudState===undefined?(state&&typeof state!=='string'?state:null):cloudState,deletionRequested=false;
 win.__deps={...core,e:core.escapeHtml,configured:true,loadCatalog:async()=>cards,currentAdmin:async()=>admin,login:async()=>{admin=true;},logout:async()=>{admin=false;},currentUser:async()=>user,userLogin:async email=>{user={uid:'approved-user',email,emailVerified:true};},requestPasswordSetup:async email=>{passwordSetupEmail=email;},userLogout:async()=>{user=null;},loadStudyState:async()=>savedCloudState,saveStudyState:async value=>{savedCloudState=value;},requestAccountDeletion:async()=>{deletionRequested=true;},writeTerm:async value=>{saved=value;},deleteTerm:async()=>{},seedCatalog:async()=>{}};
 const body=source.replace(/^import .*;\r?\n/gm,'');
 const bindings=Object.keys(win.__deps).join(',');
 win.eval(`{ const {${bindings}} = window.__deps; ${body} }`);
 await wait(35);
 return {win,doc:win.document,animations,click(action){const el=win.document.querySelector(`[data-action="${action}"]`) || (action==='flip'?win.document.querySelector('.flashcard'):null);assert.ok(el,`button ${action}`);el.click();},saved:()=>saved,passwordSetupEmail:()=>passwordSetupEmail,cloudState:()=>savedCloudState,deletionRequested:()=>deletionRequested,clipboardText:()=>clipboardText,close:()=>win.close()};
}
test('homepage shows actual category counts and 10-card session with bilingual term',async()=>{
 const ui=await setup();try{
 assert.match(ui.doc.body.textContent,/239/);assert.match(ui.doc.body.textContent,/145/);
 ui.click('start');assert.match(ui.doc.querySelector('.numeric').textContent,/1.*10/);
 assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);assert.equal(ui.doc.querySelector('.english').textContent,terms[0].englishTerm);
 assert.equal(ui.doc.querySelectorAll('[data-action=known]').length,1);
 ui.click('flip');assert.equal(ui.doc.querySelector('.definition>p').textContent,terms[0].definition);
 ui.click('unknown');await wait(270);assert.equal(ui.doc.querySelector('h1').textContent,terms[1].term);
 assert.equal(ui.cloudState().ratings[terms[0].id],'unknown');
 }finally{ui.close();}
});
test('homepage shows Pickle copy and official Android and iOS download links',async()=>{
 const ui=await setup();try{
  assert.equal(ui.doc.querySelector('.home-intro h1').textContent,'AI시대 뒤처지긴 싫고 시간은 없고,그래서 하루 용어 딱 10개씩만.');
  assert.match(ui.doc.querySelector('.intro-copy').textContent,/내 AI 비서 "피클"을 연결해 두면/);
  assert.match(ui.doc.querySelector('.intro-copy').textContent,/매일 저녁 8시, 용어 퀴즈 전화/);
  const links=[...ui.doc.querySelectorAll('.store-links a')];
  assert.equal(links.length,2);
  assert.equal(links[0].href,'https://play.google.com/store/apps/details?id=com.pickle.client');
  assert.equal(links[1].href,'https://apps.apple.com/kr/app/id6795790129');
  assert.equal(links[0].querySelector('img').getAttribute('src'),'./google-play.svg');
  assert.equal(links[1].querySelector('img').getAttribute('src'),'./app-store.svg');
  assert.equal(ui.doc.querySelector('.pickle-prompt-trigger').textContent,'피클에게 이렇게 요청해보세요');
  ui.click('show-pickle-prompt');
  const prompt=ui.doc.querySelector('.pickle-prompt-dialog');
  assert.ok(prompt.open);
  assert.match(prompt.textContent,/매주 월~금 저녁 9시에 전화로 단어 암기 테스트/);
  assert.match(prompt.textContent,/https:\/\/realbeginnerr.github.io\/flashcards\//);
  assert.match(prompt.textContent,/매일 단어 10개씩 질문한다/);
  assert.ok(prompt.querySelector('.prompt-copy-button .copy-icon'));
  ui.click('copy-pickle-prompt');await wait(0);
  assert.match(ui.clipboardText(),/매주 월~금 저녁 9시에 전화로 단어 암기 테스트/);
  assert.ok(prompt.querySelector('.prompt-copy-button').classList.contains('copied'));
  ui.click('close-pickle-prompt');assert.equal(prompt.open,false);
  assert.equal(ui.doc.querySelector('.sample'),null);
  assert.doesNotMatch(ui.doc.querySelector('.home-intro').textContent,/오늘, 이런 용어는 어때요|AI에게 작업 방법을 알려주는 지침 묶음/);
  assert.doesNotMatch(ui.doc.querySelector('.home-intro').textContent,/하루 열 장, 새로운 지식 한 조각|알 듯 말 듯한 용어|가입 없이 가볍게 시작/);
  assert.doesNotMatch(ui.doc.querySelector('.start-panel').textContent,/한 번에 10장씩, 내 속도대로/);
 }finally{ui.close();}
});
test('homepage shows requested category order and display labels without changing filter values',async()=>{
 const ui=await setup();try{
  const options=[...ui.doc.querySelectorAll('.category-option')];
  assert.deepEqual(options.map(option=>option.querySelector('.category-name').textContent),['전체','AI','개발','UXUI 디자인','피그마','마케팅, 브랜딩']);
  assert.deepEqual(options.map(option=>option.querySelector('input').value),['전체','AI 툴','개발','UX/UI 디자인','피그마','마케팅']);
 }finally{ui.close();}
});
test('header shows only the logo name without a side tagline',async()=>{
 const ui=await setup();try{
  assert.equal(ui.doc.querySelector('.brand').textContent.trim(),'붕억빵');
  assert.equal(ui.doc.querySelector('.brand-mark').getAttribute('src'),'./boongeoppang-complete.png');
  assert.equal(ui.doc.querySelector('.brand-tag'),null);
  assert.equal(ui.doc.querySelector('.header-login').textContent,'마이페이지');
  assert.equal(ui.doc.querySelector('.header-login').getAttribute('href'),'#/login');
  assert.equal(ui.doc.querySelector('.header-admin').textContent,'관리자');
  assert.equal(ui.doc.querySelector('.header-admin').getAttribute('href'),'#/admin');
  assert.equal(ui.doc.querySelector('.header-admin').nextElementSibling,ui.doc.querySelector('.header-login'));
 }finally{ui.close();}
});
test('approved user can open login, request password setup and sign in',async()=>{
 const ui=await setup({hash:'#/login',authenticated:false});try{
  assert.equal(ui.doc.querySelector('h1').textContent,'로그인');
  const form=ui.doc.querySelector('#user-login-form');
  form.elements.email.value='approved@example.com';
  ui.click('password-setup');await wait(5);
  assert.equal(ui.passwordSetupEmail(),'approved@example.com');
  form.elements.password.value='secure-password';
  form.dispatchEvent(new ui.win.Event('submit',{bubbles:true,cancelable:true}));await wait(10);
  assert.match(ui.doc.querySelector('h1').textContent,/내 계정/);
  assert.match(ui.doc.querySelector('.admin-login').textContent,/approved@example.com/);
 }finally{ui.close();}
});
test('mypage shows cloud progress and submits an irreversible deletion request',async()=>{
 const saved=core.rate(core.emptyState(),terms[0].id,'unknown');
 const ui=await setup({hash:'#/login',cloudState:saved});try{
  assert.equal(ui.doc.querySelector('.header-login').textContent,'마이페이지');
  assert.match(ui.doc.querySelector('.account-stats').textContent,/학습한 용어1/);
  ui.click('show-delete-request');
  assert.match(ui.doc.querySelector('.delete-warning').textContent,/약 1일/);
  assert.match(ui.doc.querySelector('.delete-warning').textContent,/다시 복구할 수 없어요/);
  ui.click('confirm-account-delete');await wait(5);
  assert.equal(ui.deletionRequested(),true);
  assert.match(ui.doc.querySelector('h1').textContent,/삭제 요청을 보냈어요/);
 }finally{ui.close();}
});
test('home omits browser storage note and footer links to Instagram proposals',async()=>{
 const ui=await setup();try{
  assert.doesNotMatch(ui.doc.querySelector('.start-panel').textContent,/기록은 이 브라우저에 저장돼요|자세히/);
  const proposal=[...ui.doc.querySelectorAll('.site-footer a')].find(link=>link.textContent==='용어제안/기타제휴');
  assert.ok(proposal);
  assert.equal(proposal.href,'https://www.instagram.com/t_s_recipe?vrfl=MWRzMTVmNW1iMjlqdA%3D%3D&utm_source=qr');
  assert.equal(proposal.target,'_blank');
  assert.deepEqual([...ui.doc.querySelector('.site-footer').children].map(element=>element.textContent),['© 붕억빵','용어제안/기타제휴']);
  assert.equal(ui.doc.querySelector('.site-footer a[href="#/admin"]'),null);
 }finally{ui.close();}
});
test('ten evaluations finish one batch and next starts at card eleven',async()=>{
 const ui=await setup();try{
 ui.click('start');for(let i=0;i<10;i++){ui.click('flip');ui.click(i%2?'known':'unknown');await wait(260);}
 assert.match(ui.doc.querySelector('h1').textContent,/学習|학습/);
 assert.equal(ui.doc.querySelector('.completion-image').getAttribute('src'),'./boongeoppang-complete.png');
 assert.equal(ui.doc.querySelector('.completion-image').getAttribute('alt'),'완성된 붕어빵');
 assert.equal(ui.doc.querySelector('.complete-panel .eyebrow'),null);
 assert.match(ui.doc.querySelector('.result-stats').textContent,/10/);
 const completionButtons=[...ui.doc.querySelectorAll('.complete-actions>.btn:not(.text-button)')];
 assert.deepEqual(completionButtons.map(button=>button.dataset.action),['review-session','next']);
 assert.equal(completionButtons[0].textContent.trim(),'틀린 용어 복습 ↗');
 assert.equal(completionButtons[1].textContent.trim(),'다음 10장 학습 ↗');
 ui.click('next');assert.equal(ui.doc.querySelector('h1').textContent,terms[10].term);
 assert.equal(ui.cloudState().completed['전체'].length,10);
 }finally{ui.close();}
});
test('last batch is nine and restart preserves ratings',async()=>{
 let state=core.completeBatch(core.emptyState(),'전체',terms.slice(0,230).map(c=>c.id));state=core.rate(state,terms[0].id,'unknown');
 const ui=await setup({state});try{
 ui.click('start');assert.match(ui.doc.querySelector('.numeric').textContent,/1.*9/);
 for(let i=0;i<9;i++){ui.click('flip');ui.click('known');await wait(260);}
 assert.match(ui.doc.querySelector('h1').textContent,/한 바퀴/);ui.click('restart');
 assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
 assert.equal(ui.cloudState().ratings[terms[0].id],'unknown');
 }finally{ui.close();}
});
test('review uses only unknown IDs and known removes it on next visit',async()=>{
 const state=core.rate(core.emptyState(),terms[5].id,'unknown');const ui=await setup({state});try{
 ui.click('review');assert.equal(ui.doc.querySelector('h1').textContent,terms[5].term);
 ui.click('flip');ui.click('known');await wait(270);ui.click('home');await wait(35);ui.click('review');
 assert.match(ui.doc.querySelector('h1').textContent,/모르는 용어가 아직 없어요/);
 }finally{ui.close();}
});
test('guest ignores browser records and can still study without persistence',async()=>{
 const ui=await setup({state:'{broken',authenticated:false});try{assert.equal(ui.doc.querySelector('#notice').textContent,'');ui.click('start');ui.click('flip');ui.click('known');await wait(270);assert.equal(ui.win.localStorage.getItem(core.STORE_KEY),'{broken');assert.equal(ui.cloudState(),null);}finally{ui.close();}
});
test('HTML in term data is text, not executable markup',async()=>{
 const cards=[{...terms[0],term:'<img src=x onerror=alert(1)>',definition:'<script>alert(1)</script>',englishTerm:''}];
 const ui=await setup({cards});try{ui.click('start');assert.equal(ui.doc.querySelector('h1 img'),null);ui.click('flip');assert.match(ui.doc.querySelector('.definition').textContent,/<script>/);assert.equal(ui.doc.querySelector('.definition script'),null);}finally{ui.close();}
});
test('admin Google login leads to list and shared editor validates categories',async()=>{
 const ui=await setup({hash:'#/admin'});try{
 assert.match(ui.doc.querySelector('h1').textContent,/관리자 로그인/);ui.click('login');await wait(35);
 assert.match(ui.doc.querySelector('h1').textContent,/용어 관리/);ui.click('add');
 const form=ui.doc.querySelector('form');form.elements.term.value='새 용어';form.elements.definition.value='새 뜻';
 form.dispatchEvent(new ui.win.Event('submit',{bubbles:true,cancelable:true}));await wait(10);
 assert.match(ui.doc.querySelector('#category-error').textContent,/하나 이상/);assert.equal(ui.saved(),null);
 form.querySelector('[name=categories]').checked=true;
 form.dispatchEvent(new ui.win.Event('submit',{bubbles:true,cancelable:true}));await wait(35);
 assert.equal(ui.saved().term,'새 용어');assert.equal(ui.saved().categories.length,1);
 }finally{ui.close();}
});
test('clicking either card face repeatedly flips without rating or advancing',async()=>{
 const ui=await setup();try{
 ui.click('start');
 for(let i=0;i<8;i++){
  ui.doc.querySelector(i%2?'.definition>p':'.term-heading h1').click();
  assert.ok(ui.doc.querySelector(i%2?'.flashcard.front':'.flashcard.back'));
  assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
  assert.match(ui.doc.querySelector('.numeric').textContent,/1.*10/);
 }
 assert.equal(ui.win.localStorage.getItem(core.STORE_KEY),null);
 }finally{ui.close();}
});
test('card keyboard and explicit flip buttons each toggle only once',async()=>{
 const ui=await setup();try{
 ui.click('start');ui.click('flip');assert.ok(ui.doc.querySelector('.flashcard.back'));
 ui.click('flip');assert.ok(ui.doc.querySelector('.flashcard.front'));
 for(const key of ['Enter',' ','Enter',' '])ui.doc.querySelector('.flashcard').dispatchEvent(new ui.win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
 assert.ok(ui.doc.querySelector('.flashcard.front'));
 }finally{ui.close();}
});
test('reference controls and text selection do not flip the back face',async()=>{
 const card={...terms[0],sources:[{title:'Reference',url:'https://example.com'}]};
 const ui=await setup({cards:[card]});try{
 ui.click('start');ui.click('flip');ui.doc.querySelector('summary').click();
 assert.ok(ui.doc.querySelector('.flashcard.back'));
 const selection=ui.win.getSelection();const range=ui.doc.createRange();range.selectNodeContents(ui.doc.querySelector('.definition>p'));selection.addRange(range);
 ui.doc.querySelector('.definition>p').click();assert.ok(ui.doc.querySelector('.flashcard.back'));
 selection.removeAllRanges();ui.doc.querySelector('.definition>p').click();assert.ok(ui.doc.querySelector('.flashcard.front'));
 }finally{ui.close();}
});
test('rotation swaps faces at halfway, prevents double flips, and reverses direction',async()=>{
 const ui=await setup({motion:true});try{
 ui.click('start');ui.doc.querySelector('.flashcard').click();
 assert.equal(ui.animations.length,1);assert.ok(ui.doc.querySelector('.flashcard.front'));
 ui.doc.querySelector('.flashcard').click();assert.equal(ui.animations.length,1);
 ui.animations[0].finish();await wait(5);assert.ok(ui.doc.querySelector('.flashcard.back'));assert.equal(ui.animations.length,2);
 ui.click('known');assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
 ui.animations[1].finish();await wait(5);ui.doc.querySelector('.flashcard').click();
 assert.match(ui.animations[2].keyframes[1].transform,/-90deg/);
 ui.animations[2].finish();await wait(5);assert.ok(ui.doc.querySelector('.flashcard.front'));
 ui.animations[3].finish();await wait(5);
 }finally{ui.close();}
});
test('leaving during rotation does not restore an old card',async()=>{
 const ui=await setup({motion:true});try{
 ui.click('start');ui.click('flip');ui.click('exit');
 ui.animations[0].finish();await wait(5);
 assert.equal(ui.doc.querySelector('.flashcard'),null);assert.ok(ui.doc.querySelector('[data-action=start]'));
 }finally{ui.close();}
});
test('known and unknown both slide current card upward and next card from below exactly once',async()=>{
 for(const rating of ['known','unknown']){
  const ui=await setup({motion:true});try{
   ui.click('start');ui.click('flip');ui.animations[0].finish();await wait(5);ui.animations[1].finish();await wait(5);
   ui.click(rating);assert.equal(ui.animations.length,3);
   assert.match(ui.animations[2].keyframes[1].transform,/-110%/);
   assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
   ui.click(rating);ui.doc.querySelector('.flashcard').click();assert.equal(ui.animations.length,3);await wait(5);
   assert.equal(ui.cloudState().ratings[terms[0].id],rating);
   ui.animations[2].finish();await wait(5);
   assert.equal(ui.doc.querySelector('h1').textContent,terms[1].term);
   assert.match(ui.animations[3].keyframes[0].transform,/100%/);
   ui.doc.querySelector('.flashcard').click();assert.equal(ui.animations.length,4);
   ui.animations[3].finish();await wait(5);
   assert.equal(ui.doc.querySelector('.flashcard').hasAttribute('aria-busy'),false);
   assert.match(ui.doc.querySelector('.numeric').textContent,/2.*10/);
  }finally{ui.close();}
 }
});
test('exit during outgoing slide keeps saved rating without resurrecting next card',async()=>{
 const ui=await setup({motion:true});try{
  ui.click('start');ui.click('flip');ui.animations[0].finish();await wait(5);ui.animations[1].finish();await wait(5);
  ui.click('known');ui.click('exit');ui.animations[2].finish();await wait(5);
  assert.equal(ui.doc.querySelector('.flashcard'),null);
  assert.equal(ui.cloudState().ratings[terms[0].id],'known');
 }finally{ui.close();}
});
test('last card slides out before completion, with no nonexistent next card',async()=>{
 const ui=await setup({motion:true,cards:[terms[0]]});try{
  ui.click('start');ui.click('flip');ui.animations[0].finish();await wait(5);ui.animations[1].finish();await wait(5);
  ui.click('unknown');assert.ok(ui.doc.querySelector('.flashcard'));
  ui.animations[2].finish();await wait(5);assert.equal(ui.doc.querySelector('.flashcard'),null);assert.ok(ui.doc.querySelector('.complete-panel'));
  ui.animations[3].finish();await wait(5);
 }finally{ui.close();}
});
test('rating dock occupies the same position after the card on both faces',async()=>{
 const ui=await setup();try{
  ui.click('start');
  for(let i=0;i<4;i++){
   const card=ui.doc.querySelector('.flashcard');
   assert.equal(card.nextElementSibling.className,'rating-dock');
   assert.equal(card.nextElementSibling.nextElementSibling.className,'card-footer');
   assert.equal(ui.doc.body.textContent.includes('이 용어, 이제 어느 정도 아세요?'),false);
   assert.deepEqual([...ui.doc.querySelectorAll('.rating-dock button')].map(b=>b.textContent),['몰라요','알아요']);
   card.click();
  }
 }finally{ui.close();}
});
test('both ratings work on the front without flipping',async()=>{
 for(const value of ['known','unknown']){
  const ui=await setup();try{
   ui.click('start');assert.ok(ui.doc.querySelector('.flashcard.front'));
   ui.click(value);await wait(5);
   assert.equal(ui.doc.querySelector('h1').textContent,terms[1].term);
   assert.equal(ui.cloudState().ratings[terms[0].id],value);
  }finally{ui.close();}
 }
});
test('logo returns home after completing ten cards even when URL is already home',async()=>{
 const ui=await setup({cards:terms.slice(0,10),hash:'#/'});try{
  assert.equal(ui.doc.querySelector('#home-link'),null);
  ui.click('start');for(let i=0;i<10;i++){ui.click('known');await wait(5);}
  assert.ok(ui.doc.querySelector('.complete-panel'));
  ui.doc.querySelector('.brand-mark').click();await wait(35);
  assert.ok(ui.doc.querySelector('.start-panel'));assert.equal(ui.doc.querySelector('.complete-panel'),null);
  assert.equal(ui.cloudState().completed['전체'].length,10);
 }finally{ui.close();}
});
test('logo navigates home even when default link navigation is intercepted',async()=>{
 for(const selector of ['.brand'])for(const hash of ['', '#/']){
  const ui=await setup({hash});try{
   ui.click('start');ui.click('flip');
   const link=ui.doc.querySelector(selector);
   link.addEventListener('click',event=>event.preventDefault());
    link.querySelector('.brand-mark').click();await wait(35);
   assert.ok(ui.doc.querySelector('.start-panel'),`${selector} with ${hash||'empty hash'}`);
   assert.equal(ui.doc.querySelector('.flashcard'),null);
  }finally{ui.close();}
 }
});
test('header navigation works with absolute same-site URLs',async()=>{
 const ui=await setup({hash:'#/'});try{
  ui.click('start');const link=ui.doc.querySelector('.brand');link.setAttribute('href','http://localhost:5174/#/');
  link.click();await wait(35);assert.ok(ui.doc.querySelector('.start-panel'));
 }finally{ui.close();}
});
test('dedicated logo home control does not depend on hosting-rewritten hrefs',async()=>{
 for(const selector of ['.brand']){
  const ui=await setup();try{
   ui.click('start');ui.doc.querySelector(selector).href='https://example.com/embedded/#/';
   ui.doc.querySelector(selector).click();await wait(35);
   assert.ok(ui.doc.querySelector('.start-panel'));assert.equal(ui.doc.querySelector('.flashcard'),null);
  }finally{ui.close();}
 }
});
test('review button has left-aligned copy, count, and a trailing arrow',async()=>{
 const ui=await setup();try{
  const review=ui.doc.querySelector('[data-action="review"]');
  assert.ok(review.querySelector('.review-copy'));
  assert.match(review.textContent,/틀린 용어 복습/);
  assert.ok(review.querySelector('.count'));
  assert.equal(review.querySelector('[aria-hidden="true"]').textContent,'↗');
 }finally{ui.close();}
});
