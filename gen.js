import fs from 'fs';
import path from 'path';
import * as lbClasses from './src/line-break.js';
import * as gbClasses from './src/grapheme-break.js';
import UnicodeTrieBuilder from 'unicode-trie/builder.js';
import {getTrie, encodeTrie} from './src/string-trie-encode.js';
import {URL} from 'url';

const __dirname = new URL('.', import.meta.url).pathname;

function writeTrie(filename, trie) {
  const buffer = trie.toBuffer();
  let src = '// generated from gen.js\n'
    + 'import UnicodeTrie from \'unicode-trie\';\n'
    + 'export default new UnicodeTrie(new Uint8Array([';
  for (let i = 0; i < buffer.length; ++i) {
    src += i > 0 ? ',' + buffer[i] : buffer[i];
  }
  src += ']));';
  fs.writeFileSync(filename, src);
}

async function generateLineBreakTrie() {
  const res = await fetch('http://www.unicode.org/Public/14.0.0/ucd/LineBreak.txt');
  if (res.status !== 200) throw new Error(res.status);
  const data = await res.text();
  const matches = data.match(/^[0-9A-F]+(\.\.[0-9A-F]+)?;[A-Z][A-Z0-9]([A-Z])?/gm);

  let start = null;
  let end = null;
  let type = null;
  const trie = new UnicodeTrieBuilder(lbClasses.XX, 0);

  // collect entries in the linebreaking table into ranges
  // to keep things smaller.
  for (let line of matches) {
    let rangeEnd, rangeType;
    const matches = line.split(/;|\.\./);
    const rangeStart = matches[0];

    if (matches.length === 3) {
      rangeEnd = matches[1];
      rangeType = matches[2];
    } else {
      rangeEnd = rangeStart;
      rangeType = matches[1];
    }

    if ((type != null) && (rangeType !== type)) {
      if (typeof lbClasses[type] !== 'number') {
        throw new Error(`Class ${type} not found; update line-break.ts?`);
      }
      trie.setRange(parseInt(start, 16), parseInt(end, 16), lbClasses[type], true);
      type = null;
    }

    if (type == null) {
      start = rangeStart;
      type = rangeType;
    }

    end = rangeEnd;
  }

  trie.setRange(parseInt(start, 16), parseInt(end, 16), lbClasses[type], true);
  
  writeTrie(path.join(__dirname, 'gen/line-break-trie.ts'), trie);
}

async function generateGraphemeBreakTrie() {
  const res = await fetch(`http://www.unicode.org/Public/8.0.0/ucd/auxiliary/GraphemeBreakProperty.txt`);
  if (res.status !== 200) throw new Error(res.status);
  const data = await res.text();
  let match;
  const re = /^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*([A-Za-z_]+)/gm;

  const trie = new UnicodeTrieBuilder(gbClasses.Other, 0);

  // collect entries in the table into ranges
  // to keep things smaller.
  while ((match = re.exec(data))) {
    const start = match[1];
    const end = match[2] != null ? match[2] : start;
    const type = match[3];
    if (typeof gbClasses[type] !== 'number') {
      throw new Error(`Class ${type} not found; update grapheme-break.ts?`);
    }

    trie.setRange(parseInt(start, 16), parseInt(end, 16), gbClasses[type]);
  }

  writeTrie(path.join(__dirname, 'gen/grapheme-break-trie.ts'), trie);
}

async function generateLangScriptDatabase() {
  // To update, clone fontconfig and ls fc-lang/*.orth
  const langs = ['aa', 'bg', 'co', 'fat', 'hif', 'ka', 'ky', 'mjw', 'nn', 'pt', 'shn', 'szl', 'ug', 'yuw', 'ab', 'bh', 'crh', 'ff', 'hne', 'kaa', 'la', 'mk', 'no', 'qu', 'shs', 'ta', 'uk', 'za', 'af', 'bhb', 'cs', 'fi', 'ho', 'kab', 'lah', 'ml', 'nqo', 'quz', 'si', 'tcy', 'und_zmth', 'zh_cn', 'agr', 'bho', 'csb', 'fil', 'hr', 'ki', 'lb', 'mn_cn', 'nr', 'raj', 'sid', 'te', 'und_zsye', 'zh_hk', 'ak', 'bi', 'cu', 'fj', 'hsb', 'kj', 'lez', 'mn_mn', 'nso', 'rif', 'sk', 'tg', 'unm', 'zh_mo', 'am', 'bin', 'cv', 'fo', 'ht', 'kk', 'lg', 'mni', 'nv', 'rm', 'sl', 'th', 'ur', 'zh_sg', 'an', 'bm', 'cy', 'fr', 'hu', 'kl', 'li', 'mnw', 'ny', 'rn', 'sm', 'the', 'uz', 'zh_tw', 'anp', 'bn', 'da', 'fur', 'hy', 'km', 'lij', 'mo', 'oc', 'ro', 'sma', 'ti_er', 've', 'zu', 'ar', 'bo', 'de', 'fy', 'hz', 'kn', 'ln', 'mr', 'om', 'ru', 'smj', 'ti_et', 'vi', 'as', 'br', 'doi', 'ga', 'ia', 'ko', 'lo', 'ms', 'or', 'rw', 'smn', 'tig', 'vo', 'ast', 'brx', 'dsb', 'gd', 'id', 'kok', 'lt', 'mt', 'os', 'sa', 'sms', 'tk', 'vot', 'av', 'bs', 'dv', 'gez', 'ie', 'kr', 'lv', 'my', 'ota', 'sah', 'sn', 'tl', 'wa', 'ay', 'bua', 'dz', 'gl', 'ig', 'ks', 'lzh', 'na', 'pa', 'sat', 'so', 'tn', 'wae', 'ayc', 'byn', 'ee', 'gn', 'ii', 'ku_am', 'mag', 'nan', 'pa_pk', 'sc', 'sq', 'to', 'wal', 'az_az', 'ca', 'el', 'gu', 'ik', 'ku_iq', 'mai', 'nb', 'pap_an', 'sco', 'sr', 'tpi', 'wen', 'az_ir', 'ce', 'en', 'gv', 'io', 'ku_ir', 'mfe', 'nds', 'pap_aw', 'sd', 'ss', 'tr', 'wo', 'ba', 'ch', 'eo', 'ha', 'is', 'ku_tr', 'mg', 'ne', 'pes', 'se', 'st', 'ts', 'xh', 'be', 'chm', 'es', 'hak', 'it', 'kum', 'mh', 'ng', 'pl', 'sel', 'su', 'tt', 'yap', 'bem', 'chr', 'et', 'haw', 'iu', 'kv', 'mhr', 'nhn', 'prs', 'sg', 'sv', 'tw', 'yi', 'ber_dz', 'ckb', 'eu', 'he', 'ja', 'kw', 'mi', 'niu', 'ps_af', 'sgs', 'sw', 'ty', 'yo', 'ber_ma', 'cmn', 'fa', 'hi', 'jv', 'kwm', 'miq', 'nl', 'ps_pk', 'sh', 'syr', 'tyv', 'yue'];

  fs.writeFileSync(
    path.join(__dirname, 'gen/lang-script-coverage.ts'),
    `export default ${JSON.stringify(langs)};\n`
  );

  /** @type {Map<string, ([number] | [number, number])[]>} */
  const orths = new Map();
  /** @type {Map<string, string[]>} */
  const dependencies = new Map();

  let errors = 0;
  console.log('Rebuilding gen/lang-script-database.cc...');
  for (const lang of langs) {
    const url = `https://gitlab.freedesktop.org/fontconfig/fontconfig/-/raw/main/fc-lang/${lang}.orth`;
    console.log(url);
    let errored = false;
    let res;

    try {
      res = await fetch(url);
    } catch (e) {
      console.log(`==> Fetch error: ${e.message}`);
      errors += 1;
      errored = true;
    }

    if (res.status !== 200) {
      console.log(`==> Got ${res.status}`);
      errors += 1;
      errored = true;
    }

    if (errored) {
      if (errors > 5) {
        console.log('==> Too many errors, quitting');
        process.exit();
      } else {
        console.log('==> Continuing anyways');
        continue;
      }
    }

    const text = await res.text();
    const rStartToComment = /^([^#]+)/;
    const rSingleCodepoint = /[0-9A-Fa-f]{4}/;
    const rCodepointRange = /([0-9A-Fa-f]{4})-([0-9A-Fa-f]{4})/;
    const rInclude = /include ([^.]+).orth/;
    /** @type {([string] | [string, string])[]} */
    const langOrths = [];
    const langDeps = [];

    let nRanges = 0;
    let nSingle = 0;
    let nIncludes = 0;

    for (const line of text.split('\n')) {
      const untilCommentMatch = rStartToComment.exec(line);

      if (untilCommentMatch) {
        const [, untilComment] = untilCommentMatch;
        const codepointRangeMatch = rCodepointRange.exec(untilComment);

        if (codepointRangeMatch) {
          const [, start, end] = codepointRangeMatch;
          langOrths.push([parseInt(start, 16), parseInt(end, 16)]);
          nRanges += 1;
          continue;
        }

        const singleCodepointMatch = rSingleCodepoint.exec(untilComment);

        if (singleCodepointMatch) {
          const [codepoint] = singleCodepointMatch;
          langOrths.push([parseInt(codepoint, 16)]);
          nSingle += 1;
          continue;
        }

        const includeMatch = rInclude.exec(untilComment);

        if (includeMatch) {
          const [, dependsOn] = includeMatch;
          langDeps.push(dependsOn);
          nIncludes += 1;
        }
      }
    }

    console.log(`==> ${nRanges} range(s), ${nSingle} single codepoints, ${nIncludes} includes`);

    orths.set(lang, langOrths);
    dependencies.set(lang, langDeps);

    // Seems curteous
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * @param {number[][]} ranges
   */
  function toFlatUtf16Array(ranges) {
    const ret = [];
    for (const range of ranges) {
      for (const num of range) {
        for (let s = String.fromCodePoint(num), i = 0; i < s.length; i++) {
          ret.push(s.charCodeAt(i));
        }
      }
    }
    return ret;
  }

  let c = `// generated by gen.js
#include "../../harfbuzz/src/hb.h"
#include <unordered_map>
#include <vector>
#include <unordered_set>

#define U16_SURROGATE_OFFSET ((0xd800<<10UL)+0xdc00-0x10000)
#define U16_GET_SUPPLEMENTARY(lead, trail) \\
  (((int32_t)(lead)<<10UL)+(int32_t)(trail)-U16_SURROGATE_OFFSET)
#define U16_IS_LEAD(c) (((c)&0xfffffc00)==0xd800)
#define U16_IS_TRAIL(c) (((c)&0xfffffc00)==0xdc00)
#define U16_NEXT(s, i, length, c) do { \\
  (c)=(s)[(i)++]; \\
  if(U16_IS_LEAD(c)) { \\
    uint16_t __c2; \\
    if((i)!=(length) && U16_IS_TRAIL(__c2=(s)[(i)])) { \\
      ++(i); \\
      (c)=U16_GET_SUPPLEMENTARY((c), __c2); \\
    } \\
  } \\
} while (0)

`;

  for (const [lang, ranges] of orths) {
    const range1s = toFlatUtf16Array(ranges.filter(r => r.length === 1));
    const range2s = toFlatUtf16Array(ranges.filter(r => r.length === 2));
    c += `static uint16_t lcov_${lang}_1[] = {${range1s.join(', ')}};\n`;
    c += `static int32_t lcov_${lang}_1_length = ${range1s.length};\n`;
    c += `static uint16_t lcov_${lang}_2[] = {${range2s.join(', ')}};\n`;
    c += `static int32_t lcov_${lang}_2_length = ${range2s.length};\n`;
  }

  c += `
static void fill_set(
  hb_set_t* set,
  uint16_t* lcov_1,
  int32_t lcov_1_length,
  uint16_t* lcov_2,
  int32_t lcov_2_length
) {
  int32_t c = 0;
  int32_t i = 0;
  while (i < lcov_1_length) {
    U16_NEXT(lcov_1, i, lcov_1_length, c);
    hb_set_add(set, c);
  }

  int32_t c1 = 0;
  int32_t c2 = 0;
  i = 0;
  while (i < lcov_2_length) {
    U16_NEXT(lcov_2, i, lcov_2_length, c1);
    U16_NEXT(lcov_2, i, lcov_2_length, c2);
    hb_set_add_range(set, c1, c2);
  }
}

`;

  for (const [lang] of orths) {
    c += `__attribute__((used)) hb_set_t* ${lang}_coverage;\n`;
  }

  c += '__attribute__((export_name("lang_script_database_init")))\n';
  c += 'void lang_script_database_init() {\n';
  for (const [lang] of orths) {
    c += `  ${lang}_coverage = hb_set_create();\n`;
    c += `  fill_set(
    ${lang}_coverage,
    lcov_${lang}_1,
    lcov_${lang}_1_length,
    lcov_${lang}_2,
    lcov_${lang}_2_length
  );
`;
  }
  c += `
  std::unordered_set<hb_set_t*> seen;
  std::vector<hb_set_t*> stack = {${[...dependencies.keys()].map(l => l + '_coverage').join(', ')}};
  std::unordered_map<hb_set_t*, std::vector<hb_set_t*>> dependencies = {\n`;

  for (const [name, langs] of dependencies) {
    const vector = `{${langs.map(lang => lang + '_coverage').join(', ')}}`;
    c += `    {${name + '_coverage'}, ${vector}},\n`
  }

  c += '  };\n';

  c += `
  while (stack.size()) {
    hb_set_t* lang = stack.back();
    std::vector<hb_set_t*> depends_on_langs = dependencies[lang];
    bool processed = seen.find(lang) != seen.end() || depends_on_langs.size() == 0;

    stack.pop_back();
    seen.insert(lang);

    if (processed) {
      for (hb_set_t* depends_on : depends_on_langs) {
        hb_set_union(lang, depends_on);
      }
    } else {
      stack.push_back(lang);
      for (hb_set_t* depends_on : depends_on_langs) {
        stack.push_back(depends_on);
      }
    }
  }
}
`;

  fs.writeFileSync(path.join(__dirname, 'gen/lang-script-database.cc'), c);
}

async function generateEntityTrie() {
  const res = await fetch('https://html.spec.whatwg.org/entities.json');
  if (res.status !== 200) throw new Error(res.status);
  const resMap = JSON.parse(await res.text());
  const map = {};
  for (const key in resMap) map[key.slice(1)] = resMap[key].characters;
  console.log(`Generating ${Object.keys(map).length} entities...`);
  const encoded = encodeTrie(getTrie(map));
  const stringified = JSON.stringify(String.fromCharCode(...encoded))
    .replace(
        /[^\x20-\x7e]/g,
        (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`
    )
    .replace(/\\u0000/g, "\\0")
    .replace(/\\u00([\da-f]{2})/g, "\\x$1");

  // Write the encoded trie to disk
  fs.writeFileSync(
  path.join(__dirname, `gen/entity-trie.ts`),
  `// Generated from gen.js

export default new Uint16Array(
    ${stringified}
        .split("")
        .map((c) => c.charCodeAt(0))
);
`);
}

const fns = process.argv.slice(2).map(command => {
  if (command === 'line-break-trie') return generateLineBreakTrie;
  if (command === 'grapheme-break-trie') return generateGraphemeBreakTrie;
  if (command === 'lang-script-database') return generateLangScriptDatabase;
  if (command === 'entity-trie') return generateEntityTrie;
  console.error(`Usage: node gen.js (cmd )+
Available commands:
  line-break-trie
  grapheme-break-trie
  lang-script-database
  entity-trie`);
  process.exit(1);
});

for (const fn of fns) await fn();


