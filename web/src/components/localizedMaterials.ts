import type { Language } from '../types.js';
import { stripDeliveryMarkup } from '../domain/deliveryMarkup.js';
import { chineseExtraMaterials } from './chineseExtraMaterials.js';
import { defaultMaterials, type ScriptMaterial } from './materials.js';

function createEnglishMaterial(id: string, title: string, deliveryMarkup: string, tip: string): ScriptMaterial {
  return {
    id,
    title,
    content: stripDeliveryMarkup(deliveryMarkup),
    deliveryMarkup,
    tip
  };
}

const englishMaterials: ScriptMaterial[] = [
  createEnglishMaterial(
    'en-start-with-the-point',
    'Start with the point',
    `Have you noticed that the more we try to [[explain everything]], the harder it can be for someone to follow?{//}

The problem is often not a lack of detail.{/}It is that the listener does not yet know [[what the detail is for]].{b}

Imagine someone asks why a project is late.{/}You could begin with resources, suppliers, and process.{//}A clearer opening is: [[The project is late because one critical condition was never locked down.]]{b}

Now the listener has a frame for everything that follows.{//}

Good communication is not about unloading every fact.{/}It is about giving people [[an entrance to the idea]].`,
    'Practice focus: keep the opening conversational, then slow down slightly for the one-sentence conclusion.'
  ),
  createEnglishMaterial(
    'en-sound-natural-on-script',
    'Sound natural on script',
    `A script should help you remember the point.{/}It should not make you sound as if you are reading a document.{//}

Before you record, identify three things:{/}the sentence that opens the topic,{/}the example that makes it real,{/}and the line you want the listener to remember.{b}

Read the opening exactly once.{//}Then look away from the text and explain the example in your own words.{//}

When you return to the closing line, [[say it to one person]], not to an anonymous audience.`,
    'Practice focus: treat the middle paragraph as an outline, not a passage that must be read word for word.'
  ),
  createEnglishMaterial(
    'en-quiet-morning',
    'A quiet morning',
    `The city is different before most people wake.{//}

A delivery bike passes through the pale light.{/}A café lifts its shutters.{/}Someone waters a row of plants on a balcony three floors above the street.{b}

Nothing remarkable is happening,{/}and that is exactly why the morning feels generous.{//}For a few minutes, there is no rush to explain the day or improve it.{b}

You can simply notice the cool air,{/}the first cup being poured,{/}and the soft sound of a place [[becoming itself again]].`,
    'Practice focus: keep the pace unhurried. Let each concrete image land before moving to the next one.'
  ),
  createEnglishMaterial(
    'en-last-train-home',
    'The last train home',
    `On the last train home, people become quieter.{//}

Phones dim.{/}Conversations shorten.{/}The windows turn into mirrors, carrying tired faces over tunnels and empty platforms.{b}

At every stop, a few passengers stand and disappear into the night.{//}The carriage grows lighter, but somehow more intimate.{b}

You begin to notice small things:{/}a worker holding a paper bag of dinner,{/}a student asleep against a backpack,{/}a stranger moving aside so someone else can sit.{//}

By the time your station arrives, the day feels less like a list of tasks and more like [[a story finally finding its ending]].`,
    'Practice focus: use a low, reflective tone and make the final sentence feel earned rather than dramatic.'
  ),
  createEnglishMaterial(
    'en-small-courage',
    'Small acts of courage',
    `Courage is easy to imagine as something loud.{/}A speech.{/}A leap.{/}A decision everyone can see.{//}

But most courage is much smaller.{b}

It is asking a question when everyone else seems certain.{/}It is saying “I was wrong” before someone forces you to.{/}It is beginning again after an ordinary disappointment.{b}

These moments do not look heroic from the outside.{//}Often, nobody notices them at all.{b}

Still, they change the direction of a day,{/}and sometimes the direction of a life.{//}That may be enough: [[not fearless, just willing to move while fear is still there]].`,
    'Practice focus: build contrast between the loud image of courage and the quieter examples that follow.'
  ),
  createEnglishMaterial(
    'en-after-rain',
    'After the rain',
    `After the rain, the familiar street looks newly made.{//}

The pavement holds pieces of the sky.{/}Leaves shine at their edges.{/}Cars move slowly through shallow water, making brief silver fans beside the curb.{b}

People step around puddles with the careful concentration of children.{//}For a moment, everyone is paying attention to where they place their feet.{b}

Then the clouds break.{/}A little sunlight reaches the buildings.{/}The whole street seems to exhale.{//}

Nothing has really changed,{/}but the world feels clean enough to [[begin one more time]].`,
    'Practice focus: use gentle variation in pace; slightly brighten the tone when the sunlight appears.'
  )
];

const englishTipByChineseTip: Record<string, string> = {
  '先慢读带标记的目标字，再按正常语速讲完整故事。平舌音标在字下，翘舌音标在字上；鼠标悬停可查看舌位提示。': 'Practice focus: read the marked sounds slowly first, then tell the full story at a natural pace.',
  '练习重点：“你有没有发现”“我后来发现”“比如”要像真实聊天，不要刻意加重每个字。': 'Practice focus: make the conversational phrases sound like real speech instead of stressing every word.',
  '练习重点：最后一句放慢，像在总结自己真实形成的工作习惯。': 'Practice focus: slow down for the final sentence and make it sound like a genuine professional habit.',
  '练习重点：把“预算谁来批？风险谁来承担？”读成连续追问，而非并列念清单。': 'Practice focus: deliver the two questions as a connected line of inquiry, not as a flat checklist.',
  '练习重点：“每个人都没有错”前后各停顿半秒，让语气更有理解感。': 'Practice focus: pause briefly before and after “no one is wrong” to make the tone more understanding.',
  '练习重点：不要煽情；把它当成分享一个自己真正认可的观察。': 'Practice focus: avoid sounding dramatic. Share it as an observation you genuinely believe.',
  '练习重点：三连问要有递进感，最后一句不要“喊口号”，轻一点收尾。': 'Practice focus: build momentum across the three questions, then finish the final sentence lightly.',
  '练习重点：最后两句像对同事沟通，不像演讲结尾。': 'Practice focus: deliver the final two sentences as a conversation with a colleague, not a speech ending.',
  '练习重点：画面感来自“通勤方式、吃饭时间、公共空间”这三个细节，适当放慢。': 'Practice focus: slow down around the three concrete details so the listener can picture the scene.',
  '练习重点：对“不是谁被替代，而是什么样的工作方式”做明显对比停顿。': 'Practice focus: use a clear contrast pause between “who gets replaced” and “which ways of working stop making sense.”',
  '练习重点：最后两句放松收尾，不要把“更自然一点”读成口号。': 'Practice focus: relax through the final two sentences and do not turn “a little more natural” into a slogan.'
};

export function getCuratedMaterials(language: Language): ScriptMaterial[] {
  return language === 'zh' ? [...chineseExtraMaterials, ...defaultMaterials] : englishMaterials;
}

export function localizePracticeTip(tip: string, language: Language): string {
  if (!tip || language === 'zh') return tip;
  return englishTipByChineseTip[tip] ?? tip;
}
