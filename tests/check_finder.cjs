const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../finder.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(0,source.indexOf('const finderStage')),context);
const recommend = a=>context.recommendCaviSphere(a);
assert.equal(recommend(['culture','insert','no']).product,'MicroSphere');
assert.equal(recommend(['culture','film','yes']).product,'SensoSphere');
assert.equal(recommend(['exchange','film','no']).product,'PoroSphere');
assert.equal(recommend(['exchange','insert','yes']).product,'Custom integration');
assert.equal(recommend(['exchange','unsure','unsure']).product,'PoroSphere');
assert.match(recommend(['exchange','film','unsure']).note,/not an oxygen sensor/);
assert.equal(recommend(['culture','insert','unsure']).product,'CaviSphere');
for(const optical of ['ready','help','unsure']) {
 assert.equal(recommend(['oxygen','insert',optical]).product,'SensoSphere');
 assert.match(recommend(['oxygen','film',optical]).note,/compatibility|optics/);
}
for(const stage of ['model','planning','unsure'])assert.equal(recommend(['unsure','unsure',stage]).product,'CaviSphere');
for(const bad of [[],['culture','insert'],['bad','insert','no'],['oxygen','insert','no'],['culture','film','ready'],['culture','<script>','yes'],null])assert.throws(()=>recommend(bad));
let routes=0;
for (const [goal] of context.finderQuestion(0,[]).options) {
 for(const [format] of context.finderQuestion(1,[goal]).options) {
  for(const [detail] of context.finderQuestion(2,[goal,format]).options) {
   const result=recommend([goal,format,detail]);
   assert.ok(result.context.includes(result.product));
   assert.equal(result.summary.length,3);
   assert.ok(result.formatLabel.includes(format==='film'?'films':format==='insert'?'inserts':'open'));
   const [file,fragment]=result.href.split('#');
   assert.ok(fs.readFileSync(path.join(__dirname,'..',file),'utf8').includes(`id="${fragment}"`));
   assert.ok(['micro','poro','senso'].includes(result.variant));
   assert.equal(result.modelFormat,format==='film'?'film':'insert');
   assert.ok(result.note.length>30);
   routes++;
  }
 }
}
assert.equal(routes,36);
console.log(`PASS: all ${routes} finder paths, uncertain answers, combined requirements, formats, optics and result links.`);
