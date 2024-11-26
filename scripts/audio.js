// 创建音频上下文
let audioContext;
let isPlaying = false;
let oscillators = [];
let progressInterval;
let shouldStop = false;
let mediaRecorder = null;
let audioChunks = [];

// 初始化音频上下文
function initAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

// 创建用于录制的 MediaStream
function createMediaStreamDestination() {
    const ctx = initAudioContext();
    return ctx.createMediaStreamDestination();
}

// 开始录制
function startRecording(mediaStream) {
    audioChunks = [];
    try {
        mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            downloadAudio(audioBlob);
        };
        
        mediaRecorder.start(100); // 每100ms记录一次数据
        console.log('开始录制音频');
    } catch (error) {
        console.error('录制音频时出错:', error);
    }
}

// 停止录制
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        console.log('停止录制音频');
    }
}

// 下载音频文件
function downloadAudio(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'morse_code.webm'; // 改为.webm格式
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 创建莫斯电码声音
function createTone(startTime, duration) {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // 设置音调频率（600Hz是典型的莫斯电码频率）
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, startTime);
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.005);
    gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.005);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    // 连接节点
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    oscillators.push(oscillator);
    
    return { oscillator, duration };
}

// 为录制创建音调
function createToneForRecording(startTime, duration, destination) {
    const ctx = audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, startTime);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.005);
    gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.005);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    return { oscillator, gainNode };
}

// 清理所有振荡器
function cleanupOscillators() {
    oscillators.forEach(osc => {
        try {
            osc.stop();
            osc.disconnect();
        } catch (e) {
            // 忽略已经停止的振荡器
        }
    });
    oscillators = [];
}

// 更新进度条
function updateProgress(progress, status = '') {
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const progressStatus = document.querySelector('.progress-status');
    
    progressContainer.classList.add('active');
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
    
    if (status) {
        progressStatus.textContent = status;
    }
}

// 隐藏进度条
function hideProgress() {
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const progressStatus = document.querySelector('.progress-status');
    
    progressContainer.classList.remove('active');
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    progressStatus.textContent = '准备就绪';
}

// 播放莫斯密码序列
async function playMorseSequence(morseCode) {
    if (isPlaying) return;
    isPlaying = true;
    shouldStop = false;
    
    try {
        const ctx = initAudioContext();
        cleanupOscillators();
        
        const dotDuration = 0.1;
        const dashDuration = dotDuration * 3;
        const symbolGap = dotDuration;
        const letterGap = dotDuration * 3;
        let totalDuration = 0;
        
        // 计算总持续时间
        for (const char of morseCode) {
            if (char === '.') totalDuration += dotDuration + symbolGap;
            else if (char === '-') totalDuration += dashDuration + symbolGap;
            else if (char === ' ') totalDuration += letterGap;
        }
        
        const startTime = ctx.currentTime;
        let currentTime = startTime;
        updateProgress(0, '正在播放...');
        
        // 创建所有音调
        for (const char of morseCode) {
            if (shouldStop) break;
            
            if (char === '.') {
                createTone(currentTime, dotDuration);
                currentTime += dotDuration + symbolGap;
            } else if (char === '-') {
                createTone(currentTime, dashDuration);
                currentTime += dashDuration + symbolGap;
            } else if (char === ' ') {
                currentTime += letterGap;
            }
        }
        
        // 使用requestAnimationFrame来更新进度
        function updatePlaybackProgress() {
            if (!isPlaying || shouldStop) return;
            
            const elapsed = ctx.currentTime - startTime;
            const progress = Math.min((elapsed / totalDuration) * 100, 100);
            
            updateProgress(progress, '正在播放...');
            
            if (progress < 100) {
                requestAnimationFrame(updatePlaybackProgress);
            } else {
                updateProgress(100, '播放完成！');
                setTimeout(hideProgress, 1000);
                isPlaying = false;
            }
        }
        
        requestAnimationFrame(updatePlaybackProgress);
        
        // 等待播放完成
        await new Promise(resolve => setTimeout(resolve, totalDuration * 1000));
        
    } catch (error) {
        console.error('播放出错:', error);
        updateProgress(0, '播放出错');
        setTimeout(hideProgress, 2000);
    }
    
    isPlaying = false;
}

// 创建莫斯电码声音并录制
async function createAndRecordMorseCode(morseCode) {
    try {
        console.log('准备生成莫斯密码音频:', morseCode);
        updateProgress(0, '正在生成音频...');
        
        const ctx = initAudioContext();
        const destination = createMediaStreamDestination();
        startRecording(destination.stream);
        
        const dotDuration = 0.1;
        const dashDuration = dotDuration * 3;
        const symbolGap = dotDuration;
        const letterGap = dotDuration * 3;
        let totalDuration = 0;
        
        // 计算总持续时间
        for (const char of morseCode) {
            if (char === '.') totalDuration += dotDuration + symbolGap;
            else if (char === '-') totalDuration += dashDuration + symbolGap;
            else if (char === ' ') totalDuration += letterGap;
        }
        
        console.log('开始生成音频，预计持续时间:', totalDuration, '秒');
        const startTime = ctx.currentTime;
        let currentTime = startTime;
        
        // 使用requestAnimationFrame来更新进度
        function updateRecordingProgress() {
            if (shouldStop) return;
            
            const elapsed = ctx.currentTime - startTime;
            const progress = Math.min((elapsed / totalDuration) * 95, 95); // 保留5%给最后的处理
            
            updateProgress(progress, '正在生成音频...');
            
            if (progress < 95) {
                requestAnimationFrame(updateRecordingProgress);
            }
        }
        
        requestAnimationFrame(updateRecordingProgress);
        
        // 创建音频
        for (const char of morseCode) {
            if (char === '.') {
                createToneForRecording(currentTime, dotDuration, destination);
                currentTime += dotDuration + symbolGap;
            } else if (char === '-') {
                createToneForRecording(currentTime, dashDuration, destination);
                currentTime += dashDuration + symbolGap;
            } else if (char === ' ') {
                currentTime += letterGap;
            }
        }
        
        // 等待所有音频生成完成后停止录制
        updateProgress(98, '正在完成录制...');
        await new Promise(resolve => setTimeout(resolve, totalDuration * 1000));
        
        stopRecording();
        updateProgress(100, '下载完成！');
        setTimeout(hideProgress, 1000);
        
    } catch (error) {
        console.error('生成音频时出错:', error);
        updateProgress(0, '生成音频时出错');
        setTimeout(hideProgress, 2000);
    }
}

// 停止播放
function stopMorseSequence() {
    shouldStop = true;
    cleanupOscillators();
    clearInterval(progressInterval);
    if (audioContext) {
        audioContext.close().then(() => {
            audioContext = null;
        });
    }
    isPlaying = false;
    
    // 重置进度条
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    progressContainer.classList.remove('active');
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
}

// 文本朗读功能
let speaking = false;

// 检查浏览器是否支持语音合成
if (!window.speechSynthesis) {
    console.error('当前浏览器不支持语音合成API');
}
const synth = window.speechSynthesis;

// 获取可用的语音列表
function getVoices() {
    return new Promise((resolve) => {
        let voices = synth.getVoices();
        if (voices.length) {
            resolve(voices);
            return;
        }
        
        // Chrome 需要等待 voiceschanged 事件
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            resolve(voices);
        };
    });
}

async function speakText(text) {
    try {
        if (speaking) {
            stopSpeaking();
            return;
        }
        
        if (!text) {
            console.log('没有输入文本');
            return;
        }
        
        console.log('准备朗读文本:', text);
        
        const voices = await getVoices();
        console.log('可用语音列表:', voices);
        
        // 查找中文语音
        const chineseVoice = voices.find(voice => 
            voice.lang.includes('zh') || 
            voice.lang.includes('cmn') || 
            voice.lang.includes('yue')
        );
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 如果找到中文语音就使用，否则使用默认语音
        if (chineseVoice) {
            console.log('使用中文语音:', chineseVoice.name);
            utterance.voice = chineseVoice;
        } else {
            console.log('未找到中文语音，使用默认语音');
        }
        
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        utterance.onstart = () => {
            console.log('开始朗读');
            speaking = true;
            document.getElementById('speakButton').textContent = '停止朗读';
        };
        
        utterance.onend = () => {
            console.log('朗读结束');
            speaking = false;
            document.getElementById('speakButton').textContent = '朗读文本';
        };
        
        utterance.onerror = (event) => {
            console.error('朗读出错:', event);
            speaking = false;
            document.getElementById('speakButton').textContent = '朗读文本';
        };
        
        synth.speak(utterance);
    } catch (error) {
        console.error('朗读功能出错:', error);
        speaking = false;
        document.getElementById('speakButton').textContent = '朗读文本';
    }
}

function stopSpeaking() {
    if (synth) {
        synth.cancel();
        speaking = false;
        document.getElementById('speakButton').textContent = '朗读文本';
        console.log('停止朗读');
    }
}

// 导出函数
window.speakText = speakText;
window.stopSpeaking = stopSpeaking;
window.createAndRecordMorseCode = createAndRecordMorseCode;
