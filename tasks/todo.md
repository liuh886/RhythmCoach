# RhythmCoach Development Plan

## Phase 0: Project Infrastructure Setup
- [x] Create `gradle.properties`, `settings.gradle.kts`
- [x] Create root `build.gradle.kts`
- [x] Create `app` module `build.gradle.kts` and AndroidManifest.xml
- [x] Set up basic Compose MainActivity
- [x] Setup `core:ui` module
- [x] Setup `core:data` module
- [x] Setup `feature:floating` module
- [x] Setup `feature:audio` module

## Phase 1: Script Editing & Stats (稿件编辑 + 字数统计)
- [ ] UI: Script editor screen (Title, Body, Target CPM)
- [ ] Logic: Auto-calculate Chinese characters count
- [ ] Logic: Estimate duration based on target CPM
- [ ] Persistence: Save scripts to Room database

## Phase 2: Floating Window Permission & Teleprompter (悬浮窗权限 + 悬浮提词器)
- [ ] Permission: Check and request `SYSTEM_ALERT_WINDOW`
- [ ] UI: Basic floating window view using `WindowManager`
- [ ] UI: Teleprompter view with semi-transparent background
- [ ] Logic: Fixed-speed auto-scrolling based on CPM

## Phase 3: Rhythm Widget & Controls (悬浮节奏挂件)
- [ ] UI: Draggable floating widget (Rhythm state, micro-chart)
- [ ] Logic: Drag and position memory
- [ ] Logic: Start/Pause controls for teleprompter

## Phase 4: Audio Record & VAD (麦克风 + VAD)
- [ ] Permission: `RECORD_AUDIO`
- [ ] Service: Foreground Service for background audio recording
- [ ] Logic: AudioRecord capture (16kHz, mono)
- [ ] Logic: VAD to detect speaking vs silence
- [ ] Logic: Link VAD state to teleprompter (pause on silence)

## Phase 5: Rhythm Analysis & Review (节奏曲线 + 复盘)
- [ ] Logic: Estimate CPM from VAD density
- [ ] UI: End-of-practice summary screen
- [ ] Logic: Track session duration, speaking ratio, etc.

## Phase 6: Polish & HyperOS Compatibility
- [ ] Ensure foreground service robustness
- [ ] Prompt for battery optimization exemption on Xiaomi devices

## Review
- [ ] ...
