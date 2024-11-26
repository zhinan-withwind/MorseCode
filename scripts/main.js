let morseCode = {};
let reverseMorse = {};

async function loadMorseCode() {
    try {
        const response = await fetch('data/morsecode.json');
        morseCode = await response.json();
        // 创建反向映射
        for (const [char, code] of Object.entries(morseCode)) {
            reverseMorse[code] = char;
        }
    } catch (error) {
        console.error('Error loading Morse code:', error);
    }
}

// 音调映射表
const toneMarks = {
    'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
    'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
    'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
    'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
    'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
    'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4', 'ü': 'v'
};

const reverseToneMarks = {
    'a1': 'ā', 'a2': 'á', 'a3': 'ǎ', 'a4': 'à',
    'e1': 'ē', 'e2': 'é', 'e3': 'ě', 'e4': 'è',
    'i1': 'ī', 'i2': 'í', 'i3': 'ǐ', 'i4': 'ì',
    'o1': 'ō', 'o2': 'ó', 'o3': 'ǒ', 'o4': 'ò',
    'u1': 'ū', 'u2': 'ú', 'u3': 'ǔ', 'u4': 'ù',
    'v1': 'ǖ', 'v2': 'ǘ', 'v3': 'ǚ', 'v4': 'ǜ', 'v': 'ü'
};

// 将带声调的拼音转换为数字表示
function convertToneToNumber(pinyin) {
    let result = '';
    for (let i = 0; i < pinyin.length; i++) {
        const char = pinyin[i];
        if (toneMarks[char]) {
            result += toneMarks[char];
        } else {
            result += char;
        }
    }
    return result;
}

// 将数字声调转换回带声调的拼音
function convertNumberToTone(pinyin) {
    let result = '';
    for (let i = 0; i < pinyin.length; i++) {
        const char = pinyin[i];
        const nextChar = pinyin[i + 1];
        if (nextChar && /[1-4]/.test(nextChar)) {
            const key = char + nextChar;
            if (reverseToneMarks[key]) {
                result += reverseToneMarks[key];
                i++; // 跳过数字
            } else {
                result += char;
            }
        } else {
            result += char;
        }
    }
    return result;
}

// 核心转换逻辑
function getPinyin(char) {
    if (char.match(/[\u4e00-\u9fa5]/)) {
        // 如果是汉字，获取拼音
        const pinyin = pinyinData[char];
        if (pinyin) {
            // 获取完整拼音（如果有多个音，取第一个）
            const fullPinyin = pinyin.split(',')[0];
            // 转换音调为数字表示
            return convertToneToNumber(fullPinyin);
        }
        return char;  // 如果找不到拼音，返回原字符
    }
    return char;  // 如果不是汉字，直接返回原字符
}

function convertTextToMorse(text) {
    let result = '';
    let lastChar = '';
    
    // 逐字符处理
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // 处理空格和换行
        if (char === ' ' || char === '\n') {
            result = result.trim() + ' / ';  // 用/替代空格
            if (char === '\n') {
                result = result.trim() + '\n';  // 保留换行
            }
            lastChar = char;
            continue;
        }
        
        const pinyin = getPinyin(char);
        
        // 如果当前字符是中文，且上一个字符也是中文，添加分隔符
        if (char.match(/[\u4e00-\u9fa5]/) && 
            lastChar && lastChar !== ' ' && lastChar !== '\n' && 
            text[i-1] && text[i-1].match(/[\u4e00-\u9fa5]/)) {
            result = result.trim() + ' / ';
        }
        
        // 将拼音或英文字符转换为摩斯密码
        for (let k = 0; k < pinyin.length; k++) {
            const letter = pinyin[k].toUpperCase();
            if (morseCode[letter]) {
                result += morseCode[letter] + ' ';
            }
        }
        
        lastChar = char;
    }
    
    return result.trim();
}

// 创建反向拼音映射表
const reversePinyinData = {};
function initReversePinyinData() {
    console.log('Initializing reverse pinyin data...');
    console.log('pinyinData sample:', Object.entries(pinyinData).slice(0, 5));
    for (const [char, pinyins] of Object.entries(pinyinData)) {
        const pinyinList = pinyins.split(',');
        for (const pinyin of pinyinList) {
            if (!reversePinyinData[pinyin]) {
                reversePinyinData[pinyin] = [];
            }
            reversePinyinData[pinyin].push(char);
        }
    }
    console.log('Reverse pinyin data sample:', Object.entries(reversePinyinData).slice(0, 5));
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    await loadMorseCode();
    initReversePinyinData();
    
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    
    // 初始化按钮状态
    function updateOutputButtonsState() {
        const output = document.getElementById('output').value;
        const hasOutput = output.trim().length > 0;
        
        document.getElementById('copyButton').disabled = !hasOutput;
        document.getElementById('readButton').disabled = !hasOutput;
        document.getElementById('downloadButton').disabled = !hasOutput;
    }
    
    updateOutputButtonsState();
    
    // 监听output变化
    const observer = new MutationObserver(updateOutputButtonsState);
    observer.observe(output, { 
        attributes: true, 
        childList: true, 
        characterData: true, 
        subtree: true 
    });
    
    // 转换按钮事件
    document.getElementById('convertButton').addEventListener('click', async () => {
        const text = input.value;
        if (!text) return;
        
        output.value = await convertTextToMorse(text);
        updateOutputButtonsState();
    });
    
    document.getElementById('reverseButton').addEventListener('click', () => {
        const morse = input.value;
        if (!morse) return;
        
        output.value = convertMorseToText(morse);
        updateOutputButtonsState();
    });
});

function guessChinese(pinyinWord) {
    // 先将数字音调转换为声调符号
    const toneWord = convertNumberToTone(pinyinWord.toLowerCase());
    console.log('Converting pinyin:', pinyinWord, 'to tone word:', toneWord);
    const chars = reversePinyinData[toneWord];
    console.log('Found chars for', toneWord, ':', chars);
    if (chars && chars.length > 0) {
        return chars[0];
    }
    return null;
}

function convertMorseToText(morse) {
    let output = '';
    let lastChar = '';
    let isFirstLetterOfWord = true;
    let currentWord = '';  // 用于收集当前单词的拼音
    let guessResults = [];  // 存储所有的汉字猜测结果

    // 将输入按换行符分割
    const lines = morse.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            if (i < lines.length - 1) {
                output += '\n';
            }
            continue;
        }

        // 按/分割单词
        const words = line.split('/');
        
        for (let j = 0; j < words.length; j++) {
            const word = words[j].trim();
            if (!word) continue;

            // 处理每个单词中的摩斯密码
            const codes = word.split(/\s+/);
            currentWord = '';
            isFirstLetterOfWord = true;
            lastChar = null;

            for (const code of codes) {
                if (!code) continue;

                if (reverseMorse[code]) {
                    const char = reverseMorse[code];
                    if (/[1-4]/.test(char) && lastChar && /[AEIOUV]/.test(lastChar)) {
                        const key = lastChar.toLowerCase() + char;
                        if (reverseToneMarks[key]) {
                            const toneChar = reverseToneMarks[key];
                            const newChar = isFirstLetterOfWord ? toneChar.toUpperCase() : toneChar;
                            output = output.slice(0, -1) + newChar;
                            currentWord = currentWord.slice(0, -1) + newChar;
                            continue;
                        }
                    }
                    const newChar = isFirstLetterOfWord ? char.toUpperCase() : char.toLowerCase();
                    output += newChar;
                    currentWord += newChar;
                    lastChar = char.toUpperCase();
                    isFirstLetterOfWord = false;
                }
            }

            // 处理当前单词的拼音转换
            if (currentWord) {
                const guessedChar = guessChinese(currentWord);
                if (guessedChar) {
                    guessResults.push(`${currentWord}（猜测为：${guessedChar}）`);
                }
            }

            // 在单词之间添加空格（最后一个单词除外）
            if (j < words.length - 1) {
                output += ' ';
            }
        }

        // 在行之间添加换行符（最后一行除外）
        if (i < lines.length - 1) {
            output += '\n';
        }
    }

    // 如果有汉字猜测结果，添加到输出末尾
    if (guessResults.length > 0) {
        output = output.trim() + '\n\n汉字猜测结果：\n' + guessResults.join('\n');
    }

    return output;
}

// 判断文本是否为莫斯密码
function isMorseCode(text) {
    return /^[.\- /]+$/.test(text.trim());
}

// 播放莫斯密码声音
async function playMorseCode() {
    const button = document.getElementById('readButton');
    const icon = button.querySelector('i');
    
    if (isPlaying) {
        stopMorseSequence();
        icon.className = 'fas fa-play';
        button.classList.remove('playing');
        return;
    }
    
    const output = document.getElementById('output').value;
    if (!output) return;
    
    icon.className = 'fas fa-stop';
    button.classList.add('playing');
    
    try {
        await playMorseSequence(output);
        icon.className = 'fas fa-play';
        button.classList.remove('playing');
    } catch (error) {
        console.error('播放出错:', error);
        icon.className = 'fas fa-play';
        button.classList.remove('playing');
    }
}

// 合并的播放/朗读功能
function playOrSpeak() {
    const output = document.getElementById('output').value;
    if (!output) return;
    
    const button = document.getElementById('readButton');
    const icon = button.querySelector('i');

    if (isMorseCode(output)) {
        // 如果是莫斯密码就播放声音
        playMorseCode();
    } else {
        // 如果是普通文本就朗读
        if (speaking) {
            stopSpeaking();
            icon.className = 'fas fa-play';
            button.classList.remove('playing');
        } else {
            speakText(output);
            icon.className = 'fas fa-stop';
            button.classList.add('playing');
        }
    }
}

// 添加播放/朗读按钮事件监听
document.getElementById('readButton').addEventListener('click', playOrSpeak);

// 添加下载按钮事件监听
document.getElementById('downloadButton').addEventListener('click', () => {
    const output = document.getElementById('output').value;
    if (!output) return;
    
    if (isMorseCode(output)) {
        createAndRecordMorseCode(output);
    } else {
        alert('只有莫斯密码才能下载为音频文件');
    }
});

function copyOutput() {
    const output = document.getElementById('output');
    output.select();
    document.execCommand('copy');
}

document.getElementById('copyButton').addEventListener('click', copyOutput);
