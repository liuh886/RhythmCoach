import { stripDeliveryMarkup } from '../domain/deliveryMarkup.js';
import type { ScriptMaterial } from './materials.js';

function createMaterial(id: string, title: string, deliveryMarkup: string, tip: string): ScriptMaterial {
  return {
    id,
    title,
    content: stripDeliveryMarkup(deliveryMarkup),
    deliveryMarkup,
    tip
  };
}

export const chineseExtraMaterials: ScriptMaterial[] = [
  createMaterial(
    'cantonese-common-phrases',
    '粤语常用语｜落楼饮茶',
    `朝早七点半，{/}阿朗落楼转个弯。{//}

见到陈姨，{/}先笑住讲：[[「早晨！」]]{/}陈姨问：[[「食咗未呀？」]]{/}阿朗答：[[「仲未呀，去饮茶先。」]]{b}

行到茶记门口，{/}伙计问：[[「几位呀？」]]{/}阿朗讲：[[「一位，唔该。」]]{//}坐低先发现挡住隔篱张凳，{/}佢即刻讲：[[「唔好意思，我移一移。」]]{b}

菠萝油上枱，{/}冻奶茶随后嚟。{/}阿朗食得急，{/}陈姨啱啱又行入嚟，{/}笑住提佢：[[「慢慢嚟，唔使急。」]]{//}阿朗点点头：[[「冇问题，今日得闲。」]]{b}

临走之前，{/}伙计问张单搞掂未。{/}阿朗举起收据：[[「搞掂晒，多谢！」]]{//}出门撞见陈姨，{/}两个人挥挥手：[[「得闲饮茶，下次见！」]]{b}

早晨先问好，{/}唔该挂嘴边；{/}唔好意思唔怕讲，{/}慢慢嚟更自然。{//}冇问题，搞掂晒，{/}得闲饮茶再见面。`,
    '练习重点：先把“早晨、食咗未、唔该、唔好意思、冇问题、慢慢嚟、搞掂晒、得闲饮茶”读顺，再按聊天语气讲完整个小故事。粤语重在口语节奏，不要逐字用普通话腔去念。'
  ),
  createMaterial(
    'nursery-boat-rhythm',
    '童谣节奏｜小船',
    `[[小船儿荡起双桨……]]{//}

风从湖面轻轻响，{/}小鸭排队过桥旁。{/}左一桨，右一桨，{/}笑声跟着水纹晃。{b}

云在头顶慢慢逛，{/}树影落在船舷上。{/}前一弯，后一弯，{/}小船摇成月牙样。{b}

太阳躲进金波浪，{/}晚风把小帽吹歪晃。{/}收好桨，靠好岸，{/}今天的故事明天讲。`,
    '练习重点：用轻快、自然的童谣节奏读，保持每两句一个小拍点；不要追求快，重点是句尾韵脚清楚、气息不断。'
  )
];
