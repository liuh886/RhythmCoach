package com.rhythmcoach.feature.floating.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun TeleprompterView(
    scriptContent: String = "这里是提词器的示例文本。在实际应用中，它会随着用户的阅读自动滚动。这是一段用来测试长度的占位文本。可以调整滚动速度、字体大小和透明度。",
    targetCpm: Int = 220,
    isPlaying: Boolean = true
) {
    val scrollState = rememberScrollState()

    // Fixed-speed auto-scrolling logic
    LaunchedEffect(isPlaying) {
        if (isPlaying) {
            while (true) {
                delay(16L) // ~60 FPS
                val scrollAmount = (targetCpm / 60f) * 1.5f // Simplified calculation
                scrollState.animateScrollTo(scrollState.value + scrollAmount.toInt())
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .padding(8.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0x80000000)) // Semi-transparent black
            .padding(16.dp)
    ) {
        Text(
            text = scriptContent,
            style = TextStyle(color = Color.White, fontSize = 24.sp),
            modifier = Modifier.verticalScroll(scrollState)
        )
    }
}
