(function(){
const API_URL='https://etching-contact-barterer.ngrok-free.dev/chat';

const link=document.createElement('link');
link.rel='stylesheet';
link.href='article-avatar.css?v=20260917-1';
document.head.appendChild(link);

const box=document.createElement('div');
box.id='paperAvatarWidget';
box.innerHTML=`
  <div class="avatar-bubble">
    <div class="avatar-chip">Converse comigo</div>
    <div class="avatar-title">Resumo do artigo</div>
    <p class="avatar-text">Olá! Eu sou a Rayana virtual. Você pode me perguntar sobre o artigo digitando ou usando o microfone.</p>
    <div class="avatar-status">Pronta para conversar.</div>
    <div class="chat-row">
      <textarea class="chat-input" rows="2" placeholder="Digite sua pergunta..."></textarea>
      <button class="mic" type="button" title="Falar pelo microfone">🎤</button>
    </div>
    <div class="avatar-controls">
      <button class="primary send" type="button">Enviar</button>
      <button class="guide" type="button">Voltar ao guia</button>
      <button class="min" type="button">Minimizar</button>
    </div>
  </div>
  <div class="avatar-wrap" title="Clique para expandir">
    <div class="avatar-glow"></div>
    <img class="avatar-img" src="rayana.png.png?v=20260917-1" alt="Avatar ilustrado de Rayana Schneider">
  </div>`;
document.body.appendChild(box);

const title=box.querySelector('.avatar-title');
const text=box.querySelector('.avatar-text');
const status=box.querySelector('.avatar-status');
const input=box.querySelector('.chat-input');
const sendBtn=box.querySelector('.send');
const micBtn=box.querySelector('.mic');
const guideBtn=box.querySelector('.guide');
const minBtn=box.querySelector('.min');
const avatarWrap=box.querySelector('.avatar-wrap');

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

let current=items[0];
let conversationMode=false;
let busy=false;
let history=[];

function headings(){return Array.from(document.querySelectorAll('h2,h3'))}
function active(){
  const hs=headings();let found=items[0];const pivot=window.innerHeight*.34;
  hs.forEach(h=>{if(h.getBoundingClientRect().top<=pivot){const s=items.find(i=>h.textContent.trim().startsWith(i.match));if(s)found=s}});
  return found;
}
function setGuide(it){current=it;title.textContent=it.title;text.textContent=it.text;status.textContent='Você pode perguntar por texto ou microfone.'}
function compactHistory(){return history.slice(-6).map(x=>(x.role==='user'?'Visitante: ':'Rayana virtual: ')+x.content).join('\n')}

async function sendMessage(raw){
  const question=(raw||'').trim();
  if(!question||busy)return;
  conversationMode=true;busy=true;
  input.value='';
  sendBtn.disabled=true;micBtn.disabled=true;
  title.textContent='Conversando com o Qwen';
  text.textContent='Pensando na sua pergunta…';
  status.textContent='Consultando o modelo local da Rayana…';

  const previous=compactHistory();
  const payloadMessage=previous
    ? `Considere esta conversa anterior apenas como contexto:\n${previous}\n\nPergunta atual do visitante: ${question}`
    : question;

  try{
    const r=await fetch(API_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'ngrok-skip-browser-warning':'true'
      },
      body:JSON.stringify({message:payloadMessage})
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    const data=await r.json();
    const answer=(data.answer||'').trim()||'Não consegui gerar uma resposta agora.';
    history.push({role:'user',content:question},{role:'assistant',content:answer});
    title.textContent='Rayana virtual';
    text.textContent=answer;
    status.textContent='Resposta gerada pelo Qwen3-4B-Instruct-2507.';
  }catch(e){
    title.textContent='Não consegui conectar';
    text.textContent='O servidor local pode estar desligado ou o endereço do ngrok pode ter mudado.';
    status.textContent='Verifique LM Studio, Uvicorn e ngrok.';
    console.error(e);
  }finally{
    busy=false;sendBtn.disabled=false;micBtn.disabled=false;
  }
}

sendBtn.addEventListener('click',()=>sendMessage(input.value));
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input.value)}});

guideBtn.addEventListener('click',()=>{conversationMode=false;setGuide(active())});
minBtn.addEventListener('click',()=>{const m=box.classList.toggle('minimized');minBtn.textContent=m?'Expandir':'Minimizar'});
avatarWrap.addEventListener('click',()=>{if(box.classList.contains('minimized')){box.classList.remove('minimized');minBtn.textContent='Minimizar'}});

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
  const recognition=new SpeechRecognition();
  recognition.lang='pt-BR';
  recognition.interimResults=false;
  recognition.continuous=false;
  recognition.onstart=()=>{micBtn.classList.add('listening');status.textContent='Ouvindo… fale sua pergunta.'};
  recognition.onend=()=>micBtn.classList.remove('listening');
  recognition.onerror=e=>{micBtn.classList.remove('listening');status.textContent='Não consegui captar o áudio. Você pode digitar a pergunta.';console.warn(e)};
  recognition.onresult=e=>{const spoken=e.results[0][0].transcript;input.value=spoken;status.textContent='Entendi: '+spoken;sendMessage(spoken)};
  micBtn.addEventListener('click',()=>{try{recognition.start()}catch(e){console.warn(e)}});
}else{
  micBtn.disabled=true;
  micBtn.title='Reconhecimento de voz não disponível neste navegador';
}

let ticking=false;
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{if(!conversationMode){const a=active();if(a.title!==current.title)setGuide(a)}ticking=false});ticking=true}},{passive:true});
setGuide(active());
})();
