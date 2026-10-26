const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(0, source.indexOf('const header =')), context);
function url(product, text) { return new URL(context.makeInquiry(product, text)); }
for (const product of ['CaviSphere','MicroSphere','PoroSphere','SensoSphere','Custom integration']) {
  const result = url(product, '  O₂ & test?\nA+B #café  ');
  assert.equal(result.protocol, 'mailto:');
  assert.equal(result.pathname, 'info@cavigen.eu');
  assert.equal(result.searchParams.get('subject'), product + ' enquiry');
  assert.ok(result.searchParams.get('body').includes('O₂ & test?\nA+B #café'));
  assert.equal([...result.searchParams.keys()].length, 2);
}
assert.equal(url('bad\r\nBcc:elsewhere@example.com', 'hello').searchParams.get('subject'), 'CaviSphere enquiry');
assert.ok(!url('MicroSphere', '  ').searchParams.get('body').includes('My model'));
assert.ok(url('MicroSphere', 'x'.repeat(3000)).searchParams.get('body').includes('x'.repeat(2000)));
assert.ok(!url('MicroSphere', 'x'.repeat(3000)).searchParams.get('body').includes('x'.repeat(2001)));
console.log('PASS: mail recipient, product validation, Unicode, URL encoding and input limits.');
