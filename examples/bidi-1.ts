import * as oflo from '../src/api-with-parse.js';
import fs from 'fs';
import {registerFontAsset} from '../assets/register.js';
import {createCanvas} from 'canvas';

registerFontAsset('Cairo/Cairo-Regular.ttf');
registerFontAsset('Arimo/Arimo-Regular.ttf');

const rootElement = oflo.parse(`
  <div style="background-color: #ccc; direction: ltr; font-size: 14px; height: 100%;" x-overflow-log>
    abc<span style="background-color: red;">Hello</span>def
    <span style="background-color: green;">آلو</span>

    <span style="background-color: red;">What's your name?</span>:
    <span style="background-color: green;">ما اسمك</span>؟
  </div>
`);

rootElement.style.height = {value: 100, unit: '%'};
const blockContainer = oflo.generate(rootElement);

console.log(blockContainer.repr());

oflo.layout(blockContainer, 100, 125);

const canvas = createCanvas(200, 250);
const ctx = canvas.getContext('2d');
ctx.scale(2, 2);
oflo.paintToCanvas(blockContainer, ctx);
canvas.createPNGStream().pipe(fs.createWriteStream(new URL('bidi-1.png', import.meta.url)));
