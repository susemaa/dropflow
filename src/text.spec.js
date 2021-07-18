//@ts-check
const {expect} = require('chai');
const {Area} = require('./box');
const {generateBlockContainer, layoutBlockBox} = require('./flow');
const {initialStyle, createComputedStyle} = require('./cascade');
const {HTMLElement} = require('./node');
const {parseNodes} = require('./parser');
const {Run, Collapser, createLineboxes} = require('./text');
const HarfBuzzInit = require('harfbuzzjs');
const FontConfigInit = require('fontconfig');
const ItemizerInit = require('itemizer');

const rootStyle = createComputedStyle(initialStyle, {
  fontSize: 16,
  fontFamily: ['Helvetica'],
  fontWeight: 300,
  whiteSpace: 'normal',
  tabSize: {value: 8, unit: null},
  lineHeight: {value: 1.6, unit: null},
  position: 'static',
  height: {value: 100, unit: '%'},
  writingMode: 'horizontal-tb',
  display: {
    outer: 'block',
    inner: 'flow-root'
  }
});

describe('Text Module', function () {
  describe('Run', function () {
    it('throws on a setRange that doesn\'t make sense', function () {
      expect(() => new Run('').setRange(0, '')).to.throw();
      expect(() => new Run('').setRange('', '')).to.throw();
      expect(() => new Run('').setRange(5, 5)).to.throw();
      expect(() => new Run('hello').setRange(-1, 4)).to.throw();
      expect(() => new Run('test').setRange(0, 1)).to.throw();
      expect(() => new Run('xxxxxx').setRange(1, 10)).to.throw();
    });

    it('shifts', function () {
      const t1 = new Run('Hello');
      t1.setRange(0, 4);
      t1.shift(-2);
      expect(t1.start).to.equal(2);
      expect(t1.end).to.equal(6);

      const t2 = new Run('Hello');
      t2.setRange(0, 4);
      t2.shift(2);
      expect(t2.start).to.equal(-2);
      expect(t2.end).to.equal(2);
    });

    it('mod() removes a character', function () {
      const t1 = new Run('Hello');
      t1.setRange(0, 4);
      t1.mod(2, 2, '');
      expect(t1.text).to.equal('Helo');
      expect(t1.start).to.equal(0);
      expect(t1.end).to.equal(3);
    });

    it('mod() removes characters', function () {
      const t1 = new Run('Hello');
      t1.setRange(0, 4);
      t1.mod(1, 3, '');
      expect(t1.text).to.equal('Ho');
      expect(t1.start).to.equal(0);
      expect(t1.end).to.equal(1);
    });

    it('mod() replaces characters', function () {
      const t1 = new Run('Hello');
      t1.setRange(0, 4);
      t1.mod(2, 2, 'aron');
      expect(t1.text).to.equal('Hearonlo');
      expect(t1.start).to.equal(0);
      expect(t1.end).to.equal(7);
    });

    it('mod() handles start < text.i < end', function () {
      const t1 = new Run('texty');
      t1.setRange(5, 9);
      t1.mod(2, 6, 's');
      expect(t1.text).to.equal('sxty');
      expect(t1.start).to.equal(5);
      expect(t1.end).to.equal(8);
    });

    it('mod() handles start < text.end < j', function () {
      const t1 = new Run('texty');
      t1.setRange(5, 9);
      t1.mod(8, 10, 'y');
      expect(t1.text).to.equal('texy');
      expect(t1.start).to.equal(5);
      expect(t1.end).to.equal(8);
    });
  });

  describe('Collapser', function () {
    it('throws an error if buf doesn\'t match the texts', function () {
      const [r1, r2] = [new Run('a'), new Run('b')];
      r1.setRange(0, 0);
      r2.setRange(1, 1);

      const [r3, r4] = [new Run('text'), new Run('musmatch')];
      r3.setRange(0, 3);
      r4.setRange(4, 11);

      expect(() => new Collapser('xxyy', [])).to.throw();
      expect(() => new Collapser('', [r1, r2])).to.throw();
      expect(() => new Collapser('text mismatch', [r3, r4])).to.throw();
    });

    describe('mod()', function () {
      it('replaces text', function () {
        const t = new Run('Lorem ipsum');
        t.setRange(0, 10);
        const c = new Collapser('Lorem ipsum', [t]);
        c.mod(6, 10, 'lorem');
        expect(c.buf).to.equal('Lorem lorem');
        expect(t.start).to.equal(0);
        expect(t.end).to.equal(10);
        expect(t.text).to.equal('Lorem lorem');
      });

      it('replaces text when the boundaries are in the middle of 2 texts', function () {
        const t1 = new Run('This is my');
        const t2 = new Run(' theme song');
        t1.setRange(0, 9);
        t2.setRange(10, 20);
        const c = new Collapser('This is my theme song', [t1, t2]);
        c.mod(8, 15, 'not my');
        expect(c.buf).to.equal('This is not my song')
        expect(t1.start).to.equal(0);
        expect(t1.end).to.equal(13);
        expect(t1.text).to.equal('This is not my');
        expect(t2.start).to.equal(14);
        expect(t2.end).to.equal(18);
        expect(t2.text).to.equal(' song');
      });

      it('replaces with empty text', function () {
        const t = new Run('Lorem ipsum');
        t.setRange(0, 10);
        const c = new Collapser('Lorem ipsum', [t]);
        c.mod(3, 4, '');
        expect(c.buf).to.equal('Lor ipsum');
        expect(t.text).to.equal('Lor ipsum');
        expect(t.start).to.equal(0);
        expect(t.end).to.equal(8);
      });

      it('replaces with empty text when the boundaries are in the middle of 2 texts', function () {
        const t1 = new Run('This is my');
        const t2 = new Run(' theme song');
        t1.setRange(0, 9);
        t2.setRange(10, 20);
        const c = new Collapser('This is my theme song', [t1, t2]);
        c.mod(8, 16, '');
        expect(c.buf).to.equal('This is song')
        expect(t1.start).to.equal(0);
        expect(t1.end).to.equal(7);
        expect(t1.text).to.equal('This is ');
        expect(t2.start).to.equal(8);
        expect(t2.end).to.equal(11);
        expect(t2.text).to.equal('song');
      });
    });

    describe('collapse', function () {
      it('collapses whitespace', function () {
        const t1 = new Run('  \there\n', {whiteSpace: 'normal'});
        const t2 = new Run('\t\t  I  go killin  ', {whiteSpace: 'nowrap'});
        const t3 = new Run('  \n\t\n\t  again  ', {whiteSpace: 'normal'});

        t1.setRange(0, 7);
        t2.setRange(8, 25);
        t3.setRange(26, 40);

        const c = new Collapser('  \there\n\t\t  I  go killin    \n\t\n\t  again  ', [t1, t2, t3]);
        c.collapse();
        expect(c.buf).to.equal(' here I go killin again ');
      });

      it('preserves newlines', function () {
        const t1 = new Run('  \there\n', {whiteSpace: 'pre-line'});
        const t2 = new Run('\t\t  I  go killin  ', {whiteSpace: 'nowrap'});
        const t3 = new Run('  \n\t\n\t  again  ', {whiteSpace: 'normal'});

        t1.setRange(0, 7);
        t2.setRange(8, 25);
        t3.setRange(26, 40);

        const c = new Collapser('  \there\n\t\t  I  go killin    \n\t\n\t  again  ', [t1, t2, t3]);
        c.collapse();
        expect(c.buf).to.equal(' here\nI go killin again ');
      });

      it('preserves everything', function () {
        const t1 = new Run('  \there\n', {whiteSpace: 'pre'});
        const t2 = new Run('\t\t  I  go killin  ', {whiteSpace: 'pre'});
        const t3 = new Run('  \n\t\n\t  again  ', {whiteSpace: 'pre'});

        t1.setRange(0, 7);
        t2.setRange(8, 25);
        t3.setRange(26, 40);

        const c = new Collapser('  \there\n\t\t  I  go killin    \n\t\n\t  again  ', [t1, t2, t3]);
        c.collapse();
        expect(c.buf).to.equal('  \there\n\t\t  I  go killin    \n\t\n\t  again  ');
      });

      it('preserves parts', function () {
        const t1 = new Run('  \there\n', {whiteSpace: 'normal'});
        const t2 = new Run('\t\t  I  go killin  ', {whiteSpace: 'normal'});
        const t3 = new Run('  \n\t\n\t  again  ', {whiteSpace: 'pre'});

        t1.setRange(0, 7);
        t2.setRange(8, 25);
        t3.setRange(26, 40);

        const c = new Collapser('  \there\n\t\t  I  go killin    \n\t\n\t  again  ', [t1, t2, t3]);
        c.collapse();
        expect(c.buf).to.equal(' here I go killin   \n\t\n\t  again  ');
      });
    });
  });
});

async function setupLayoutTests() {
  const [hb, itemizer, FontConfig] = await Promise.all([HarfBuzzInit, ItemizerInit, FontConfigInit]);
  const cfg = new FontConfig();

  await Promise.all([
    cfg.addFont('assets/Arimo/Arimo-Regular.ttf'),
    cfg.addFont('assets/Noto/NotoSansCJKsc-Regular.otf'),
    cfg.addFont('assets/Noto/NotoSansCJKjp-Regular.otf'),
    cfg.addFont('assets/Noto/NotoSansCJKtc-Regular.otf'),
    cfg.addFont('assets/Noto/NotoSansCJKkr-Regular.otf'),
    cfg.addFont('assets/Noto/NotoSansHebrew-Medium.ttf'),
    cfg.addFont('assets/Noto/NotoSansCherokee-Regular.ttf'),
    cfg.addFont('assets/Ramabhadra/Ramabhadra-Regular.ttf'),
    cfg.addFont('assets/Cairo/Cairo-Regular.ttf'),
    cfg.addFont('assets/Roboto/Roboto-Regular.ttf')
  ]);

  this.layout = async function (html) {
    const logging = {text: new Set([])};
    this.initialContainingBlock = new Area('', 0, 0, 300, 500);
    this.rootElement = new HTMLElement('root', 'root', rootStyle);
    parseNodes(this.rootElement, html);
    this.blockContainer = generateBlockContainer(this.rootElement);
    if (!this.blockContainer.isBlockBox()) throw new Error('wat');
    await this.blockContainer.preprocess({fcfg: cfg, itemizer, hb, logging});
    layoutBlockBox(this.blockContainer, {
      lastBlockContainerArea: this.initialContainingBlock,
      lastPositionedArea: this.initialContainingBlock,
      bfcWritingMode: rootStyle.writingMode,
      bfcStack: [],
      hb,
      logging
    });
    this.blockContainer.setBlockPosition(0, rootStyle.writingMode);
    this.blockContainer.absolutify();
    this.get = function (...args) {
      /** @type import('./box').Box */
      let ret = this.blockContainer;
      while (args.length) ret = ret.children[args.shift()];
      return ret;
    };
  };
}

function logIfFailed() {
  if (this.currentTest.state == 'failed') {
    let indent = 0, t = this.currentTest;
    while (t = t.parent) indent += 1;
    console.log('  '.repeat(indent) + "Box tree:");
    console.log(this.currentTest.ctx.blockContainer.repr(indent));
  }
}

describe('Shaping', function () {
  before(setupLayoutTests);
  afterEach(logIfFailed);

  describe('Boundaries', function () {
    it('splits shaping boundaries on fonts', async function () {
      await this.layout(`
        <span style="font: 12px Arimo;">Arimo</span>
        <span style="font: 12px Roboto;">Roboto</span>
      `);
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(5);
    });

    it('splits shaping boundaries on font-size', async function () {
      await this.layout(`
        <span style="font-size: 12px;">a</span>
        <span style="font-size: 13px;">b</span>
      `);
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(5);
    });

    it('does not split shaping boundaries on line-height', async function () {
      await this.layout(`
        <span style="line-height: 3;">Left</span>
        <span style="line-height: 4;">Right</span>
      `);
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(1);
    });

    it('splits shaping boundaries based on script', async function () {
      await this.layout('Lorem Ipusm העמוד');
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(2);
      expect(inline.shaped[0].face).to.equal(inline.shaped[1].face);
    });

    it('splits shaping boundaries based on emoji', async function () {
      await this.layout('Hey 😃 emoji are kinda hard 🦷');
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(4);
    });
  });

  describe('Fallbacks', function () {
    it('falls back on diacritic é', async function () {
      await this.layout('<span style="font: 12px/1 Ramabhadra;">xe\u0301</span>');
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(2);
      expect(inline.shaped[0].glyphs.length).to.satisfy(l => l > 0);
      expect(inline.shaped[1].glyphs.length).to.satisfy(l => l > 0);
      expect(inline.shaped[1].glyphs.map(g => g.g)).not.to.have.members([0]);
      expect(inline.shaped[0].face).not.to.equal(inline.shaped[1].face);
    });

    it('sums to the same string with many reshapes', async function () {
      await this.layout('Lorem大併外بينᏣᎳᎩ');
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      let s = '';
      for (const item of inline.shaped) s += item.text;
      expect(s).to.equal('Lorem大併外بينᏣᎳᎩ');
    });

    it('falls back to tofu', async function () {
      await this.layout('\uffff');
      /** @type import('./flow').IfcInline[] */
      const [inline] = this.get().children;
      expect(inline.shaped).to.have.lengthOf(1);
      expect(inline.shaped[0].glyphs).to.have.lengthOf(1);
      expect(inline.shaped[0].glyphs[0].g).to.equal(0);
    });
  });
});

describe('Line breaking', function () {
  before(setupLayoutTests);
  afterEach(logIfFailed);

  it('always puts one word per line at minimum', async function () {
    await this.layout('<div style="width: 0;">eat lots of peaches</div>');
    const [inline] = this.get(0).children;
    expect(inline.lineboxes).to.have.lengthOf(4);
    expect(inline.lineboxes[0].start).to.equal(0);
    expect(inline.lineboxes[1].start).to.equal(4);
    expect(inline.lineboxes[2].start).to.equal(9);
    expect(inline.lineboxes[3].start).to.equal(12);
  });

  it('skips whitespace at the beginning of the line if it\'s collapsible', async function () {
    await this.layout('<div>  hey</div>');
    const [inline] = this.get(0).children;
    expect(inline.lineboxes[0].start).to.equal(1); // (remember these indices are
    expect(inline.lineboxes[0].end).to.equal(4);   // post whitespace collapsing)
  });

  it('keeps whitespace at the beginning of the line when it\'s not collapsible', async function () {
    await this.layout('<div style="white-space: pre;">  hey</div>');
    const [inline] = this.get(0).children;
    expect(inline.lineboxes[0].start).to.equal(0);
    expect(inline.lineboxes[0].end).to.equal(5);
  });

  it('breaks between shaping boundaries', async function () {
    await this.layout(`
      <div style="width: 100px; font: Roboto 16px;">
        Lorem ipsum <span style="font-size: 17px;">lorem ipsum</span>
      </div>
    `);
    /** @type import('./flow').IfcInline[] */
    const [inline] = this.get(0).children;
    expect(inline.lineboxes).to.have.lengthOf(2);
    expect(inline.lineboxes[0].end).to.equal(13);
    expect(inline.shaped).to.have.lengthOf(3);
  });

  it('breaks inside shaping boundaries', async function () {
    await this.layout(`
      <div style="width: 100px; font: Roboto 16px;">
        Lorem ipsum lorem ipsum
      </div>
    `);
    /** @type import('./flow').IfcInline[] */
    const [inline] = this.get(0).children;
    expect(inline.lineboxes).to.have.lengthOf(2);
    expect(inline.lineboxes[0].end).to.equal(13);
    expect(inline.shaped).to.have.lengthOf(2);
  });

  it('leaves shaping boundaries whole if they can be', async function () {
   await this.layout(`
    <div style="width: 16px; font: Roboto 16px;">
      <span style="line-height: 1;">lorem</span><span style="line-height: 2;">ipsum</span>
      <span style="color: green;">lorem</span><span style="color: purple;">ipsum</span>
    </div>
   `);
    /** @type import('./flow').IfcInline[] */
    const [inline] = this.get(0).children;
    expect(inline.shaped).to.have.lengthOf(2);
  });
});
