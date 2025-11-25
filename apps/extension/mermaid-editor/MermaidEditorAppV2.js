/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/cjs.js!./app/styles.css":
/*!**********************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/cjs.js!./app/styles.css ***!
  \**********************************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/cssWithMappingToString.js */ "../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/cssWithMappingToString.js");
/* harmony import */ var _node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/api.js */ "../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_runtime_cssWithMappingToString_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, "/* Base styles */\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nhtml, body {\n  height: 100%;\n  overflow: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n  font-size: 14px;\n}\n\n.app {\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n  background: #ffffff;\n}\n\n/* Toolbar */\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 16px;\n  background: #f8f9fa;\n  border-bottom: 1px solid #e9ecef;\n  min-height: 40px;\n}\n\n.status {\n  font-size: 13px;\n  color: #6c757d;\n}\n\n.actions {\n  display: flex;\n  gap: 8px;\n}\n\n.actions button {\n  padding: 4px 12px;\n  font-size: 13px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.actions button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n/* Workspace */\n.workspace {\n  display: flex;\n  flex: 1;\n  overflow: hidden;\n  position: relative;\n}\n\n.diagram-panel {\n  flex: 1;\n  min-width: 320px;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.workspace-divider {\n  width: 6px;\n  cursor: col-resize;\n  background: #f1f3f5;\n  border-left: 1px solid #e9ecef;\n  border-right: 1px solid #e9ecef;\n  flex: 0 0 auto;\n}\n\n.workspace-divider:hover,\n.workspace-divider.dragging {\n  background: #e0e4e8;\n}\n\n.workspace.resizing,\n.workspace.resizing * {\n  cursor: col-resize !important;\n}\n\n.panel-header {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e9ecef;\n  background: #f8f9fa;\n}\n\n.panel-title {\n  font-weight: 600;\n  font-size: 14px;\n  display: block;\n  margin-bottom: 4px;\n}\n\n.panel-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.panel-caption.muted {\n  color: #adb5bd;\n}\n\n.panel-body {\n  padding: 16px;\n  flex: 1;\n}\n\n.style-section {\n  margin-bottom: 24px;\n}\n\n.section-heading {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 12px;\n}\n\n.section-heading h3 {\n  font-size: 14px;\n  font-weight: 600;\n}\n\n.section-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.section-caption.muted {\n  color: #adb5bd;\n}\n\n.style-controls {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.style-control {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.style-control span {\n  font-size: 12px;\n  color: #495057;\n}\n\n.style-control input[type=\"color\"],\n.style-control input[type=\"text\"],\n.style-control input[type=\"number\"],\n.style-control select {\n  padding: 6px;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  font-size: 13px;\n}\n\n.style-control input[type=\"color\"] {\n  height: 36px;\n  cursor: pointer;\n}\n\n.style-control:disabled,\n.style-control[aria-disabled=\"true\"] input,\n.style-control[aria-disabled=\"true\"] select {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.image-control {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.image-control-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.image-control-actions button {\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.image-control-actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.image-control-meta {\n  font-size: 11px;\n  color: #6c757d;\n}\n\n.image-control-meta.muted {\n  color: #adb5bd;\n}\n\n.style-reset {\n  margin-top: 12px;\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n  width: 100%;\n}\n\n.style-reset:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n/* Diagram Container */\n.diagram-container {\n  flex: 1;\n  position: relative;\n  overflow: hidden;\n  background: #ffffff;\n}\n\n.diagram-wrapper {\n  width: 100%;\n  height: 100%;\n  position: relative;\n}\n\n.diagram {\n  width: 100%;\n  height: 100%;\n  cursor: default;\n}\n\n.diagram .node {\n  cursor: move;\n}\n\n.diagram .node.selected {\n  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .edge {\n  cursor: pointer;\n}\n\n.diagram .edge.selected {\n  filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .handle {\n  fill: #3b82f6;\n  stroke: #ffffff;\n  stroke-width: 2;\n  cursor: move;\n}\n\n.diagram .handle.active {\n  fill: #10b981;\n}\n\n.diagram .handle:hover {\n  fill: #2563eb;\n}\n\n.diagram .subgraph {\n  cursor: grab;\n}\n\n.diagram .subgraph:active {\n  cursor: grabbing;\n}\n\n.diagram .alignment-guide {\n  stroke: #3b82f6;\n  stroke-width: 1;\n  stroke-dasharray: 4 4;\n  pointer-events: none;\n}\n\n/* Mermaid 选择样式 */\n.mermaid-selected-node {\n  filter: drop-shadow(0 0 4px #007bff);\n  opacity: 0.9;\n}\n\n.mermaid-selected-edge path {\n  stroke-width: 4 !important;\n  filter: drop-shadow(0 0 2px #007bff);\n}\n\n.mermaid-selection-box {\n  pointer-events: none;\n}\n\n/* Mermaid 容器样式 */\n#diagram-container {\n  position: relative;\n  overflow: auto;\n  background: #ffffff;\n}\n\n#diagram-container svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n\n/* 交互元素样式 */\n[data-interactive=\"true\"] {\n  transition: opacity 0.2s;\n}\n\n[data-interactive=\"true\"]:hover {\n  opacity: 0.8;\n}\n\n/* 连接目标高亮 */\n.mermaid-hover-target {\n  filter: drop-shadow(0 0 6px #28a745) !important;\n  opacity: 0.9 !important;\n}\n\n/* 添加节点对话框样式 */\n.mermaid-add-node-dialog {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n}\n\n/* 标签编辑器样式 */\n.mermaid-label-editor input {\n  outline: none;\n}\n\n.mermaid-label-editor input:focus {\n  border-color: #0056b3 !important;\n  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);\n}\n\n/* CodeMirror 编辑器样式 */\n.CodeMirror {\n  height: 100%;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.CodeMirror-scroll {\n  min-height: 100%;\n}\n\n.CodeMirror-lines {\n  padding: 12px;\n}\n\n.CodeMirror-line {\n  padding: 0;\n}\n\n/* 错误行样式 */\n.CodeMirror-line.error-line {\n  background-color: #fee;\n}\n\n/* 原生编辑器样式（降级方案） */\n.mermaid-source-editor {\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n  tab-size: 2;\n}\n\n/* Source Panel */\n.source-panel {\n  width: 320px;\n  min-width: 240px;\n  border-left: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  background: #ffffff;\n  flex: 0 0 auto;\n}\n\n.panel-path {\n  font-size: 11px;\n  color: #6c757d;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n}\n\n.source-editor {\n  flex: 1;\n  padding: 12px;\n  border: none;\n  resize: none;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n  background: #ffffff;\n  color: #212529;\n}\n\n.source-editor:focus {\n  outline: none;\n}\n\n.panel-footer {\n  padding: 8px 12px;\n  border-top: 1px solid #e9ecef;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 11px;\n  background: #f8f9fa;\n}\n\n.source-status {\n  padding: 2px 6px;\n  border-radius: 3px;\n  font-size: 11px;\n}\n\n.source-status.synced {\n  color: #10b981;\n}\n\n.source-status.pending {\n  color: #f59e0b;\n}\n\n.source-status.saving {\n  color: #3b82f6;\n}\n\n.source-status.error {\n  color: #ef4444;\n}\n\n.selection-label {\n  color: #6c757d;\n  font-size: 11px;\n}\n\n/* Error Message */\n.error {\n  padding: 8px 16px;\n  background: #fee2e2;\n  color: #991b1b;\n  border-top: 1px solid #fecaca;\n  font-size: 13px;\n}\n\n/* Placeholder */\n.placeholder {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  color: #6c757d;\n  font-size: 14px;\n}\n\n/* Context Menu */\n.context-menu {\n  position: absolute;\n  background: #ffffff;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 4px 0;\n  z-index: 1000;\n  min-width: 120px;\n}\n\n.context-menu button {\n  width: 100%;\n  padding: 8px 16px;\n  text-align: left;\n  border: none;\n  background: none;\n  cursor: pointer;\n  font-size: 13px;\n  color: #212529;\n}\n\n.context-menu button:hover {\n  background: #f8f9fa;\n}\n\n", "",{"version":3,"sources":["webpack://./app/styles.css"],"names":[],"mappings":"AAAA,gBAAgB;AAChB;EACE,sBAAsB;EACtB,SAAS;EACT,UAAU;AACZ;;AAEA;EACE,YAAY;EACZ,gBAAgB;EAChB,yGAAyG;EACzG,eAAe;AACjB;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,aAAa;EACb,mBAAmB;AACrB;;AAEA,YAAY;AACZ;EACE,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,iBAAiB;EACjB,mBAAmB;EACnB,gCAAgC;EAChC,gBAAgB;AAClB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,aAAa;EACb,QAAQ;AACV;;AAEA;EACE,iBAAiB;EACjB,eAAe;EACf,yBAAyB;EACzB,mBAAmB;EACnB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,YAAY;EACZ,mBAAmB;AACrB;;AAEA,cAAc;AACd;EACE,aAAa;EACb,OAAO;EACP,gBAAgB;EAChB,kBAAkB;AACpB;;AAEA;EACE,OAAO;EACP,gBAAgB;EAChB,aAAa;EACb,sBAAsB;EACtB,gBAAgB;AAClB;;AAEA;EACE,UAAU;EACV,kBAAkB;EAClB,mBAAmB;EACnB,8BAA8B;EAC9B,+BAA+B;EAC/B,cAAc;AAChB;;AAEA;;EAEE,mBAAmB;AACrB;;AAEA;;EAEE,6BAA6B;AAC/B;;AAEA;EACE,kBAAkB;EAClB,gCAAgC;EAChC,mBAAmB;AACrB;;AAEA;EACE,gBAAgB;EAChB,eAAe;EACf,cAAc;EACd,kBAAkB;AACpB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,aAAa;EACb,OAAO;AACT;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,mBAAmB;AACrB;;AAEA;EACE,eAAe;EACf,gBAAgB;AAClB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,SAAS;AACX;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,QAAQ;AACV;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;;;;EAIE,YAAY;EACZ,yBAAyB;EACzB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,YAAY;EACZ,eAAe;AACjB;;AAEA;;;EAGE,YAAY;EACZ,mBAAmB;AACrB;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,QAAQ;AACV;;AAEA;EACE,aAAa;EACb,QAAQ;AACV;;AAEA;EACE,iBAAiB;EACjB,eAAe;EACf,yBAAyB;EACzB,mBAAmB;EACnB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,gBAAgB;EAChB,iBAAiB;EACjB,eAAe;EACf,yBAAyB;EACzB,mBAAmB;EACnB,kBAAkB;EAClB,eAAe;EACf,WAAW;AACb;;AAEA;EACE,mBAAmB;AACrB;;AAEA,sBAAsB;AACtB;EACE,OAAO;EACP,kBAAkB;EAClB,gBAAgB;EAChB,mBAAmB;AACrB;;AAEA;EACE,WAAW;EACX,YAAY;EACZ,kBAAkB;AACpB;;AAEA;EACE,WAAW;EACX,YAAY;EACZ,eAAe;AACjB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,oDAAoD;AACtD;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,oDAAoD;AACtD;;AAEA;EACE,aAAa;EACb,eAAe;EACf,eAAe;EACf,YAAY;AACd;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,gBAAgB;AAClB;;AAEA;EACE,eAAe;EACf,eAAe;EACf,qBAAqB;EACrB,oBAAoB;AACtB;;AAEA,iBAAiB;AACjB;EACE,oCAAoC;EACpC,YAAY;AACd;;AAEA;EACE,0BAA0B;EAC1B,oCAAoC;AACtC;;AAEA;EACE,oBAAoB;AACtB;;AAEA,iBAAiB;AACjB;EACE,kBAAkB;EAClB,cAAc;EACd,mBAAmB;AACrB;;AAEA;EACE,cAAc;EACd,WAAW;EACX,YAAY;AACd;;AAEA,WAAW;AACX;EACE,wBAAwB;AAC1B;;AAEA;EACE,YAAY;AACd;;AAEA,WAAW;AACX;EACE,+CAA+C;EAC/C,uBAAuB;AACzB;;AAEA,cAAc;AACd;EACE,yGAAyG;AAC3G;;AAEA,YAAY;AACZ;EACE,aAAa;AACf;;AAEA;EACE,gCAAgC;EAChC,6CAA6C;AAC/C;;AAEA,qBAAqB;AACrB;EACE,YAAY;EACZ,wDAAwD;EACxD,eAAe;EACf,gBAAgB;AAClB;;AAEA;EACE,gBAAgB;AAClB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,UAAU;AACZ;;AAEA,UAAU;AACV;EACE,sBAAsB;AACxB;;AAEA,kBAAkB;AAClB;EACE,wDAAwD;EACxD,eAAe;EACf,gBAAgB;EAChB,WAAW;AACb;;AAEA,iBAAiB;AACjB;EACE,YAAY;EACZ,gBAAgB;EAChB,8BAA8B;EAC9B,aAAa;EACb,sBAAsB;EACtB,mBAAmB;EACnB,cAAc;AAChB;;AAEA;EACE,eAAe;EACf,cAAc;EACd,wDAAwD;AAC1D;;AAEA;EACE,OAAO;EACP,aAAa;EACb,YAAY;EACZ,YAAY;EACZ,wDAAwD;EACxD,eAAe;EACf,gBAAgB;EAChB,mBAAmB;EACnB,cAAc;AAChB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,iBAAiB;EACjB,6BAA6B;EAC7B,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,eAAe;EACf,mBAAmB;AACrB;;AAEA;EACE,gBAAgB;EAChB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;EACd,eAAe;AACjB;;AAEA,kBAAkB;AAClB;EACE,iBAAiB;EACjB,mBAAmB;EACnB,cAAc;EACd,6BAA6B;EAC7B,eAAe;AACjB;;AAEA,gBAAgB;AAChB;EACE,aAAa;EACb,mBAAmB;EACnB,uBAAuB;EACvB,YAAY;EACZ,cAAc;EACd,eAAe;AACjB;;AAEA,iBAAiB;AACjB;EACE,kBAAkB;EAClB,mBAAmB;EACnB,yBAAyB;EACzB,kBAAkB;EAClB,yCAAyC;EACzC,cAAc;EACd,aAAa;EACb,gBAAgB;AAClB;;AAEA;EACE,WAAW;EACX,iBAAiB;EACjB,gBAAgB;EAChB,YAAY;EACZ,gBAAgB;EAChB,eAAe;EACf,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,mBAAmB;AACrB","sourcesContent":["/* Base styles */\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nhtml, body {\n  height: 100%;\n  overflow: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n  font-size: 14px;\n}\n\n.app {\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n  background: #ffffff;\n}\n\n/* Toolbar */\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 16px;\n  background: #f8f9fa;\n  border-bottom: 1px solid #e9ecef;\n  min-height: 40px;\n}\n\n.status {\n  font-size: 13px;\n  color: #6c757d;\n}\n\n.actions {\n  display: flex;\n  gap: 8px;\n}\n\n.actions button {\n  padding: 4px 12px;\n  font-size: 13px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.actions button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n/* Workspace */\n.workspace {\n  display: flex;\n  flex: 1;\n  overflow: hidden;\n  position: relative;\n}\n\n.diagram-panel {\n  flex: 1;\n  min-width: 320px;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.workspace-divider {\n  width: 6px;\n  cursor: col-resize;\n  background: #f1f3f5;\n  border-left: 1px solid #e9ecef;\n  border-right: 1px solid #e9ecef;\n  flex: 0 0 auto;\n}\n\n.workspace-divider:hover,\n.workspace-divider.dragging {\n  background: #e0e4e8;\n}\n\n.workspace.resizing,\n.workspace.resizing * {\n  cursor: col-resize !important;\n}\n\n.panel-header {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e9ecef;\n  background: #f8f9fa;\n}\n\n.panel-title {\n  font-weight: 600;\n  font-size: 14px;\n  display: block;\n  margin-bottom: 4px;\n}\n\n.panel-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.panel-caption.muted {\n  color: #adb5bd;\n}\n\n.panel-body {\n  padding: 16px;\n  flex: 1;\n}\n\n.style-section {\n  margin-bottom: 24px;\n}\n\n.section-heading {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 12px;\n}\n\n.section-heading h3 {\n  font-size: 14px;\n  font-weight: 600;\n}\n\n.section-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.section-caption.muted {\n  color: #adb5bd;\n}\n\n.style-controls {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.style-control {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.style-control span {\n  font-size: 12px;\n  color: #495057;\n}\n\n.style-control input[type=\"color\"],\n.style-control input[type=\"text\"],\n.style-control input[type=\"number\"],\n.style-control select {\n  padding: 6px;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  font-size: 13px;\n}\n\n.style-control input[type=\"color\"] {\n  height: 36px;\n  cursor: pointer;\n}\n\n.style-control:disabled,\n.style-control[aria-disabled=\"true\"] input,\n.style-control[aria-disabled=\"true\"] select {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.image-control {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.image-control-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.image-control-actions button {\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.image-control-actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.image-control-meta {\n  font-size: 11px;\n  color: #6c757d;\n}\n\n.image-control-meta.muted {\n  color: #adb5bd;\n}\n\n.style-reset {\n  margin-top: 12px;\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n  width: 100%;\n}\n\n.style-reset:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n/* Diagram Container */\n.diagram-container {\n  flex: 1;\n  position: relative;\n  overflow: hidden;\n  background: #ffffff;\n}\n\n.diagram-wrapper {\n  width: 100%;\n  height: 100%;\n  position: relative;\n}\n\n.diagram {\n  width: 100%;\n  height: 100%;\n  cursor: default;\n}\n\n.diagram .node {\n  cursor: move;\n}\n\n.diagram .node.selected {\n  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .edge {\n  cursor: pointer;\n}\n\n.diagram .edge.selected {\n  filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .handle {\n  fill: #3b82f6;\n  stroke: #ffffff;\n  stroke-width: 2;\n  cursor: move;\n}\n\n.diagram .handle.active {\n  fill: #10b981;\n}\n\n.diagram .handle:hover {\n  fill: #2563eb;\n}\n\n.diagram .subgraph {\n  cursor: grab;\n}\n\n.diagram .subgraph:active {\n  cursor: grabbing;\n}\n\n.diagram .alignment-guide {\n  stroke: #3b82f6;\n  stroke-width: 1;\n  stroke-dasharray: 4 4;\n  pointer-events: none;\n}\n\n/* Mermaid 选择样式 */\n.mermaid-selected-node {\n  filter: drop-shadow(0 0 4px #007bff);\n  opacity: 0.9;\n}\n\n.mermaid-selected-edge path {\n  stroke-width: 4 !important;\n  filter: drop-shadow(0 0 2px #007bff);\n}\n\n.mermaid-selection-box {\n  pointer-events: none;\n}\n\n/* Mermaid 容器样式 */\n#diagram-container {\n  position: relative;\n  overflow: auto;\n  background: #ffffff;\n}\n\n#diagram-container svg {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n\n/* 交互元素样式 */\n[data-interactive=\"true\"] {\n  transition: opacity 0.2s;\n}\n\n[data-interactive=\"true\"]:hover {\n  opacity: 0.8;\n}\n\n/* 连接目标高亮 */\n.mermaid-hover-target {\n  filter: drop-shadow(0 0 6px #28a745) !important;\n  opacity: 0.9 !important;\n}\n\n/* 添加节点对话框样式 */\n.mermaid-add-node-dialog {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n}\n\n/* 标签编辑器样式 */\n.mermaid-label-editor input {\n  outline: none;\n}\n\n.mermaid-label-editor input:focus {\n  border-color: #0056b3 !important;\n  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);\n}\n\n/* CodeMirror 编辑器样式 */\n.CodeMirror {\n  height: 100%;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.CodeMirror-scroll {\n  min-height: 100%;\n}\n\n.CodeMirror-lines {\n  padding: 12px;\n}\n\n.CodeMirror-line {\n  padding: 0;\n}\n\n/* 错误行样式 */\n.CodeMirror-line.error-line {\n  background-color: #fee;\n}\n\n/* 原生编辑器样式（降级方案） */\n.mermaid-source-editor {\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n  tab-size: 2;\n}\n\n/* Source Panel */\n.source-panel {\n  width: 320px;\n  min-width: 240px;\n  border-left: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  background: #ffffff;\n  flex: 0 0 auto;\n}\n\n.panel-path {\n  font-size: 11px;\n  color: #6c757d;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n}\n\n.source-editor {\n  flex: 1;\n  padding: 12px;\n  border: none;\n  resize: none;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n  background: #ffffff;\n  color: #212529;\n}\n\n.source-editor:focus {\n  outline: none;\n}\n\n.panel-footer {\n  padding: 8px 12px;\n  border-top: 1px solid #e9ecef;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 11px;\n  background: #f8f9fa;\n}\n\n.source-status {\n  padding: 2px 6px;\n  border-radius: 3px;\n  font-size: 11px;\n}\n\n.source-status.synced {\n  color: #10b981;\n}\n\n.source-status.pending {\n  color: #f59e0b;\n}\n\n.source-status.saving {\n  color: #3b82f6;\n}\n\n.source-status.error {\n  color: #ef4444;\n}\n\n.selection-label {\n  color: #6c757d;\n  font-size: 11px;\n}\n\n/* Error Message */\n.error {\n  padding: 8px 16px;\n  background: #fee2e2;\n  color: #991b1b;\n  border-top: 1px solid #fecaca;\n  font-size: 13px;\n}\n\n/* Placeholder */\n.placeholder {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  color: #6c757d;\n  font-size: 14px;\n}\n\n/* Context Menu */\n.context-menu {\n  position: absolute;\n  background: #ffffff;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 4px 0;\n  z-index: 1000;\n  min-width: 120px;\n}\n\n.context-menu button {\n  width: 100%;\n  padding: 8px 16px;\n  text-align: left;\n  border: none;\n  background: none;\n  cursor: pointer;\n  font-size: 13px;\n  color: #212529;\n}\n\n.context-menu button:hover {\n  background: #f8f9fa;\n}\n\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./app/MermaidEditorAppV2.js":
/*!***********************************!*\
  !*** ./app/MermaidEditorAppV2.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidEditorAppV2: () => (/* binding */ MermaidEditorAppV2)
/* harmony export */ });
/* harmony import */ var _styles_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./styles.css */ "./app/styles.css");
/* harmony import */ var _lib_StateManager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/StateManager.js */ "./lib/StateManager.js");
/* harmony import */ var _lib_MermaidRenderer_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/MermaidRenderer.js */ "./lib/MermaidRenderer.js");
/* harmony import */ var _lib_MermaidInteractionLayer_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/MermaidInteractionLayer.js */ "./lib/MermaidInteractionLayer.js");
/* harmony import */ var _lib_MermaidLabelEditor_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/MermaidLabelEditor.js */ "./lib/MermaidLabelEditor.js");
/* harmony import */ var _lib_MermaidNodeAdder_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/MermaidNodeAdder.js */ "./lib/MermaidNodeAdder.js");
/* harmony import */ var _lib_MermaidNodeConnector_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/MermaidNodeConnector.js */ "./lib/MermaidNodeConnector.js");
/* harmony import */ var _lib_MermaidCodeEditor_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/MermaidCodeEditor.js */ "./lib/MermaidCodeEditor.js");
/* harmony import */ var _lib_MermaidParser_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/MermaidParser.js */ "./lib/MermaidParser.js");
/* harmony import */ var _lib_MermaidCodeGenerator_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/MermaidCodeGenerator.js */ "./lib/MermaidCodeGenerator.js");
/* harmony import */ var _lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/vscodeApi.js */ "./lib/vscodeApi.js");
// Mermaid Editor App V2 - 基于 mermaid.js 的新版本
// 阶段1实现：基础渲染、选择、样式编辑













class MermaidEditorAppV2 {
  constructor() {
    this.stateManager = new _lib_StateManager_js__WEBPACK_IMPORTED_MODULE_1__.StateManager();
    this.renderer = null;
    this.interactionLayer = null;
    this.labelEditor = null;
    this.nodeAdder = null;
    this.nodeConnector = null;
    this.codeEditor = null;
    this.parser = new _lib_MermaidParser_js__WEBPACK_IMPORTED_MODULE_8__.MermaidParser();
    this.codeGenerator = new _lib_MermaidCodeGenerator_js__WEBPACK_IMPORTED_MODULE_9__.MermaidCodeGenerator();
    
    this.saveTimer = null;
    this.lastSubmittedSource = null;
    this.isSaving = false;
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    
    // DOM elements
    this.elements = {
      errorMessage: document.getElementById('error-message'),
      workspace: document.getElementById('workspace'),
      diagramPanel: document.getElementById('diagram-panel'),
      workspaceDivider: document.getElementById('workspace-divider'),
      diagramContainer: document.getElementById('diagram-container'),
      sourcePanel: document.getElementById('source-panel'),
      sourcePath: document.getElementById('source-path'),
      sourceEditor: document.getElementById('source-editor'),
      sourceStatus: document.getElementById('source-status'),
      selectionLabel: document.getElementById('selection-label'),
    };
    
    this.init();
  }
  
  async init() {
    // 初始化 mermaid 渲染器
    this.renderer = new _lib_MermaidRenderer_js__WEBPACK_IMPORTED_MODULE_2__.MermaidRenderer(this.elements.diagramContainer);
    
    // 初始化标签编辑器
    this.labelEditor = new _lib_MermaidLabelEditor_js__WEBPACK_IMPORTED_MODULE_4__.MermaidLabelEditor(
      this.renderer,
      this.parser,
      this.codeGenerator
    );
    
    // 初始化节点添加器
    this.nodeAdder = new _lib_MermaidNodeAdder_js__WEBPACK_IMPORTED_MODULE_5__.MermaidNodeAdder(
      this.renderer,
      this.parser,
      this.codeGenerator
    );
    
    // 初始化节点连接器
    this.nodeConnector = new _lib_MermaidNodeConnector_js__WEBPACK_IMPORTED_MODULE_6__.MermaidNodeConnector(
      this.renderer,
      this.parser,
      this.codeGenerator
    );
    this.nodeConnector.setOnConnectionCreated(async (newSource) => {
      if (this.codeEditor) {
        this.codeEditor.setValue(newSource);
      } else {
        this.elements.sourceEditor.value = newSource;
      }
      await this.renderDiagram(newSource);
      await this.saveSource(newSource);
    });
    
    // 初始化交互层
    this.interactionLayer = new _lib_MermaidInteractionLayer_js__WEBPACK_IMPORTED_MODULE_3__.MermaidInteractionLayer(this.renderer, {
      onNodeSelect: (nodeId, nodeInfo, element) => this.handleNodeSelect(nodeId, nodeInfo),
      onEdgeSelect: (edgeIndex, edgeInfo, element) => this.handleEdgeSelect(edgeIndex, edgeInfo),
      onElementDblClick: (type, id, element) => this.handleElementDblClick(type, id, element),
      onCanvasClick: () => this.handleCanvasClick(),
      onCanvasDblClick: (e) => this.handleCanvasDblClick(e),
      onNodeCtrlClick: (nodeId, e) => this.handleNodeCtrlClick(nodeId, e),
      onMultiSelect: (selection) => this.handleMultiSelect(selection),
    });
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    // 设置事件监听
    // 初始化代码编辑器
    this.codeEditor = new _lib_MermaidCodeEditor_js__WEBPACK_IMPORTED_MODULE_7__.MermaidCodeEditor(this.elements.sourceEditor, {
      onChange: (value) => {
        this.handleSourceChange();
      },
      onError: (error) => {
        this.stateManager.setState({ error: error.message });
      }
    });
    
    this.setupEventListeners();
    this.setupWorkspaceResizer();
    
    // 设置 VSCode 消息监听
    if (_lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_10__.isVSCodeWebview) {
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'load' || data.type === 'load-response') {
          if (this.isSaving) return;
          if (data.diagram) {
            this.handleDiagramLoad(data.diagram);
          }
        }
      });
      
      if (window.pendingDiagram) {
        this.handleDiagramLoad(window.pendingDiagram);
        window.pendingDiagram = null;
      } else {
        this.loadDiagram();
      }
    } else {
      this.loadDiagram();
    }
  }
  
  setupEventListeners() {
    // 源代码编辑器变化（如果使用原生编辑器）
    if (!this.codeEditor.editor) {
      this.elements.sourceEditor.addEventListener('input', () => {
        this.handleSourceChange();
      });
    }
    
    // 键盘删除快捷键
    if (!this.boundHandleKeyDown) {
      this.boundHandleKeyDown = this.handleKeyDown.bind(this);
      window.addEventListener('keydown', this.boundHandleKeyDown);
    }
  }
  
  handleKeyDown(event) {
    const key = event.key;
    if (key !== 'Delete' && key !== 'Backspace') {
      return;
    }
    
    // 如果焦点在代码编辑器或输入框中，则不处理
    if (this.codeEditor?.editor && typeof this.codeEditor.editor.hasFocus === 'function' && this.codeEditor.editor.hasFocus()) {
      return;
    }
    const target = event.target;
    if (target) {
      const tagName = target.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable || target.closest('.CodeMirror') || target.closest('.mermaid-label-editor')) {
        return;
      }
    }
    
    const selection = this.interactionLayer?.getAllSelected();
    if (!selection) {
      return;
    }
    const hasSelection = selection.nodes.length > 0 || selection.edges.length > 0 || this.selectedNodeId || this.selectedEdgeIndex !== null;
    if (!hasSelection) {
      return;
    }
    
    event.preventDefault();
    this.handleDeleteSelected();
  }
  
  setupWorkspaceResizer() {
    const workspace = this.elements.workspace;
    const divider = this.elements.workspaceDivider;
    const diagramPanel = this.elements.diagramPanel;
    const sourcePanel = this.elements.sourcePanel;
    
    if (!workspace || !divider || !diagramPanel || !sourcePanel) {
      return;
    }
    
    const minDiagramWidth = 320;
    const minSourceWidth = 240;
    const getDividerWidth = () => divider.getBoundingClientRect().width || 6;
    let isDragging = false;
    let startX = 0;
    let startDiagramWidth = 0;
    
    const onDrag = (event) => {
      if (!isDragging) return;
      const workspaceRect = workspace.getBoundingClientRect();
      const delta = event.clientX - startX;
      const dividerWidth = getDividerWidth();
      const maxDiagramWidth = workspaceRect.width - dividerWidth - minSourceWidth;
      let newDiagramWidth = startDiagramWidth + delta;
      newDiagramWidth = Math.max(minDiagramWidth, Math.min(maxDiagramWidth, newDiagramWidth));
      const newSourceWidth = workspaceRect.width - newDiagramWidth - dividerWidth;
      
      diagramPanel.style.flex = 'none';
      diagramPanel.style.width = `${newDiagramWidth}px`;
      sourcePanel.style.flex = 'none';
      sourcePanel.style.width = `${newSourceWidth}px`;
    };
    
    const stopDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      workspace.classList.remove('resizing');
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    
    const startDrag = (event) => {
      if (event.button !== 0) return;
      isDragging = true;
      startX = event.clientX;
      startDiagramWidth = diagramPanel.getBoundingClientRect().width;
      workspace.classList.add('resizing');
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      event.preventDefault();
    };
    
    const adjustByStep = (delta) => {
      const workspaceRect = workspace.getBoundingClientRect();
      const dividerWidth = getDividerWidth();
      const currentWidth = diagramPanel.getBoundingClientRect().width;
      let newDiagramWidth = currentWidth + delta;
      const maxDiagramWidth = workspaceRect.width - dividerWidth - minSourceWidth;
      newDiagramWidth = Math.max(minDiagramWidth, Math.min(maxDiagramWidth, newDiagramWidth));
      const newSourceWidth = workspaceRect.width - newDiagramWidth - dividerWidth;
      diagramPanel.style.flex = 'none';
      diagramPanel.style.width = `${newDiagramWidth}px`;
      sourcePanel.style.flex = 'none';
      sourcePanel.style.width = `${newSourceWidth}px`;
    };
    
    divider.addEventListener('mousedown', startDrag);
    divider.addEventListener('dragstart', (event) => event.preventDefault());
    divider.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 40 : 20;
      if (event.key === 'ArrowLeft') {
        adjustByStep(-step);
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        adjustByStep(step);
        event.preventDefault();
      }
    });
  }
  
  async loadDiagram() {
    try {
      this.stateManager.setState({ loading: true });
      const diagram = await (0,_lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_10__.fetchDiagram)();
      this.handleDiagramLoad(diagram);
    } catch (error) {
      console.error('Load diagram error:', error);
      this.stateManager.setState({
        loading: false,
        error: error.message || '加载图表失败'
      });
    }
  }
  
  handleDiagramLoad(diagram) {
    const source = diagram.source || '';
    
    this.stateManager.setState({
      diagram: diagram,
      source: source,
      sourceDraft: source,
      loading: false,
      error: null
    });
    
    // 更新代码编辑器
    if (this.codeEditor) {
      this.codeEditor.setValue(source);
    } else {
      this.elements.sourceEditor.value = source;
    }
    if (diagram.sourcePath) {
      this.elements.sourcePath.textContent = diagram.sourcePath;
    }
    
    // 渲染图表
    this.renderDiagram(source);
  }
  
  async renderDiagram(source) {
    try {
      await this.renderer.render(source);
      this.interactionLayer.update();
      
      this.stateManager.setState({ error: null });
    } catch (error) {
      console.error('Render error:', error);
      this.stateManager.setState({
        error: `渲染错误: ${error.message}`
      });
    }
  }
  
  handleSourceChange() {
    const source = this.codeEditor ? this.codeEditor.getValue() : this.elements.sourceEditor.value;
    this.stateManager.setState({ sourceDraft: source });
    
    // 防抖重新渲染
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      await this.renderDiagram(source);
    }, 500);
  }
  
  handleNodeSelect(nodeId, nodeInfo) {
    this.selectedNodeId = nodeId;
    this.selectedEdgeIndex = null;
    
    this.stateManager.setState({
      selectedNodeId: nodeId,
      selectedEdgeId: null
    });
    
  }
  
  handleEdgeSelect(edgeIndex, edgeInfo) {
    this.selectedEdgeIndex = edgeIndex;
    this.selectedNodeId = null;
    
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: `edge-${edgeIndex}`
    });
    
  }
  
  handleElementDblClick(type, id, element) {
    if (type === 'node') {
      // 双击节点，进入标签编辑模式
      this.startLabelEdit(id, 'node');
    } else if (type === 'edge') {
      // 双击边，进入标签编辑模式
      this.startLabelEdit(id, 'edge');
    }
  }
  
  handleCanvasClick() {
    // 如果正在编辑标签，不处理点击
    if (this.labelEditor && this.labelEditor.isEditing()) {
      return;
    }
    
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: null
    });
    
  }
  
  handleNodeCtrlClick(nodeId, e) {
    // Ctrl/Cmd + 点击节点：开始连接
    this.nodeConnector.startConnecting(nodeId, e);
  }
  
  handleCanvasDblClick(e) {
    // 如果正在编辑标签，不处理双击
    if (this.labelEditor && this.labelEditor.isEditing()) {
      return;
    }
    
    // 双击空白处，显示添加节点对话框
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    const svgPoint = this.nodeAdder.getSVGPoint(svg, e.clientX, e.clientY);
    if (svgPoint) {
      this.nodeAdder.showAddNodeDialog(svgPoint, async (newSource, nodeId) => {
        this.elements.sourceEditor.value = newSource;
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
        
        // 自动选择新添加的节点
        setTimeout(() => {
          const nodeInfo = this.renderer.getNode(nodeId);
          if (nodeInfo) {
            const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
              this.interactionLayer.selectNode(nodeId, nodeElement);
              this.handleNodeSelect(nodeId, nodeInfo);
            }
          }
        }, 100);
      });
    }
  }
  
  startLabelEdit(id, type) {
    if (type === 'node') {
      this.labelEditor.startNodeLabelEdit(id, async (newSource) => {
        if (this.codeEditor) {
          this.codeEditor.setValue(newSource);
        } else {
          this.elements.sourceEditor.value = newSource;
        }
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
      });
    } else if (type === 'edge') {
      this.labelEditor.startEdgeLabelEdit(id, async (newSource) => {
        if (this.codeEditor) {
          this.codeEditor.setValue(newSource);
        } else {
          this.elements.sourceEditor.value = newSource;
        }
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
      });
    }
  }
  
  async handleDeleteSelected() {
    const selection = this.interactionLayer.getAllSelected();
    
    // 如果有多个选中项，批量删除
    if (selection.nodes.length > 1 || selection.edges.length > 0) {
      await this.deleteMultiple(selection);
      return;
    }
    
    // 单个删除
    if (this.selectedNodeId) {
      await this.deleteNode(this.selectedNodeId);
    } else if (this.selectedEdgeIndex !== null) {
      await this.deleteEdge(this.selectedEdgeIndex);
    }
  }
  
  async deleteMultiple(selection) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 删除多个节点
    if (selection.nodes.length > 0) {
      const nodeIdsToDelete = new Set(selection.nodes);
      ast.nodes = ast.nodes.filter(n => !nodeIdsToDelete.has(n.id));
      ast.edges = ast.edges.filter(e => 
        !nodeIdsToDelete.has(e.from) && !nodeIdsToDelete.has(e.to)
      );
      
      // 删除相关样式
      selection.nodes.forEach(nodeId => {
        ast.classDefs = ast.classDefs.filter(cd => cd.name !== `style-${nodeId}`);
        if (ast.classApplications) {
          ast.classApplications = ast.classApplications.filter(ca => !ca.nodes.includes(nodeId));
        }
      });
    }
    
    // 删除多个边（需要重新索引）
    if (selection.edges.length > 0) {
      const edgesToDelete = new Set(selection.edges);
      const newEdges = [];
      const newLinkStyles = [];
      
      ast.edges.forEach((edge, index) => {
        if (!edgesToDelete.has(index)) {
          newEdges.push(edge);
          if (ast.linkStyles && ast.linkStyles[index]) {
            newLinkStyles[newEdges.length - 1] = ast.linkStyles[index];
          }
        }
      });
      
      ast.edges = newEdges;
      ast.linkStyles = newLinkStyles;
    }
    
    const newSource = this.codeGenerator.generate(ast, source);
    if (this.codeEditor) {
      this.codeEditor.setValue(newSource);
    } else {
      this.elements.sourceEditor.value = newSource;
    }
    await this.renderDiagram(newSource);
    await this.saveSource(newSource);
    
    this.clearSelection();
  }
  
  handleMultiSelect(selection) {
    const count = selection.nodes.length + selection.edges.length;
    if (count > 1 && this.elements.selectionLabel) {
      this.elements.selectionLabel.textContent = `已选择 ${count} 个元素`;
    }
  }
  
  async deleteNode(nodeId) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 删除节点
    ast.nodes = ast.nodes.filter(n => n.id !== nodeId);
    
    // 删除相关的边
    ast.edges = ast.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    
    // 删除相关的样式
    ast.classDefs = ast.classDefs.filter(cd => cd.name !== `style-${nodeId}`);
    if (ast.classApplications) {
      ast.classApplications = ast.classApplications.filter(ca => !ca.nodes.includes(nodeId));
    }
    
    const newSource = this.codeGenerator.generate(ast, source);
    if (this.codeEditor) {
      this.codeEditor.setValue(newSource);
    } else {
      this.elements.sourceEditor.value = newSource;
    }
    await this.renderDiagram(newSource);
    await this.saveSource(newSource);
    
    this.clearSelection();
  }
  
  async deleteEdge(edgeIndex) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 删除边
    ast.edges.splice(edgeIndex, 1);
    
    // 删除相关的 linkStyle（需要重新索引）
    if (ast.linkStyles) {
      const newLinkStyles = [];
      ast.linkStyles.forEach((linkStyle, index) => {
        if (linkStyle && index !== edgeIndex) {
          const newIndex = index > edgeIndex ? index - 1 : index;
          newLinkStyles[newIndex] = linkStyle;
        }
      });
      ast.linkStyles = newLinkStyles;
    }
    
    const newSource = this.codeGenerator.generate(ast, source);
    if (this.codeEditor) {
      this.codeEditor.setValue(newSource);
    } else {
      this.elements.sourceEditor.value = newSource;
    }
    await this.renderDiagram(newSource);
    await this.saveSource(newSource);
    
    this.clearSelection();
  }
  
  clearSelection() {
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    this.interactionLayer.clearSelection();
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: null
    });
  }
  
  async saveSource(source) {
    this.isSaving = true;
    try {
      const diagram = {
        ...this.stateManager.diagram,
        source: source
      };
      await (0,_lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_10__.saveDiagram)(diagram);
      this.stateManager.setState({ source: source, sourceDraft: source });
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      this.isSaving = false;
    }
  }
  
  onStateChange(state) {
    // 更新错误消息
    if (state.error) {
      this.elements.errorMessage.textContent = state.error;
      this.elements.errorMessage.style.display = 'block';
    } else {
      this.elements.errorMessage.style.display = 'none';
    }
    
    // 更新选择标签
    let selectionLabel = '未选择';
    const selection = this.interactionLayer?.getAllSelected();
    if (selection) {
      const count = selection.nodes.length + selection.edges.length;
      if (count > 1) {
        selectionLabel = `已选择 ${count} 个元素`;
      } else if (state.selectedNodeId) {
        selectionLabel = `节点: ${state.selectedNodeId}`;
      } else if (state.selectedEdgeId) {
        selectionLabel = `边: ${state.selectedEdgeId}`;
      }
    } else if (state.selectedNodeId) {
      selectionLabel = `节点: ${state.selectedNodeId}`;
    } else if (state.selectedEdgeId) {
      selectionLabel = `边: ${state.selectedEdgeId}`;
    }
    if (this.elements.selectionLabel) {
      this.elements.selectionLabel.textContent = selectionLabel;
    }
  }
}

// 导出类供全局使用
if (typeof window !== 'undefined') {
  window.MermaidEditorAppV2 = MermaidEditorAppV2;
}

// 如果直接加载，自动初始化
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  // 延迟初始化，确保所有脚本已加载
  setTimeout(() => {
    if (!window.app && window.MermaidEditorAppV2) {
      window.app = new MermaidEditorAppV2();
    }
  }, 100);
}



/***/ }),

/***/ "./app/styles.css":
/*!************************!*\
  !*** ./app/styles.css ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_style_loader_2_0_0_webpack_5_103_0_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/.pnpm/style-loader@2.0.0_webpack@5.103.0/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../node_modules/.pnpm/style-loader@2.0.0_webpack@5.103.0/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_pnpm_style_loader_2_0_0_webpack_5_103_0_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_2_0_0_webpack_5_103_0_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_cjs_js_styles_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/cjs.js!./styles.css */ "../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/cjs.js!./app/styles.css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_pnpm_style_loader_2_0_0_webpack_5_103_0_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_cjs_js_styles_css__WEBPACK_IMPORTED_MODULE_1__["default"], options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_pnpm_css_loader_5_2_7_webpack_5_103_0_node_modules_css_loader_dist_cjs_js_styles_css__WEBPACK_IMPORTED_MODULE_1__["default"].locals || {});

/***/ }),

/***/ "./lib/MermaidCodeEditor.js":
/*!**********************************!*\
  !*** ./lib/MermaidCodeEditor.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidCodeEditor: () => (/* binding */ MermaidCodeEditor)
/* harmony export */ });
// Mermaid 代码编辑器
// 集成语法高亮和自动补全功能

class MermaidCodeEditor {
  constructor(textareaElement, callbacks = {}) {
    this.textarea = textareaElement;
    this.callbacks = {
      onChange: callbacks.onChange || (() => {}),
      onError: callbacks.onError || (() => {})
    };
    
    this.editor = null;
    this.init();
  }
  
  async init() {
    // 动态导入 CodeMirror（如果可用）
    try {
      // 尝试使用 CodeMirror
      if (typeof CodeMirror !== 'undefined') {
        this.initCodeMirror();
      } else {
        // 降级到原生 textarea，但添加基础样式
        this.initNativeEditor();
      }
    } catch (error) {
      console.warn('CodeMirror not available, using native editor', error);
      this.initNativeEditor();
    }
  }
  
  /**
   * 初始化 CodeMirror 编辑器
   */
  initCodeMirror() {
    // 检查 CodeMirror 是否已加载
    if (typeof CodeMirror === 'undefined') {
      this.initNativeEditor();
      return;
    }
    
    // 尝试定义 Mermaid 语法模式（简化版）
    // 如果 defineSimpleMode 不可用，使用 text/plain 模式
    try {
      if (typeof CodeMirror.defineSimpleMode === 'function') {
        CodeMirror.defineSimpleMode('mermaid', {
          start: [
            { regex: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|gitgraph|journey|erDiagram|requirementDiagram|mindmap|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\s+(TD|LR|BT|RL|V|H)/, token: 'keyword' },
            { regex: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|gitgraph|journey|erDiagram|requirementDiagram|mindmap|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)/, token: 'keyword' },
            { regex: /(TD|LR|BT|RL|V|H)/, token: 'atom' },
            { regex: /(subgraph|end)/, token: 'keyword' },
            { regex: /(classDef|class|linkStyle|style|click)/, token: 'keyword' },
            { regex: /(\w+)\[([^\]]*)\]/, token: ['variable', null, 'string'] },
            { regex: /(\w+)\(([^)]*)\)/, token: ['variable', null, 'string'] },
            { regex: /(\w+)\{([^}]*)\}/, token: ['variable', null, 'string'] },
            { regex: /(\w+)\s*(-->|--|==>|===|-\.->|-\.-)\s*(\w+)/, token: ['variable', 'operator', 'variable'] },
            { regex: /(\w+)\s*(-->|--|==>|===|-\.->|-\.-)\s*\|([^|]+)\|\s*(\w+)/, token: ['variable', 'operator', 'string', 'variable'] },
            { regex: /%%.*/, token: 'comment' },
            { regex: /\/\/.*/, token: 'comment' },
            { regex: /#[0-9a-fA-F]{6}/, token: 'number' },
            { regex: /"[^"]*"/, token: 'string' },
            { regex: /'[^']*'/, token: 'string' },
            { regex: /\s+/, token: null }
          ]
        });
      }
    } catch (error) {
      console.warn('Failed to define Mermaid mode, using plain text mode', error);
    }
    
    // 创建 CodeMirror 编辑器
    this.editor = CodeMirror.fromTextArea(this.textarea, {
      mode: typeof CodeMirror.defineSimpleMode === 'function' ? 'mermaid' : 'text/plain',
      theme: 'default',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
      autofocus: false,
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Tab': (cm) => {
          if (cm.somethingSelected()) {
            cm.indentSelection('add');
          } else {
            cm.replaceSelection('  ', 'end');
          }
        }
      }
    });
    
    // 监听变化
    this.editor.on('change', (cm) => {
      const value = cm.getValue();
      this.callbacks.onChange(value);
    });
    
    // 添加自动补全（如果可用）
    if (typeof CodeMirror.showHint !== 'undefined') {
      this.setupAutocomplete();
    }
  }
  
  /**
   * 初始化原生编辑器（降级方案）
   */
  initNativeEditor() {
    // 添加基础样式类
    this.textarea.classList.add('mermaid-source-editor');
    
    // 监听变化
    this.textarea.addEventListener('input', () => {
      this.callbacks.onChange(this.textarea.value);
    });
    
    // 添加基础语法高亮（通过 CSS）
    this.textarea.addEventListener('input', () => {
      this.applyBasicHighlighting();
    });
  }
  
  /**
   * 设置自动补全
   */
  setupAutocomplete() {
    if (!this.editor || typeof CodeMirror.registerHelper === 'undefined') return;
    
    try {
      CodeMirror.registerHelper('hint', 'mermaid', (cm) => {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const start = cursor.ch;
        const end = cursor.ch;
        
        const suggestions = [
          'graph TD', 'graph LR', 'graph BT', 'graph RL',
          'flowchart TD', 'flowchart LR',
          'A[Label]', 'A(Label)', 'A{Label}', 'A((Label))',
          'A --> B', 'A --- B', 'A -.-> B', 'A ==> B',
          'classDef', 'class', 'linkStyle', 'style',
          'subgraph', 'end'
        ];
        
        const word = line.slice(0, start).match(/\w+$/);
        const prefix = word ? word[0] : '';
        
        const filtered = suggestions.filter(s => s.startsWith(prefix));
        
        return {
          list: filtered.length > 0 ? filtered : suggestions,
          from: CodeMirror.Pos(cursor.line, start - prefix.length),
          to: CodeMirror.Pos(cursor.line, end)
        };
      });
    } catch (error) {
      console.warn('Failed to setup autocomplete', error);
    }
  }
  
  /**
   * 基础语法高亮（降级方案）
   */
  applyBasicHighlighting() {
    // 这是一个非常简单的实现，主要通过 CSS 类来实现
    // 实际项目中建议使用 CodeMirror 或 Monaco Editor
  }
  
  /**
   * 获取编辑器内容
   */
  getValue() {
    if (this.editor) {
      return this.editor.getValue();
    }
    return this.textarea.value;
  }
  
  /**
   * 设置编辑器内容
   */
  setValue(value) {
    if (this.editor) {
      this.editor.setValue(value);
    } else {
      this.textarea.value = value;
    }
  }
  
  /**
   * 聚焦编辑器
   */
  focus() {
    if (this.editor) {
      this.editor.focus();
    } else {
      this.textarea.focus();
    }
  }
  
  /**
   * 设置只读
   */
  setReadOnly(readOnly) {
    if (this.editor) {
      this.editor.setOption('readOnly', readOnly);
    } else {
      this.textarea.readOnly = readOnly;
    }
  }
  
  /**
   * 标记错误行
   */
  markError(line, message) {
    if (this.editor) {
      this.editor.addLineClass(line - 1, 'background', 'error-line');
      // 可以添加错误提示
    }
  }
  
  /**
   * 清除错误标记
   */
  clearErrors() {
    if (this.editor) {
      this.editor.removeLineClass(null, 'background', 'error-line');
    }
  }
  
  /**
   * 获取光标位置
   */
  getCursor() {
    if (this.editor) {
      return this.editor.getCursor();
    }
    return { line: 0, ch: 0 };
  }
  
  /**
   * 设置光标位置
   */
  setCursor(line, ch) {
    if (this.editor) {
      this.editor.setCursor(line, ch);
    } else {
      // 对于 textarea，设置选择范围
      const text = this.textarea.value;
      const lines = text.split('\n');
      let pos = 0;
      for (let i = 0; i < line && i < lines.length; i++) {
        pos += lines[i].length + 1; // +1 for newline
      }
      pos += ch;
      this.textarea.setSelectionRange(pos, pos);
    }
  }
}



/***/ }),

/***/ "./lib/MermaidCodeGenerator.js":
/*!*************************************!*\
  !*** ./lib/MermaidCodeGenerator.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidCodeGenerator: () => (/* binding */ MermaidCodeGenerator)
/* harmony export */ });
// Mermaid 代码生成器
// 从 AST 生成 mermaid 源代码，尽量保留原始格式

class MermaidCodeGenerator {
  /**
   * 生成 mermaid 源代码
   */
  generate(ast, originalSource = '') {
    // 如果只是样式修改，尝试保留原始格式
    if (originalSource && this.canPreserveFormat(ast, originalSource)) {
      return this.updatePreservingFormat(ast, originalSource);
    }
    
    // 否则生成新代码
    return this.generateNew(ast);
  }
  
  /**
   * 检查是否可以保留格式
   */
  canPreserveFormat(newAST, originalSource) {
    // 简单检查：如果节点和边的数量相同，可能可以保留格式
    const originalAST = this.parse(originalSource);
    return (
      newAST.nodes.length === originalAST.nodes.length &&
      newAST.edges.length === originalAST.edges.length &&
      newAST.subgraphs.length === originalAST.subgraphs.length
    );
  }
  
  /**
   * 更新代码，保留原始格式（包括 subgraph）
   */
  updatePreservingFormat(newAST, originalSource) {
    const lines = originalSource.split('\n');
    const updatedLines = [...lines]; // 保留所有原始行，包括 subgraph
    
    // 标记哪些行是样式相关的，需要更新
    const styleLineNumbers = new Set();
    if (newAST.nodeStyles) {
      newAST.nodeStyles.forEach(styleDef => {
        if (styleDef.lineNumber >= 0) {
          styleLineNumbers.add(styleDef.lineNumber);
        }
      });
    }
    newAST.classDefs.forEach(classDef => {
      if (classDef.lineNumber >= 0) {
        styleLineNumbers.add(classDef.lineNumber);
      }
    });
    newAST.linkStyles.forEach((linkStyle, index) => {
      if (linkStyle && linkStyle.lineNumber >= 0) {
        styleLineNumbers.add(linkStyle.lineNumber);
      }
    });
    newAST.classApplications.forEach(app => {
      if (app.lineNumber >= 0) {
        styleLineNumbers.add(app.lineNumber);
      }
    });
    
    // 更新 style 指令（最常用的方式）
    if (newAST.nodeStyles) {
      newAST.nodeStyles.forEach(styleDef => {
        if (styleDef.lineNumber >= 0 && styleDef.lineNumber < lines.length) {
          // 检查原行的缩进
          const originalLine = lines[styleDef.lineNumber];
          const indent = originalLine.match(/^\s*/)?.[0] || '    ';
          updatedLines[styleDef.lineNumber] = indent + this.generateStyle(styleDef);
        } else if (styleDef.lineNumber === -1) {
          // 新添加的 style，添加到文件末尾（在 subgraph end 之后）
          const insertIndex = this.findInsertIndexForStyle(updatedLines);
          updatedLines.splice(insertIndex, 0, '    ' + this.generateStyle(styleDef));
        }
      });
    }
    
    // 更新 classDef（保留兼容性）
    newAST.classDefs.forEach(classDef => {
      if (classDef.lineNumber >= 0 && classDef.lineNumber < lines.length) {
        // 检查原行的缩进
        const originalLine = lines[classDef.lineNumber];
        const indent = originalLine.match(/^\s*/)?.[0] || '    ';
        updatedLines[classDef.lineNumber] = indent + this.generateClassDef(classDef);
      } else if (classDef.lineNumber === -1) {
        // 新添加的 classDef，添加到文件末尾（在 subgraph end 之前）
        const insertIndex = this.findInsertIndexForStyle(updatedLines);
        updatedLines.splice(insertIndex, 0, '    ' + this.generateClassDef(classDef));
      }
    });
    
    // 更新 linkStyle（需要添加缩进）
    newAST.linkStyles.forEach((linkStyle, index) => {
      if (linkStyle && linkStyle.lineNumber >= 0 && linkStyle.lineNumber < lines.length) {
        // 检查原行的缩进
        const originalLine = lines[linkStyle.lineNumber];
        const indent = originalLine.match(/^\s*/)?.[0] || '    ';
        updatedLines[linkStyle.lineNumber] = indent + this.generateLinkStyle(index, linkStyle);
      } else if (linkStyle && linkStyle.lineNumber === -1) {
        // 新添加的 linkStyle，添加到文件末尾（在 subgraph end 之前）
        const insertIndex = this.findInsertIndexForStyle(updatedLines);
        updatedLines.splice(insertIndex, 0, '    ' + this.generateLinkStyle(index, linkStyle));
      }
    });
    
    // 更新 class 应用（需要添加缩进）
    newAST.classApplications.forEach(app => {
      if (app.lineNumber >= 0 && app.lineNumber < lines.length) {
        // 检查原行的缩进
        const originalLine = lines[app.lineNumber];
        const indent = originalLine.match(/^\s*/)?.[0] || '    ';
        updatedLines[app.lineNumber] = indent + this.generateClassApplication(app);
      } else if (app.lineNumber === -1) {
        // 新添加的 class 应用，添加到文件末尾（在 subgraph end 之前）
        const insertIndex = this.findInsertIndexForStyle(updatedLines);
        updatedLines.splice(insertIndex, 0, '    ' + this.generateClassApplication(app));
      }
    });
    
    return updatedLines.join('\n');
  }
  
  /**
   * 找到插入样式代码的位置（在最后一个 subgraph end 之后，或文件末尾）
   */
  findInsertIndexForStyle(lines) {
    // 从后往前找最后一个 'end'（subgraph 结束标记）
    // 但要确保不是在 subgraph 内部
    let lastEndIndex = -1;
    let inSubgraph = false;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed === 'end') {
        lastEndIndex = i;
        inSubgraph = true;
      } else if (trimmed.match(/^subgraph/)) {
        inSubgraph = false;
        if (lastEndIndex >= 0) {
          // 找到了完整的 subgraph，在 end 之后插入
          return lastEndIndex + 1;
        }
      }
    }
    
    // 如果找到了 end，在 end 之后插入
    if (lastEndIndex >= 0) {
      return lastEndIndex + 1;
    }
    
    // 如果没有找到 end，返回文件末尾
    return lines.length;
  }
  
  /**
   * 生成新代码
   */
  generateNew(ast) {
    let code = '';
    
    // 生成 init 配置（如果有）
    if (ast.styles && Object.keys(ast.styles).length > 0) {
      code += this.generateInit(ast.styles) + '\n';
    }
    
    // 生成图表声明
    code += `graph ${ast.direction}\n`;
    
    // 生成节点
    ast.nodes.forEach(node => {
      code += `    ${this.generateNode(node)}\n`;
    });
    
    // 生成边
    ast.edges.forEach(edge => {
      code += `    ${this.generateEdge(edge)}\n`;
    });
    
    // 生成 style 指令（最常用的方式）
    if (ast.nodeStyles) {
      ast.nodeStyles.forEach(styleDef => {
        code += `    ${this.generateStyle(styleDef)}\n`;
      });
    }
    
    // 生成 classDef（保留兼容性）
    ast.classDefs.forEach(classDef => {
      code += `    ${this.generateClassDef(classDef)}\n`;
    });
    
    // 生成 class 应用
    ast.classApplications.forEach(app => {
      code += `    ${this.generateClassApplication(app)}\n`;
    });
    
    // 生成 linkStyle
    ast.linkStyles.forEach((linkStyle, index) => {
      if (linkStyle) {
        code += `    ${this.generateLinkStyle(index, linkStyle)}\n`;
      }
    });
    
    return code.trim();
  }
  
  /**
   * 生成节点代码
   */
  generateNode(node) {
    const shapeChars = {
      rectangle: ['[', ']'],
      stadium: ['(', ')'],
      diamond: ['{', '}'],
      circle: ['((', '))'],
      subroutine: ['[[', ']]'],
      cylinder: ['[//', ']'],
      hexagon: ['{//', '}'],
      parallelogram: ['[///', ']'],
    };
    
    const [start, end] = shapeChars[node.shape] || ['[', ']'];
    return `${node.id}${start}${node.label}${end}`;
  }
  
  /**
   * 生成边代码
   */
  generateEdge(edge) {
    const typeMap = {
      'arrow': '-->',
      'line': '---',
      'dotted-arrow': '-.->',
      'dotted-line': '-.-',
      'thick-arrow': '==>',
      'thick-line': '==='
    };
    
    const connector = typeMap[edge.type] || '-->';
    const label = edge.label ? `|${edge.label}|` : '';
    return `${edge.from} ${connector} ${label} ${edge.to}`;
  }
  
  /**
   * 生成 style 指令（最常用的方式）
   */
  generateStyle(styleDef) {
    const styles = Object.entries(styleDef.styles)
      .map(([key, value]) => {
        // 规范化颜色值
        if ((key === 'fill' || key === 'stroke' || key === 'color') && typeof value === 'string' && value.startsWith('#')) {
          value = this.normalizeColor(value);
        }
        // stroke-width 可以保留 px 单位（Mermaid 支持）
        return `${key}:${value}`;
      })
      .join(',');
    return `style ${styleDef.nodeId} ${styles}`;
  }
  
  /**
   * 生成 classDef
   */
  generateClassDef(classDef) {
    const styles = Object.entries(classDef.styles)
      .map(([key, value]) => {
        // 规范化颜色值
        if ((key === 'fill' || key === 'stroke' || key === 'color') && typeof value === 'string' && value.startsWith('#')) {
          // 规范化颜色值格式
          value = this.normalizeColor(value);
        }
        // 规范化 stroke-width 值（移除 px 单位）
        if (key === 'stroke-width' && typeof value === 'string') {
          value = value.replace(/px\s*$/, '');
        }
        return `${key}:${value}`;
      })
      .join(',');
    return `classDef ${classDef.name} ${styles}`;
  }
  
  /**
   * 规范化颜色值
   */
  normalizeColor(color) {
    if (!color || !color.startsWith('#')) {
      return color;
    }
    
    // 移除 # 号
    const hex = color.slice(1);
    
    // 如果是 3 位十六进制，扩展为 6 位
    if (hex.length === 3) {
      return '#' + hex.split('').map(c => c + c).join('');
    }
    
    // 如果是 1 位，扩展为 6 位（重复 6 次）
    if (hex.length === 1) {
      return '#' + hex.repeat(6);
    }
    
    // 如果是 2 位，扩展为 6 位（灰度值）
    if (hex.length === 2) {
      return '#' + hex.repeat(3);
    }
    
    // 如果已经是 6 位，直接返回
    if (hex.length === 6) {
      return color;
    }
    
    // 其他情况，尝试补齐到 6 位
    if (hex.length < 6) {
      return '#' + hex.padEnd(6, '0');
    }
    
    return color;
  }
  
  /**
   * 生成 class 应用
   */
  generateClassApplication(app) {
    return `class ${app.nodes.join(',')} ${app.className}`;
  }
  
  /**
   * 生成 linkStyle
   */
  generateLinkStyle(index, linkStyle) {
    const styles = Object.entries(linkStyle.styles)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
    return `linkStyle ${index} ${styles}`;
  }
  
  /**
   * 生成 init 配置
   */
  generateInit(styles) {
    const themeVars = Object.entries(styles)
      .map(([key, value]) => `'${key}':'${value}'`)
      .join(',');
    return `%%{init: {'themeVariables': {${themeVars}}}}%%`;
  }
  
  /**
   * 简单解析（用于格式保留检查）
   */
  parse(source) {
    // 简化版解析，只用于检查结构
    const nodes = [];
    const edges = [];
    
    const nodePattern = /(\w+)\[([^\]]*)\]|(\w+)\(([^)]*)\)|(\w+)\{([^}]*)\}/g;
    const edgePattern = /(\w+)\s*-->\s*(\w+)/g;
    
    let match;
    while ((match = nodePattern.exec(source)) !== null) {
      nodes.push({ id: match[1] || match[3] || match[5] });
    }
    
    while ((match = edgePattern.exec(source)) !== null) {
      edges.push({ from: match[1], to: match[2] });
    }
    
    return { nodes, edges };
  }
}



/***/ }),

/***/ "./lib/MermaidInteractionLayer.js":
/*!****************************************!*\
  !*** ./lib/MermaidInteractionLayer.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidInteractionLayer: () => (/* binding */ MermaidInteractionLayer)
/* harmony export */ });
// Mermaid 交互层
// 处理节点/边的选择、点击等交互事件

class MermaidInteractionLayer {
  constructor(renderer, callbacks = {}) {
    this.renderer = renderer;
    this.callbacks = {
      onNodeSelect: callbacks.onNodeSelect || (() => {}),
      onEdgeSelect: callbacks.onEdgeSelect || (() => {}),
      onElementClick: callbacks.onElementClick || (() => {}),
      onElementDblClick: callbacks.onElementDblClick || (() => {}),
      onCanvasClick: callbacks.onCanvasClick || (() => {})
    };
    
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    this.selectedNodeIds = new Set(); // 多选节点集合
    this.selectedEdgeIndices = new Set(); // 多选边集合
    
    this.setup();
  }
  
  setup() {
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    // 绑定点击事件
    svg.addEventListener('click', (e) => this.handleClick(e));
    svg.addEventListener('dblclick', (e) => this.handleDblClick(e));
    
    // 绑定画布双击事件
    svg.addEventListener('dblclick', (e) => {
      if (e.target === svg || e.target.tagName === 'svg') {
        if (this.callbacks.onCanvasDblClick) {
          this.callbacks.onCanvasDblClick(e);
        }
      }
    });
  }
  
  /**
   * 处理点击事件
   */
  handleClick(e) {
    const target = e.target;
    
    // 检查是否点击了节点
    const nodeElement = target.closest('.node[data-mermaid-type="node"]');
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id');
      
      // Ctrl/Cmd + 点击：多选或开始连接
      if (e.ctrlKey || e.metaKey) {
        // 如果按住 Shift，则多选
        if (e.shiftKey) {
          this.toggleNodeSelection(nodeId, nodeElement);
        } else {
          // Ctrl/Cmd 单独：开始连接
          if (this.callbacks.onNodeCtrlClick) {
            this.callbacks.onNodeCtrlClick(nodeId, e);
          }
        }
        e.stopPropagation();
        return;
      }
      
      // Shift + 点击：多选
      if (e.shiftKey) {
        this.toggleNodeSelection(nodeId, nodeElement);
        e.stopPropagation();
        return;
      }
      
      // 普通点击：单选
      this.selectNode(nodeId, nodeElement);
      e.stopPropagation();
      return;
    }
    
    // 检查是否点击了边
    const edgeElement = target.closest('.edgePath[data-mermaid-type="edge"]');
    if (edgeElement) {
      const edgeIndex = parseInt(edgeElement.getAttribute('data-edge-index'));
      
      // Ctrl/Cmd 或 Shift + 点击：多选
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        this.toggleEdgeSelection(edgeIndex, edgeElement);
      } else {
        // 普通点击：单选
        this.selectEdge(edgeIndex, edgeElement);
      }
      e.stopPropagation();
      return;
    }
    
    // 点击空白处，取消选择
    if (target === this.renderer.getCurrentSVG() || target.tagName === 'svg') {
      this.clearSelection();
      this.callbacks.onCanvasClick();
    }
  }
  
  /**
   * 处理双击事件
   */
  handleDblClick(e) {
    const target = e.target;
    
    const nodeElement = target.closest('.node[data-mermaid-type="node"]');
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id');
      this.callbacks.onElementDblClick('node', nodeId, nodeElement);
      e.stopPropagation();
      return;
    }
    
    const edgeElement = target.closest('.edgePath[data-mermaid-type="edge"]');
    if (edgeElement) {
      const edgeIndex = parseInt(edgeElement.getAttribute('data-edge-index'));
      this.callbacks.onElementDblClick('edge', edgeIndex, edgeElement);
      e.stopPropagation();
      return;
    }
  }
  
  /**
   * 选择节点（单选）
   */
  selectNode(nodeId, element) {
    this.clearSelection();
    
    this.selectedNodeId = nodeId;
    this.selectedNodeIds.clear();
    this.selectedNodeIds.add(nodeId);
    this.renderer.highlightElement(element, 'node');
    this.renderer.showSelectionBox(element);
    
    const nodeInfo = this.renderer.getNode(nodeId);
    this.callbacks.onNodeSelect(nodeId, nodeInfo, element);
  }
  
  /**
   * 切换节点选择（多选）
   */
  toggleNodeSelection(nodeId, element) {
    if (this.selectedNodeIds.has(nodeId)) {
      // 取消选择
      this.selectedNodeIds.delete(nodeId);
      element.classList.remove('mermaid-selected-node');
      
      // 如果这是当前单选节点，清除单选状态
      if (this.selectedNodeId === nodeId) {
        this.selectedNodeId = null;
        this.renderer.hideSelectionBox();
      }
    } else {
      // 添加选择
      this.selectedNodeIds.add(nodeId);
      this.renderer.highlightElement(element, 'node');
      
      // 如果当前没有单选，设置这个为单选
      if (!this.selectedNodeId) {
        this.selectedNodeId = nodeId;
        this.renderer.showSelectionBox(element);
      }
    }
    
    // 更新多选回调
    if (this.callbacks.onMultiSelect) {
      this.callbacks.onMultiSelect({
        nodes: Array.from(this.selectedNodeIds),
        edges: Array.from(this.selectedEdgeIndices)
      });
    }
  }
  
  /**
   * 选择边（单选）
   */
  selectEdge(edgeIndex, element) {
    this.clearSelection();
    
    this.selectedEdgeIndex = edgeIndex;
    this.selectedEdgeIndices.clear();
    this.selectedEdgeIndices.add(edgeIndex);
    this.renderer.highlightElement(element, 'edge');
    
    const edgeInfo = this.renderer.getEdge(edgeIndex);
    this.callbacks.onEdgeSelect(edgeIndex, edgeInfo, element);
  }
  
  /**
   * 切换边选择（多选）
   */
  toggleEdgeSelection(edgeIndex, element) {
    if (this.selectedEdgeIndices.has(edgeIndex)) {
      // 取消选择
      this.selectedEdgeIndices.delete(edgeIndex);
      element.classList.remove('mermaid-selected-edge');
      
      // 如果这是当前单选边，清除单选状态
      if (this.selectedEdgeIndex === edgeIndex) {
        this.selectedEdgeIndex = null;
      }
    } else {
      // 添加选择
      this.selectedEdgeIndices.add(edgeIndex);
      this.renderer.highlightElement(element, 'edge');
      
      // 如果当前没有单选，设置这个为单选
      if (this.selectedEdgeIndex === null) {
        this.selectedEdgeIndex = edgeIndex;
      }
    }
    
    // 更新多选回调
    if (this.callbacks.onMultiSelect) {
      this.callbacks.onMultiSelect({
        nodes: Array.from(this.selectedNodeIds),
        edges: Array.from(this.selectedEdgeIndices)
      });
    }
  }
  
  /**
   * 清除选择
   */
  clearSelection() {
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    this.selectedNodeIds.clear();
    this.selectedEdgeIndices.clear();
    this.renderer.clearHighlight();
    this.renderer.hideSelectionBox();
  }
  
  /**
   * 获取多选节点 ID 列表
   */
  getSelectedNodeIds() {
    return Array.from(this.selectedNodeIds);
  }
  
  /**
   * 获取多选边索引列表
   */
  getSelectedEdgeIndices() {
    return Array.from(this.selectedEdgeIndices);
  }
  
  /**
   * 获取所有选中的元素
   */
  getAllSelected() {
    return {
      nodes: this.getSelectedNodeIds(),
      edges: this.getSelectedEdgeIndices()
    };
  }
  
  /**
   * 获取当前选中的节点 ID
   */
  getSelectedNodeId() {
    return this.selectedNodeId;
  }
  
  /**
   * 获取当前选中的边索引
   */
  getSelectedEdgeIndex() {
    return this.selectedEdgeIndex;
  }
  
  /**
   * 更新（当 SVG 重新渲染后调用）
   */
  update() {
    this.setup();
    
    // 恢复选择状态
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    // 确保 selectedNodeIds 和 selectedEdgeIndices 已初始化
    if (!this.selectedNodeIds) {
      this.selectedNodeIds = new Set();
    }
    if (!this.selectedEdgeIndices) {
      this.selectedEdgeIndices = new Set();
    }
    
    // 恢复多选节点
    if (this.selectedNodeIds && this.selectedNodeIds.size > 0) {
      this.selectedNodeIds.forEach(nodeId => {
        const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeElement) {
          this.renderer.highlightElement(nodeElement, 'node');
        }
      });
    }
    
    // 恢复单选节点
    if (this.selectedNodeId) {
      const nodeElement = svg.querySelector(`[data-node-id="${this.selectedNodeId}"]`);
      if (nodeElement) {
        this.renderer.highlightElement(nodeElement, 'node');
        this.renderer.showSelectionBox(nodeElement);
      }
    }
    
    // 恢复多选边
    if (this.selectedEdgeIndices && this.selectedEdgeIndices.size > 0) {
      this.selectedEdgeIndices.forEach(edgeIndex => {
        const edgeElement = svg.querySelector(`[data-edge-index="${edgeIndex}"]`);
        if (edgeElement) {
          this.renderer.highlightElement(edgeElement, 'edge');
        }
      });
    }
    
    // 恢复单选边
    if (this.selectedEdgeIndex !== null) {
      const edgeElement = svg.querySelector(`[data-edge-index="${this.selectedEdgeIndex}"]`);
      if (edgeElement) {
        this.renderer.highlightElement(edgeElement, 'edge');
      }
    }
  }
}




/***/ }),

/***/ "./lib/MermaidLabelEditor.js":
/*!***********************************!*\
  !*** ./lib/MermaidLabelEditor.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidLabelEditor: () => (/* binding */ MermaidLabelEditor)
/* harmony export */ });
// Mermaid 标签编辑器
// 实现节点和边标签的内联编辑功能

class MermaidLabelEditor {
  constructor(renderer, parser, codeGenerator) {
    this.renderer = renderer;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
    this.currentEdit = null;
  }
  
  /**
   * 开始编辑节点标签
   */
  startNodeLabelEdit(nodeId, onComplete) {
    const nodeInfo = this.renderer.getNode(nodeId);
    if (!nodeInfo) return;
    
    const svg = this.renderer.getCurrentSVG();
    const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    const textElement = nodeElement.querySelector('text');
    if (!textElement) return;
    
    const currentLabel = textElement.textContent.trim();
    this.startEdit(textElement, nodeElement, currentLabel, (newLabel) => {
      this.updateNodeLabel(nodeId, newLabel, onComplete);
    });
  }
  
  /**
   * 开始编辑边标签
   */
  startEdgeLabelEdit(edgeIndex, onComplete) {
    const edgeInfo = this.renderer.getEdge(edgeIndex);
    if (!edgeInfo) return;
    
    const svg = this.renderer.getCurrentSVG();
    const edgeElement = svg.querySelector(`[data-edge-index="${edgeIndex}"]`);
    if (!edgeElement) return;
    
    // 查找边标签（可能在 edgeLabel 中）
    const labelElement = edgeElement.parentElement?.querySelector('.edgeLabel text') ||
                        edgeElement.parentElement?.querySelector('.edgeLabel');
    
    if (!labelElement) {
      // 如果没有标签元素，创建一个
      this.createEdgeLabel(edgeElement, edgeIndex, onComplete);
      return;
    }
    
    const currentLabel = labelElement.textContent?.trim() || '';
    this.startEdit(labelElement, edgeElement, currentLabel, (newLabel) => {
      this.updateEdgeLabel(edgeIndex, newLabel, onComplete);
    });
  }
  
  /**
   * 开始编辑（通用方法）
   */
  startEdit(textElement, parentElement, currentText, onComplete) {
    // 如果正在编辑，先取消
    if (this.currentEdit) {
      this.cancelEdit();
    }
    
    const bbox = textElement.getBBox();
    const svg = this.renderer.getCurrentSVG();
    
    // 创建输入框容器
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', bbox.x - 10);
    foreignObject.setAttribute('y', bbox.y - 5);
    foreignObject.setAttribute('width', Math.max(bbox.width + 20, 150));
    foreignObject.setAttribute('height', bbox.height + 10);
    foreignObject.setAttribute('class', 'mermaid-label-editor');
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.padding = '2px 5px';
    input.style.border = '2px solid #007bff';
    input.style.borderRadius = '4px';
    input.style.fontSize = textElement.getAttribute('font-size') || '14px';
    input.style.fontFamily = textElement.getAttribute('font-family') || 'Arial, sans-serif';
    input.style.backgroundColor = '#ffffff';
    input.style.boxSizing = 'border-box';
    
    foreignObject.appendChild(input);
    svg.appendChild(foreignObject);
    
    // 保存编辑状态
    this.currentEdit = {
      foreignObject,
      input,
      textElement,
      originalText: currentText,
      onComplete
    };
    
    // 聚焦并选中文本
    input.focus();
    input.select();
    
    // 绑定事件
    const save = () => {
      const newText = input.value.trim();
      if (newText !== currentText) {
        onComplete(newText);
      } else {
        this.cancelEdit();
      }
    };
    
    const cancel = () => {
      this.cancelEdit();
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });
    
    // 阻止点击事件冒泡
    foreignObject.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  /**
   * 取消编辑
   */
  cancelEdit() {
    if (this.currentEdit) {
      const svg = this.renderer.getCurrentSVG();
      if (svg && svg.contains(this.currentEdit.foreignObject)) {
        svg.removeChild(this.currentEdit.foreignObject);
      }
      this.currentEdit = null;
    }
  }
  
  /**
   * 更新节点标签
   */
  updateNodeLabel(nodeId, newLabel, onComplete) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 更新节点标签
    const node = ast.nodes.find(n => n.id === nodeId);
    if (node) {
      node.label = newLabel;
    }
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    // 取消编辑状态
    this.cancelEdit();
    
    // 重新渲染
    if (onComplete) {
      onComplete(newSource);
    }
  }
  
  /**
   * 更新边标签
   */
  updateEdgeLabel(edgeIndex, newLabel, onComplete) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 更新边标签
    const edge = ast.edges[edgeIndex];
    if (edge) {
      edge.label = newLabel;
    }
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    // 取消编辑状态
    this.cancelEdit();
    
    // 重新渲染
    if (onComplete) {
      onComplete(newSource);
    }
  }
  
  /**
   * 为没有标签的边创建标签
   */
  createEdgeLabel(edgeElement, edgeIndex, onComplete) {
    const svg = this.renderer.getCurrentSVG();
    const path = edgeElement.querySelector('path');
    if (!path) return;
    
    // 获取路径中点
    const pathLength = path.getTotalLength();
    const midPoint = path.getPointAtLength(pathLength / 2);
    
    // 创建标签元素
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'edgeLabel');
    labelGroup.setAttribute('transform', `translate(${midPoint.x}, ${midPoint.y})`);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = '';
    
    labelGroup.appendChild(text);
    edgeElement.parentElement.appendChild(labelGroup);
    
    // 开始编辑
    this.startEdit(text, edgeElement, '', (newLabel) => {
      this.updateEdgeLabel(edgeIndex, newLabel, onComplete);
    });
  }
  
  /**
   * 检查是否正在编辑
   */
  isEditing() {
    return this.currentEdit !== null;
  }
}



/***/ }),

/***/ "./lib/MermaidNodeAdder.js":
/*!*********************************!*\
  !*** ./lib/MermaidNodeAdder.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidNodeAdder: () => (/* binding */ MermaidNodeAdder)
/* harmony export */ });
/* harmony import */ var _MermaidParser_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./MermaidParser.js */ "./lib/MermaidParser.js");
/* harmony import */ var _MermaidCodeGenerator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./MermaidCodeGenerator.js */ "./lib/MermaidCodeGenerator.js");
// Mermaid 节点添加器
// 实现快速添加节点功能




class MermaidNodeAdder {
  constructor(renderer, parser, codeGenerator) {
    this.renderer = renderer;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
    this.nodeCounter = 1;
  }
  
  /**
   * 在指定位置添加节点
   */
  addNodeAtPosition(x, y, label = '', shape = 'rectangle', onComplete) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 生成节点 ID
    const nodeId = this.generateNodeId(ast);
    
    // 创建新节点
    const newNode = {
      id: nodeId,
      label: label || `节点${this.nodeCounter++}`,
      shape: shape,
      lineNumber: -1
    };
    
    ast.nodes.push(newNode);
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    if (onComplete) {
      onComplete(newSource, nodeId);
    }
    
    return { newSource, nodeId };
  }
  
  /**
   * 生成唯一的节点 ID
   */
  generateNodeId(ast) {
    const existingIds = new Set(ast.nodes.map(n => n.id));
    let id = 'A';
    let counter = 0;
    
    while (existingIds.has(id)) {
      counter++;
      if (counter < 26) {
        id = String.fromCharCode(65 + counter); // A-Z
      } else {
        id = `Node${counter}`;
      }
    }
    
    return id;
  }
  
  /**
   * 显示添加节点对话框
   */
  showAddNodeDialog(svgPoint, onComplete) {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'mermaid-add-node-dialog';
    dialog.style.cssText = `
      position: fixed;
      left: ${svgPoint.x}px;
      top: ${svgPoint.y}px;
      background: white;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 200px;
    `;
    
    // 标签输入
    const labelLabel = document.createElement('label');
    labelLabel.textContent = '节点标签:';
    labelLabel.style.display = 'block';
    labelLabel.style.marginBottom = '8px';
    labelLabel.style.fontSize = '14px';
    labelLabel.style.fontWeight = '500';
    
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = '输入节点标签';
    labelInput.style.width = '100%';
    labelInput.style.padding = '6px';
    labelInput.style.border = '1px solid #ddd';
    labelInput.style.borderRadius = '4px';
    labelInput.style.marginBottom = '12px';
    labelInput.style.boxSizing = 'border-box';
    
    // 形状选择
    const shapeLabel = document.createElement('label');
    shapeLabel.textContent = '节点形状:';
    shapeLabel.style.display = 'block';
    shapeLabel.style.marginBottom = '8px';
    shapeLabel.style.fontSize = '14px';
    shapeLabel.style.fontWeight = '500';
    
    const shapeSelect = document.createElement('select');
    shapeSelect.style.width = '100%';
    shapeSelect.style.padding = '6px';
    shapeSelect.style.border = '1px solid #ddd';
    shapeSelect.style.borderRadius = '4px';
    shapeSelect.style.marginBottom = '12px';
    shapeSelect.style.boxSizing = 'border-box';
    
    const shapes = [
      { value: 'rectangle', label: '矩形' },
      { value: 'stadium', label: '圆角矩形' },
      { value: 'diamond', label: '菱形' },
      { value: 'circle', label: '圆形' },
      { value: 'subroutine', label: '子程序' }
    ];
    
    shapes.forEach(shape => {
      const option = document.createElement('option');
      option.value = shape.value;
      option.textContent = shape.label;
      shapeSelect.appendChild(option);
    });
    
    // 按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'flex-end';
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 6px 12px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    // 添加按钮
    const addBtn = document.createElement('button');
    addBtn.textContent = '添加';
    addBtn.style.cssText = `
      padding: 6px 12px;
      border: none;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    // 组装对话框
    dialog.appendChild(labelLabel);
    dialog.appendChild(labelInput);
    dialog.appendChild(shapeLabel);
    dialog.appendChild(shapeSelect);
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(addBtn);
    dialog.appendChild(buttonContainer);
    
    document.body.appendChild(dialog);
    
    // 聚焦输入框
    labelInput.focus();
    
    // 添加事件
    const cleanup = () => {
      if (document.body.contains(dialog)) {
        document.body.removeChild(dialog);
      }
    };
    
    const add = () => {
      const label = labelInput.value.trim() || `节点${this.nodeCounter++}`;
      const shape = shapeSelect.value;
      const result = this.addNodeAtPosition(svgPoint.x, svgPoint.y, label, shape);
      cleanup();
      if (onComplete) {
        onComplete(result.newSource, result.nodeId);
      }
    };
    
    addBtn.addEventListener('click', add);
    cancelBtn.addEventListener('click', cleanup);
    
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    });
    
    // 点击外部关闭
    const clickOutside = (e) => {
      if (!dialog.contains(e.target)) {
        cleanup();
        document.removeEventListener('click', clickOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', clickOutside);
    }, 100);
  }
  
  /**
   * 将屏幕坐标转换为 SVG 坐标
   */
  getSVGPoint(svg, clientX, clientY) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return point.matrixTransform(ctm.inverse());
  }
}



/***/ }),

/***/ "./lib/MermaidNodeConnector.js":
/*!*************************************!*\
  !*** ./lib/MermaidNodeConnector.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidNodeConnector: () => (/* binding */ MermaidNodeConnector)
/* harmony export */ });
/* harmony import */ var _MermaidParser_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./MermaidParser.js */ "./lib/MermaidParser.js");
/* harmony import */ var _MermaidCodeGenerator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./MermaidCodeGenerator.js */ "./lib/MermaidCodeGenerator.js");
// Mermaid 节点连接器
// 实现拖拽方式连接节点




class MermaidNodeConnector {
  constructor(renderer, parser, codeGenerator) {
    this.renderer = renderer;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
    this.connecting = false;
    this.sourceNodeId = null;
    this.connectionLine = null;
  }
  
  /**
   * 开始连接（从源节点开始）
   */
  startConnecting(sourceNodeId, e) {
    if (this.connecting) return;
    
    this.connecting = true;
    this.sourceNodeId = sourceNodeId;
    
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    const sourceNode = this.renderer.getNode(sourceNodeId);
    if (!sourceNode) return;
    
    // 创建连接线
    this.connectionLine = this.createConnectionLine(
      svg,
      sourceNode.x,
      sourceNode.y,
      e
    );
    
    // 绑定鼠标移动和释放事件
    const onMouseMove = (e) => {
      this.updateConnectionLine(e);
    };
    
    const onMouseUp = (e) => {
      this.completeConnection(e, onMouseMove, onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 阻止默认行为
    e.preventDefault();
    e.stopPropagation();
  }
  
  /**
   * 创建连接线
   */
  createConnectionLine(svg, startX, startY, e) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'mermaid-connection-line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    
    const svgPoint = this.getSVGPoint(svg, e.clientX, e.clientY);
    line.setAttribute('x2', svgPoint ? svgPoint.x : startX);
    line.setAttribute('y2', svgPoint ? svgPoint.y : startY);
    
    line.setAttribute('stroke', '#007bff');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-dasharray', '8,4');
    line.setAttribute('marker-end', 'url(#arrow-end)');
    line.style.pointerEvents = 'none';
    line.style.opacity = '0.7';
    
    // 确保箭头标记存在
    this.ensureArrowMarker(svg);
    
    svg.appendChild(line);
    return line;
  }
  
  /**
   * 更新连接线
   */
  updateConnectionLine(e) {
    if (!this.connectionLine) return;
    
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    const svgPoint = this.getSVGPoint(svg, e.clientX, e.clientY);
    if (svgPoint) {
      this.connectionLine.setAttribute('x2', svgPoint.x);
      this.connectionLine.setAttribute('y2', svgPoint.y);
    }
    
    // 高亮悬停的节点
    this.highlightHoverNode(e);
  }
  
  /**
   * 完成连接
   */
  completeConnection(e, onMouseMove, onMouseUp) {
    // 移除事件监听
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // 移除连接线
    if (this.connectionLine) {
      const svg = this.renderer.getCurrentSVG();
      if (svg && svg.contains(this.connectionLine)) {
        svg.removeChild(this.connectionLine);
      }
      this.connectionLine = null;
    }
    
    // 清除高亮
    this.clearHoverHighlight();
    
    // 检查是否连接到目标节点
    const targetNodeId = this.getHoverNodeId(e);
    if (targetNodeId && targetNodeId !== this.sourceNodeId) {
      // 创建连接
      this.createConnection(this.sourceNodeId, targetNodeId);
    }
    
    // 重置状态
    this.connecting = false;
    this.sourceNodeId = null;
  }
  
  /**
   * 创建连接（添加边）
   */
  createConnection(fromNodeId, toNodeId) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 检查边是否已存在
    const existingEdge = ast.edges.find(e => 
      e.from === fromNodeId && e.to === toNodeId
    );
    
    if (existingEdge) {
      // 边已存在，不重复添加
      return;
    }
    
    // 添加新边
    const newEdge = {
      from: fromNodeId,
      to: toNodeId,
      label: '',
      type: 'arrow',
      lineNumber: -1
    };
    
    ast.edges.push(newEdge);
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    // 触发回调
    if (this.onConnectionCreated) {
      this.onConnectionCreated(newSource);
    }
  }
  
  /**
   * 高亮悬停的节点
   */
  highlightHoverNode(e) {
    const targetNodeId = this.getHoverNodeId(e);
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    // 清除之前的高亮
    this.clearHoverHighlight();
    
    if (targetNodeId && targetNodeId !== this.sourceNodeId) {
      const nodeElement = svg.querySelector(`[data-node-id="${targetNodeId}"]`);
      if (nodeElement) {
        nodeElement.classList.add('mermaid-hover-target');
      }
    }
  }
  
  /**
   * 清除悬停高亮
   */
  clearHoverHighlight() {
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    svg.querySelectorAll('.mermaid-hover-target').forEach(el => {
      el.classList.remove('mermaid-hover-target');
    });
  }
  
  /**
   * 获取悬停的节点 ID
   */
  getHoverNodeId(e) {
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return null;
    
    const svgPoint = this.getSVGPoint(svg, e.clientX, e.clientY);
    if (!svgPoint) return null;
    
    // 检查所有节点
    const nodes = this.renderer.getAllNodes();
    for (const node of nodes) {
      const dx = svgPoint.x - node.x;
      const dy = svgPoint.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果鼠标在节点范围内
      if (distance < Math.max(node.width, node.height) / 2 + 10) {
        return node.id;
      }
    }
    
    return null;
  }
  
  /**
   * 将屏幕坐标转换为 SVG 坐标
   */
  getSVGPoint(svg, clientX, clientY) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return point.matrixTransform(ctm.inverse());
  }
  
  /**
   * 确保箭头标记存在
   */
  ensureArrowMarker(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    
    // 检查箭头标记是否存在
    let arrowEnd = defs.querySelector('#arrow-end');
    if (!arrowEnd) {
      arrowEnd = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      arrowEnd.setAttribute('id', 'arrow-end');
      arrowEnd.setAttribute('markerWidth', '12');
      arrowEnd.setAttribute('markerHeight', '12');
      arrowEnd.setAttribute('refX', '10');
      arrowEnd.setAttribute('refY', '6');
      arrowEnd.setAttribute('orient', 'auto');
      arrowEnd.setAttribute('markerUnits', 'strokeWidth');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M2,2 L10,6 L2,10 z');
      path.setAttribute('fill', '#007bff');
      arrowEnd.appendChild(path);
      
      defs.appendChild(arrowEnd);
    }
  }
  
  /**
   * 设置连接创建回调
   */
  setOnConnectionCreated(callback) {
    this.onConnectionCreated = callback;
  }
}



/***/ }),

/***/ "./lib/MermaidParser.js":
/*!******************************!*\
  !*** ./lib/MermaidParser.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidParser: () => (/* binding */ MermaidParser)
/* harmony export */ });
// Mermaid 源代码解析器
// 解析 mermaid 源代码为 AST，用于编辑操作

class MermaidParser {
  /**
   * 解析 mermaid 源代码
   */
  parse(source) {
    const ast = {
      type: this.detectDiagramType(source),
      direction: this.extractDirection(source),
      nodes: [],
      edges: [],
      classDefs: [],
      linkStyles: [],
      subgraphs: [],
      classApplications: [],
      nodeStyles: [], // 使用 style 指令的节点样式
      styles: this.extractStyles(source),
      source: source
    };
    
    const lines = source.split('\n');
    let inSubgraph = false;
    let currentSubgraph = null;
    let edgeIndex = 0;
    
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('%%')) {
        return; // 跳过空行和注释
      }
      
      // 解析节点
      const nodeMatch = this.parseNode(trimmed);
      if (nodeMatch) {
        const node = {
          ...nodeMatch,
          lineNumber: lineIndex
        };
        
        if (inSubgraph && currentSubgraph) {
          if (!currentSubgraph.nodes) {
            currentSubgraph.nodes = [];
          }
          currentSubgraph.nodes.push(node.id);
        } else {
          ast.nodes.push(node);
        }
        return;
      }
      
      // 解析边
      const edgeMatch = this.parseEdge(trimmed);
      if (edgeMatch) {
        ast.edges.push({
          ...edgeMatch,
          index: edgeIndex++,
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 classDef
      const classDefMatch = trimmed.match(/classDef\s+(\w+)\s+(.+)/);
      if (classDefMatch) {
        ast.classDefs.push({
          name: classDefMatch[1],
          styles: this.parseStyles(classDefMatch[2]),
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 class 应用
      const classMatch = trimmed.match(/class\s+([\w,]+)\s+(\w+)/);
      if (classMatch) {
        ast.classApplications.push({
          nodes: classMatch[1].split(',').map(s => s.trim()),
          className: classMatch[2],
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 style 指令（最常用的方式）
      const styleMatch = trimmed.match(/style\s+(\w+)\s+(.+)/);
      if (styleMatch) {
        ast.nodeStyles.push({
          nodeId: styleMatch[1],
          styles: this.parseStyles(styleMatch[2]),
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 linkStyle
      const linkStyleMatch = trimmed.match(/linkStyle\s+(\d+)\s+(.+)/);
      if (linkStyleMatch) {
        const index = parseInt(linkStyleMatch[1]);
        ast.linkStyles[index] = {
          styles: this.parseStyles(linkStyleMatch[2]),
          lineNumber: lineIndex
        };
        return;
      }
      
      // 解析 subgraph
      if (trimmed.match(/subgraph/)) {
        inSubgraph = true;
        const subgraphMatch = trimmed.match(/subgraph\s+(\w+)?\[?([^\]]*)\]?/);
        currentSubgraph = {
          id: subgraphMatch[1] || `subgraph-${ast.subgraphs.length}`,
          label: subgraphMatch[2] || '',
          nodes: [],
          lineNumber: lineIndex
        };
        ast.subgraphs.push(currentSubgraph);
      } else if (trimmed === 'end' && inSubgraph) {
        inSubgraph = false;
        currentSubgraph = null;
      }
    });
    
    return ast;
  }
  
  /**
   * 解析节点
   */
  parseNode(line) {
    const patterns = [
      { regex: /^(\w+)\[([^\]]*)\]$/, shape: 'rectangle' },
      { regex: /^(\w+)\(([^)]*)\)$/, shape: 'stadium' },
      { regex: /^(\w+)\{([^}]*)\}$/, shape: 'diamond' },
      { regex: /^(\w+)\(\(([^)]*)\)\)$/, shape: 'circle' },
      { regex: /^(\w+)\[\[([^\]]*)\]\]$/, shape: 'subroutine' },
      { regex: /^(\w+)\[(\/\/[^\]]*)\]$/, shape: 'cylinder' },
      { regex: /^(\w+)\{(\/\/[^}]*)\}$/, shape: 'hexagon' },
      { regex: /^(\w+)\[(\/\/\/[^\]]*)\]$/, shape: 'parallelogram' },
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return {
          id: match[1],
          label: match[2] || match[1],
          shape: pattern.shape
        };
      }
    }
    
    return null;
  }
  
  /**
   * 解析边
   */
  parseEdge(line) {
    const patterns = [
      { regex: /^(\w+)\s*-->\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'arrow' },
      { regex: /^(\w+)\s*---\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'line' },
      { regex: /^(\w+)\s*-\.->\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'dotted-arrow' },
      { regex: /^(\w+)\s*-\.-\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'dotted-line' },
      { regex: /^(\w+)\s*==>\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'thick-arrow' },
      { regex: /^(\w+)\s*===\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'thick-line' },
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return {
          from: match[1],
          to: match[2],
          label: match[3]?.trim() || '',
          type: pattern.type
        };
      }
    }
    
    return null;
  }
  
  /**
   * 解析样式字符串
   */
  parseStyles(styleString) {
    const styles = {};
    const pairs = styleString.split(',');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        styles[key] = value;
      }
    });
    
    return styles;
  }
  
  /**
   * 检测图表类型
   */
  detectDiagramType(source) {
    if (source.match(/^graph\s+/)) return 'flowchart';
    if (source.match(/^sequenceDiagram/)) return 'sequence';
    if (source.match(/^classDiagram/)) return 'class';
    if (source.match(/^stateDiagram/)) return 'state';
    if (source.match(/^gantt/)) return 'gantt';
    return 'flowchart';
  }
  
  /**
   * 提取方向
   */
  extractDirection(source) {
    const match = source.match(/^graph\s+(TD|LR|BT|RL)/);
    return match ? match[1] : 'TD';
  }
  
  /**
   * 提取样式配置
   */
  extractStyles(source) {
    const styles = {};
    const initMatch = source.match(/%%\{init:\s*\{([^}]+)\}\}%%/);
    if (initMatch) {
      // 简单解析 themeVariables
      const themeMatch = initMatch[1].match(/themeVariables:\s*\{([^}]+)\}/);
      if (themeMatch) {
        const themeVars = themeMatch[1];
        const varPairs = themeVars.split(',');
        varPairs.forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim().replace(/['"]/g, ''));
          if (key && value) {
            styles[key] = value;
          }
        });
      }
    }
    return styles;
  }
}



/***/ }),

/***/ "./lib/MermaidRenderer.js":
/*!********************************!*\
  !*** ./lib/MermaidRenderer.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidRenderer: () => (/* binding */ MermaidRenderer)
/* harmony export */ });
/* harmony import */ var mermaid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mermaid */ "../../node_modules/.pnpm/mermaid@11.12.1/node_modules/mermaid/dist/mermaid.core.mjs");
// Mermaid.js 渲染器和增强层
// 负责使用 mermaid.js 渲染图表，并添加交互功能



class MermaidRenderer {
  constructor(container) {
    this.container = container;
    this.currentSVG = null;
    this.currentSource = '';
    this.nodeMap = new Map();
    this.edgeMap = new Map();
    
    this.init();
  }
  
  async init() {
    // 初始化 mermaid
    mermaid__WEBPACK_IMPORTED_MODULE_0__["default"].initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose', // 允许交互
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }
  
  /**
   * 渲染 mermaid 图表
   */
  async render(source) {
    try {
      this.currentSource = source;
      
      // 清空容器
      this.container.innerHTML = '';
      
      // 使用 mermaid 渲染
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid__WEBPACK_IMPORTED_MODULE_0__["default"].render(id, source);
      
      // 注入 SVG
      this.container.innerHTML = svg;
      this.currentSVG = this.container.querySelector('svg');
      
      if (!this.currentSVG) {
        throw new Error('Failed to render mermaid diagram');
      }
      
      // 后处理增强
      this.enhanceSVG(this.currentSVG);
      
      return this.currentSVG;
    } catch (error) {
      console.error('Mermaid render error:', error);
      throw error;
    }
  }
  
  /**
   * 增强 SVG，添加交互功能
   */
  enhanceSVG(svg) {
    // 1. 添加数据属性
    this.addDataAttributes(svg);
    
    // 2. 添加交互层
    this.addInteractionLayer(svg);
    
    // 3. 添加选择框
    this.addSelectionBox(svg);
    
    // 4. 提取节点和边映射
    this.extractNodeEdgeMap(svg);
  }
  
  /**
   * 添加数据属性，便于识别元素
   */
  addDataAttributes(svg) {
    // 为节点添加 data-node-id
    svg.querySelectorAll('.node').forEach((nodeGroup, index) => {
      const nodeId = this.extractNodeId(nodeGroup, index);
      nodeGroup.setAttribute('data-node-id', nodeId);
      nodeGroup.setAttribute('data-mermaid-type', 'node');
    });
    
    // 为边添加 data-edge-index
    svg.querySelectorAll('.edgePath').forEach((path, index) => {
      path.setAttribute('data-edge-index', index);
      path.setAttribute('data-mermaid-type', 'edge');
    });
    
    // 为子图添加标识
    svg.querySelectorAll('.cluster').forEach((cluster, index) => {
      cluster.setAttribute('data-subgraph-index', index);
      cluster.setAttribute('data-mermaid-type', 'subgraph');
    });
  }
  
  /**
   * 提取节点 ID
   */
  extractNodeId(nodeGroup, fallbackIndex) {
    // 方法1: 从文本内容推断（如果文本就是 ID）
    const textEl = nodeGroup.querySelector('text');
    if (textEl) {
      const text = textEl.textContent.trim();
      // 如果文本看起来像 ID（短且无空格），使用它
      if (text.length < 20 && !text.includes(' ')) {
        return text;
      }
    }
    
    // 方法2: 从 class 名称提取
    const classes = Array.from(nodeGroup.classList);
    const idClass = classes.find(c => c.startsWith('node-') || c.match(/^[A-Z]\d+$/));
    if (idClass) {
      return idClass.replace('node-', '');
    }
    
    // 方法3: 使用索引生成
    return `node-${fallbackIndex}`;
  }
  
  /**
   * 添加交互层
   */
  addInteractionLayer(svg) {
    // 为节点添加交互样式
    svg.querySelectorAll('.node').forEach(node => {
      node.style.cursor = 'pointer';
      node.setAttribute('data-interactive', 'true');
    });
    
    // 为边添加交互样式
    svg.querySelectorAll('.edgePath').forEach(edge => {
      edge.style.cursor = 'pointer';
      edge.setAttribute('data-interactive', 'true');
      
      // 增加边的点击区域（通过 stroke-width）
      const path = edge.querySelector('path');
      if (path) {
        const currentWidth = path.getAttribute('stroke-width') || '2';
        path.setAttribute('stroke-width', Math.max(parseFloat(currentWidth), 4));
        path.setAttribute('data-original-stroke-width', currentWidth);
      }
    });
    
    // 为子图添加交互样式
    svg.querySelectorAll('.cluster').forEach(cluster => {
      cluster.style.cursor = 'pointer';
      cluster.setAttribute('data-interactive', 'true');
    });
  }
  
  /**
   * 添加选择框元素
   */
  addSelectionBox(svg) {
    // 创建选择框
    const selectionBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    selectionBox.setAttribute('class', 'mermaid-selection-box');
    selectionBox.setAttribute('fill', 'none');
    selectionBox.setAttribute('stroke', '#007bff');
    selectionBox.setAttribute('stroke-width', '2');
    selectionBox.setAttribute('stroke-dasharray', '5,5');
    selectionBox.style.display = 'none';
    selectionBox.style.pointerEvents = 'none';
    
    svg.appendChild(selectionBox);
    svg._selectionBox = selectionBox;
  }
  
  /**
   * 提取节点和边的映射关系
   */
  extractNodeEdgeMap(svg) {
    this.nodeMap.clear();
    this.edgeMap.clear();
    
    // 提取节点映射
    svg.querySelectorAll('.node').forEach(nodeGroup => {
      const nodeId = nodeGroup.getAttribute('data-node-id');
      if (nodeId) {
        const bbox = nodeGroup.getBBox();
        const textEl = nodeGroup.querySelector('text');
        
        this.nodeMap.set(nodeId, {
          id: nodeId,
          element: nodeGroup,
          bbox: bbox,
          label: textEl ? textEl.textContent.trim() : '',
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
          width: bbox.width,
          height: bbox.height
        });
      }
    });
    
    // 提取边映射
    svg.querySelectorAll('.edgePath').forEach((edgePath, index) => {
      const path = edgePath.querySelector('path');
      if (path) {
        const pathData = path.getAttribute('d');
        const labelEl = edgePath.parentElement?.querySelector('.edgeLabel');
        
        this.edgeMap.set(index, {
          index: index,
          element: edgePath,
          path: path,
          pathData: pathData,
          label: labelEl ? labelEl.textContent.trim() : ''
        });
      }
    });
  }
  
  /**
   * 获取节点信息
   */
  getNode(nodeId) {
    return this.nodeMap.get(nodeId);
  }
  
  /**
   * 获取所有节点
   */
  getAllNodes() {
    return Array.from(this.nodeMap.values());
  }
  
  /**
   * 获取边信息
   */
  getEdge(index) {
    return this.edgeMap.get(index);
  }
  
  /**
   * 获取所有边
   */
  getAllEdges() {
    return Array.from(this.edgeMap.values());
  }
  
  /**
   * 高亮元素
   */
  highlightElement(element, type) {
    this.clearHighlight();
    
    if (type === 'node') {
      element.classList.add('mermaid-selected-node');
    } else if (type === 'edge') {
      element.classList.add('mermaid-selected-edge');
    }
  }
  
  /**
   * 清除高亮
   */
  clearHighlight() {
    if (this.currentSVG) {
      this.currentSVG.querySelectorAll('.mermaid-selected-node, .mermaid-selected-edge').forEach(el => {
        el.classList.remove('mermaid-selected-node', 'mermaid-selected-edge');
      });
    }
  }
  
  /**
   * 显示选择框
   */
  showSelectionBox(element) {
    if (!this.currentSVG || !this.currentSVG._selectionBox) return;
    
    const bbox = element.getBBox();
    const selectionBox = this.currentSVG._selectionBox;
    
    selectionBox.setAttribute('x', bbox.x - 4);
    selectionBox.setAttribute('y', bbox.y - 4);
    selectionBox.setAttribute('width', bbox.width + 8);
    selectionBox.setAttribute('height', bbox.height + 8);
    selectionBox.style.display = 'block';
  }
  
  /**
   * 隐藏选择框
   */
  hideSelectionBox() {
    if (this.currentSVG && this.currentSVG._selectionBox) {
      this.currentSVG._selectionBox.style.display = 'none';
    }
  }
  
  /**
   * 获取当前源代码
   */
  getCurrentSource() {
    return this.currentSource;
  }
  
  /**
   * 获取当前 SVG
   */
  getCurrentSVG() {
    return this.currentSVG;
  }
}



/***/ }),

/***/ "./lib/StateManager.js":
/*!*****************************!*\
  !*** ./lib/StateManager.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StateManager: () => (/* binding */ StateManager)
/* harmony export */ });
// State Manager - replaces React Hooks

class StateManager {
  constructor() {
    this.diagram = null;
    this.loading = true;
    this.error = null;
    this.saving = false;
    this.source = "";
    this.sourceDraft = "";
    this.sourceSaving = false;
    this.sourceError = null;
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.imagePaddingValue = "";
    this.dragging = false;
    
    // 监听器
    this.listeners = new Set();
    
    // 保存定时器
    this.saveTimer = null;
    this.lastSubmittedSource = null;
  }
  
  // 订阅状态变化
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // 通知所有监听器
  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
  
  // 获取当前状态快照
  getState() {
    return {
      diagram: this.diagram,
      loading: this.loading,
      error: this.error,
      saving: this.saving,
      source: this.source,
      sourceDraft: this.sourceDraft,
      sourceSaving: this.sourceSaving,
      sourceError: this.sourceError,
      selectedNodeId: this.selectedNodeId,
      selectedEdgeId: this.selectedEdgeId,
      imagePaddingValue: this.imagePaddingValue,
      dragging: this.dragging,
    };
  }
  
  // 设置状态并通知
  setState(updates) {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this[key] !== value) {
        this[key] = value;
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }
  
  // 获取选中的节点
  getSelectedNode() {
    if (!this.diagram || !this.selectedNodeId) {
      return null;
    }
    return this.diagram.nodes.find(node => node.id === this.selectedNodeId) ?? null;
  }
  
  // 获取选中的边
  getSelectedEdge() {
    if (!this.diagram || !this.selectedEdgeId) {
      return null;
    }
    return this.diagram.edges.find(edge => edge.id === this.selectedEdgeId) ?? null;
  }
  
  // 检查是否有覆盖
  hasOverrides() {
    if (!this.diagram) {
      return false;
    }
    return (
      this.diagram.nodes.some(node => node.overridePosition) ||
      this.diagram.edges.some(edge => edge.overridePoints && edge.overridePoints.length > 0)
    );
  }
  
  // 清除保存定时器
  clearSaveTimer() {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
  
  // 设置保存定时器
  setSaveTimer(callback, delay) {
    this.clearSaveTimer();
    this.saveTimer = setTimeout(callback, delay);
  }
}



/***/ }),

/***/ "./lib/vscodeApi.js":
/*!**************************!*\
  !*** ./lib/vscodeApi.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deleteEdge: () => (/* binding */ deleteEdge),
/* harmony export */   deleteNode: () => (/* binding */ deleteNode),
/* harmony export */   fetchDiagram: () => (/* binding */ fetchDiagram),
/* harmony export */   isVSCodeWebview: () => (/* binding */ isVSCodeWebview),
/* harmony export */   saveDiagram: () => (/* binding */ saveDiagram),
/* harmony export */   updateLayout: () => (/* binding */ updateLayout),
/* harmony export */   updateNodeImage: () => (/* binding */ updateNodeImage),
/* harmony export */   updateSource: () => (/* binding */ updateSource),
/* harmony export */   updateStyle: () => (/* binding */ updateStyle),
/* harmony export */   vscode: () => (/* binding */ vscode)
/* harmony export */ });
// VSCode API adapter - converts fetch API calls to VSCode message passing

// 检测是否在 VSCode webview 环境中
// 注意：acquireVsCodeApi() 只能调用一次，所以优先使用 window.vscode（可能由内联脚本初始化）
let vscode = null;
let isVSCodeWebview = false;

if (typeof window !== 'undefined' && window.vscode) {
  // 如果内联脚本已经初始化了 vscode，使用它
  vscode = window.vscode;
  isVSCodeWebview = true;
} else if (typeof acquireVsCodeApi !== 'undefined') {
  // 否则尝试获取 VS Code API
  try {
    vscode = acquireVsCodeApi();
    isVSCodeWebview = !!vscode;
    // 如果成功获取，也存储到 window 上供其他模块使用
    if (typeof window !== 'undefined') {
      window.vscode = vscode;
    }
  } catch (e) {
    // 如果已经获取过，会抛出错误，尝试使用 window.vscode
    if (typeof window !== 'undefined' && window.vscode) {
      vscode = window.vscode;
      isVSCodeWebview = true;
    } else {
      console.warn('[vscodeApi] Failed to acquire VS Code API:', e);
    }
  }
}

// 消息 ID 生成器
let messageIdCounter = 0;
function generateMessageId() {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

// 等待消息响应的 Promise 映射
const pendingMessages = new Map();

// 监听来自扩展的消息
if (isVSCodeWebview) {
  window.addEventListener('message', (event) => {
    const data = event.data;
    
    // 处理 API 响应（带 messageId 的请求-响应消息）
    if (data.messageId && pendingMessages.has(data.messageId)) {
      const { resolve, reject } = pendingMessages.get(data.messageId);
      pendingMessages.delete(data.messageId);
      
      if (data.error) {
        const error = new Error(data.error);
        error.status = data.status || 500;
        error.statusText = data.statusText || 'Internal Server Error';
        reject(error);
      } else {
        resolve(data.result);
      }
      return;
    }
    
    // 处理其他消息类型（如 load）
    // 注意：load 消息由 app.js 直接处理，这里不需要处理
    // 但为了兼容性，如果存在 window.onDiagramLoad 回调，也调用它
    if ((data.type === 'load' || data.type === 'load-response') && data.diagram) {
      // 存储到 window.pendingDiagram 供应用使用（如果应用还未初始化）
      if (typeof window !== 'undefined') {
        window.pendingDiagram = data.diagram;
      }
      // 如果存在回调，也调用它
      if (window.onDiagramLoad) {
        window.onDiagramLoad(data.diagram);
      }
    }
  });
}

// API 函数 - 简化版本，只保留加载和保存
// 所有编辑操作都在前端完成，只通过保存整个图表数据来同步

async function fetchDiagram() {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId();
    pendingMessages.set(messageId, { resolve, reject });
    
    vscode.postMessage({
      type: 'api-fetchDiagram',
      messageId,
    });
    
    setTimeout(() => {
      if (pendingMessages.has(messageId)) {
        pendingMessages.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

async function saveDiagram(diagram) {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId();
    pendingMessages.set(messageId, { resolve, reject });
    
    vscode.postMessage({
      type: 'api-saveDiagram',
      messageId,
      payload: { diagram },
    });
    
    setTimeout(() => {
      if (pendingMessages.has(messageId)) {
        pendingMessages.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

// 为了兼容性，保留这些函数，但它们内部都调用 saveDiagram
async function updateLayout(update) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

async function updateSource(source) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

async function updateStyle(update) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

async function deleteNode(nodeId) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

async function deleteEdge(edgeId) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

async function updateNodeImage(nodeId, payload) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

// 导出 VSCode API 状态




/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		// The chunk loading function for additional chunks
/******/ 		// Since all referenced chunks are already included
/******/ 		// in this file, this function is empty here.
/******/ 		__webpack_require__.e = () => (Promise.resolve());
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"MermaidEditorAppV2": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkmermaid_editor"] = self["webpackChunkmermaid_editor"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-MermaidEditorAppV2"], () => (__webpack_require__("./app/MermaidEditorAppV2.js")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;
//# sourceMappingURL=MermaidEditorAppV2.js.map