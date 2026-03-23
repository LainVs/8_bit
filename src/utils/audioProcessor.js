/**
 * Multi-Style Audio Processor
 * Supports: Chiptune, Retro, Radio, VHS
 */

let previewContext = null;
let sourceNode = null;
let effectNode = null; // BitCrusher
let filterNode = null; // Bandpass/Lowpass
let lfoNode = null;    // For Wow/Flutter
let lfoGain = null;

/**
 * 实时 BitCrusher 处理逻辑
 */
function createBitCrusherNode(ctx, bitDepth, downsample) {
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  node.bitDepth = bitDepth;
  node.downsample = downsample;
  let phase = 0;
  let lastSample = 0;

  node.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const output = e.outputBuffer.getChannelData(0);
    const step = Math.pow(0.5, node.bitDepth);
    for (let i = 0; i < input.length; i++) {
      phase += 1 / node.downsample;
      if (phase >= 1) {
        phase -= 1;
        lastSample = step * Math.floor(input[i] / step + 0.5);
      }
      output[i] = lastSample;
    }
  };
  return node;
}

/**
 * 启动实时预览
 */
export async function startPreview(file, mode, intensity) {
  if (previewContext) await stopPreview();
  
  previewContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await previewContext.decodeAudioData(arrayBuffer);
  
  sourceNode = previewContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.loop = true;

  // 1. 设置效果链
  filterNode = previewContext.createBiquadFilter();
  effectNode = createBitCrusherNode(previewContext, 16, 1);
  
  // 建立连接：Source -> Filter -> Effect -> Destination
  sourceNode.connect(filterNode);
  filterNode.connect(effectNode);
  effectNode.connect(previewContext.destination);

  // 2. 初始化 VHS 专用的 Wow/Flutter (LFO)
  lfoNode = previewContext.createOscillator();
  lfoGain = previewContext.createGain();
  lfoNode.frequency.value = 3; // 3Hz 左右的晃动
  lfoNode.connect(lfoGain);
  lfoGain.connect(sourceNode.playbackRate);
  lfoNode.start();

  // 3. 应用参数
  updatePreviewParams(mode, intensity);
  
  sourceNode.start();
  return previewContext;
}

/**
 * 更新预览参数
 */
export function updatePreviewParams(mode, intensity) {
  if (!previewContext) return;

  const wet = intensity / 100;

  // 默认状态：重置滤镜（增加存在性检查以防止异步初始化过程中的竞态崩溃）
  if (filterNode) filterNode.type = 'allpass';
  if (effectNode) {
    effectNode.bitDepth = 16;
    effectNode.downsample = 1;
  }
  if (lfoGain) lfoGain.gain.value = 0;

  if (!filterNode || !effectNode || !lfoGain) return;

  switch (mode) {
    case 'chiptune': // 8-Bit
      effectNode.bitDepth = 16 - (wet * 14); 
      effectNode.downsample = 1 + (wet * 8);
      break;
    
    case 'retro': // 复古采样
      effectNode.bitDepth = 16 - (wet * 10);
      effectNode.downsample = 1 + (wet * 4);
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 15000 - (wet * 12000);
      break;

    case 'radio': // 老收音机
      filterNode.type = 'bandpass';
      filterNode.frequency.value = 1500;
      filterNode.Q.value = 1.0;
      effectNode.bitDepth = 16 - (wet * 8); // 增加一点失真
      break;

    case 'vhs': // 录像带
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 4000 - (wet * 3000);
      lfoGain.gain.value = wet * 0.02; // playbackRate 抖动
      effectNode.bitDepth = 16 - (wet * 4);
      break;
  }
}

/**
 * 停止预览
 */
export async function stopPreview() {
  if (sourceNode) { sourceNode.stop(); sourceNode = null; }
  if (lfoNode) { lfoNode.stop(); lfoNode = null; }
  if (previewContext) { await previewContext.close(); previewContext = null; }
}

/**
 * 最终导出处理
 */
export async function processAudio(file, mode, intensity) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const numOfChan = audioBuffer.numberOfChannels;
  const channelData = [];
  for (let i = 0; i < numOfChan; i++) {
    channelData.push(new Float32Array(audioBuffer.getChannelData(i)));
  }

  const worker = new Worker(new URL('./audioWorker.js', import.meta.url), { type: 'module' });

  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'SUCCESS') {
        resolve({ buffer: audioBuffer, url: URL.createObjectURL(payload.blob) });
        worker.terminate();
      } else {
        reject(new Error(payload));
        worker.terminate();
      }
    };
    worker.postMessage({
      type: 'PROCESS_AUDIO',
      payload: { channelData, sampleRate: audioBuffer.sampleRate, mode, intensity }
    }, channelData.map(b => b.buffer));
  });
}

/**
 * 生成节奏文档
 */
export async function generateTimingDoc(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const timingData = [];
  const threshold = 0.02;
  const windowSize = Math.floor(sampleRate * 0.05);
  
  let isSounding = false;
  let startTime = 0;

  for (let i = 0; i < channelData.length; i += windowSize) {
    let maxAmp = 0;
    const end = Math.min(i + windowSize, channelData.length);
    for (let j = i; j < end; j++) {
      if (Math.abs(channelData[j]) > maxAmp) maxAmp = Math.abs(channelData[j]);
    }
    const currentTime = i / sampleRate;
    if (!isSounding && maxAmp > threshold) {
      isSounding = true;
      startTime = currentTime;
    } else if (isSounding && maxAmp < threshold * 0.4) {
      isSounding = false;
      const duration = currentTime - startTime;
      if (duration > 0.03) timingData.push({ start: startTime.toFixed(3), duration: duration.toFixed(3) });
    }
  }

  let docContent = "# Sound Lab Logic Document\nGenerated by Bit Music Lab\n\nTime(s)\t\tDuration(s)\tAction\n";
  timingData.forEach(item => {
    docContent += `${item.start}\t\t${item.duration}\t\tPlay Event\n`;
  });

  return { url: URL.createObjectURL(new Blob([docContent], { type: 'text/plain' })), name: "sound_lab_logic.txt" };
}
