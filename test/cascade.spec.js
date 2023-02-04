//@ts-check

import {createComputedStyle, initialStyle, Style, inherited, initial} from '../src/cascade.js';
import {Area} from '../src/box.js';
import {BlockContainer} from '../src/flow.js';
import {expect} from 'chai';

describe('CSS Style', function () {
  it('calculates used value for border width', function () {
    const computed = createComputedStyle(initialStyle, {
      borderTopWidth: 1,
      borderTopStyle: 'none',
      borderRightWidth: 1,
      borderRightStyle: 'none',
      borderBottomWidth: 1,
      borderBottomStyle: 'none',
      borderLeftWidth: 1,
      borderLeftStyle: 'none'
    });

    const style = new Style(computed);
    const box = new BlockContainer(style, [], 0);
    box.containingBlock = new Area('a', style, 0, 0, 100, 100);

    expect(style.getBorderBlockStartWidth(box)).to.equal(0);
    expect(style.getBorderBlockEndWidth(box)).to.equal(0);
    expect(style.getBorderLineLeftWidth(box)).to.equal(0);
    expect(style.getBorderLineRightWidth(box)).to.equal(0);
  });

  it('calculates used values for percentages', function () {
    const computed = createComputedStyle(initialStyle, {
      paddingTop: {value: 50, unit: '%'},
      paddingRight: {value: 50, unit: '%'},
      paddingBottom: {value: 50, unit: '%'},
      paddingLeft: {value: 50, unit: '%'},
      width: {value: 50, unit: '%'},
      height: {value: 50, unit: '%'},
      marginTop: {value: 50, unit: '%'},
      marginRight: {value: 50, unit: '%'},
      marginBottom: {value: 50, unit: '%'},
      marginLeft: {value: 50, unit: '%'}
    });

    const style = new Style(computed);
    const box = new BlockContainer(style, [], 0);
    box.containingBlock = new Area('a', style, 0, 0, 100, 200);

    expect(style.getPaddingBlockStart(box)).to.equal(50);
    expect(style.getPaddingLineRight(box)).to.equal(50);
    expect(style.getPaddingBlockEnd(box)).to.equal(50);
    expect(style.getPaddingLineLeft(box)).to.equal(50);
    expect(style.getInlineSize(box)).to.equal(50);
    expect(style.getBlockSize(box)).to.equal(100);
    expect(style.getMarginBlockStart(box)).to.equal(50);
    expect(style.getMarginLineRight(box)).to.equal(50);
    expect(style.getMarginBlockEnd(box)).to.equal(50);
    expect(style.getMarginLineLeft(box)).to.equal(50);
  });

  it('normalizes border-box to content-box', function () {
    const computed = createComputedStyle(initialStyle, {
      width: 100,
      borderLeftWidth: 10,
      borderLeftStyle: 'solid',
      borderRightWidth: 10,
      borderRightStyle: 'solid',
      paddingRight: 10,
      paddingLeft: 10,
      boxSizing: 'border-box'
    });

    const style = new Style(computed);
    const box = new BlockContainer(style, [], 0);
    box.containingBlock = new Area('a', style, 0, 0, 100, 100);
    expect(style.getInlineSize(box)).to.equal(60);
  });

  it('normalizes padding-box to content-box', function () {
    const computed = createComputedStyle(initialStyle, {
      width: 100,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      paddingRight: 10,
      paddingLeft: 10,
      boxSizing: 'padding-box'
    });

    const style = new Style(computed);
    const box = new BlockContainer(style, [], 0);
    box.containingBlock = new Area('a', style, 0, 0, 100, 100);

    expect(style.getInlineSize(box)).to.equal(80);
  });

  it('computes unitless line-height', function () {
    const parentComputed = createComputedStyle(initialStyle, {fontSize: 10});
    const childComputed = createComputedStyle(parentComputed, {lineHeight: {value: 2, unit: null}});
    expect(childComputed.lineHeight).to.deep.equal({value: 2, unit: null});
  });

  it('computes line-height as a percentage', function () {
    const parentComputed = createComputedStyle(initialStyle, {fontSize: 50});
    const childComputed = createComputedStyle(parentComputed, {lineHeight: {value: 50, unit: '%'}});
    expect(childComputed.lineHeight).to.equal(25);
  });

  it('computes font-size as a percentage', function () {
    const parentComputed = createComputedStyle(initialStyle, {fontSize: 50});
    const childComputed = createComputedStyle(parentComputed, {fontSize: {value: 50, unit: '%'}});
    expect(childComputed.fontSize).to.equal(25);
  });

  it('computes font-weight: bolder', function () {
    const parentComputed = createComputedStyle(initialStyle, {fontWeight: 400});
    const childComputed = createComputedStyle(parentComputed, {fontWeight: 'bolder'});
    expect(childComputed.fontWeight).to.equal(700);
  });

  it('computes font-weight: lighter', function () {
    const parentComputed = createComputedStyle(initialStyle, {fontWeight: 400});
    const childComputed = createComputedStyle(parentComputed, {fontWeight: 'lighter'});
    expect(childComputed.fontWeight).to.equal(100);
  });

  it('supports the inherit keyword', function () {
    const parentComputed = createComputedStyle(initialStyle, {backgroundColor: {r: 200, g: 200, b: 200, a: 1}});
    const childComputed = createComputedStyle(parentComputed, {backgroundColor: inherited});
    expect(childComputed.backgroundColor).to.deep.equal({r: 200, g: 200, b: 200, a: 1});
  });

  it('supports the initial keyword', function () {
    const parentComputed = createComputedStyle(initialStyle, {color: {r: 200, g: 200, b: 200, a: 1}});
    const childComputed = createComputedStyle(parentComputed, {color: initial});
    expect(childComputed.color).to.deep.equal(initialStyle.color);
  });

  it('defaultifies correctly if the style has a zero', function () {
    expect(createComputedStyle(initialStyle, {width: 0}).width).to.equal(0);
  })
});