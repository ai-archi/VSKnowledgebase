/**
 * Jest setup file
 * Sets up the DOM environment for testing
 * 
 * Note: We use jsdom environment which provides real DOM APIs
 * This file is mainly for additional mocks if needed
 */

// jsdom already provides document and window, but we can add additional mocks here
if (typeof document !== 'undefined') {
  // Ensure requestAnimationFrame is available
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return setTimeout(callback, 16);
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
}

