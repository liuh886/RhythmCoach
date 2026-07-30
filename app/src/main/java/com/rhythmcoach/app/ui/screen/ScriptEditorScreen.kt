package com.rhythmcoach.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScriptEditorScreen(
    viewModel: ScriptEditorViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
    onStartPractice: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("新建稿件") },
                actions = {
                    TextButton(onClick = {
                        viewModel.saveScript()
                        onStartPractice()
                    }) {
                        Text("开始口播")
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
            OutlinedTextField(
                value = uiState.title,
                onValueChange = viewModel::updateTitle,
                label = { Text("标题") },
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = uiState.content,
                onValueChange = viewModel::updateContent,
                label = { Text("稿件内容") },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                maxLines = Int.MAX_VALUE
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("字数: ${uiState.charCount}")
                Text("目标 CPM: ${uiState.targetCpm}")
                Text("估算时长: ${uiState.estimatedMinutes}分${uiState.estimatedSeconds}秒")
            }
            
            // Slider to adjust CPM
            Slider(
                value = uiState.targetCpm.toFloat(),
                onValueChange = { viewModel.updateTargetCpm(it.toInt()) },
                valueRange = 100f..350f,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
