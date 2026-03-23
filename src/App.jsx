import React, { useState, useEffect } from 'react';
import { Upload, Music, FileText, Download, Loader2, Play, Square, Radio, Tv, Gamepad2, Layers } from 'lucide-react';
import { startPreview, stopPreview, updatePreviewParams, processAudio, generateTimingDoc } from './utils/audioProcessor';

const STYLES = [
  { id: 'chiptune', name: '8-Bit', icon: Gamepad2 },
  { id: 'retro', name: 'Retro', icon: Layers },
  { id: 'radio', name: 'Radio', icon: Radio },
  { id: 'vhs', name: 'VHS', icon: Tv },
];

export default function App() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('chiptune');
  const [intensity, setIntensity] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      updatePreviewParams(mode, intensity);
    }
  }, [intensity, mode, isPlaying]);

  const selectFile = (selectedFile) => {
    // 某些浏览器对特殊后缀或中文名文件的 MIME 识别可能为空，增加后缀检查
    const isAudio = selectedFile?.type.startsWith('audio/') || 
                    /\.(mp3|wav|ogg|flac|m4a)$/i.test(selectedFile?.name);
    
    if (isAudio) {
      setFile(selectedFile);
      setResults(null);
      handleStopPreview();
    }
  };

  const handleFileChange = (e) => {
    selectFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleTogglePreview = async () => {
    if (isPlaying) {
      await handleStopPreview();
    } else {
      if (!file) return;
      setIsPlaying(true);
      await startPreview(file, mode, intensity);
    }
  };

  const handleStopPreview = async () => {
    setIsPlaying(false);
    await stopPreview();
  };

  const handleSave = async () => {
    if (!file) return;
    await handleStopPreview();
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const timer = setInterval(() => setProgress(prev => Math.min(prev + 5, 95)), 300);
      const processed = await processAudio(file, mode, intensity);
      const timingDoc = await generateTimingDoc(processed.buffer);
      
      clearInterval(timer);
      setProgress(100);
      setResults({ audioUrl: processed.url, docUrl: timingDoc.url });
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <h1>Sound Lab</h1>

      <main className="card">
        <div 
          className={`dropzone ${file ? 'has-file' : ''} ${isDragging ? 'dragging' : ''}`}
          onClick={() => document.getElementById('fileInput').click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input id="fileInput" type="file" accept="audio/*" hidden onChange={handleFileChange} />
          {file ? (
            <div className="file-info">
              <Music size={16} style={{ marginBottom: '0.25rem', opacity: 0.3 }} />
              <h3>{file.name}</h3>
            </div>
          ) : (
            <>
              <Upload size={18} strokeWidth={1.5} color="var(--text-dim)" style={{ marginBottom: '0.75rem' }} />
              <h3>Import Audio</h3>
            </>
          )}
        </div>

        {file && (
          <div className="controls-animation">
            <div className="style-selector">
              {STYLES.map((style) => {
                const Icon = style.icon;
                if (!Icon) return null; // 防止图标丢失导致崩溃
                return (
                  <button 
                    key={style.id}
                    className={`style-btn ${mode === style.id ? 'active' : ''}`}
                    onClick={() => setMode(style.id)}
                    title={style.name}
                  >
                    <Icon size={18} />
                    <span>{style.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="intensity-control">
              <div className="label-row">
                <span>{mode.toUpperCase()} DEGREE</span>
                <span className="value">{intensity}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={intensity} 
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="minimal-slider"
              />
            </div>

            <div className="action-row">
              <button className={`btn-icon ${isPlaying ? 'active' : ''}`} onClick={handleTogglePreview}>
                {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              
              <button 
                className="btn-primary-mini" 
                onClick={handleSave} 
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Save Result'}
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="progress-bar">
            <div className="progress-inner" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {results && (
          <div className="results scale-in">
            <div className="result-group">
              <a href={results.audioUrl} download={`${mode}_output.wav`} className="download-link">
                <Download size={14} /> <span>WAV</span>
              </a>
              <a href={results.docUrl} download={`${mode}_logic.txt`} className="download-link">
                <FileText size={14} /> <span>LOGIC</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
