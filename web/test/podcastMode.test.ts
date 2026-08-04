import {
  DEFAULT_REHEARSAL_SCRIPT,
  PODCAST_REHEARSAL_TEMPLATE,
  getStarterScript,
  shouldSeedPodcastTemplate
} from '../src/domain/podcastMode.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

const legacyChineseStarter = '大家好，欢迎来到节奏教练。\n\n在这里，你可以选择定时提词、语音跟随或自由演讲。完成练习后，系统会保存本次会话，并与同一稿件的上一次练习进行比较。';
const legacyEnglishStarter = 'Hello everyone, welcome to RhythmCoach.\n\nChoose timed prompting, voice-follow prompting, or free speaking. After each rehearsal, the session is saved and compared with your previous attempt on the same script.';

expect(shouldSeedPodcastTemplate(''), 'Empty workspace receives the podcast template');
expect(shouldSeedPodcastTemplate(DEFAULT_REHEARSAL_SCRIPT.zh), 'Chinese starter copy receives the podcast template');
expect(shouldSeedPodcastTemplate(DEFAULT_REHEARSAL_SCRIPT.en), 'English starter copy receives the podcast template');
expect(shouldSeedPodcastTemplate(legacyChineseStarter), 'Legacy Chinese starter copy receives the podcast template');
expect(shouldSeedPodcastTemplate(legacyEnglishStarter), 'Legacy English starter copy receives the podcast template');
expect(!shouldSeedPodcastTemplate('A creator-authored script'), 'Creator-authored content is never overwritten');
expectEqual(getStarterScript('zh', true), PODCAST_REHEARSAL_TEMPLATE.zh, 'Chinese podcast template');
expectEqual(getStarterScript('en', true), PODCAST_REHEARSAL_TEMPLATE.en, 'English podcast template');
expectEqual(getStarterScript('zh', false), DEFAULT_REHEARSAL_SCRIPT.zh, 'Chinese rehearsal starter');
expect(PODCAST_REHEARSAL_TEMPLATE.zh.includes('【开场】'), 'Chinese template includes an opening section');
expect(PODCAST_REHEARSAL_TEMPLATE.zh.includes('【大纲】'), 'Chinese template includes an outline section');
expect(PODCAST_REHEARSAL_TEMPLATE.zh.includes('【结尾】'), 'Chinese template includes a closing section');

console.log('podcast mode tests passed');
