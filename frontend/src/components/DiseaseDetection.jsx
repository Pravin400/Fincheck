import React, { useState } from 'react';
import { detectionAPI } from '../services/api';

const DiseaseDetection = ({ currentSession, onNewSession }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
      setResults(null);
      setError('');
    }
  };

  const handleDetect = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    // Create session if none exists
    if (!currentSession) {
      await onNewSession();
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (currentSession) {
        formData.append('sessionId', currentSession.id);
      }

      const response = await detectionAPI.detectDisease(formData);
      setResults(response.data.results);
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed. Please try again.');
      console.error('Detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreview(null);
    setResults(null);
    setError('');
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'severe':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
      case 'moderate':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
      case 'mild':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Fish Disease Detection</h2>
        <p className="text-gray-600 mb-8">
          Upload an image to detect fish diseases using our trained AI model
        </p>

        {/* Upload Section */}
        <div className="mb-8">
          <label className="block w-full">
            <div className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              preview ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}>
              {preview ? (
                <div className="space-y-4">
                  <img src={preview} alt="Preview" className="max-h-96 mx-auto rounded-lg shadow-md" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleReset();
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Change image
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium text-gray-700 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Detect Button */}
        {selectedImage && !results && (
          <button
            onClick={handleDetect}
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing for diseases...
              </span>
            ) : (
              '🔬 Detect Disease'
            )}
          </button>
        )}

        {/* Results Section */}
        {results && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Detection Results</h3>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                New Detection
              </button>
            </div>

            {/* Disease Status */}
            <div className={`rounded-xl p-6 border-2 ${getSeverityColor(results.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2">
                    {results.disease || 'No Disease Detected'}
                  </h4>
                  <p className="text-sm opacity-90 mb-4">
                    {results.description || 'The fish appears to be healthy'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Confidence:</span>
                    <div className="flex-1 max-w-xs bg-white/50 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all bg-current opacity-60"
                        style={{ width: `${(results.confidence || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">
                      {((results.confidence || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h4>
                <ul className="space-y-2">
                  {results.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Info */}
            {results.additionalInfo && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">ℹ️ Additional Information</h4>
                <p className="text-gray-700">{results.additionalInfo}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiseaseDetection;
