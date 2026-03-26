import React, { useState } from 'react';
import { detectionAPI } from '../services/api';

const FishDetection = ({ currentSession, onNewSession }) => {
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

      const response = await detectionAPI.detectFish(formData);
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Fish Species Detection</h2>
        <p className="text-gray-600 mb-8">
          Upload an image to detect fish species using our ensemble of 4 AI models
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
                Analyzing with 4 AI models...
              </span>
            ) : (
              '🔍 Detect Fish Species'
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

            {/* Ensemble Results */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Ensemble Prediction</h4>
              <div className="bg-white rounded-lg p-4">
                <p className="text-2xl font-bold text-indigo-600 mb-2">
                  {results.ensemble?.species || 'Unknown'}
                </p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all"
                      style={{ width: `${(results.ensemble?.confidence || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {((results.ensemble?.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Model Results */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Individual Model Results</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {results.models?.map((model, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">{model.name}</p>
                    <p className="text-lg font-semibold text-gray-900 mb-2">{model.species}</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${model.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {(model.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FishDetection;
