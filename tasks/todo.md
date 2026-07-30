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
- [x] UI: Script editor screen (Title, Body, Target CPM)
- [x] Logic: Auto-calculate Chinese characters count
- [x] Logic: Estimate duration based on target CPM
- [x] Persistence: Save scripts to Room database

## Phase 2: Floating Window Permission & Teleprompter (悬浮窗权限 + 悬浮提词器)
- [x] Permission: Check and request `SYSTEM_ALERT_WINDOW`
- [x] UI: Basic floating window view using `WindowManager`
- [x] UI: Teleprompter view with semi-transparent background
- [x] Logic: Fixed-speed auto-scrolling based on CPM

## Phase 3: Rhythm Widget & Controls (悬浮节奏挂件)
- [x] UI: Draggable floating widget (Rhythm state, micro-chart)
- [x] Logic: Drag and position memory
- [x] Logic: Start/Pause controls for teleprompter

## Phase 4: Audio Record & VAD (麦克风 + VAD)
- [x] Permission: `RECORD_AUDIO`
- [x] Service: Foreground Service for background audio recording
- [x] Logic: AudioRecord capture (16kHz, mono)
- [x] Logic: VAD to detect speaking vs silence
- [x] Logic: Link VAD state to teleprompter (pause on silence)

## Phase 5: Rhythm Analysis & Review (节奏曲线 + 复盘)
- [x] Logic: Estimate CPM from VAD density
- [x] UI: End-of-practice summary screen
- [x] Logic: Track session duration, speaking ratio, etc.

## Phase 6: Polish & HyperOS Compatibility
- [x] Ensure foreground service robustness
- [x] Prompt for battery optimization exemption on Xiaomi devices

## Review
- [ ] ...
