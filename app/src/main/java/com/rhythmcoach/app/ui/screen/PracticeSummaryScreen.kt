package com.rhythmcoach.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeSummaryScreen(
    totalDurationSeconds: Int = 300,
    speakingDurationSeconds: Int = 240,
    averageCpm: Int = 210,
    longPauses: Int = 3,
    onBackToHome: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("练习复盘") },
                actions = {
                    TextButton(onClick = onBackToHome) {
                        Text("完成")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            Text("本次总时长: ${totalDurationSeconds / 60}分${totalDurationSeconds % 60}秒", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text("实际发声时长: ${speakingDurationSeconds / 60}分${speakingDurationSeconds % 60}秒", style = MaterialTheme.typography.bodyLarge)
            Spacer(modifier = Modifier.height(8.dp))
            
            val ratio = if (totalDurationSeconds > 0) (speakingDurationSeconds.toFloat() / totalDurationSeconds * 100).toInt() else 0
            Text("发声占比: $ratio%", style = MaterialTheme.typography.bodyLarge)
            Spacer(modifier = Modifier.height(16.dp))

            Text("平均估算 CPM: $averageCpm", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(8.dp))
            Text("长停顿次数: $longPauses 次", style = MaterialTheme.typography.bodyLarge)
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Placeholder for the full session chart
            Card(modifier = Modifier.fillMaxWidth().height(200.dp)) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Text("这里将展示全程节奏曲线图")
                }
            }
        }
    }
}
