import { getCuratedMaterials, localizePracticeTip } from '../src/components/localizedMaterials.js';

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

const englishMaterials = getCuratedMaterials('en');
const chineseMaterials = getCuratedMaterials('zh');

expect(englishMaterials.length > 0, 'English interface has English curated materials');
expect(chineseMaterials.length > 0, 'Chinese interface keeps Chinese curated materials');
expect(
  englishMaterials.every((material) => !/[\u3400-\u9fff]/u.test(`${material.title}${material.content}${material.tip ?? ''}`)),
  'English curated materials contain no Chinese text'
);
expect(
  localizePracticeTip('练习重点：不要煽情；把它当成分享一个自己真正认可的观察。', 'en')
    === 'Practice focus: avoid sounding dramatic. Share it as an observation you genuinely believe.',
  'Persisted Chinese practice tip is localized in the English interface'
);

console.log('localized material tests passed');
