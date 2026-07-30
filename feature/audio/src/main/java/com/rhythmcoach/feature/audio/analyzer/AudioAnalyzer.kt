package com.rhythmcoach.feature.audio.analyzer

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.abs

class AudioAnalyzer {

    private var audioRecord: AudioRecord? = null
    private var isRecording = false

    private val _voiceState = MutableStateFlow(VoiceState.SILENCE_LONG)
    val voiceState: StateFlow<VoiceState> = _voiceState.asStateFlow()

    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

    @SuppressLint("MissingPermission")
    fun startRecording() {
        if (isRecording) return

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )

        audioRecord?.startRecording()
        isRecording = true

        Thread {
            val buffer = ShortArray(bufferSize)
            var silenceCount = 0

            while (isRecording) {
                val readResult = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (readResult > 0) {
                    val energy = calculateEnergy(buffer, readResult)
                    if (energy > ENERGY_THRESHOLD) {
                        _voiceState.value = VoiceState.SPEAKING
                        silenceCount = 0
                    } else {
                        silenceCount++
                        if (silenceCount > LONG_SILENCE_FRAMES) {
                            _voiceState.value = VoiceState.SILENCE_LONG
                        } else if (silenceCount > SHORT_SILENCE_FRAMES) {
                            _voiceState.value = VoiceState.SILENCE_SHORT
                        }
                    }
                }
            }
        }.start()
    }

    fun stopRecording() {
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }

    private fun calculateEnergy(buffer: ShortArray, readSize: Int): Double {
        var sum = 0.0
        for (i in 0 until readSize) {
            sum += abs(buffer[i].toDouble())
        }
        return sum / readSize
    }

    companion object {
        private const val ENERGY_THRESHOLD = 500.0 // Simplified threshold
        private const val SHORT_SILENCE_FRAMES = 10 // e.g. ~800ms
        private const val LONG_SILENCE_FRAMES = 30  // e.g. ~1.2s
    }
}
