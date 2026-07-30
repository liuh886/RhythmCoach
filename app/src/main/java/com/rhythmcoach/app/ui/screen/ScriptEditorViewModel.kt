package com.rhythmcoach.app.ui.screen

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ScriptEditorUiState(
    val title: String = "",
    val content: String = "",
    val targetCpm: Int = 220,
    val charCount: Int = 0,
    val estimatedMinutes: Int = 0,
    val estimatedSeconds: Int = 0
)

class ScriptEditorViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(ScriptEditorUiState())
    val uiState: StateFlow<ScriptEditorUiState> = _uiState.asStateFlow()

    fun updateTitle(newTitle: String) {
        _uiState.update { it.copy(title = newTitle) }
    }

    fun updateContent(newContent: String) {
        val count = calculateChineseCharacters(newContent)
        val (mins, secs) = calculateEstimatedTime(count, _uiState.value.targetCpm)
        _uiState.update {
            it.copy(
                content = newContent,
                charCount = count,
                estimatedMinutes = mins,
                estimatedSeconds = secs
            )
        }
    }

    fun updateTargetCpm(newCpm: Int) {
        val cpm = if (newCpm < 1) 1 else newCpm
        val (mins, secs) = calculateEstimatedTime(_uiState.value.charCount, cpm)
        _uiState.update {
            it.copy(
                targetCpm = cpm,
                estimatedMinutes = mins,
                estimatedSeconds = secs
            )
        }
    }

    private fun calculateChineseCharacters(text: String): Int {
        // Simple logic to count Chinese characters, letters, and numbers
        val regex = "[\\u4e00-\\u9fa5a-zA-Z0-9]".toRegex()
        return regex.findAll(text).count()
    }

    private fun calculateEstimatedTime(charCount: Int, cpm: Int): Pair<Int, Int> {
        if (cpm <= 0) return 0 to 0
        val totalSeconds = (charCount.toDouble() / cpm * 60).toInt()
        val mins = totalSeconds / 60
        val secs = totalSeconds % 60
        return mins to secs
    }

    fun saveScript() {
        // TODO: Call Repository/Dao to save
    }
}
