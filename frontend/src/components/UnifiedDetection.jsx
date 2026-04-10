import React, { useState, useEffect } from 'react';
import { detectionAPI, sessionAPI } from '../services/api';
import AiChatPanel from './AiChatPanel';

const UnifiedDetection = ({ currentSession, onNewSessionClick, onCreateSession }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fishResults, setFishResults] = useState(null);
  const [diseaseResults, setDiseaseResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('upload');
  const [error, setError] = useState('');
  const [analysisHistory, setAnalysisHistory] = useState([]); // Store all analyses in session
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  // Sync visual detection history with the currently selected session
  useEffect(() => {
    setAnalysisHistory([]); // Clear instantly to prevent bleeding visual states
    setCurrentStep('upload'); 

    if (currentSession?.id) {
      loadSessionHistory(currentSession.id);
    } else {
      handleNewAnalysis();
    }
  }, [currentSession?.id]);

  const loadSessionHistory = async (sessionId) => {
    try {
      setLoading(true);
      const response = await sessionAPI.getSession(sessionId);
      const detections = response.data.detections || [];
      
      const history = [];
      let currentAnalysis = {};

      detections.forEach((d) => {
        if (d.detection_type === 'fish_detection') {
          // If we already have a fish result pending without a disease match, push it and start fresh
          if (currentAnalysis.fishResults) {
            history.push({ ...currentAnalysis });
            currentAnalysis = {};
          }
          currentAnalysis.id = d.id || Date.now();
          // Use base64 from stored results first, then Supabase URL as fallback
          const savedBase64 = d.results?.original_image_base64;
          currentAnalysis.preview = savedBase64 || d.image_url;
          currentAnalysis.fishImageUrl = d.image_url;
          // Strip the heavy base64 from results before storing in state (keep UI lean)
          const { original_image_base64, ...cleanResults } = d.results || {};
          currentAnalysis.fishResults = cleanResults;
          currentAnalysis.timestamp = d.created_at;
        } else if (d.detection_type === 'disease_detection') {
          // If this is an orphaned disease detection without a fish record, initialize the card
          if (!currentAnalysis.preview) {
             currentAnalysis.id = d.id || Date.now();
             currentAnalysis.preview = d.image_url;
             currentAnalysis.timestamp = d.created_at;
          }
          currentAnalysis.diseaseImageUrl = d.image_url;
          currentAnalysis.diseaseResults = d.results;
          
          // Disease detection marks the completion of an analysis pipeline, push and reset
          history.push({ ...currentAnalysis });
          currentAnalysis = {};
        }
      });
      
      // Push any dangling half-finished analysis
      if (Object.keys(currentAnalysis).length > 0) {
        history.push({ ...currentAnalysis });
      }
      
      setAnalysisHistory(history);
      
      if (history.length > 0) {
         setFishResults(null);
         setDiseaseResults(null);
         setSelectedImage(null);
         setPreview(null);
         setCurrentStep('complete');
      } else {
         handleNewAnalysis();
      }
    } catch (err) {
      console.error('Failed to load session history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    e.preventDefault();
    let file = null;
    if (e.dataTransfer && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    } else if (e.target && e.target.files) {
      file = e.target.files[0];
    }

    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
      setFishResults(null);
      setDiseaseResults(null);
      setCurrentStep('upload');
      setError('');
    } else if (file) {
      setError('Please upload a valid image file (JPEG/PNG)');
    }
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDetect = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    let session = currentSession;
    if (!session) {
      session = await onCreateSession();
      if (!session) {
        setLoading(false);
        setError('Failed to initialize session automatically. Please try again.');
        return;
      }
    }

    setLoading(true);
    setError('');
    setCurrentStep('fish');

    // Convert image to persistent base64 data URL (survives state changes, unlike blob URLs)
    const imageDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(selectedImage);
    });

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('sessionId', session.id);

      // Step 1: Fish Species Detection
      const fishResponse = await detectionAPI.detectFish(formData);
      const fishData = fishResponse.data.results;
      setFishResults(fishData);

      let diseaseData = null;
      let diseaseImgUrl = null;

      // Check if a fish was actually detected
      const detectedSpecies = fishData?.ensemble?.species || 'No detection';
      
      if (detectedSpecies === 'No detection' || detectedSpecies === 'No fish detected') {
        // Step 2: Skip Disease Detection because there is no fish
        diseaseData = {
          disease: 'No Disease Detected',
          confidence: 0,
          description: 'Because no fish was detected in the image, disease analysis was skipped.',
          severity: 'none',
          recommendations: ['Please upload an image that clearly shows a fish.'],
          additionalInfo: 'No fish detected in the frame.',
          detections: [],
          annotated_image: null
        };
      } else {
        // Step 2: Actual Disease Detection
        setCurrentStep('disease');
        const formData2 = new FormData();
        formData2.append('image', selectedImage);
        formData2.append('sessionId', session.id);
        const diseaseResponse = await detectionAPI.detectDisease(formData2);
        diseaseData = diseaseResponse.data.results;
        diseaseImgUrl = diseaseResponse.data.imageUrl;
      }

      setDiseaseResults(diseaseData);
      setCurrentStep('complete');

      // Add to analysis history — use backend base64 (also stored in DB) for reliability
      const reliableImage = fishResponse.data.originalImageBase64 || imageDataUrl;
      setAnalysisHistory(prev => [...prev, {
        id: Date.now(),
        preview: reliableImage,
        fishResults: fishData,
        diseaseResults: diseaseData,
        fishImageUrl: fishResponse.data.imageUrl,
        diseaseImageUrl: diseaseImgUrl,
        timestamp: new Date().toISOString()
      }]);

      setFishResults(null);
      setDiseaseResults(null);
      setPreview(null);
      setSelectedImage(null);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Detection failed. Please try again.');
      console.error('Detection error:', err);
      setCurrentStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setSelectedImage(null);
    setPreview(null);
    setCurrentStep('upload');
    setError('');
  };

  const getSeverityStyle = (severity) => {
    const styles = {
      critical: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-800', icon: '🔴' },
      high: { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-800', icon: '🟠' },
      severe: { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-800', icon: '🟠' },
      moderate: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      mild: { bg: 'bg-green-50', border: 'border-green-300', badge: 'bg-green-100 text-green-800', icon: '🟢' },
      none: { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-800', icon: '✅' },
      healthy: { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-800', icon: '✅' }
    };
    return styles[severity?.toLowerCase()] || styles.moderate;
  };

  // Render a single analysis report card
  const renderReportCard = (analysis, isLatest = false) => {
    const { fishResults: fish, diseaseResults: disease } = analysis;
    // Fallback chain: preview (Supabase URL or base64) → localPreview → fishImageUrl
    const displayImage = analysis.preview || analysis.localPreview || analysis.fishImageUrl;
    const severity = getSeverityStyle(disease?.severity);

    return (
      <div key={analysis.id} className={`bg-white rounded-2xl shadow-lg border ${isLatest ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-200'} overflow-hidden mb-6`}>
        {/* Report Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="text-white font-bold text-lg">Analysis Report</h3>
                <p className="text-slate-300 text-xs">{new Date(analysis.timestamp).toLocaleString()}</p>
              </div>
            </div>
            {disease?.severity && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${severity.badge}`}>
                {severity.icon} {(disease.severity || 'Unknown').toUpperCase()} SEVERITY
              </span>
            )}
          </div>
        </div>

        {/* Images: Original + Annotated */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Original Image */}
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                📷 Original Image
              </div>
              <div className="p-2 bg-gray-50">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Original"
                    className="w-full rounded-lg object-contain max-h-72"
                    onError={(e) => {
                      // If the URL fails to load, replace with placeholder
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-72 text-gray-400"><p class="text-sm">⚠️ Original image unavailable — restart backend to enable image storage</p></div>';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-72 text-gray-400">
                    <p className="text-sm">Original image not available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Annotated Image with Bounding Boxes */}
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                🔍 AI Detection (Bounding Boxes)
              </div>
              <div className="p-2 bg-gray-50">
                {(disease?.annotated_image || fish?.annotated_image) ? (
                  <img
                    src={`data:image/jpeg;base64,${disease?.annotated_image || fish?.annotated_image}`}
                    alt="Annotated Detection"
                    className="w-full rounded-lg object-contain max-h-72"
                  />
                ) : (
                  <div className="flex items-center justify-center h-72 text-gray-400">
                    <p className="text-sm">No annotated image available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stage 1: Fish Species Identification */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 mb-4">
            <div className="flex items-center mb-3">
              <span className="text-xl mr-2">🐟</span>
              <h4 className="text-base font-bold text-gray-900">Stage 1 — Fish Species Identification</h4>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Detected Species</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {fish?.ensemble?.species || 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((fish?.ensemble?.confidence || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all"
                  style={{ width: `${(fish?.ensemble?.confidence || 0) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Stage 2: Disease Detection */}
          <div className={`${severity.bg} rounded-xl p-5 border ${severity.border} mb-4`}>
            <div className="flex items-center mb-3">
              <span className="text-xl mr-2"></span>
              <h4 className="text-base font-bold text-gray-900">Stage 2 — Disease Detection & Health Assessment</h4>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Condition</p>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {disease?.disease || 'No Detection'}
                  </p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${severity.badge}`}>
                    {severity.icon} {(disease?.severity || 'none').toUpperCase()} SEVERITY
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((disease?.confidence || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Description */}
              {disease?.description && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-900 mb-1">📋 Diagnosis Details</p>
                  <p className="text-sm text-blue-800">{disease.description}</p>
                </div>
              )}

              {/* Recommendations */}
              {disease?.recommendations && disease.recommendations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-900 mb-2">💊 Treatment & Recommendations</p>
                  <ul className="space-y-1.5">
                    {disease.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2 mt-0.5 text-xs">✓</span>
                        <span className="text-sm text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Info */}
              {disease?.additionalInfo && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 mb-1">ℹ️ Additional Information</p>
                  <p className="text-sm text-amber-700">{disease.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detection Summary Box */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">📝 Quick Summary</p>
            <p className="text-sm text-gray-700">
              <strong>Species:</strong> {fish?.ensemble?.species || 'Unknown'} (
              {((fish?.ensemble?.confidence || 0) * 100).toFixed(0)}% confidence) •{' '}
              <strong>Health:</strong> {disease?.disease || 'No detection'} (
              {disease?.severity || 'none'} severity, {((disease?.confidence || 0) * 100).toFixed(0)}% confidence)
            </p>
          </div>
        </div>
      </div>
    );
  };

  const latestAnalysis = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1] : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Previous Analysis Reports */}
      {analysisHistory.length > 0 && (
        <div className="mb-6">
          {analysisHistory.map((analysis, idx) =>
            renderReportCard(analysis, idx === analysisHistory.length - 1 && currentStep === 'complete')
          )}
        </div>
      )}

      {/* Upload & New Analysis Section */}
      {(currentStep !== 'complete' || analysisHistory.length === 0) && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          {analysisHistory.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🔬 New Analysis</h2>
              <p className="text-xs text-gray-500">Upload another fish image</p>
            </div>
          )}

          {analysisHistory.length === 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">🔬 Complete Fish Analysis</h2>
              <p className="text-gray-500 text-sm mb-6">
                Upload an image for species identification and disease detection
              </p>
            </>
          )}

          {/* Upload Area */}
          <label 
            className="block w-full cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleImageSelect}
          >
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              preview ? 'border-indigo-400 bg-indigo-50/50' : 
              isDragging ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}>
              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-md" />
                  <button
                    onClick={(e) => { e.preventDefault(); handleNewAnalysis(); }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Change image
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-base font-medium text-gray-700 mb-1">Click to upload fish image</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </label>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {currentStep === 'fish' ? '🐟 Stage 1: Identifying species...' : '🏥 Stage 2: Detecting diseases...'}
                </span>
                <span className="text-xs text-gray-500">
                  Step {currentStep === 'fish' ? '1' : '2'} of 2
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: currentStep === 'fish' ? '40%' : '85%' }}
                ></div>
              </div>
            </div>
          )}

          {/* Detect Button */}
          {selectedImage && !loading && currentStep === 'upload' && (
            <button
              onClick={handleDetect}
              className="w-full mt-4 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              🔬 Start Complete Analysis
            </button>
          )}
        </div>
      )}

      {/* "Analyze Another" button after completion */}
      {currentStep === 'complete' && (
        <div className="text-center mb-6">
          <button
            onClick={handleNewAnalysis}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
          >
            📷 Analyze Another Fish
          </button>
        </div>
      )}

      {/* AI Chat Panel */}
      <AiChatPanel
        currentSession={currentSession}
        fishResults={fishResults || latestAnalysis?.fishResults}
        diseaseResults={diseaseResults || latestAnalysis?.diseaseResults}
        isAnalyzing={loading}
        hasAnalysisResults={!!(fishResults || diseaseResults || latestAnalysis)}
        latestAnalysisTimestamp={latestAnalysis?.timestamp}
      />
    </div>
  );
};

export default UnifiedDetection;
