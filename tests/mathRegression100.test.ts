import assert from 'node:assert/strict';
import { calculateExpression } from '../src/engine/mathEngine';

type TestCase = [string, number] | [string, number, 'DEG' | 'RAD' | 'GRAD'];

const cases: TestCase[] = [
['1+1',2],['2+3',5],['10-7',3],['6*7',42],['81/9',9],['2^10',1024],['3^4',81],['144^0.5',12],['0.1+0.2',0.3],['5*(2+3)',25],
['2(3+4)',14],['3sin(30)',1.5],['sin(0)',0],['sin(90)',1],['cos(0)',1],['cos(180)',-1],['tan(45)',1],['sqrt(49)',7],['root(27,3)',3],['log(100)',2],
['ln(e)',1],['abs(-9)',9],['floor(3.9)',3],['ceil(3.1)',4],['round(3.5)',4],['ncr(5,2)',10],['npr(5,2)',20],['factorial(5)',120],['2^3^2',512],['(2+3)*4',20],
['10%3',1],['20/4+3',8],['20/(4+1)',4],['2+3*4',14],['(2+3)*4',20],['7-2-1',4],['8/2/2',2],['2^-3',0.125],['4^0',1],['9^1',9],
['pi',Math.PI],['e',Math.E],['sin(pi/2)',1,'RAD'],['cos(pi)',-1,'RAD'],['tan(pi/4)',1,'RAD'],['sqrt(2)^2',2],['abs(-3.5)',3.5],['10^3',1000],['10^-2',0.01],['1000*0.001',1],
['2+2+2+2',8],['3*3*3',27],['100-25-25',50],['100/10/2',5],['(8-3)^2',25],['(12+8)/4',5],['2*(5-2)^3',54],['(1+2)*(3+4)',21],['18/(3*2)',3],['5+(-2)',3],
['-5+8',3],['-5*-2',10],['(-3)^2',9],['(-3)^3',-27],['1/4',0.25],['3/8',0.375],['7/2',3.5],['12.5+7.5',20],['0.5*0.2',0.1],['1.5^2',2.25],
['2.5+2.5',5],['9.9-0.9',9],['0.25*4',1],['0.75/0.25',3],['1000+250',1250],['1500-750',750],['25*40',1000],['5000/100',50],['2^5',32],['5^3',125],
['sqrt(121)',11],['sqrt(144)',12],['sqrt(225)',15],['root(64,3)',4],['root(16,4)',2],['log(1000)',3],['log(10000)',4],['ln(1)',0],['exp(1)',Math.E],['exp(0)',1],
['sin(30)',0.5],['cos(60)',0.5],['tan(30)',Math.tan(Math.PI/6)],['sin(90)',1],['cos(90)',0],['sin(180)',0],['cos(180)',-1],['tan(0)',0],['sin(45)',Math.SQRT1_2],['cos(45)',Math.SQRT1_2],
];

for (const item of cases) {
  const [expression, expected, angleMode] = item;
  const result = calculateExpression(expression, angleMode);
  assert.equal(result.error, undefined, expression);
  assert.ok(Math.abs(result.value - expected) < 1e-9, `${expression}: ${result.value} != ${expected}`);
}
assert.ok(cases.length >= 100);
console.log(`100+ math regression cases passed: ${cases.length}`);
