package com.rhythmcoach.feature.floating.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

@Composable
fun RhythmWidgetView(
    cpm: Int = 218,
    status: String = "稳定",
    statusColor: Color = Color.Green,
    isPlaying: Boolean,
    onTogglePlay: () -> Unit
) {
    var offsetX by remember { mutableStateOf(0f) }
    var offsetY by remember { mutableStateOf(0f) }

    Box(
        modifier = Modifier
            .offset { IntOffset(offsetX.roundToInt(), offsetY.roundToInt()) }
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    offsetX += dragAmount.x
                    offsetY += dragAmount.y
                }
            }
            .width(180.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xCC000000)) // darker semi-transparent
            .padding(12.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "节奏: $status",
                    color = statusColor,
                    fontSize = 14.sp
                )
                // Play/Pause button could be an icon, just text for MVP
                IconButton(onClick = onTogglePlay, modifier = Modifier.size(24.dp)) {
                    Text(text = if (isPlaying) "||" else "▶", color = Color.White)
                }
            }
            Text(
                text = "$cpm CPM (估算)",
                color = Color.White,
                fontSize = 12.sp
            )
            // Mock chart
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(24.dp)
                    .padding(top = 4.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf(10, 15, 8, 20, 12, 18, 14).forEach { height ->
                    Box(
                        modifier = Modifier
                            .width(8.dp)
                            .height(height.dp)
                            .background(statusColor)
                    )
                }
            }
        }
    }
}
