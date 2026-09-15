(function(){
const link=document.createElement('link');
link.rel='stylesheet';
link.href='article-avatar.css?v=20260915-4';
document.head.appendChild(link);

const box=document.createElement('div');
box.id='paperAvatarWidget';
box.innerHTML='<div class="avatar-bubble"><div class="avatar-chip">Explicação guiada</div><div class="avatar-title">Resumo do artigo</div><p class="avatar-text">Olá! Eu sou a Rayana virtual. Ative a voz e eu vou explicando o artigo à medida que você desce a página.</p><div class="avatar-status">Áudio desligado. O texto já acompanha a rolagem.</div><div class="voice-row"><label for="rayanaVoiceSelect">Voz feminina</label><select id="rayanaVoiceSelect" class="voice-select"><option>Carregando vozes...</option></select></div><div class="avatar-controls"><button class="primary voice" type="button">Ativar voz</button><button class="test" type="button">Testar voz</button><button class="replay" type="button">Repetir</button><button class="min" type="button">Minimizar</button></div></div><div class="avatar-wrap"><div class="avatar-glow"></div><img class="avatar-img" src="avatar-rayana.svg?v=20260915-4" alt="Avatar ilustrado de Rayana Schneider"></div>';
document.body.appendChild(box);

const title=box.querySelector('.avatar-title');
const text=box.querySelector('.avatar-text');
const status=box.querySelector('.avatar-status');
const voiceBtn=box.querySelector('.voice');
const testBtn=box.querySelector('.test');
const replayBtn=box.querySelector('.replay');
const minBtn=box.querySelector('.min');
const voiceSelect=box.querySelector('.voice-select');

const items=[
{match:'abstract',title:'Resumo do artigo',text:'Neste artigo eu parto do trabalho de Farina e proponho quatro melhorias para o MPC de controle de tensão em redes de média tensão com geração distribuída. A ideia é tornar o controlador mais robusto, mais suave e mais informativo.'},
{match:'I. Introduction',title:'Introdução',text:'Aqui eu contextualizo o problema. Com mais geração distribuída, o perfil de tensão varia bastante e o controle passa a depender de coordenação entre geração reativa e o OLTC.'},
{match:'II. Baseline',title:'MPC original',text:'Nesta seção eu resumo o controlador original. Ele usa um modelo FIR por resposta ao impulso para prever as tensões futuras e resolver um problema de otimização quadrática em horizonte deslizante.'},
{match:'III. Enhanced',title:'As quatro melhorias',text:'Aqui começa a proposta nova: banco de modelos com gain scheduling, penalização da variação dos comandos, folgas individuais por nó e um supervisor do OLTC baseado na redução prevista das violações.'},
{match:'A. Scheduled',title:'Melhoria 1: gain scheduling',text:'Em vez de usar para sempre um único modelo identificado em um ponto de operação, o controlador escolhe entre diferentes modelos FIR conforme o regime da rede. Isso reduz o erro de predição quando carga e geração mudam.'},
{match:'B. Input-rate',title:'Melhoria 2: comandos mais suaves',text:'Eu penalizo a variação do fator de potência e imponho um limite para a velocidade de mudança do comando. Assim, o MPC evita oscilações e movimentos agressivos.'},
{match:'C. Node-wise',title:'Melhoria 3: folgas por nó',text:'Cada tensão controlada passa a ter uma folga superior e outra inferior. Dessa forma o controlador sabe exatamente em qual nó está a violação, em vez de misturar tudo em duas folgas globais.'},
{match:'D. Predictive',title:'Melhoria 4: OLTC mais inteligente',text:'O supervisor do OLTC avalia qual direção de tap reduz mais a violação prevista de tensão, mantendo um tempo mínimo entre comutações para evitar desgaste mecânico.'},
{match:'IV. Reproducible',title:'Estudo comparativo',text:'Como o artigo original não publica todas as matrizes do modelo identificado, eu uso um benchmark FIR reproduzível com as mesmas dimensões e os principais parâmetros do trabalho de referência.'},
{match:'V. Results',title:'Resultados',text:'Os resultados mostram redução de vinte e um vírgula seis por cento na violação máxima, quarenta vírgula dois por cento na violação acumulada e uma redução ainda maior nos saltos do fator de potência.'},
{match:'VI. Discussion',title:'Discussão e limitações',text:'O principal limite é importante: estes números vêm de um benchmark substituto, não de uma reprodução exata da rede italiana usada no artigo original. A comparação serve para isolar o efeito das melhorias no controlador.'},
{match:'VII. Conclusions',title:'Conclusões',text:'Em resumo, as melhorias preservam a estrutura simples do MPC por resposta ao impulso, mas tornam o método mais robusto a mudanças de operação, com restrições mais informativas e comandos mais suaves.'}
];

let voiceOn=false;
let current=items[0];
let last='';
let selectedVoice=null;
let availableVoices=[];

function normalize(s){return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function headings(){return Array.from(document.querySelectorAll('h2,h3'))}
function active(){const hs=headings();let found=items[0];const pivot=window.innerHeight*.34;hs.forEach(h=>{if(h.getBoundingClientRect().top<=pivot){const s=items.find(i=>h.textContent.trim().startsWith(i.match));if(s)found=s}});return found}
function setItem(it,say){current=it;title.textContent=it.title;text.textContent=it.text;if(say&&voiceOn&&last!==it.title){last=it.title;speak(it.text)}}

function femaleScore(v){
  const name=normalize((v.name||'')+' '+(v.voiceURI||''));
  const lang=normalize(v.lang||'');
  const female=['francisca','maria','luciana','joana','helena','fernanda','camila','leticia','vitoria','isabela','female','feminina','google portugues do brasil'];
  const male=['antonio','donato','daniel','felipe','fabio','julio','nicolau','paulo','ricardo','thiago','male','masculino'];
  let score=0;
  if(lang.startsWith('pt-br'))score+=200;else if(lang.startsWith('pt'))score+=80;
  if(female.some(n=>name.includes(normalize(n))))score+=1000;
  if(name.includes('google')&&lang.startsWith('pt-br'))score+=700;
  if(/natural|neural|premium|enhanced/.test(name))score+=60;
  if(male.some(n=>name.includes(normalize(n))))score-=2000;
  return score;
}

function refreshVoices(){
  if(!('speechSynthesis' in window))return;
  availableVoices=speechSynthesis.getVoices().filter(v=>/^pt/i.test(v.lang||''));
  if(!availableVoices.length){availableVoices=speechSynthesis.getVoices()}
  availableVoices.sort((a,b)=>femaleScore(b)-femaleScore(a));
  voiceSelect.innerHTML='';
  availableVoices.forEach((v,i)=>{
    const o=document.createElement('option');
    o.value=String(i);
    o.textContent=(v.name||'Voz')+(v.lang?' · '+v.lang:'');
    voiceSelect.appendChild(o);
  });
  const saved=localStorage.getItem('rayanaAvatarVoiceName');
  let idx=-1;
  if(saved)idx=availableVoices.findIndex(v=>v.name===saved);
  if(idx<0){idx=availableVoices.findIndex(v=>femaleScore(v)>=900)}
  if(idx<0&&availableVoices.length)idx=0;
  if(idx>=0){voiceSelect.value=String(idx);selectedVoice=availableVoices[idx]}
  if(voiceOn&&selectedVoice)status.textContent='Voz selecionada: '+selectedVoice.name+' · '+selectedVoice.lang+'.';
}

voiceSelect.addEventListener('change',()=>{
  const i=Number(voiceSelect.value);
  selectedVoice=availableVoices[i]||null;
  if(selectedVoice){localStorage.setItem('rayanaAvatarVoiceName',selectedVoice.name);status.textContent='Voz selecionada: '+selectedVoice.name+' · '+selectedVoice.lang+'.'}
  stop();
});

function stop(){if('speechSynthesis'in window)speechSynthesis.cancel();box.classList.remove('speaking')}
function speak(t){
  if(!voiceOn||!('speechSynthesis'in window)||!selectedVoice)return;
  stop();
  const u=new SpeechSynthesisUtterance(t);
  u.voice=selectedVoice;
  u.lang=selectedVoice.lang||'pt-BR';
  u.rate=.96;
  u.pitch=1.05;
  u.volume=1;
  u.onstart=()=>{box.classList.add('speaking');status.textContent='Falando com: '+selectedVoice.name+' · '+selectedVoice.lang+'.'};
  u.onend=()=>box.classList.remove('speaking');
  u.onerror=()=>box.classList.remove('speaking');
  speechSynthesis.speak(u);
}

voiceBtn.addEventListener('click',()=>{
  voiceOn=!voiceOn;
  if(voiceOn){
    refreshVoices();
    voiceBtn.textContent='Desativar voz';
    if(selectedVoice){status.textContent='Voz selecionada: '+selectedVoice.name+' · '+selectedVoice.lang+'.';last='';setItem(active(),true)}
    else status.textContent='Nenhuma voz disponível neste navegador.';
  }else{
    voiceBtn.textContent='Ativar voz';
    status.textContent='Áudio desligado. O texto continua acompanhando a rolagem.';
    stop();
  }
});

testBtn.addEventListener('click',()=>{
  refreshVoices();
  if(!selectedVoice){status.textContent='Nenhuma voz disponível neste navegador.';return}
  const wasOn=voiceOn;voiceOn=true;speak('Olá, eu sou a Rayana virtual. Esta é a voz selecionada para explicar o artigo.');voiceOn=wasOn||true;
});

replayBtn.addEventListener('click',()=>{if(voiceOn){last='';setItem(current,true)}});
minBtn.addEventListener('click',()=>{const m=box.classList.toggle('minimized');minBtn.textContent=m?'Expandir':'Minimizar';if(m)stop()});

if(!('speechSynthesis'in window)){
  voiceBtn.disabled=true;testBtn.disabled=true;replayBtn.disabled=true;voiceSelect.disabled=true;status.textContent='Seu navegador não oferece síntese de voz; o resumo em texto continua funcionando.';
}else{
  refreshVoices();
  speechSynthesis.onvoiceschanged=refreshVoices;
  setTimeout(refreshVoices,300);
  setTimeout(refreshVoices,1200);
}

let ticking=false;
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{const a=active();if(a.title!==current.title)setItem(a,voiceOn);ticking=false});ticking=true}},{passive:true});
addEventListener('beforeunload',stop);
setItem(active(),false);
})();