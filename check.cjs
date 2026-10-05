const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('trainer/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(source);
const elements=new Map(), timers=[], listeners={}, saved=new Map();
function element(){return {value:'',checked:false,disabled:false,style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},addEventListener(name,cb){this[name]=cb},querySelectorAll(){return []},querySelector(){return null},textContent:''}}
const collapsedClasses=new Set(),collapseAttrs={};
const collapseButton={...element(),dataset:{panelToggle:'statsTitle'},closest(){return {classList:{toggle(k,on){on?collapsedClasses.add(k):collapsedClasses.delete(k)}}}},setAttribute(k,v){collapseAttrs[k]=v},getAttribute(k){return collapseAttrs[k]}};
const ctx={console,TextEncoder,TextDecoder,Date,Math,Set,Map,JSON,Number,String,Array,Object,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},document:{querySelectorAll(){return [collapseButton]},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},documentElement:element()},window:{addEventListener:(k,v)=>listeners[k]=v,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},confirm:()=>true,requestAnimationFrame(){} }};
const exposed=source.replace('      init();',`globalThis.api={bindEvents,getChapterLabel,sanitizeResultHistory,sanitizeRecord,mergeRemoteData,applyPendingMarks,updateCheckButtonState,drawFromCandidates,fetchGithubFile,renderLastResult,
setState(s){records=s.records||{};currentSet=s.set||[];pendingMarks=s.marks||{};resultHistory=s.history||[];syncBaselineRecords=s.baseline||{};githubSettings={};lastResult=s.lastResult||null;},getState(){return {records,currentSet,pendingMarks,resultHistory}}};`);
vm.runInNewContext(exposed,ctx);const a=ctx.api;
a.bindEvents();collapseButton.click();assert.equal(collapseAttrs["aria-expanded"],"false");assert.equal(saved.get("blankTrainer.collapsed.statsTitle"),"true");a.bindEvents();assert.equal(collapseButton.textContent,"Open");collapseButton.click();assert.equal(collapsedClasses.has("is-collapsed"),false);assert.equal(typeof elements.get('paintRescueButton').click,'function');assert.equal(typeof listeners.pagehide,'function');assert.equal(a.getChapterLabel(1),'Ch.1 時制');
assert.equal(a.sanitizeResultHistory([{id:'bad',entries:[null,{number:1,status:'toString'}]}]).length,0);
assert.equal(a.sanitizeRecord({status:'constructor'},1).status,'none');
const history=Array.from({length:501},(_,i)=>({id:`r${i}`,createdAt:new Date(1700000000000+i).toISOString(),entries:[{number:1,status:'correct'}]}));
a.setState({history});a.mergeRemoteData({records:{},syncBaselineRecords:{},resultHistory:[]});assert.equal(a.getState().records[1].correctCount,501);a.mergeRemoteData({records:{},syncBaselineRecords:{},resultHistory:history});assert.equal(a.getState().records[1].correctCount,501);
a.setState({set:[1],marks:{1:'correct'}});a.applyPendingMarks();assert.equal(a.getState().records[1].correctCount,1);assert.equal(a.getState().currentSet.length,0);assert.equal(JSON.parse(saved.get('blankTrainer.currentSet.v1')).length,0);a.applyPendingMarks();assert.equal(a.getState().records[1].correctCount,1);
elements.get('startNumber').value='1';elements.get('endNumber').value='10';a.drawFromCandidates([2],1,'all');a.updateCheckButtonState();assert.equal(elements.get('checkButton').disabled,true);timers.shift()();assert.deepEqual(Array.from(a.getState().currentSet),[2]);assert.equal(elements.get('checkButton').disabled,false);
console.log('PASS: syntax, event registration, malformed history, 501-event merge/idempotence, completion persistence, duplicate check guard, new-set animation race.');

a.setState({lastResult:{total:'<img src=x onerror=alert(1)>',correct:'<b>bad</b>',mistakeChapters:[null,{label:'<script>',total:'<img>'}]}});a.renderLastResult();assert.equal(elements.get('lastResultPanel').innerHTML.includes('<img'),false);
ctx.fetch=async()=>({ok:false,status:401,clone:()=>({json:async()=>({message:'Bad credentials'})})});
a.fetchGithubFile({owner:'test',repo:'test',path:'save.json',branch:'main',token:'test'},false).then(()=>assert.fail('expected rejection'),error=>{assert.equal(error.status,401);assert.match(error.message,/invalid or expired/);console.log('PASS: imported-result escaping and GitHub HTTP error reporting.');});
