/* Zweispieler-Duell für das Länderquiz.
   Beide sehen dieselbe Frage; wer das Land zuerst richtig doppelt antippt, bekommt den Punkt.
   Jedes Handy misst selbst die Zeit vom Erscheinen der Frage bis zum richtigen Tipp –
   die kürzere Zeit gewinnt, eine langsamere Verbindung ist also kein Nachteil.
   Verbindung: Firebase Realtime Database. Testgegner: läuft nur auf diesem Gerät. */
var MP_CFG={databaseURL:'https://laenderquiz-baeb9-default-rtdb.europe-west1.firebasedatabase.app'};
var MP_SDK='https://www.gstatic.com/firebasejs/10.12.2/';
var MP={on:false,db:null,ref:null,code:'',me:'',host:false,bot:false,room:null,game:-1,qi:-1,shownAt:0,answered:false,myOk:false,resShown:false,
 endShown:false,decT:0,qT:0,advFor:-1,botT:0,cb:null,len:10,name:'',leftShown:false};

/* ---------- Datenbank: Firebase oder (für den Testgegner) ein kleiner Speicher nur auf diesem Gerät ---------- */
function mpSplit(p){return String(p).split('/').filter(function(x){return x})}
function mpClone(v){return v==null?null:JSON.parse(JSON.stringify(v))}
function LocalDB(){
 var root={},L=[];
 function get(path){var o=root;mpSplit(path).forEach(function(k){o=(o&&typeof o==='object')?o[k]:undefined});return o===undefined?null:o}
 function setAt(path,v){
  var ks=mpSplit(path),o=root;
  for(var i=0;i<ks.length-1;i++){if(!o[ks[i]]||typeof o[ks[i]]!=='object')o[ks[i]]={};o=o[ks[i]]}
  if(v==null)delete o[ks[ks.length-1]];else o[ks[ks.length-1]]=mpClone(v);
 }
 function notify(path){
  var p=mpSplit(path).join('/');
  L.slice().forEach(function(l){var q=mpSplit(l.p).join('/');
   if(p===q||p.indexOf(q+'/')===0||q.indexOf(p+'/')===0||!q)setTimeout(function(){if(L.indexOf(l)>=0)l.cb(snap(get(l.p)))},0)});
 }
 function snap(v){var c=mpClone(v);return{val:function(){return mpClone(c)},exists:function(){return c!=null}}}
 function ref(path){return{
  set:function(v){setAt(path,v);notify(path);return Promise.resolve()},
  update:function(o){Object.keys(o).forEach(function(k){setAt(path+'/'+k,o[k])});notify(path);return Promise.resolve()},
  remove:function(){setAt(path,null);notify(path);return Promise.resolve()},
  once:function(){return Promise.resolve(snap(get(path)))},
  on:function(t,cb){var l={p:path,cb:cb};L.push(l);setTimeout(function(){if(L.indexOf(l)>=0)cb(snap(get(path)))},0);return cb},
  off:function(t,cb){L=L.filter(function(l){return !(l.p===path&&(!cb||l.cb===cb))})},
  onDisconnect:function(){return{remove:function(){return Promise.resolve()},cancel:function(){return Promise.resolve()}}}
 }}
 return{ref:ref};
}
var mpSdkP=null;
function mpLoadScript(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){no(new Error('load'))};document.head.appendChild(s)})}
function mpFirebase(){
 if(MP.fb)return Promise.resolve(MP.fb);
 if(!mpSdkP)mpSdkP=mpLoadScript(MP_SDK+'firebase-app-compat.js').then(function(){return mpLoadScript(MP_SDK+'firebase-database-compat.js')});
 return mpSdkP.then(function(){
  if(!window.firebase)throw new Error('sdk');
  var app=firebase.apps&&firebase.apps.length?firebase.app():firebase.initializeApp(MP_CFG);
  MP.fb=app.database();return MP.fb;
 });
}
function mpId(){var a='abcdefghijkmnpqrstuvwxyz23456789',s='';for(var i=0;i<10;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function mpShuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function mpEsc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
function mpSec(ms){return (Math.round(ms/100)/10).toLocaleString('de-DE',{minimumFractionDigits:1})+' s'}

/* ---------- Oberfläche ---------- */
function mpInit(){
 var st=document.createElement('style');
 st.textContent=
 'body:not(.mp) .mpo{display:none!important}body.mp .spo{display:none!important}'+
 'body.mp #endbox{display:none!important}'+
 '.mpstart{display:block;width:100%;margin-top:10px;padding:11px 14px;font-weight:600;background:rgba(48,164,108,.14);border-color:rgba(48,164,108,.55)}'+
 '#mp{position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}'+
 '#mp.hide{display:none}#mp .mc h2{margin-bottom:6px}#mp .sub{color:var(--muted);font-size:.9rem;margin:0 0 14px}'+
 '#mp .col{display:flex;flex-direction:column;gap:8px}#mp .col button{padding:12px 14px;text-align:left}'+
 '#mp .col button small{display:block;color:var(--muted);font-size:.8rem;margin-top:2px}'+
 '#mp .col button.p small{color:rgba(255,255,255,.85)}'+
 '#mp .code{font-size:3rem;font-weight:900;letter-spacing:.18em;text-align:center;margin:6px 0 4px;font-variant-numeric:tabular-nums}'+
 '#mp .codein{font-size:2rem;letter-spacing:.3em;text-align:center}'+
 '#mp .pl{list-style:none;margin:10px 0;padding:0}#mp .pl li{padding:8px 10px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px}'+
 '#mp .pl li.wait{color:var(--muted);border-style:dashed}'+
 '#mp .seg{display:flex;gap:6px;margin:6px 0 4px}#mp .seg button{flex:1}#mp .seg button.on{background:var(--acc);border-color:var(--acc);color:#fff}'+
 '#mp button:disabled{opacity:.4;cursor:default}#mp .err{color:var(--bad);font-size:.88rem;min-height:1.2em;margin-top:6px}'+
 '#mpsc b{color:var(--text)}#mpsc .me{color:var(--acc)}'+
 '#mpwarn{margin:10px 2px 0;padding:8px 10px;border-radius:10px;background:rgba(250,204,21,.18);border:1px solid rgba(250,204,21,.6);font-size:.9rem}#mpend{margin:0 2px 10px}#mpend .big{font-size:1.25rem;font-weight:800;margin-bottom:6px}#mpend .btns{margin-top:10px}';
 document.head.appendChild(st);
 var w=document.createElement('div');w.id='mp';w.className='hide';
 w.innerHTML='<div class="mc">'+
  '<div id="mpA"><h2>Zu zweit spielen</h2><p class="sub">Duell in Echtzeit: Beide suchen dasselbe Land. Wer es zuerst richtig doppelt antippt, bekommt den Punkt.</p>'+
   '<div class="col"><button class="p" id="mpNew">Neues Duell erstellen<small>Mit den Kontinenten, die du gewählt hast</small></button>'+
   '<button id="mpJoinB">Einem Duell beitreten<small>Du hast einen 4-stelligen Code bekommen</small></button>'+
   '<button id="mpBot">Gegen Testgegner üben<small>Ohne zweites Handy, zum Ausprobieren</small></button></div>'+
   '<div class="err" id="mpAerr"></div><div class="mrow"><button id="mpAx">Zurück</button></div></div>'+
  '<div id="mpJ" style="display:none"><h2>Duell beitreten</h2><p class="sub">Gib den Code ein, der beim anderen Spieler angezeigt wird.</p>'+
   '<input class="nm codein" id="mpCode" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000">'+
   '<div class="err" id="mpJerr"></div><div class="mrow"><button id="mpJx">Zurück</button><button class="p" id="mpJgo">Beitreten</button></div></div>'+
  '<div id="mpL" style="display:none"><h2 id="mpLt">Duell</h2><div id="mpLcode"></div><p class="sub" id="mpLsub"></p>'+
   '<ul class="pl" id="mpLpl"></ul><div id="mpLlen"></div><div class="err" id="mpLerr"></div>'+
   '<div class="mrow"><button id="mpLx">Abbrechen</button><button class="p" id="mpLgo" style="display:none">Duell starten</button></div></div>'+
 '</div>';
 document.body.appendChild(w);
 var wn=document.createElement('div');wn.id='mpwarn';wn.style.display='none';$('fb').parentNode.insertBefore(wn,$('fb'));
 $('mpbtn').onclick=mpOpen;
 $('mpAx').onclick=function(){mpPanel(null)};
 $('mpNew').onclick=function(){mpCreate(false)};
 $('mpBot').onclick=function(){mpCreate(true)};
 $('mpJoinB').onclick=function(){$('mpJerr').textContent='';$('mpCode').value='';mpPanel('J');setTimeout(function(){try{$('mpCode').focus()}catch(e){}},50)};
 $('mpJx').onclick=function(){mpPanel('A')};
 $('mpJgo').onclick=mpJoin;
 $('mpCode').addEventListener('input',function(){this.value=this.value.replace(/\D/g,'').slice(0,4);$('mpJerr').textContent=''});
 $('mpCode').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();mpJoin()}});
 $('mpLx').onclick=function(){mpLeave()};
 $('mpLgo').onclick=mpStartGame;
 $('mpgive').onclick=mpGiveUp;
 $('mpquit').onclick=function(){
  if(this.__arm){this.__arm=false;this.textContent='Duell beenden';mpLeave();return}
  var b=this;b.__arm=true;b.textContent='Wirklich beenden?';setTimeout(function(){b.__arm=false;b.textContent='Duell beenden'},3000);
 };
 /* Auswahl im Duell läuft über eigene Logik; Einzelspiel bleibt unverändert */
 var spAnswer=answer;
 answer=function(c){if(MP.on)return mpAnswer(c);return spAnswer(c)};
}
function mpPanel(k){
 if(!k){$('mp').classList.add('hide');return}
 ['A','J','L'].forEach(function(x){$('mp'+x).style.display=x===k?'':'none'});
 $('mp').classList.remove('hide');
}
function mpOpen(){
 var v=readName();if(!v)return;
 MP.name=v;player=v;setName(v);$('pl').textContent=v;
 $('mpAerr').textContent='';mpPanel('A');
}
function mpSelList(){return Object.keys(CONT).filter(function(k){return sel[k]})}

/* ---------- Raum erstellen / beitreten ---------- */
function mpCreate(bot){
 var ks=mpSelList();
 if(!ks.length){$('mpAerr').textContent='Bitte wähle zuerst mindestens einen Kontinent.';return}
 $('mpAerr').textContent=bot?'':'Verbinde …';
 var dbp=bot?Promise.resolve(LocalDB()):mpFirebase();
 dbp.then(function(db){
  MP.db=db;MP.bot=bot;MP.host=true;MP.me=mpId();
  return mpFreeCode(db).then(function(code){
   MP.code=code;MP.ref=db.ref('rooms/'+code);
   var room={host:MP.me,created:Date.now(),status:'lobby',sel:ks,len:MP.len,game:0,qi:0,players:{}};
   room.players[MP.me]={name:MP.name,score:0,j:Date.now()};
   if(bot)room.players.bot={name:'Testgegner 🤖',score:0,j:Date.now()+1};
   return MP.ref.set(room);
  }).then(function(){
   mpPresence();mpListen();
  });
 }).catch(function(e){
  $('mpAerr').textContent='Keine Verbindung zum Spielserver. Prüfe die Internetverbindung. Hinweis: Zu zweit spielen geht nur über laenderquiz.github.io/laenderquiz.';
  if(window.console)console.error(e);
 });
}
function mpFreeCode(db,n){
 n=n||0;var code=String(1000+Math.floor(Math.random()*9000));
 return db.ref('rooms/'+code).once('value').then(function(s){
  var r=s.val();
  if(!r||n>8||(r.created&&Date.now()-r.created>6*3600e3))return code;
  return mpFreeCode(db,n+1);
 });
}
function mpJoin(){
 var code=$('mpCode').value;
 if(!/^\d{4}$/.test(code)){$('mpJerr').textContent='Der Code hat 4 Ziffern.';return}
 $('mpJerr').textContent='Verbinde …';
 mpFirebase().then(function(db){
  return db.ref('rooms/'+code).once('value').then(function(s){
   var r=s.val();
   if(!r||!r.host){$('mpJerr').textContent='Kein Duell mit diesem Code gefunden.';return}
   var ps=r.players||{};
   if(Object.keys(ps).length>=2){$('mpJerr').textContent='Dieses Duell hat schon zwei Spieler.';return}
   MP.db=db;MP.bot=false;MP.host=false;MP.me=mpId();MP.code=code;MP.ref=db.ref('rooms/'+code);
   var me=MP.ref.child?MP.ref.child('players/'+MP.me):db.ref('rooms/'+code+'/players/'+MP.me);
   return me.set({name:MP.name,score:0,j:Date.now()}).then(function(){
    $('mpJerr').textContent='';mpPresence();mpListen();
   });
  });
 }).catch(function(e){
  $('mpJerr').textContent='Keine Verbindung zum Spielserver. Prüfe die Internetverbindung. Hinweis: Zu zweit spielen geht nur über laenderquiz.github.io/laenderquiz.';
  if(window.console)console.error(e);
 });
}
function mpListen(){
 MP.game=-1;MP.qi=-1;MP.endShown=false;MP.leftShown=false;MP.room=null;MP.seen=false;
 MP.cb=MP.ref.on('value',function(s){mpHandle(s.val())},function(e){if(window.console)console.error(e)});
 mpPanel('L');mpLobby(null);
}
function mpPlayers(r){
 var ps=(r&&r.players)||{};
 return Object.keys(ps).map(function(k){return{id:k,name:ps[k].name||'?',score:ps[k].score||0,j:ps[k].j||0,on:ps[k].on}}).sort(function(a,b){return a.j-b.j});
}

/* Online-Kennzeichen: bei kurzem Verbindungsverlust (z. B. Safari im Hintergrund) bleibt der Spieler im Raum */
function mpPresence(){
 if(MP.bot||!MP.db||!MP.db.ref)return;
 var me=MP.db.ref('rooms/'+MP.code+'/players/'+MP.me),info=MP.db.ref('.info/connected');
 if(MP.infoCb)try{MP.infoRef.off('value',MP.infoCb)}catch(e){}
 MP.infoRef=info;MP.meRef=me;
 MP.infoCb=info.on('value',function(s){
  if(s.val()!==true||!MP.ref)return;
  try{me.child('on').onDisconnect().set(false)}catch(e){}
  me.once('value').then(function(x){if(x.exists()&&MP.ref)me.update({on:true})});
 });
}
function mpOffline(r){return mpPlayers(r).filter(function(p){return p.id!==MP.me&&p.on===false})}
function mpWarn(r){
 var w=$('mpwarn');if(!w)return;
 var off=MP.on?mpOffline(r):[];
 if(!off.length){w.style.display='none';clearTimeout(MP.warnT);MP.warnT=0;return}
 if(w.style.display!=='none'||MP.warnT)return;
 MP.warnT=setTimeout(function(){MP.warnT=0;var o=mpOffline(MP.room);if(MP.on&&o.length){w.textContent=o[0].name+' ist gerade nicht verbunden – das Duell geht weiter, sobald '+o[0].name+' zurück ist.';w.style.display=''}},2500);
}

/* ---------- Lobby ---------- */
function mpLobby(r){
 $('mpLcode').innerHTML=MP.bot?'':'<div class="code">'+mpEsc(MP.code)+'</div>';
 $('mpLt').textContent=MP.bot?'Übungsduell':(MP.host?'Dein Duell-Code':'Duell '+MP.code);
 var ps=mpPlayers(r),ks=(r&&r.sel)||[];
 $('mpLsub').textContent=MP.bot?'Der Testgegner läuft nur auf diesem Handy. Kontinente: '+ks.join(', ')+'.':
  (MP.host?'Dein Mitspieler öffnet laenderquiz.github.io/laenderquiz, gibt seinen Namen ein und tippt auf „Zu zweit spielen“ → „Einem Duell beitreten“. Kontinente: '+ks.join(', ')+'.':
  'Kontinente: '+ks.join(', ')+'.');
 var ul=$('mpLpl');ul.innerHTML='';
 ps.forEach(function(p){var li=document.createElement('li');li.textContent=p.name+(p.id===MP.me?' (du)':'')+(r&&p.id===r.host?' – erstellt':'')+(p.on===false&&p.id!==MP.me?' (gerade nicht verbunden)':'');ul.appendChild(li)});
 if(ps.length<2){var li=document.createElement('li');li.className='wait';li.textContent='Warte auf Mitspieler …';ul.appendChild(li)}
 var lw=$('mpLlen');
 if(MP.host){
  var n=mpPoolSize(ks);
  lw.innerHTML='<div class="lab">Wie viele Fragen?</div><div class="seg"><button data-n="10">10</button><button data-n="20">20</button><button data-n="0">Alle ('+n+')</button></div>';
  [].forEach.call(lw.querySelectorAll('button'),function(b){var v=+b.getAttribute('data-n');b.classList.toggle('on',v===MP.len);b.onclick=function(){MP.len=v;mpLobby(MP.room||r)}});
  $('mpLgo').style.display='';$('mpLgo').disabled=ps.length<2;
 }else{
  var h=ps.filter(function(p){return r&&p.id===r.host})[0];
  lw.innerHTML='<p class="sub">Warte, bis '+mpEsc(h?h.name:'der andere Spieler')+' das Duell startet …</p>';
  $('mpLgo').style.display='none';
 }
}
function mpPoolSize(ks){var m={};ks.forEach(function(k){m[k]=1});return codes.filter(function(c){return m[cmap[c]]}).length}

/* ---------- Spielablauf ---------- */
function mpStartGame(){
 var r=MP.room;if(!r||!MP.host)return;
 var ps=mpPlayers(r);if(ps.length<2){$('mpLerr').textContent='Es fehlt noch ein Mitspieler.';return}
 var m={};(r.sel||[]).forEach(function(k){m[k]=1});
 var pool=mpShuffle(codes.filter(function(c){return m[cmap[c]]}));
 if(MP.len)pool=pool.slice(0,MP.len);
 var up={status:'play',order:pool,qi:0,game:(r.game||0)+1,ans:null,res:null,len:MP.len};
 ps.forEach(function(p){up['players/'+p.id+'/score']=0});
 MP.ref.update(up);
}
function mpHandle(r){
 if(!r&&!MP.seen)return;
 if(r)MP.seen=true;
 MP.room=r;
 if(!r){
  if(MP.on||!$('mp').classList.contains('hide')){mpShowGone('Das Duell wurde beendet.');}
  return;
 }
 if(r.status==='lobby'){if(!MP.on)mpLobby(r);return}
 if(r.status==='play'||r.status==='end'){
  if(r.game!==MP.game)mpBegin(r);
  if(r.status==='play'&&r.qi!==MP.qi)mpQuestion(r);
  var res=r.res&&r.res['q'+r.qi];
  if(r.status==='play'&&res&&!MP.resShown)mpResult(r,res);
  mpScore(r);
  var ps=mpPlayers(r);
  if(ps.length<2&&!MP.leftShown){MP.leftShown=true;mpOpponentLeft()}
  mpWarn(r);
  if(r.status==='end'&&!MP.endShown)mpEnd(r);
  if(MP.host)mpHostTick(r);
 }
}
function mpBegin(r){
 MP.game=r.game;MP.qi=-1;MP.endShown=false;MP.leftShown=false;MP.advFor=-1;
 clearTimeout(MP.decT);clearTimeout(MP.qT);clearTimeout(MP.botT);
 MP.on=true;mpPanel(null);
 document.body.classList.remove('pre');document.body.classList.add('mp');
 $('menu').classList.add('hide');$('endbox').style.display='none';
 $('mpend').style.display='none';$('mainbtns').style.display='';
 var m={};(r.sel||[]).forEach(function(k){m[k]=1});
 act={};codes.forEach(function(c){if(m[cmap[c]])act[c]=1});
 try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()}catch(e){}
 try{window.scrollTo(0,0)}catch(e){}
 codes.forEach(function(c){paint(c)});
 try{fitSel()}catch(e){}
}
function mpQuestion(r){
 var qi=r.qi,order=r.order||[];
 clearTimeout(timer);stopBlink();if(window.microReset)microReset();
 clearTimeout(MP.botT);
 MP.qi=qi;MP.answered=false;MP.myOk=false;MP.resShown=false;
 locked=false;tries=3;$('tr').textContent=tries;
 target=order[qi];
 codes.forEach(function(c){paint(c)});
 $('q').innerHTML='Wo liegt <b>'+mpEsc(nm(target))+'</b>?';
 if(window.updateLupes)updateLupes();
 $('fb').className='';$('fb').textContent=qi===0?'Los! Auswählen per Doppelklick.':'';
 $('mpq').textContent=(qi+1)+'/'+order.length;
 $('mpgive').disabled=false;
 MP.shownAt=Date.now();
 if(MP.bot)mpBotPlay(qi);
}
function mpWriteAns(ok,ms){
 var o={};o['ans/q'+MP.qi+'/'+MP.me]={ok:!!ok,ms:ok?ms:0};
 MP.ref.update(o);
}
function mpAnswer(c){
 if(locked||!act[c]||MP.answered||!target)return;
 if(c===target){
  var ms=Date.now()-MP.shownAt;
  locked=true;MP.answered=true;MP.myOk=true;$('mpgive').disabled=true;
  flash(c,'#16a34a',1200,true);mark(c,'ok');
  $('fb').className='ok';$('fb').textContent='Richtig! ('+mpSec(ms)+')';
  mpWriteAns(true,ms);
 }else{
  tries--;$('tr').textContent=tries;mark(c,'bad');flash(c,'#e5484d',700,false);
  if(tries<=0){
   locked=true;MP.answered=true;$('mpgive').disabled=true;
   $('fb').className='bad';$('fb').textContent='Falsch – das war '+nm(c)+'. Keine Versuche mehr, warte auf den anderen Spieler …';
   mpWriteAns(false,0);
  }else{
   $('fb').className='bad';$('fb').textContent='Falsch – das war '+nm(c)+'. Noch '+tries+(tries===1?' Versuch':' Versuche')+'.';
  }
 }
}
function mpGiveUp(){
 if(!MP.on||MP.answered||!target)return;
 locked=true;MP.answered=true;$('mpgive').disabled=true;tries=0;$('tr').textContent=0;
 $('fb').className='bad';$('fb').textContent='Aufgegeben – warte auf den anderen Spieler …';
 mpWriteAns(false,0);
}
function mpName(r,id){var p=r.players&&r.players[id];return p?p.name:'Mitspieler'}
function mpResult(r,res){
 MP.resShown=true;locked=true;$('mpgive').disabled=true;
 if(window.closeLens)try{closeLens(true)}catch(e){}
 if(res.w===MP.me){
  $('fb').className='ok';$('fb').textContent='Punkt für dich! ('+mpSec(res.ms)+')';
 }else if(res.w){
  $('fb').className='bad';
  $('fb').textContent=MP.myOk?('Richtig, aber '+mpName(r,res.w)+' war schneller ('+mpSec(res.ms)+'). Punkt für '+mpName(r,res.w)+'.'):
   ('Punkt für '+mpName(r,res.w)+' ('+mpSec(res.ms)+'). '+nm(target)+' blinkt jetzt.');
  if(!MP.myOk){zoomTo(target);blink(target)}
 }else{
  $('fb').className='bad';$('fb').textContent='Keiner hat '+nm(target)+' gefunden – es blinkt jetzt auf der Karte.';
  zoomTo(target);blink(target);
 }
}
function mpScore(r){
 var ps=mpPlayers(r),me=ps.filter(function(p){return p.id===MP.me})[0],ot=ps.filter(function(p){return p.id!==MP.me})[0];
 var h='';
 if(me)h+='<span class="me">'+mpEsc(me.name)+'</span> <b>'+me.score+'</b>';
 if(ot)h+=' : <b>'+ot.score+'</b> '+mpEsc(ot.name);
 $('mpsc').innerHTML=h;
}
function mpEnd(r){
 MP.endShown=true;clearTimeout(MP.botT);
 stopBlink();if(window.microReset)microReset();locked=true;target=null;
 var ps=mpPlayers(r),me=ps.filter(function(p){return p.id===MP.me})[0]||{score:0},ot=ps.filter(function(p){return p.id!==MP.me})[0];
 var t;
 if(!ot)t='Duell beendet.';
 else if(me.score>ot.score)t='Du hast gewonnen! 🏆';
 else if(me.score<ot.score)t=ot.name+' hat gewonnen.';
 else t='Unentschieden!';
 $('q').innerHTML='Duell vorbei';
 codes.forEach(function(c){paint(c)});try{fitSel()}catch(x){}
 $('fb').className='';$('fb').textContent='';
 var e=$('mpend');e.style.display='';
 e.innerHTML='<div class="big"></div><div class="sub"></div><div class="btns">'+(MP.host?'<button class="p" id="mpAgain">Revanche</button>':'')+'<button id="mpBack">Zurück zum Start</button></div>';
 e.querySelector('.big').textContent=t;
 e.querySelector('.sub').textContent=ot?('Endstand: '+me.name+' '+me.score+' : '+ot.score+' '+ot.name+(MP.host?'':' – '+mpName(r,r.host)+' kann eine Revanche starten.')):'';
 $('mainbtns').style.display='none';
 if($('mpAgain'))$('mpAgain').onclick=function(){$('mpend').style.display='none';mpStartGame()};
 $('mpBack').onclick=function(){mpLeave()};
}
function mpOpponentLeft(){
 if(MP.endShown)return;
 clearTimeout(MP.decT);clearTimeout(MP.qT);
 locked=true;stopBlink();
 $('fb').className='bad';$('fb').textContent='Dein Mitspieler hat das Duell verlassen.';
 var e=$('mpend');e.style.display='';
 e.innerHTML='<div class="btns"><button class="p" id="mpBack2">Zurück zum Start</button></div>';
 $('mainbtns').style.display='none';
 $('mpBack2').onclick=function(){mpLeave()};
}
function mpShowGone(msg){
 var wasOn=MP.on;mpCleanup();
 if(wasOn){
  $('q').textContent=msg;$('fb').className='bad';$('fb').textContent='';
  var e=$('mpend');e.style.display='';document.body.classList.add('mp');
  e.innerHTML='<div class="big"></div><div class="btns"><button class="p" id="mpBack3">Zurück zum Start</button></div>';
  e.querySelector('.big').textContent=msg;$('mainbtns').style.display='none';
  $('mpBack3').onclick=function(){$('mpend').style.display='none';document.body.classList.remove('mp');$('mainbtns').style.display='';buildMenu()};
 }else{
  mpPanel('A');$('mpAerr').textContent=msg;
 }
}

/* ---------- Spielleitung (läuft beim Ersteller) ---------- */
function mpHostTick(r){
 if(r.status!=='play')return;
 var qi=r.qi,key='q'+qi,res=r.res&&r.res[key],ps=mpPlayers(r);
 if(ps.length<2)return;
 if(res){
  if(MP.advFor!==qi){
   MP.advFor=qi;clearTimeout(MP.decT);clearTimeout(MP.qT);
   setTimeout(function(){
    var cur=MP.room;if(!cur||cur.status!=='play'||cur.qi!==qi||cur.game!==r.game)return;
    if(qi+1<(cur.order||[]).length)MP.ref.update({qi:qi+1});else MP.ref.update({status:'end'});
   },res.w?2200:3800);
  }
  return;
 }
 var ans=(r.ans&&r.ans[key])||{},oks=Object.keys(ans).filter(function(k){return ans[k]&&ans[k].ok});
 var all=ps.every(function(p){return ans[p.id]});
 if(MP.decFor!==qi){MP.decFor=qi;MP.decArmed=false;clearTimeout(MP.qT);
  MP.qT=setTimeout(function(){mpDecide(qi,r.game)},90000)}
 if(all)mpDecide(qi,r.game);
 else if(oks.length&&!MP.decArmed){MP.decArmed=true;clearTimeout(MP.decT);MP.decT=setTimeout(function(){mpDecide(qi,r.game)},900)}
}
function mpDecide(qi,game){
 var r=MP.room;if(!r||r.status!=='play'||r.qi!==qi||r.game!==game)return;
 var key='q'+qi;if(r.res&&r.res[key])return;
 var ans=(r.ans&&r.ans[key])||{},best=null;
 Object.keys(ans).forEach(function(k){var a=ans[k];if(a&&a.ok&&r.players&&r.players[k]&&(!best||a.ms<best.ms))best={w:k,ms:a.ms}});
 var up={};up['res/'+key]=best?{w:best.w,ms:best.ms}:{w:'',ms:0};
 if(best)up['players/'+best.w+'/score']=((r.players[best.w]&&r.players[best.w].score)||0)+1;
 MP.ref.update(up);
}

/* ---------- Testgegner ---------- */
function mpBotPlay(qi){
 var ok=Math.random()<0.6,delay=ok?2500+Math.random()*7000:7000+Math.random()*5000;
 MP.botT=setTimeout(function(){
  var r=MP.room;if(!r||r.status!=='play'||r.qi!==qi)return;
  var o={};o['ans/q'+qi+'/bot']={ok:ok,ms:ok?Math.round(delay):0};MP.ref.update(o);
 },delay);
}

/* ---------- Verlassen ---------- */
function mpCleanup(){
 clearTimeout(MP.decT);clearTimeout(MP.qT);clearTimeout(MP.botT);
 if(MP.ref&&MP.cb){try{MP.ref.off('value',MP.cb)}catch(e){}}
 if(MP.infoRef&&MP.infoCb){try{MP.infoRef.off('value',MP.infoCb)}catch(e){}}MP.infoCb=null;
 if(MP.meRef){try{MP.meRef.child('on').onDisconnect().cancel()}catch(e){}}MP.meRef=null;
 clearTimeout(MP.warnT);MP.warnT=0;if($('mpwarn'))$('mpwarn').style.display='none';
 MP.cb=null;MP.on=false;MP.room=null;MP.game=-1;MP.qi=-1;MP.decFor=-1;MP.advFor=-1;
 stopBlink();if(window.microReset)microReset();target=null;locked=false;
 $('mpend').style.display='none';
}
function mpLeave(){
 var ref=MP.ref,host=MP.host,me=MP.me,db=MP.db,code=MP.code;
 mpCleanup();
 try{
  if(ref){if(host)ref.remove();else if(db)db.ref('rooms/'+code+'/players/'+me).remove()}
 }catch(e){}
 MP.ref=null;
 document.body.classList.remove('mp');$('mainbtns').style.display='';
 mpPanel(null);buildMenu();
}
