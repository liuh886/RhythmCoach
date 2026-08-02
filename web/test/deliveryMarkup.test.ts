import { isDeliveryMarkupAligned, parseDeliveryMarkup, stripDeliveryMarkup } from '../src/domain/deliveryMarkup.js';
import { defaultMaterials } from '../src/components/materials.js';

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

const sample = '先说[[结论]]。{/}再解释原因。{//}{b}最后收尾。';
const tokens = parseDeliveryMarkup(sample);
expect(stripDeliveryMarkup(sample) === '先说结论。再解释原因。最后收尾。', 'Markup stripping preserves spoken text');
expect(tokens.some((token) => token.kind === 'text' && token.emphasis && token.text === '结论'), 'Emphasis token is parsed');
expect(tokens.some((token) => token.kind === 'cue' && token.cue === 'short-pause'), 'Short pause is parsed');
expect(tokens.some((token) => token.kind === 'cue' && token.cue === 'long-pause'), 'Long pause is parsed');
expect(tokens.some((token) => token.kind === 'cue' && token.cue === 'breath'), 'Breath cue is parsed');
expect(isDeliveryMarkupAligned(sample, '先说结论。再解释原因。最后收尾。'), 'Aligned markup is accepted');
expect(!isDeliveryMarkupAligned(sample, '正文已经被编辑'), 'Edited text invalidates markup');

expect(defaultMaterials.length === 11, 'All curated materials remain available');
defaultMaterials.forEach((material) => {
  expect(Boolean(material.deliveryMarkup), `${material.title}: delivery markup exists`);
  expect(isDeliveryMarkupAligned(material.deliveryMarkup, material.content), `${material.title}: markup matches visible content`);
  expect(!material.content.includes('[[') && !material.content.includes('{/}'), `${material.title}: raw markers stay hidden`);
});

const specialtyStory = defaultMaterials.find((material) => material.id === 'flat-retroflex-story');
expect(Boolean(specialtyStory), 'Flat-retroflex specialty story is available');
if (specialtyStory) {
  ['组织', '自治', '四十', '十四', '杂志', '暂时', '宗旨', '素质', '搜索', '支持', '事实'].forEach((term) => {
    expect(specialtyStory.content.includes(term), `Specialty story includes ${term}`);
  });
  expect(
    specialtyStory.deliveryMarkup?.includes('[[四]]{/}{b}') === true,
    'Flat-tongue targets use the lower marker sequence'
  );
  expect(
    specialtyStory.deliveryMarkup?.includes('[[十]]{//}{b}') === true,
    'Retroflex targets use the upper marker sequence'
  );
}

console.log('deliveryMarkup tests passed');
