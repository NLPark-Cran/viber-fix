/**
 * 核心启发式函数单元测试:从 inspector.js 提取纯逻辑函数,用合成元素验证
 * 运行: node test/heuristics.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'extension', 'content', 'inspector.js'), 'utf8');

function extractFn(name) {
  const start = src.indexOf('function ' + name);
  assert(start >= 0, '找不到函数 ' + name);
  // 从函数头开始,匹配大括号配对
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    if (src[j] === '}') depth--;
    if (depth === 0) {
      return new Function('return ' + src.slice(start, j + 1))();
    }
  }
  throw new Error('括号不匹配: ' + name);
}

const guessElementRole = extractFn('guessElementRole');
const guessRegionRole = extractFn('guessRegionRole');
const buildSelector = extractFn('buildSelector');

/* ---------- Node 环境 stub ---------- */
global.document = { documentElement: {} };
global.window = { innerWidth: 1280, innerHeight: 800 };

/* ---------- 合成元素工厂 ---------- */
function el(tag, cls, rect, extra = {}) {
  const classList = (cls || '').split(/\s+/).filter(Boolean);
  return {
    tagName: tag,
    className: cls || '',
    id: extra.id || '',
    classList,
    nodeType: 1,
    parentElement: extra.parent || null,
    children: extra.children || [],
    getBoundingClientRect: () => rect,
    ...extra,
  };
}

const VW = 1280, VH = 800;

/* ---------- guessElementRole ---------- */
assert.strictEqual(guessElementRole(el('ASIDE', '', {})), 'sidebar');
assert.strictEqual(guessElementRole(el('NAV', '', {})), 'navbar');
assert.strictEqual(guessElementRole(el('FOOTER', '', {})), 'footer');
assert.strictEqual(guessElementRole(el('ARTICLE', '', {})), 'article');
assert.strictEqual(guessElementRole(el('BUTTON', '', {})), 'button');
assert.strictEqual(guessElementRole(el('DIV', 'sidebar-left', {})), 'sidebar');
assert.strictEqual(guessElementRole(el('DIV', 'main-nav', {})), 'navbar');
assert.strictEqual(guessElementRole(el('DIV', 'hero-banner', {})), 'banner');
assert.strictEqual(guessElementRole(el('DIV', 'product-card', {})), 'card');
assert.strictEqual(guessElementRole(el('DIV', 'whatever', {})), 'region');
console.log('✓ guessElementRole 全部通过');

/* ---------- guessRegionRole ---------- */
// 左侧竖条 → sidebar
assert.strictEqual(
  guessRegionRole({ left: 0, right: 260, top: 60, bottom: 780, width: 260, height: 720 }, []),
  'sidebar'
);
// 右侧竖条 → sidebar
assert.strictEqual(
  guessRegionRole({ left: 1020, right: 1280, top: 60, bottom: 780, width: 260, height: 720 }, []),
  'sidebar'
);
// 顶部横条 → navbar
assert.strictEqual(
  guessRegionRole({ left: 0, right: 1280, top: 0, bottom: 64, width: 1280, height: 64 }, []),
  'navbar'
);
// 底部横条 → footer
assert.strictEqual(
  guessRegionRole({ left: 0, right: 1280, top: 740, bottom: 800, width: 1280, height: 60 }, []),
  'footer'
);
// 3 个等大卡片 → cardlist
const cardRects = [
  { left: 40, right: 420, top: 100, bottom: 300, width: 380, height: 200 },
  { left: 450, right: 830, top: 100, bottom: 300, width: 380, height: 200 },
  { left: 860, right: 1240, top: 100, bottom: 300, width: 380, height: 200 },
];
const cards = cardRects.map((r) => el('DIV', 'card', r));
assert.strictEqual(
  guessRegionRole({ left: 0, right: 1280, top: 80, bottom: 320, width: 1280, height: 240 }, cards),
  'cardlist'
);
// 中部大块首屏 → banner
assert.strictEqual(
  guessRegionRole({ left: 0, right: 1280, top: 60, bottom: 400, width: 1280, height: 340 }, []),
  'banner'
);
// 其他 → region
assert.strictEqual(
  guessRegionRole({ left: 400, right: 700, top: 300, bottom: 500, width: 300, height: 200 }, []),
  'region'
);
console.log('✓ guessRegionRole 全部通过');

/* ---------- buildSelector ---------- */
// 有 id → #id
assert.strictEqual(buildSelector(el('DIV', 'x', {}, { id: 'app' })), '#app');

// class 路径
const grand = el('DIV', 'layout', {});
const parent = el('SECTION', 'cards grid', {}, { parent: grand });
const child = el('DIV', 'card active-item', {}, { parent });
assert.strictEqual(buildSelector(child), 'div.layout > section.cards.grid > div.card.active-item');

// 同标签兄弟 → nth-of-type
const p2 = el('UL', 'list', {});
const li1 = el('LI', 'item', {}, { parent: p2 });
const li2 = el('LI', 'item', {}, { parent: p2 });
const li3 = el('LI', 'item', {}, { parent: p2 });
p2.children = [li1, li2, li3];
assert.strictEqual(buildSelector(li2), 'ul.list > li.item:nth-of-type(2)');
console.log('✓ buildSelector 全部通过');

console.log('\n全部启发式测试通过 ✔');
