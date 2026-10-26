'use strict';
const finderQuestions = {
  goal: { title: 'What would you like to study?', options: [
    ['culture', 'Grow consistent 3D models', 'Spheroids, organoids and 3D assays'],
    ['exchange', 'Explore how cells interact', 'Co-culture, exchange and porous interfaces'],
    ['oxygen', 'Measure oxygen in 3D cultures', 'Local oxygen dynamics and metabolism'],
    ['unsure', 'I’m still exploring', 'Help me find a starting point']
  ] },
  format: { title: 'Where will your model grow?', options: [
    ['insert', 'In a culture plate', 'Ready-to-use inserts'],
    ['film', 'In my own device', 'Films for microfluidics or custom integration'],
    ['unsure', 'I haven’t decided yet', 'Keep both formats open']
  ] },
  sensing: { title: 'Do you need oxygen measurements too?', options: [
    ['yes', 'Yes, oxygen is part of my question', 'I want a local oxygen readout'],
    ['no', 'No, I’m focusing on culture', 'Imaging, assays or cellular exchange'],
    ['unsure', 'I’d like to explore that', 'I need help deciding']
  ] },
  optics: { title: 'Have you planned your optical readout?', options: [
    ['ready', 'I have fluorescence equipment', 'Let’s check the optical configuration'],
    ['help', 'I need help with the readout', 'Let’s discuss suitable equipment'],
    ['unsure', 'I’m still planning the experiment', 'Keep the readout open for now']
  ] },
  stage: { title: 'Where are you in your research?', options: [
    ['model', 'I already have a cell model', 'I’m looking for the right culture format'],
    ['planning', 'I’m designing a new experiment', 'I’d like to discuss the possibilities'],
    ['unsure', 'I’m getting to know the platform', 'Show me what the variants can do']
  ] }
};
function finderQuestion(index, answers) {
  return finderQuestions[index === 0 ? 'goal' : index === 1 ? 'format' : answers[0] === 'oxygen' ? 'optics' : answers[0] === 'unsure' ? 'stage' : 'sensing'];
}
function recommendCaviSphere(answers) {
  if (!Array.isArray(answers) || answers.length !== 3 || answers.some((answer, i) => !finderQuestion(i, answers).options.some(option => option[0] === answer))) throw new Error('Complete all three questions with valid answers.');
  const [goal, format, detail] = answers;
  let product, title, reason, note, href;
  if (goal === 'oxygen' || (goal === 'culture' && detail === 'yes')) {
    product = 'SensoSphere'; title = 'SensoSphere';
    reason = 'Your question includes oxygen. SensoSphere brings an oxygen-sensitive layer into the microenvironment of your 3D culture.';
    note = detail === 'ready' ? 'Your fluorescence equipment still needs a compatibility check. Excitation, detection and calibration must match the sensor and experiment.' : 'Suitable fluorescence optics or a dedicated reader are required. We’ll help you discuss the readout and calibration before choosing your setup.';
    href = 'platform.html#sensosphere';
  } else if (goal === 'exchange' && detail === 'yes') {
    product = 'Custom integration'; title = 'Let’s design your setup.';
    reason = 'You want both porous exchange and oxygen readout. That combination needs a configuration discussion before we can suggest a product.';
    note = 'PoroSphere supports porous exchange; SensoSphere supports optical oxygen measurement. This finder does not assume that both capabilities are available together in a standard product.';
    href = 'platform.html#compare';
  } else if (goal === 'exchange') {
    product = 'PoroSphere'; title = 'PoroSphere';
    reason = 'Your question centres on cellular exchange. Porous microcavities make PoroSphere a starting point for co-culture, permeability and integration into flow-based systems.';
    note = detail === 'unsure' ? 'You’re still considering oxygen measurement. Discuss that requirement with us before choosing a configuration; PoroSphere alone is not an oxygen sensor.' : 'The surrounding device provides flow control. Porosity, culture protocol and compatibility need to match your model.';
    href = 'platform.html#porosphere';
  } else if (goal === 'culture' && detail === 'no') {
    product = 'MicroSphere'; title = 'MicroSphere';
    reason = 'Your priority is a consistent 3D model. MicroSphere provides defined microcavities for spheroid formation, culture, imaging and assays.';
    note = 'Cavity geometry and the seeding protocol should be matched to your cells. The team can help you choose a starting configuration.';
    href = 'platform.html#microsphere';
  } else {
    product = 'CaviSphere'; title = goal === 'culture' ? 'Two directions to explore.' : 'Let’s start with your model.';
    reason = goal === 'culture' ? 'MicroSphere covers 3D culture and assays. SensoSphere adds local oxygen measurements. Your oxygen requirement will decide which path makes sense.' : 'Your answers leave the research goal open. Explore the variants with us before committing to a product.';
    note = goal === 'unsure' && detail === 'model' ? 'Bring your cell type, current protocol and desired readout to the conversation.' : 'This is an orientation, not a confirmed product configuration. We’ll help clarify the cell model and readout you need.';
    href = 'platform.html#compare';
  }
  const formatLabel = format === 'insert' ? 'Your preferred format: inserts' : format === 'film' ? 'Your preferred format: integration films' : 'Format still open: inserts or films';
  const summary = answers.map((a,i) => finderQuestion(i,answers).options.find(o=>o[0]===a)[1]);
  const context = 'My CaviSphere finder choices:\n' + summary.map((a,i)=>`${i+1}. ${a}`).join('\n') + '\n\nSuggested starting point: ' + product + '. Please confirm the appropriate configuration.';
  return { product, title, reason, note, href, variant: product === 'SensoSphere' ? 'senso' : product === 'PoroSphere' ? 'poro' : 'micro', modelFormat: format === 'film' ? 'film' : 'insert', formatLabel, summary, context };
}
const finderStage = document.querySelector('#finder-stage');
let finderAnswers = [], finderStep = -1, finderBusy = false;
const finderBack = document.querySelector('#finder-back');
const finderRestart = document.querySelector('#finder-restart');
const finderProgress = document.querySelector('#finder-progress');
function finderScene() {
  const goal = finderAnswers[0] || 'neutral';
  const scene = finderStep === 3 ? (recommendCaviSphere(finderAnswers).product === 'SensoSphere' ? 'oxygen' : goal) : goal;
  document.dispatchEvent(new CustomEvent('cavigen:scene', {detail:{scene,format:finderAnswers[1]}}));
}
function renderFinder() {
  CaviModels.unmount(finderStage);
  finderProgress.textContent = finderStep < 3 ? `Question ${finderStep + 1} of 3` : 'Your starting point';
  document.querySelector('.finder-progress-track i').style.width = `${finderStep < 3 ? (finderStep + 1) / 3 * 100 : 100}%`;
  finderBack.hidden = finderStep === 0;
  finderRestart.hidden = false;
  if (finderStep < 3) {
    const question = finderQuestion(finderStep, finderAnswers);
    finderStage.innerHTML = `<h2 tabindex="-1">${question.title}</h2><div class="finder-options">${question.options.map(([value,label,description])=>`<button type="button" class="finder-option" data-answer="${value}" aria-pressed="${finderAnswers[finderStep] === value}"><span>${label}<small>${description}</small></span><b aria-hidden="true">↗</b></button>`).join('')}</div>`;
  } else {
    const r = recommendCaviSphere(finderAnswers);
    finderStage.innerHTML = `<div class="finder-result"><h2 tabindex="-1" class="result-name">${r.title}</h2><p>${r.reason}</p><figure class="result-model"><div class="cavi-model" data-cavi-model="${r.variant}" data-format="${r.modelFormat}" role="img" aria-label="Simplified ${r.product} ${r.modelFormat} illustration"><img class="model-fallback" src="assets/cavi-${r.modelFormat}-${r.variant}.jpg" width="700" height="700" alt="Illustrative microcavity array"></div><figcaption>Illustrative model · configuration to be confirmed</figcaption></figure><h3 class="result-format">${r.formatLabel}</h3><p class="result-note">${r.note}</p><div class="result-actions"><a class="button" data-inquiry="${r.product}" href="${makeInquiry(r.product, r.context)}">Discuss my setup <span aria-hidden="true">↗</span></a><a class="text-link" href="${r.href}">Explore the details →</a></div><details class="answer-summary"><summary>Your answers</summary><ul>${r.summary.map(a=>`<li>${a}</li>`).join('')}</ul></details></div>`;
    finderStage.querySelector('[data-inquiry]').dataset.context = r.context;
  }
  CaviModels.mount(finderStage);
  finderScene();
  finderStage.querySelector('h2').focus({preventScroll:true});
  if (window.matchMedia('(max-width: 700px)').matches) document.querySelector('.finder-content').scrollIntoView({behavior: document.documentElement.classList.contains('motion-paused') ? 'instant' : 'smooth', block:'start'});
}
async function moveFinder(next) {
  if (finderBusy) return;
  finderBusy = true;
  if (!document.documentElement.classList.contains('motion-paused')) {
    finderStage.classList.remove('finder-enter');
    const animation = finderStage.animate([{opacity:1, transform:'translateY(0)', filter:'blur(0)'},{opacity:0,transform:'translateY(-14px)',filter:'blur(7px)'}], {duration:180,easing:'ease-in',fill:'forwards'});
    await animation.finished.catch(()=>{});
    animation.cancel();
  }
  finderStep = next;
  renderFinder();
  finderStage.classList.remove('finder-enter');
  void finderStage.offsetWidth;
  finderStage.classList.add('finder-enter');
  finderBusy = false;
}
document.querySelector('#finder-start').addEventListener('click',()=>moveFinder(0));
finderStage.addEventListener('click', event=>{
  const button=event.target.closest('[data-answer]');
  if (!button || finderBusy) return;
  const value=button.dataset.answer;
  if (!finderQuestion(finderStep,finderAnswers).options.some(o=>o[0]===value)) return;
  if (finderAnswers[finderStep] !== value) finderAnswers.splice(finderStep+1);
  finderAnswers[finderStep]=value;
  button.setAttribute('aria-pressed','true');
  moveFinder(finderStep+1);
});
finderBack.addEventListener('click',()=>{if(finderStep>0) moveFinder(finderStep-1);});
finderRestart.addEventListener('click',()=>{if(!finderBusy){finderAnswers=[];moveFinder(0);}});
