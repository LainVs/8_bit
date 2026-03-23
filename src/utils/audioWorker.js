/**
 * Audio Processing Worker - Sound Lab Edition
 * Supports complex Lo-Fi styles: Chiptune, Retro, Radio, VHS
 */

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'PROCESS_AUDIO') {
    try {
      const { channelData, sampleRate, mode, intensity } = payload;
      const wet = intensity / 100;
      
      // 1. 统一转为单声道进行处理
      const mono = new Float32Array(channelData[0].length);
      for (let i = 0; i < mono.length; i++) {
        let sum = 0;
        for (let c = 0; c < channelData.length; c++) sum += channelData[c][i];
        mono[i] = sum / channelData.length;
      }

      let processedData;
      let targetSampleRate = sampleRate;

      switch (mode) {
        case 'chiptune':
          processedData = processChiptune(mono, sampleRate, wet);
          targetSampleRate = 11025 + (1 - wet) * 11025;
          break;
        case 'retro':
          processedData = processRetro(mono, sampleRate, wet);
          targetSampleRate = 16000 + (1 - wet) * 28000;
          break;
        case 'radio':
          processedData = processRadio(mono, sampleRate, wet);
          break;
        case 'vhs':
          processedData = processVHS(mono, sampleRate, wet);
          break;
        default:
          processedData = mono;
      }

      const wavBlob = audioBufferToWav([processedData], targetSampleRate);
      self.postMessage({ type: 'SUCCESS', payload: { blob: wavBlob } });
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: err.message });
    }
  }
};

/**
 * 8-Bit / Chiptune 处理
 */
function processChiptune(data, sampleRate, wet) {
  const targetRate = 11025 + (1 - wet) * 11025;
  const ratio = sampleRate / targetRate;
  const newLen = Math.floor(data.length / ratio);
  const out = new Float32Array(newLen);
  const bitDepth = 16 - (wet * 14);
  const levels = Math.pow(2, bitDepth);
  
  for (let i = 0; i < newLen; i++) {
    const sample = data[Math.floor(i * ratio)];
    out[i] = Math.round(sample * (levels/2)) / (levels/2);
  }
  return out;
}

/**
 * 复古采样处理
 */
function processRetro(data, sampleRate, wet) {
  const targetRate = 16000 + (1 - wet) * 28000;
  const ratio = sampleRate / targetRate;
  const newLen = Math.floor(data.length / ratio);
  const out = new Float32Array(newLen);
  const bitDepth = 16 - (wet * 10);
  const levels = Math.pow(2, bitDepth);

  for (let i = 0; i < newLen; i++) {
    const sample = data[Math.floor(i * ratio)];
    out[i] = Math.round(sample * (levels/2)) / (levels/2);
  }
  return out;
}

/**
 * 收音机处理 (带通滤波模拟)
 */
function processRadio(data, sampleRate, wet) {
  // 简易的数字滤波实现 (简单的移动平均/差分来模拟带通)
  const out = new Float32Array(data.length);
  let prev = 0;
  for (let i = 1; i < data.length; i++) {
    // 高通部分
    const hp = data[i] - data[i-1];
    // 低通部分 (简单平滑)
    out[i] = (hp + prev) * 0.5;
    prev = out[i];
    
    // 增加一点量化失真
    const levels = 16 - (wet * 12);
    out[i] = Math.round(out[i] * levels) / levels;
  }
  return out;
}

/**
 * VHS 处理 (Wow/Flutter 模拟)
 */
function processVHS(data, sampleRate, wet) {
  const out = new Float32Array(data.length);
  let time = 0;
  for (let i = 0; i < data.length; i++) {
    // Wow/Flutter: 改变读取位置
    const offset = Math.sin(time * 3.14 * 3) * wet * 20; 
    const readIdx = Math.max(0, Math.min(data.length - 1, i + offset));
    
    // 简单的线性插值
    const idxBase = Math.floor(readIdx);
    const idxFract = readIdx - idxBase;
    const s1 = data[idxBase];
    const s2 = data[Math.min(data.length - 1, idxBase + 1)];
    let sample = s1 + (s2 - s1) * idxFract;
    
    // 简单低通滤波
    if (i > 0) sample = (sample + out[i-1]) * 0.5;
    
    out[i] = sample;
    time += 1 / sampleRate;
  }
  return out;
}

function audioBufferToWav(channelData, sampleRate) {
  const numOfChan = channelData.length;
  const lengthInSamples = channelData[0].length;
  const length = lengthInSamples * numOfChan * 2 + 44;
  const buffer_out = new ArrayBuffer(length);
  const view = new DataView(buffer_out);
  const setUint16 = (pos, data) => view.setUint16(pos, data, true);
  const setUint32 = (pos, data) => view.setUint32(pos, data, true);

  setUint32(0, 0x46464952);
  setUint32(4, length - 8);
  setUint32(8, 0x45564157);
  setUint32(12, 0x20746d66);
  setUint32(16, 16);
  setUint16(20, 1);
  setUint16(22, numOfChan);
  setUint32(24, sampleRate);
  setUint32(28, sampleRate * 2 * numOfChan);
  setUint16(32, numOfChan * 2);
  setUint16(34, 16);
  setUint32(36, 0x61746164);
  setUint32(40, length - 44);

  let offset = 44;
  for (let i = 0; i < lengthInSamples; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      let sample = channelData[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }
  return new Blob([buffer_out], { type: "audio/wav" });
}
