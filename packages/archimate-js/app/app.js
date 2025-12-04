import 'bootstrap';
import * as bootstrap from 'bootstrap';

import 'jointjs/dist/joint.css';
import { ArchimateEditorAdapter } from '../src/adapter/ArchimateEditorAdapter.js';

// 检测是否在 VSCode webview 环境中
// eslint-disable-next-line no-undef
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
const isVSCodeWebview = !!vscode;

const tooltipTriggerList = document.querySelectorAll('[data-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

var dropdownElementList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'))
var dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
  return new bootstrap.Dropdown(dropdownToggleEl)
})

// modeler instance (使用新的适配器)
var modeler = new ArchimateEditorAdapter({
  container: '#canvas',
  keyboard: {
    bindTo: window,
  }
});

// 在 VSCode webview 中修复资源路径（图标、字体等）
if (isVSCodeWebview) {
  // 获取基础路径：从当前脚本的 URL 推断
  const scriptTag = document.querySelector('script[src*="app.js"]');
  const basePath = scriptTag 
    ? scriptTag.src.replace(/\/app\.js.*$/, '/')
    : '';
  
  function fixResourcePaths() {
    if (!basePath) return;
    
    const fixUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      
      // 修复图标路径
      url = url.replace(/url\(["']?([^"')]*\/icons\/([^"')]+))["']?\)/g, 
        (match, fullPath, iconPath) => 'url("' + basePath + 'icons/' + iconPath + '")');
      
      // 修复字体路径
      url = url.replace(/url\(["']?\.\/(assets\/)?(font-awesome-5|ibm-plex-font)\/([^"')]+)["']?\)/g,
        (match, assetsPrefix, dir, fileName) => 'url("' + basePath + 'assets/' + dir + '/' + fileName + '")');
      
      return url;
    };
    
    // 修复样式表中的路径
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          if (!sheet.cssRules) continue;
          
          for (let j = 0; j < sheet.cssRules.length; j++) {
            const rule = sheet.cssRules[j];
            if (rule.style && rule.style.backgroundImage) {
              rule.style.backgroundImage = fixUrl(rule.style.backgroundImage);
            }
            if (rule.type === CSSRule.FONT_FACE_RULE && rule.style) {
              const src = rule.style.getPropertyValue('src');
              if (src) {
                rule.style.setProperty('src', fixUrl(src), rule.style.getPropertyPriority('src'));
              }
            }
          }
        } catch (e) {
          // 跨域样式表可能无法访问，忽略
        }
      }
    } catch (e) {
      console.warn('Cannot access stylesheets:', e);
    }
    
    // 修复元素的 computed style
    document.querySelectorAll('*').forEach(el => {
      try {
        const bgImage = window.getComputedStyle(el).backgroundImage;
        if (bgImage && bgImage !== 'none' && (bgImage.includes('icons/') || bgImage.includes('font-'))) {
          const newBgImage = fixUrl(bgImage);
          if (newBgImage !== bgImage) {
            el.style.backgroundImage = newBgImage;
          }
        }
      } catch (e) {
        // 忽略无法访问的元素样式
      }
    });
  }
  
  // 延迟执行路径修复，等待样式加载完成
  const runFix = () => {
    setTimeout(fixResourcePaths, 100);
    setTimeout(fixResourcePaths, 500);
    setTimeout(fixResourcePaths, 1000);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFix);
  } else {
    runFix();
  }
  
  // 监听动态添加的元素
  new MutationObserver(() => setTimeout(fixResourcePaths, 100))
    .observe(document.body, { childList: true, subtree: true });
}

/* screen interaction */
function enterFullscreen(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

const state = {
  fullScreen: false
};

// 只在元素存在时添加事件监听器
const fullscreenBtn = document.getElementById('js-toggle-fullscreen');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', function() {
    state.fullScreen = !state.fullScreen;
    if (state.fullScreen) {
      enterFullscreen(document.documentElement);
    } else {
      exitFullscreen();
    }
  });
}

const exportSvgBtn = document.getElementById('js-export-model-svg');
if (exportSvgBtn) {
  exportSvgBtn.addEventListener('click', function() {
    getSVGfromModel().then(function(result) {
      download('model.svg', result.svg);
    });
  });
}

const exportXmlBtn = document.getElementById('js-export-model-xml');
if (exportXmlBtn) {
  exportXmlBtn.addEventListener('click', function() {
    getXMLfromModel()
      .then(function(result) {
        download('model.xml', result.xml);
    });
  });
}

const importBtn = document.getElementById('js-import-model');
if (importBtn) {
  importBtn.addEventListener('click', function() {
    importModel();
  });
}

const newModelBtn = document.getElementById('js-new-model');
if (newModelBtn) {
  newModelBtn.addEventListener('click', function() {
    newModel();
  });
}


function importModel() {
  let input = document.createElement('input');
  input.type = 'file';
  input.onchange = _this => {
            let files =   Array.from(input.files);
            openFile(files[0]);
        };
  input.click();
}

var dropZone = document.getElementById('canvas');

// Prevent default behavior (Prevent file from being opened)
dropZone.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
});

dropZone.addEventListener('drop', function(e) {
  e.stopPropagation();
  e.preventDefault();
  var files = e.dataTransfer.files; // Array of all files
  openFile(files[0]);
});

function newModel() {
  modeler.createNewModel().catch(function(err) {
    if (err) {
      console.error('could not create new archimate model', err);
      return;
    }
  });
}

// 在 VSCode webview 中，仅保留必要的加载和保存功能
if (isVSCodeWebview) {
  // 手动保存功能：监听 Ctrl+S (Windows/Linux) 或 Command+S (Mac)
  let isSaving = false;
  
  function saveModel() {
    if (isSaving) return; // 如果正在保存，跳过
    
    isSaving = true;
    modeler.saveXML({ format: true })
      .then((result) => {
        if (vscode) {
          vscode.postMessage({
            type: 'save',
            content: result.xml
          });
        }
      })
      .catch((err) => {
        console.error('Failed to save model:', err);
        if (vscode) {
          vscode.postMessage({
            type: 'error',
            message: 'Failed to save model: ' + err.message
          });
        }
      })
      .finally(() => {
        isSaving = false;
      });
  }
  
  // 监听来自扩展的消息：仅处理加载
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'load' && message.content && message.content.trim()) {
      // 加载模型内容
      openModel(message.content);
    }
  });
  
  // 监听键盘快捷键：Ctrl+S (Windows/Linux) 或 Command+S (Mac)
  // 延迟添加，确保不影响拖拽等操作
  setTimeout(() => {
    document.addEventListener('keydown', (event) => {
      // Ctrl+S (Windows/Linux) 或 Command+S (Mac)
      // 确保只在按下保存快捷键时才处理，不影响其他操作
      if ((event.ctrlKey || event.metaKey) && event.key === 's' && !event.shiftKey && !event.altKey) {
        // 检查是否在输入框中（如果是，不阻止默认行为）
        const target = event.target;
        const isInput = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        );
        
        if (!isInput) {
          event.preventDefault(); // 阻止浏览器默认保存行为
          event.stopPropagation(); // 阻止事件冒泡
          saveModel();
        }
      }
    }, false); // 使用冒泡阶段，不捕获
  }, 500); // 延迟更长时间，确保拖拽功能完全初始化
  
  // 隐藏文件操作按钮（在 VSCode 中不需要）
  const fileButtons = ['js-export-model-svg', 'js-export-model-xml', 'js-import-model', 'js-new-model'];
  fileButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn && btn.parentElement) {
      btn.parentElement.style.display = 'none';
    }
  });
}

// Create new model to show on canvas !
// 参考代码：直接在这里初始化模型，确保界面正常工作
// 如果有初始内容，加载它；否则创建新模型
if (window.initialContent && window.initialContent.trim()) {
  openModel(window.initialContent);
} else {
  newModel();
}

function openFile(file) {
  // check file api availability
  if (!window.FileReader) {
    return window.alert(
      'Looks like you use an older browser ' +
      'Try using a modern browser such as Chrome, Firefox or Internet Explorer > 10.');
  }

  // no file chosen
  if (!file) {
    return window.alert('No file to proced !');
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    var xml = e.target.result;
    openModel(xml);
  };
  reader.readAsText(file);
}

function openModel(xml) {
  // import model
  modeler.importXML(xml)
    .then(function(result) {
      if (result.warnings.length) {
        console.warn(result.warnings);
        if (!isVSCodeWebview) {
          window.alert('Warning(s) on importing archimate model. See console log.');
        }
      }
      modeler.openView().catch(function(err) {
        if (err) {
          if (!isVSCodeWebview) {
            window.alert('Error(s) on opening archimate view. See console log.');
          }
          console.error('could not open archimate view', err);
        }
      }).then(() => {
        // 视图打开后，确保渲染完成
        console.log('View opened successfully');
      });
    })
    .catch(function(err) {
      if (err) {
        if (!isVSCodeWebview) {
          window.alert('Error(s) on importing archimate model. See console log.');
        }
        console.error('could not import archimate model', err);
      }
   });
}

function getSVGfromModel() {
  return modeler.saveSVG();
}

function getXMLfromModel() {
  return modeler.saveXML({ format: true });
}

function download(filename, data) {
  var element = document.createElement('a');
  if (data) {
    var encodedData = encodeURIComponent(data);
    element.setAttribute('href', 'data:application/xml;charset=UTF-8,' + encodedData);
    element.setAttribute('download', filename);
    document.body.appendChild(element);
    element.click();
  } else {
    document.body.removeChild(element);
  }
}