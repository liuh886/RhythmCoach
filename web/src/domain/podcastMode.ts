import type { Language } from '../types';

export const DEFAULT_REHEARSAL_SCRIPT: Record<Language, string> = {
  zh: '大家好，欢迎来到节奏教练。\n\n在这里，你可以选择定时提词、语音跟随或播客训练。完成练习后，系统会保存本次会话，并与同一稿件的上一次练习进行比较。',
  en: 'Hello everyone, welcome to RhythmCoach.\n\nChoose timed prompting, voice-follow prompting, or podcast rehearsal. After each rehearsal, the session is saved and compared with your previous attempt on the same script.'
};

export const PODCAST_REHEARSAL_TEMPLATE: Record<Language, string> = {
  zh: '【开场】\n欢迎听众，并用一句话说明本期主题。\n\n【大纲】\n• 观点一：要解释的核心问题\n• 观点二：例子、经历或证据\n• 观点三：给听众的启发或行动\n\n【结尾】\n总结本期重点，感谢收听，并给出下一步提示。',
  en: '[OPENING]\nWelcome the listener and introduce the episode topic in one sentence.\n\n[OUTLINE]\n• Point one: the core question to explain\n• Point two: an example, experience, or supporting evidence\n• Point three: the takeaway or next action for the listener\n\n[CLOSING]\nSummarize the key point, thank the listener, and close with a next step.'
};

export function shouldSeedPodcastTemplate(content: string): boolean {
  const normalized = content.trim();
  if (!normalized) return true;
  return Object.values(DEFAULT_REHEARSAL_SCRIPT).some((script) => script === normalized);
}

export function getStarterScript(lang: Language, podcastMode: boolean): string {
  return podcastMode ? PODCAST_REHEARSAL_TEMPLATE[lang] : DEFAULT_REHEARSAL_SCRIPT[lang];
}
