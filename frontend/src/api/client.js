import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Health check endpoint
 */
export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

/**
 * Analyze uploaded video with streaming response
 * @param {File} file - Video file to upload
 * @param {string} videoType - Type of video (general, dashcam, etc.)
 * @param {Function} onChunk - Callback for each data chunk
 * @param {Function} onError - Callback for errors
 * @param {Function} onComplete - Callback when stream completes
 * @param {Function} onStatus - Callback for status messages (optional)
 * @param {Function} onEnhance - Callback for enhanced summary with screenshots (optional)
 */
export const analyzeUploadedVideo = async (file, videoType = 'general', onChunk, onError, onComplete, onStatus, onEnhance) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/api/analyze/upload?video_type=${videoType}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to analyze video');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (onComplete) onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove "data: " prefix
          if (data.trim()) {
            try {
              // JSON decode the chunk to handle newlines and special characters
              const decodedChunk = JSON.parse(data);

              // Check if it's a message object
              if (typeof decodedChunk === 'object' && decodedChunk.type) {
                if (decodedChunk.type === 'status' && onStatus) {
                  onStatus(decodedChunk.message);
                } else if (decodedChunk.type === 'enhance' && onEnhance) {
                  onEnhance(decodedChunk.content);
                } else if (decodedChunk.type === 'complete') {
                  // Complete signal received
                  continue;
                }
              } else if (typeof decodedChunk === 'string') {
                // Regular text chunk
                onChunk(decodedChunk);
              }
            } catch {
              // If it's not JSON, use as-is (for backwards compatibility)
              onChunk(data);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing video:', error);
    if (onError) onError(error);
    throw error;
  }
};

/**
 * Analyze YouTube video with streaming response
 * @param {string} url - YouTube URL
 * @param {string} videoType - Type of video (general, dashcam, etc.)
 * @param {Function} onChunk - Callback for each data chunk
 * @param {Function} onMetadata - Callback for video metadata
 * @param {Function} onError - Callback for errors
 * @param {Function} onComplete - Callback when stream completes
 * @param {Function} onStatus - Callback for status messages (optional)
 * @param {Function} onEnhance - Callback for enhanced summary with screenshots (optional)
 */
export const analyzeYouTubeVideo = async (
  url,
  videoType = 'general',
  onChunk,
  onMetadata,
  onError,
  onComplete,
  onStatus,
  onEnhance
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/analyze/youtube?video_type=${videoType}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to analyze YouTube video');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (onComplete) onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim()) {
            // All data is now JSON encoded
            try {
              const parsed = JSON.parse(data);

              // Check if it's a message object
              if (typeof parsed === 'object' && parsed.type) {
                if (parsed.type === 'metadata' && onMetadata) {
                  onMetadata(parsed);
                } else if (parsed.type === 'status' && onStatus) {
                  onStatus(parsed.message);
                } else if (parsed.type === 'enhance' && onEnhance) {
                  onEnhance(parsed.content);
                } else if (parsed.type === 'complete') {
                  // Complete signal received
                  continue;
                }
              } else if (typeof parsed === 'string') {
                // Regular text chunk (JSON decoded string)
                onChunk(parsed);
              } else {
                // Fallback for unexpected format
                onChunk(String(parsed));
              }
            } catch {
              // If parsing fails, use as-is (shouldn't happen now)
              onChunk(data);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing YouTube video:', error);
    if (onError) onError(error);
    throw error;
  }
};

/**
 * Generate PDF report from summary
 * @param {string} summary - Video summary text
 * @param {Object} metadata - Video metadata
 * @param {Array} screenshots - Array of base64 screenshots
 */
export const generatePDF = async (summary, metadata, screenshots = []) => {
  try {
    const response = await apiClient.post(
      '/api/generate-pdf',
      {
        summary,
        metadata,
        screenshots,
      },
      {
        responseType: 'blob',
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `summary_${metadata.filename}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default apiClient;
