import { getCuratedMaterials, localizePracticeTip } from '../src/components/localizedMaterials.js';

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

const englishMaterials = getCuratedMaterials('en');
const chineseMaterials = getCuratedMaterials('zh');

expect(englishMaterials.length >= 6, 'English interface has a substantial English short-reading library');
expect(chineseMaterials.length > englishMaterials.length, 'Chinese interface keeps its broader Chinese practice library');
expect(
  englishMaterials.every((material) => !/[\u3400-\u9fff]/u.test(`${material.title}${material.content}${material.tip ?? ''}`)),
  'English curated materials contain no Chinese text'
);
expect(
  englishMaterials.every((material) => !/平翘舌|舌位|普通话/u.test(`${material.title}${material.content}${material.tip ?? ''}`)),
  'English materials do not expose Chinese articulation drills'
);
expect(
  chineseMaterials.some((material) => material.id === 'cantonese-common-phrases' && material.title.includes('粤语常用语')),
  'Chinese library includes the Cantonese common-phrases story'
);
expect(
  chineseMaterials.some((material) => material.id === 'nursery-boat-rhythm' && material.title.includes('童谣节奏')),
  'Chinese library includes the nursery-rhythm exercise'
);
expect(
  localizePracticeTip('练习重点：不要煽情；把它当成分享一个自己真正认可的观察。', 'en')
    === 'Practice focus: avoid sounding dramatic. Share it as an observation you genuinely believe.',
  'Persisted Chinese practice tip is localized in the English interface'
);

console.log('localized material tests passed');
