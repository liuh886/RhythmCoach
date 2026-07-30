package com.rhythmcoach.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PermissionCheckScreen(
    onContinue: () -> Unit
) {
    Scaffold(
        topBar = { TopAppBar(title = { Text("权限与后台设置") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text("为了保证悬浮窗和音频录制在后台不被系统强制结束，请授予以下权限：", style = MaterialTheme.typography.bodyLarge)
            Spacer(modifier = Modifier.height(16.dp))
            
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("1. 悬浮窗权限 (必须)", style = MaterialTheme.typography.titleMedium)
                    Text("允许在其他应用上层显示挂件", style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = { /* Request Overlay */ }) { Text("去授权") }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("2. 录音权限 (必须)", style = MaterialTheme.typography.titleMedium)
                    Text("用于本地节奏分析，绝不上传云端", style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = { /* Request Mic */ }) { Text("去授权") }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("3. 后台无限制 (建议，特别是小米/HyperOS 用户)", style = MaterialTheme.typography.titleMedium)
                    Text("防止由于省电策略导致悬浮窗消失", style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = { /* Open Battery Opt */ }) { Text("去设置") }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) {
                Text("继续")
            }
        }
    }
}
