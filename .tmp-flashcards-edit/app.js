import {CATEGORIES,emptyState,eligible,unknownCards,nextBatch,rate,completeBatch,resetScope,bilingual,escapeHtml as e} from './core.js';
import {loadCatalog,configured,currentAdmin,login,logout,currentUser,userLogin,requestPasswordSetup,userLogout,loadStudyState,saveStudyState,requestAccountDeletion,writeTerm,deleteTerm,seedCatalog} from './cloud.js';
const main=document.querySelector('#main'),notice=document.querySelector('#notice');
let state=emptyState(),terms=[],scope='전체',session=null,busy=false,editing=null,dirty=false,search='',activeUser=null,cloudSaveQueue=Promise.resolve();
const selected=(v,target)=>v===target?' checked':'';
const HOME_CATEGORIES=['전체','AI 툴','개발','UX/UI 디자인','피그마','마케팅'];
const HOME_CATEGORY_LABELS={'전체':'전체','AI 툴':'AI','개발':'개발','UX/UI 디자인':'UXUI 디자인','피그마':'피그마','마케팅':'마케팅, 브랜딩'};
const button=(text,action,style='primary',extra='')=>`<button class="btn ${style}" type="button" data-action="${action}" ${extra}>${text}</button>`;
const tags=t=>`<div class="tags">${t.categories.map(c=>`<span>${e(c)}</span>`).join('')}</div>`;
const arrow='<span aria-hidden="true">↗</span>';
const PICKLE_PROMPT=`다음 웹사이트에 로그인해 내 단어 학습 현황을 확인하고, 매주 월~금 저녁 9시에 전화로 단어 암기 테스트를 진행해 줘.

https://realbeginnerr.github.io/flashcards/

학습 규칙

1. 매일 단어 10개씩 질문한다.
2. 하루는 새로운 단어, 다음 날은 이전에 틀렸거나 모르는 단어를 복습하는 방식으로 번갈아 진행한다.
3. 복습할 단어가 없으면 새로운 단어를 질문한다.
4. 내 답변의 정답 여부를 직접 판단하고 학습 기록에 반영한다.
5. 매일 웹사이트의 최신 학습 현황을 확인해 다음 테스트에 반영한다.

이 작업을 반복 일정으로 설정하고, 필요한 로그인 정보나 접근 권한이 있으면 요청해 줘.`;
const picklePrompt=()=>`<button class="pickle-prompt-trigger" type="button" data-action="show-pickle-prompt">피클에게 이렇게 요청해보세요</button><dialog class="pickle-prompt-dialog" aria-labelledby="pickle-prompt-title"><div class="prompt-dialog-heading"><h2 id="pickle-prompt-title">피클에게 요청할 프롬프트</h2><div class="prompt-dialog-actions"><button class="prompt-copy-button" type="button" data-action="copy-pickle-prompt" aria-label="프롬프트 텍스트 복사" title="텍스트 복사"><svg class="copy-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M5 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"/></svg><svg class="copy-check" aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg><span class="sr-only copy-status" aria-live="polite"></span></button><button class="prompt-dialog-close" type="button" data-action="close-pickle-prompt" aria-label="팝업 닫기">닫기</button></div></div><p class="pickle-prompt-copy">${e(PICKLE_PROMPT)}</p></dialog>`;
async function copyPicklePrompt(target){
 const status=target.querySelector('.copy-status');
 try{
  await navigator.clipboard.writeText(PICKLE_PROMPT);target.classList.add('copied');target.title='복사 완료';status.textContent='프롬프트를 복사했어요.';
  setTimeout(()=>{if(!target.isConnected)return;target.classList.remove('copied');target.title='텍스트 복사';status.textContent='';},1800);
 }catch{target.title='복사하지 못했어요';status.textContent='복사하지 못했어요. 브라우저의 클립보드 권한을 확인해주세요.';}
}
function focusTitle(){requestAnimationFrame(()=>{main.querySelector('h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
function message(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(message.timer);message.timer=setTimeout(()=>el.classList.remove('visible'),3500);}
function banner(text){notice.innerHTML=`<div class="notice" role="alert">${e(text)}</div>`;}
function persist(){
 if(!activeUser)return;
 const snapshot=state;
 cloudSaveQueue=cloudSaveQueue.catch(()=>{}).then(()=>saveStudyState(snapshot)).catch(error=>banner(error.message||'학습 기록을 저장소에 저장하지 못했어요. 다시 시도해주세요.'));
}
function setHeaderUser(user){const link=document.querySelector('.header-login');if(!link)return;link.textContent=user?'마이페이지':'로그인';link.href='#/login';}
function render(content,{wide=false}={}){main.className=wide?'wide':'';main.innerHTML=content;document.querySelector('.site-footer').hidden=Boolean(session&&!session.done);focusTitle();}
function home(){
 session=null;dirty=false;editing=null;
 const total=eligible(terms,scope),done=new Set(state.completed[scope]||[]),remaining=total.filter(t=>!done.has(t.id)).length;
 const unknown=unknownCards(terms,state).length;
 render(`<section class="home-grid"><div class="home-intro"><h1 tabindex="-1">AI시대 뒤처지긴 싫고 시간은 없고,<br><span>그래서 하루 용어 딱 10개씩만.</span></h1><p class="intro-copy">내 AI 비서 "피클"을 연결해 두면<br>매일 저녁 8시, 용어 퀴즈 전화가 와요.</p><div class="store-links" aria-label="피클 앱 다운로드"><a href="https://play.google.com/store/apps/details?id=com.pickle.client" target="_blank" rel="noopener noreferrer"><img src="./google-play.svg" alt="">Google Play에서 받기 <span aria-hidden="true">↗</span></a><a href="https://apps.apple.com/kr/app/id6795790129" target="_blank" rel="noopener noreferrer"><img src="./app-store.svg" alt="">App Store에서 받기 <span aria-hidden="true">↗</span></a></div></div><section class="start-panel" aria-labelledby="start-title"><div class="panel-heading"><p class="eyebrow">무엇을 공부할까요?</p><h2 id="start-title">오늘의 학습 분야</h2></div><fieldset class="category-list"><legend class="sr-only">학습 분야 선택</legend>${HOME_CATEGORIES.map((c,i)=>`<label class="category-option"><input type="radio" name="scope" value="${e(c)}"${selected(scope,c)}><span class="category-index">0${i+1}</span><span class="category-name">${e(HOME_CATEGORY_LABELS[c])}</span><span class="category-count">${eligible(terms,c).length}<span>개</span></span><span class="radio-mark" aria-hidden="true"></span></label>`).join('')}</fieldset><div class="start-actions">${button(total.length?(remaining?'학습 시작':'처음부터 다시 학습')+' '+arrow:'등록된 용어가 없어요','start','primary',!total.length?'disabled':'')}${button(`<span class="review-copy">틀린 용어 복습 <span class="count">${unknown}</span></span>${arrow}`,'review','secondary')}</div></section></section>`,{wide:true});
 main.querySelector('.home-intro').insertAdjacentHTML('beforeend',picklePrompt());
}
function begin(mode='normal',queue){
 if(mode==='normal'){
  let cards=nextBatch(terms,state,scope);
  if(!cards.length&&eligible(terms,scope).length){state=resetScope(state,scope);persist();cards=nextBatch(terms,state,scope);}
  if(!cards.length)return empty('이 분야에 등록된 용어가 없어요.','다른 분야를 선택해보세요.');
  session={mode,scope,queue:cards,ids:cards.map(c=>c.id),index:0,back:false,ratings:{},done:false};
 }else{
  const cards=queue||unknownCards(terms,state);
  if(!cards.length)return empty('모르는 용어가 아직 없어요.','학습 중 몰라요로 표시한 카드를 여기서 다시 만날 수 있어요.');
  session={mode,scope:'전체',remaining:cards.slice(10),queue:cards.slice(0,10),index:0,back:false,ratings:{},done:false};
 }
 study();
}
function empty(title,description){session=null;render(`<section class="empty-state"><span class="eyebrow">가볍게, 다시 시작</span><h1 tabindex="-1">${e(title)}</h1><p>${e(description)}</p>${button('학습하러 가기','home')}</section>`);}
function study(){
 const s=session;if(!s)return home();const term=s.queue[s.index];if(!term)return finish();
 const english=bilingual(term);const name=s.mode==='normal'?s.scope+' 학습':'모르는 용어 복습';
 render(`<section class="study-shell ${s.back?'is-back':''}"><div class="study-toolbar"><span class="session-name">${e(name)}</span><span class="numeric">${s.index+1} <span class="muted">/ ${s.queue.length}</span></span></div><div class="progress" role="progressbar" aria-label="이번 회차에서 확인한 카드" aria-valuenow="${s.index}" aria-valuemin="0" aria-valuemax="${s.queue.length}"><span style="width:${s.index/s.queue.length*100}%"></span></div><article class="flashcard ${s.back?'back':'front'}" tabindex="0" aria-label="학습 카드. 클릭하거나 Enter 또는 Space 키로 앞뒤를 전환할 수 있어요.">${tags(term)}<div class="term-heading"><p class="eyebrow">${s.back?'뜻을 확인해보세요':'뜻을 먼저 떠올려보세요'}</p><h1 tabindex="-1">${e(term.term)}</h1>${english?`<p class="english">${e(english)}</p>`:''}</div>${s.back?`<div class="definition"><p class="preserve">${e(term.definition)}</p>${term.explanation?`<p class="preserve">${e(term.explanation)}</p>`:''}${term.example?`<div class="example"><h2>이렇게 쓰여요</h2><div class="preserve ${term.example.includes('flowchart ')||term.term==='스킬'?'code-example':''}">${e(term.example)}</div></div>`:''}${term.sources.length?`<details class="references"><summary>참고 자료</summary>${term.sources.map(src=>`<a href="${e(src.url)}" target="_blank" rel="noopener noreferrer">${e(src.title)} ↗</a>`).join('')}</details>`:''}</div>`:``}</article><div class="rating-dock"><div class="rating-buttons">${button('몰라요','unknown','secondary')}${button('알아요','known','primary')}</div></div><div class="card-footer"><p class="study-caption">카드를 누르면 앞뒤로 계속 확인할 수 있어요.</p>${button('학습 종료','exit','text-button')}</div></section>`);
}
let flipping=false;
async function flipCard(){
 if(!session||session.done||flipping||busy)return;
 const active=session,card=main.querySelector('.flashcard');
 const focusCard=()=>requestAnimationFrame(()=>main.querySelector('.flashcard')?.focus({preventScroll:true}));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced||!card?.animate){session.back=!session.back;study();focusCard();return;}
 flipping=true;
 const direction=active.back?-1:1;
 try{
  card.setAttribute('aria-busy','true');
  await card.animate([
   {transform:'perspective(1200px) rotateY(0deg)'},
   {transform:`perspective(1200px) rotateY(${direction*90}deg)`}
  ],{duration:160,easing:'ease-in',fill:'forwards'}).finished;
  if(session!==active||!card.isConnected)return;
  active.back=!active.back;study();
  const next=main.querySelector('.flashcard');
  next.setAttribute('aria-busy','true');
  await next.animate([
   {transform:`perspective(1200px) rotateY(${-direction*90}deg)`},
   {transform:'perspective(1200px) rotateY(0deg)'}
  ],{duration:180,easing:'ease-out'}).finished;
  if(session===active&&next.isConnected){next.removeAttribute('aria-busy');focusCard();}
 }catch{
  // A navigation or animation cancellation must never leave a card edge-on.
  if(session===active&&main.querySelector('.flashcard')){study();focusCard();}
 }finally{flipping=false;}
}
main.addEventListener('keydown',ev=>{
 if(ev.target.matches('.flashcard')&&['Enter',' '].includes(ev.key)){
  ev.preventDefault();flipCard();
 }
});
async function evaluate(value){
 if(busy||flipping||!session||session.done)return;
 busy=true;
 const active=session,term=active.queue[active.index],card=main.querySelector('.flashcard');
 state=rate(state,term.id,value);active.ratings[term.id]=value;persist();
 let advanced=false;
 const advance=()=>{
  if(advanced||session!==active)return false;
  advanced=true;active.index++;active.back=false;
  if(active.index===active.queue.length)finish();else study();
  return true;
 };
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{
  if(reduced||!card?.animate){advance();return;}
  card.setAttribute('aria-busy','true');
  await card.animate([
   {transform:'translateY(0)',opacity:1},
   {transform:'translateY(-110%)',opacity:0}
  ],{duration:240,easing:'cubic-bezier(.4,0,.8,.4)',fill:'forwards'}).finished;
  if(!advance())return;
  const next=main.querySelector('.flashcard')||main.querySelector('.complete-panel');
  if(!next)return;
  next.setAttribute('aria-busy','true');
  await next.animate([
   {transform:'translateY(100%)',opacity:0},
   {transform:'translateY(0)',opacity:1}
  ],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'}).finished;
  if(session===active&&next.isConnected){
   next.removeAttribute('aria-busy');
   next.querySelector('h1')?.focus({preventScroll:true});
  }
 }catch{
  if(session===active){
   if(!advanced)advance();
   else if(active.done)finish();
   else study();
  }
 }finally{busy=false;}
}
function finish(){
 const s=session;s.done=true;
 if(s.mode==='normal'){state=completeBatch(state,s.scope,s.ids);persist();}
 const unknown=s.queue.filter(t=>s.ratings[t.id]==='unknown'),known=s.queue.length-unknown.length;
 const next=s.mode==='normal'?nextBatch(terms,state,s.scope):s.remaining;
 const allDone=s.mode==='normal'&&!next.length;
 render(`<section class="complete-panel"><img class="completion-image" src="./boongeoppang-complete.png" alt="완성된 붕어빵"><h1 tabindex="-1">${allDone?'한 바퀴 학습했어요.':'이번 학습을 마쳤어요.'}</h1><p class="muted">조금 더 익숙해진 용어가 생겼네요.</p><div class="result-stats"><div><span>확인한 카드</span><strong>${s.queue.length}<small>장</small></strong></div><div><span>알아요</span><strong>${known}<small>장</small></strong></div><div><span>몰라요</span><strong>${unknown.length}<small>장</small></strong></div></div><div class="complete-actions">${unknown.length?button(`틀린 용어 복습 ${arrow}`,'review-session',next.length||allDone?'secondary':'primary'):'<p class="muted">이번에 모른다고 표시한 용어가 없어요.</p>'}${next.length?button(`${next.length<10?'남은 '+next.length+'장':'다음 10장'} 학습 ${arrow}`,'next'):allDone?button('처음부터 다시 학습','restart'):''}${button('처음으로','home','text-button')}</div></section>`);
}
async function userAccount(){
 session=null;dirty=false;
 if(!configured){render(`<section class="admin-login"><h1 tabindex="-1">로그인</h1><p>로그인 연결을 준비 중이에요.</p>${button('처음으로','home','secondary')}</section>`);return;}
 render('<p class="loading">로그인 상태를 확인하는 중이에요.</p>');
 try{
  const user=await currentUser();activeUser=user;setHeaderUser(user);
  if(user){
   const known=Object.values(state.ratings).filter(value=>value==='known').length,unknown=Object.values(state.ratings).filter(value=>value==='unknown').length;
   render(`<section class="admin-login account-page"><p class="eyebrow">마이페이지</p><h1 tabindex="-1">내 계정</h1><p>${e(user.email||'')}</p><div class="account-stats"><div><span>학습한 용어</span><strong>${known+unknown}</strong></div><div><span>알아요</span><strong>${known}</strong></div><div><span>몰라요</span><strong>${unknown}</strong></div></div>${button('비밀번호 변경 메일 받기','password-change','secondary')}${button('로그아웃','user-logout','secondary')}${button('계정 삭제 요청','show-delete-request','danger')}${button('처음으로','home','text-button')}</section>`);return;
  }
  render(`<section class="admin-login user-login"><p class="eyebrow">승인된 사용자 전용</p><h1 tabindex="-1">로그인</h1><p>관리자가 미리 등록한 이메일만 이용할 수 있어요.</p><form id="user-login-form"><label>이메일<input name="email" type="email" autocomplete="username" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><div id="login-error" role="alert"></div><button class="btn primary" type="submit">로그인</button><button class="btn text-button" type="button" data-action="password-setup">최초 비밀번호 설정·재설정</button></form>${button('처음으로','home','text-button')}</section>`);
 }catch(err){render(`<section class="empty-state"><h1 tabindex="-1">로그인을 준비하지 못했어요.</h1><p>${e(err.message)}</p>${button('다시 시도','user-account')}</section>`);}
}
async function admin(){
 session=null;
 if(!configured){render(`<section class="admin-login"><p class="eyebrow">운영자 전용</p><h1 tabindex="-1">관리자 로그인</h1><p>학습 공간을 차근차근 준비하고 있어요.</p><div class="info-box">Google 관리자 로그인 연결을 준비 중이에요.<br>일반 학습과 복습은 지금 이용할 수 있어요.</div>${button('학습으로 돌아가기','home','secondary')}</section>`);return;}
 render('<p class="loading">로그인 상태를 확인하는 중이에요.</p>');
 try{const user=await currentAdmin();if(user)return adminList();render(`<section class="admin-login"><p class="eyebrow">운영자 전용</p><h1 tabindex="-1">관리자 로그인</h1><p>등록된 관리자 계정으로<br>용어를 관리할 수 있어요.</p><div id="admin-error" role="alert"></div>${button('Google로 로그인','login')}${button('학습으로 돌아가기','home','text-button')}</section>`);}catch(err){render(`<section class="empty-state"><h1 tabindex="-1">로그인을 준비하지 못했어요.</h1><p>${e(err.message)}</p>${button('다시 시도','admin')}</section>`);}
}
function adminList(){
 editing=null;dirty=false;
 render(`<section class="admin-shell"><div class="admin-heading"><div><p class="eyebrow">운영자</p><h1 tabindex="-1">용어 관리</h1></div>${button('로그아웃','logout','text-button')}</div><div class="admin-tools"><label class="sr-only" for="term-search">용어명 검색</label><input id="term-search" type="search" placeholder="용어명 또는 영문 검색" value="${e(search)}">${button('용어 추가 +','add')}</div><div id="admin-error" role="alert"></div><p class="muted" id="result-count"></p><div id="term-list"></div>${!terms.length?button('초기 용어 239개 등록','seed','secondary'):''}</section>`);filterList();
}
function filterList(){
 const found=terms.filter(t=>(t.term+' '+t.englishTerm).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const list=main.querySelector('#term-list');if(!list)return;
 main.querySelector('#result-count').textContent=`총 ${found.length}개`;
 list.innerHTML=found.length?found.map(t=>`<div class="admin-term"><div><strong>${e(t.term)}</strong>${bilingual(t)?`<span class="english">${e(t.englishTerm)}</span>`:''}${tags(t)}</div>${button('수정','edit','secondary',`data-id="${e(t.id)}"`)}</div>`).join(''):'<p class="empty-copy">검색 결과가 없어요. 다른 용어로 찾아보세요.</p>';
}
function editor(term){
 editing=term||null;dirty=false;const t=term||{term:'',englishTerm:'',definition:'',example:'',explanation:'',categories:[],sources:[]};
 render(`<section class="admin-shell editor"><p class="eyebrow">용어 관리</p><h1 tabindex="-1">${term?'용어 수정':'새 용어 추가'}</h1><form id="term-form"><label>용어명 <span class="required">필수</span><input name="term" value="${e(t.term)}" maxlength="200" required></label><label>영문·약어 <span class="optional">선택</span><input name="englishTerm" value="${e(t.englishTerm)}" maxlength="500"></label><fieldset><legend>분야 <span class="required">하나 이상 선택</span></legend><div class="check-grid">${CATEGORIES.map(c=>`<label><input type="checkbox" name="categories" value="${e(c)}" ${t.categories.includes(c)?'checked':''}>${e(c)}</label>`).join('')}</div><p class="field-error" id="category-error" aria-live="polite"></p></fieldset>${[['definition','뜻','필수'],['explanation','추가 설명','선택'],['example','예시','선택']].map(([name,label,req])=>`<label>${label} <span class="${req==='필수'?'required':'optional'}">${req}</span><textarea name="${name}" maxlength="20000" rows="${name==='definition'?6:4}" ${req==='필수'?'required':''}>${e(t[name])}</textarea></label>`).join('')}<label>참고 출처 <span class="optional">선택 · 한 줄에 URL 하나</span><textarea name="sources" rows="3">${e(t.sources.map(s=>s.url).join('\n'))}</textarea></label><div id="form-error" role="alert"></div><div class="form-actions"><button type="submit" class="btn primary">저장</button>${button('취소','cancel','secondary')}</div>${term?`<div class="delete-area">${button('이 용어 삭제','delete','danger')}</div>`:''}</form></section>`);
}
function canLeave(){return !dirty||confirm('저장하지 않은 내용이 있어요. 변경 내용을 버리고 나갈까요?');}
async function saveForm(form){
 if(busy)return;const values=new FormData(form),categories=values.getAll('categories');
 const categoryError=form.querySelector('#category-error');categoryError.textContent='';if(!categories.length){categoryError.textContent='분야를 하나 이상 선택해주세요.';form.querySelector('[name=categories]').focus();return;}
 const sources=String(values.get('sources')).split('\n').map(x=>x.trim()).filter(Boolean);
 if(sources.some(url=>!/^https?:\/\//i.test(url))){form.querySelector('#form-error').textContent='참고 출처는 https:// 또는 http://로 시작하는 URL을 입력해주세요.';return;}
 let sourceObjects;try{sourceObjects=sources.map(url=>({title:new URL(url).hostname,url}));}catch{form.querySelector('#form-error').textContent='참고 출처의 URL 형식을 확인해주세요.';return;}
 const value={id:editing?.id||'term-'+crypto.randomUUID(),...Object.fromEntries(['term','englishTerm','definition','explanation','example'].map(key=>[key,values.get(key)])),categories,sources:sourceObjects};
 busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent='저장 중…';form.querySelector('#form-error').textContent='';
 try{await writeTerm(value,editing);dirty=false;terms=await loadCatalog();adminList();message('용어를 저장했어요.');}catch(err){form.querySelector('#form-error').textContent=err.message;}finally{busy=false;if(submit.isConnected){submit.disabled=false;submit.textContent='저장';}}
}
async function refresh(){
 render('<p class="loading">용어를 불러오는 중이에요.</p>');
 try{
  terms=await loadCatalog();const user=await currentUser();activeUser=user;setHeaderUser(user);
  if(user){const saved=await loadStudyState();if(saved)state=saved;else await saveStudyState(state);}else state=emptyState();
  if(location.hash.startsWith('#/admin'))await admin();else if(location.hash.startsWith('#/login'))await userAccount();else home();
 }catch(err){render(`<section class="empty-state"><h1 tabindex="-1">용어를 불러오지 못했어요.</h1><p>연결 상태를 확인하고 다시 시도해주세요.</p>${button('다시 시도','retry')}</section>`);}
}
main.addEventListener('change',ev=>{if(ev.target.name==='scope'){scope=ev.target.value;home();}if(ev.target.closest('#term-form'))dirty=true;});
main.addEventListener('input',ev=>{if(ev.target.id==='term-search'){search=ev.target.value;filterList();}if(ev.target.closest('#term-form'))dirty=true;});
main.addEventListener('submit',async ev=>{
 if(ev.target.id==='term-form'){ev.preventDefault();saveForm(ev.target);return;}
 if(ev.target.id==='user-login-form'){
  ev.preventDefault();if(busy)return;const form=ev.target,error=form.querySelector('#login-error'),submit=form.querySelector('[type=submit]');
  busy=true;submit.disabled=true;error.textContent='';
   try{await userLogin(form.elements.email.value,form.elements.password.value);activeUser=await currentUser();const saved=await loadStudyState();if(saved)state=saved;else await saveStudyState(state);await userAccount();}
  catch(err){error.textContent=err.code==='auth/invalid-credential'?'이메일 또는 비밀번호를 확인해주세요.':err.message;}
  finally{busy=false;if(submit.isConnected)submit.disabled=false;}
 }
});
main.addEventListener('click',async ev=>{
 if(ev.target.matches('.pickle-prompt-dialog')){ev.target.close();return;}
 const target=ev.target.closest('[data-action]');
 if(!target){
  const card=ev.target.closest('.flashcard');
  if(card&&!ev.target.closest('a,button,input,textarea,select,summary,details')&&!window.getSelection()?.toString())flipCard();
  return;
 }
 if(target.disabled)return;const action=target.dataset.action;
  if(['known','unknown'].includes(action))return evaluate(action);
 if(busy&&action!=='exit')return;
 switch(action){
  case 'home':if(canLeave()){dirty=false;if(location.hash!=='#/')location.hash='#/';else home();}break;
   case 'show-pickle-prompt':main.querySelector('.pickle-prompt-dialog')?.showModal();break;
   case 'copy-pickle-prompt':await copyPicklePrompt(target);break;
   case 'close-pickle-prompt':target.closest('dialog')?.close();break;
   case 'start':begin();break;
   case 'review':begin('review');break;
  case 'flip':flipCard();break;
  case 'exit':session=null;home();break;
  case 'next':{const s=session;if(s.mode==='normal')begin();else begin('review',s.remaining);break;}
  case 'restart':state=resetScope(state,scope);persist();begin();break;
  case 'review-session':begin('review',session.queue.filter(t=>session.ratings[t.id]==='unknown'));break;
  case 'retry':await refresh();break;
  case 'admin':await admin();break;
   case 'user-account':await userAccount();break;
   case 'user-logout':await userLogout();activeUser=null;state=emptyState();setHeaderUser(null);await userAccount();break;
   case 'password-change':{
    const user=await currentUser();if(!user)break;
    target.disabled=true;try{await requestPasswordSetup(user.email);message('비밀번호 변경 메일을 보냈어요.');}catch(err){banner(err.message);}finally{target.disabled=false;}break;
   }
   case 'show-delete-request':render(`<section class="admin-login delete-request"><p class="eyebrow">계정 삭제</p><h1 tabindex="-1">계정 삭제를 요청할까요?</h1><div class="delete-warning"><p>요청을 확인하고 삭제하기까지 약 1일이 소요될 수 있어요.</p><p>계정이 삭제되면 암기 기록을 포함한 모든 학습 기록은 다시 복구할 수 없어요.</p></div>${button('삭제 요청 보내기','confirm-account-delete','danger')}${button('취소','user-account','secondary')}</section>`);break;
   case 'confirm-account-delete':
    busy=true;target.disabled=true;
    try{await requestAccountDeletion();render(`<section class="admin-login"><p class="eyebrow">요청 완료</p><h1 tabindex="-1">삭제 요청을 보냈어요.</h1><p>관리자가 확인한 뒤 약 1일 이내에 처리할게요.<br>삭제가 완료되면 암기 기록은 복구할 수 없어요.</p>${button('마이페이지로','user-account','secondary')}</section>`);}
    catch(err){banner(err.code==='permission-denied'?'이미 삭제 요청을 보냈거나 요청을 저장할 수 없어요.':err.message);target.disabled=false;}
    finally{busy=false;}break;
   case 'password-setup':{
    const form=target.closest('form'),email=form.elements.email,error=form.querySelector('#login-error');
    if(!email.reportValidity())break;
    busy=true;target.disabled=true;error.textContent='';
    try{await requestPasswordSetup(email.value);error.textContent='비밀번호 설정 메일을 보냈어요. 메일함을 확인해주세요.';}
    catch(err){error.textContent=err.code==='auth/invalid-email'?'이메일 주소를 확인해주세요.':err.message;}
    finally{busy=false;target.disabled=false;}
    break;
   }
  case 'login':busy=true;target.disabled=true;try{await login();await admin();}catch(err){main.querySelector('#admin-error').textContent=err.code==='auth/popup-closed-by-user'?'로그인을 취소했어요. 다시 시도할 수 있어요.':err.message;}finally{busy=false;target.disabled=false;}break;
  case 'logout':if(canLeave()){await logout();dirty=false;await admin();}break;
  case 'add':editor();break;
  case 'edit':editor(terms.find(t=>t.id===target.dataset.id));break;
  case 'cancel':if(canLeave())adminList();break;
  case 'delete':if(confirm(`‘${editing.term}’ 용어를 삭제할까요? 삭제 후에는 되돌릴 수 없어요.`)){busy=true;target.disabled=true;try{await deleteTerm(editing);dirty=false;terms=await loadCatalog();adminList();message('용어를 삭제했어요.');}catch(err){main.querySelector('#form-error').textContent=err.message;}finally{busy=false;target.disabled=false;}}break;
  case 'seed':if(confirm('검토한 초기 용어 239개를 이 프로젝트에 등록할까요?')){busy=true;target.disabled=true;try{await seedCatalog();terms=await loadCatalog();adminList();message('초기 용어를 등록했어요.');}catch(err){main.querySelector('#admin-error').textContent=err.message;}finally{busy=false;target.disabled=false;}}break;
 }
});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue='';}});
function route(){if(location.hash.startsWith('#/admin'))return admin();if(location.hash.startsWith('#/login'))return userAccount();return home();}
window.addEventListener('hashchange',()=>{if(dirty&&!canLeave()){history.replaceState(null,'','#/admin');return;}dirty=false;route();});
document.addEventListener('click',ev=>{
 const link=ev.target.closest('a[href]');
 if(!link||ev.button!==0||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
 const destination=new URL(link.href,location.href);
 const homeControl=link.matches('.site-header .brand');
  if(!homeControl&&(destination.origin!==location.origin||destination.pathname!==location.pathname||!['#/','#/admin','#/login'].includes(destination.hash)))return;
 const route=homeControl?'#/':destination.hash;
 // Explicitly handle application navigation, even when a host intercepts the
 // anchor default action or rewrites its href to an absolute same-site URL.
 ev.preventDefault();
 if(dirty&&!canLeave())return;
 dirty=false;
 if(location.hash!==route)history.pushState(null,'',route);
  route==='#/admin'?admin():route==='#/login'?userAccount():home();
},true);
window.addEventListener('popstate',()=>{
 if(dirty&&!canLeave())return;
 dirty=false;route();
});

refresh();
