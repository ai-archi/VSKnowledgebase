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
___CSS_LOADER_EXPORT___.push([module.id, "/* Base styles */\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nhtml, body {\n  height: 100%;\n  overflow: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n  font-size: 14px;\n}\n\n.app {\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n  background: #ffffff;\n}\n\n/* Toolbar */\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 16px;\n  background: #f8f9fa;\n  border-bottom: 1px solid #e9ecef;\n  min-height: 40px;\n}\n\n.status {\n  font-size: 13px;\n  color: #6c757d;\n}\n\n.actions {\n  display: flex;\n  gap: 8px;\n}\n\n.actions button {\n  padding: 4px 12px;\n  font-size: 13px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.actions button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n/* Workspace */\n.workspace {\n  display: flex;\n  flex: 1;\n  overflow: hidden;\n}\n\n/* Style Panel */\n.style-panel {\n  width: 280px;\n  border-right: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  background: #ffffff;\n  overflow-y: auto;\n}\n\n.panel-header {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e9ecef;\n  background: #f8f9fa;\n}\n\n.panel-title {\n  font-weight: 600;\n  font-size: 14px;\n  display: block;\n  margin-bottom: 4px;\n}\n\n.panel-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.panel-caption.muted {\n  color: #adb5bd;\n}\n\n.panel-body {\n  padding: 16px;\n  flex: 1;\n}\n\n.style-section {\n  margin-bottom: 24px;\n}\n\n.section-heading {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 12px;\n}\n\n.section-heading h3 {\n  font-size: 14px;\n  font-weight: 600;\n}\n\n.section-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.section-caption.muted {\n  color: #adb5bd;\n}\n\n.style-controls {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.style-control {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.style-control span {\n  font-size: 12px;\n  color: #495057;\n}\n\n.style-control input[type=\"color\"],\n.style-control input[type=\"text\"],\n.style-control input[type=\"number\"],\n.style-control select {\n  padding: 6px;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  font-size: 13px;\n}\n\n.style-control input[type=\"color\"] {\n  height: 36px;\n  cursor: pointer;\n}\n\n.style-control:disabled,\n.style-control[aria-disabled=\"true\"] input,\n.style-control[aria-disabled=\"true\"] select {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.image-control {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.image-control-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.image-control-actions button {\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.image-control-actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.image-control-meta {\n  font-size: 11px;\n  color: #6c757d;\n}\n\n.image-control-meta.muted {\n  color: #adb5bd;\n}\n\n.style-reset {\n  margin-top: 12px;\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n  width: 100%;\n}\n\n.style-reset:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n/* Diagram Container */\n.diagram-container {\n  flex: 1;\n  position: relative;\n  overflow: hidden;\n  background: #ffffff;\n}\n\n.diagram-wrapper {\n  width: 100%;\n  height: 100%;\n  position: relative;\n}\n\n.diagram {\n  width: 100%;\n  height: 100%;\n  cursor: default;\n}\n\n.diagram .node {\n  cursor: move;\n}\n\n.diagram .node.selected {\n  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .edge {\n  cursor: pointer;\n}\n\n.diagram .edge.selected {\n  filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .handle {\n  fill: #3b82f6;\n  stroke: #ffffff;\n  stroke-width: 2;\n  cursor: move;\n}\n\n.diagram .handle.active {\n  fill: #10b981;\n}\n\n.diagram .handle:hover {\n  fill: #2563eb;\n}\n\n.diagram .subgraph {\n  cursor: grab;\n}\n\n.diagram .subgraph:active {\n  cursor: grabbing;\n}\n\n.diagram .alignment-guide {\n  stroke: #3b82f6;\n  stroke-width: 1;\n  stroke-dasharray: 4 4;\n  pointer-events: none;\n}\n\n/* Source Panel */\n.source-panel {\n  width: 320px;\n  border-left: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  background: #ffffff;\n}\n\n.panel-path {\n  font-size: 11px;\n  color: #6c757d;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n}\n\n.source-editor {\n  flex: 1;\n  padding: 12px;\n  border: none;\n  resize: none;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n  background: #ffffff;\n  color: #212529;\n}\n\n.source-editor:focus {\n  outline: none;\n}\n\n.panel-footer {\n  padding: 8px 12px;\n  border-top: 1px solid #e9ecef;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 11px;\n  background: #f8f9fa;\n}\n\n.source-status {\n  padding: 2px 6px;\n  border-radius: 3px;\n  font-size: 11px;\n}\n\n.source-status.synced {\n  color: #10b981;\n}\n\n.source-status.pending {\n  color: #f59e0b;\n}\n\n.source-status.saving {\n  color: #3b82f6;\n}\n\n.source-status.error {\n  color: #ef4444;\n}\n\n.selection-label {\n  color: #6c757d;\n  font-size: 11px;\n}\n\n/* Error Message */\n.error {\n  padding: 8px 16px;\n  background: #fee2e2;\n  color: #991b1b;\n  border-top: 1px solid #fecaca;\n  font-size: 13px;\n}\n\n/* Placeholder */\n.placeholder {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  color: #6c757d;\n  font-size: 14px;\n}\n\n/* Context Menu */\n.context-menu {\n  position: absolute;\n  background: #ffffff;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 4px 0;\n  z-index: 1000;\n  min-width: 120px;\n}\n\n.context-menu button {\n  width: 100%;\n  padding: 8px 16px;\n  text-align: left;\n  border: none;\n  background: none;\n  cursor: pointer;\n  font-size: 13px;\n  color: #212529;\n}\n\n.context-menu button:hover {\n  background: #f8f9fa;\n}\n\n", "",{"version":3,"sources":["webpack://./app/styles.css"],"names":[],"mappings":"AAAA,gBAAgB;AAChB;EACE,sBAAsB;EACtB,SAAS;EACT,UAAU;AACZ;;AAEA;EACE,YAAY;EACZ,gBAAgB;EAChB,yGAAyG;EACzG,eAAe;AACjB;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,aAAa;EACb,mBAAmB;AACrB;;AAEA,YAAY;AACZ;EACE,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,iBAAiB;EACjB,mBAAmB;EACnB,gCAAgC;EAChC,gBAAgB;AAClB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,aAAa;EACb,QAAQ;AACV;;AAEA;EACE,iBAAiB;EACjB,eAAe;EACf,yBAAyB;EACzB,mBAAmB;EACnB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,YAAY;EACZ,mBAAmB;AACrB;;AAEA,cAAc;AACd;EACE,aAAa;EACb,OAAO;EACP,gBAAgB;AAClB;;AAEA,gBAAgB;AAChB;EACE,YAAY;EACZ,+BAA+B;EAC/B,aAAa;EACb,sBAAsB;EACtB,mBAAmB;EACnB,gBAAgB;AAClB;;AAEA;EACE,kBAAkB;EAClB,gCAAgC;EAChC,mBAAmB;AACrB;;AAEA;EACE,gBAAgB;EAChB,eAAe;EACf,cAAc;EACd,kBAAkB;AACpB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,aAAa;EACb,OAAO;AACT;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,mBAAmB;AACrB;;AAEA;EACE,eAAe;EACf,gBAAgB;AAClB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,SAAS;AACX;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,QAAQ;AACV;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;;;;EAIE,YAAY;EACZ,yBAAyB;EACzB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,YAAY;EACZ,eAAe;AACjB;;AAEA;;;EAGE,YAAY;EACZ,mBAAmB;AACrB;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,QAAQ;AACV;;AAEA;EACE,aAAa;EACb,QAAQ;AACV;;AAEA;EACE,iBAAiB;EACjB,eAAe;EACf,yBAAyB;EACzB,mBAAmB;EACnB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,gBAAgB;EAChB,iBAAiB;EACjB,eAAe;EACf,yBAAyB;EACzB,mBAAmB;EACnB,kBAAkB;EAClB,eAAe;EACf,WAAW;AACb;;AAEA;EACE,mBAAmB;AACrB;;AAEA,sBAAsB;AACtB;EACE,OAAO;EACP,kBAAkB;EAClB,gBAAgB;EAChB,mBAAmB;AACrB;;AAEA;EACE,WAAW;EACX,YAAY;EACZ,kBAAkB;AACpB;;AAEA;EACE,WAAW;EACX,YAAY;EACZ,eAAe;AACjB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,oDAAoD;AACtD;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,oDAAoD;AACtD;;AAEA;EACE,aAAa;EACb,eAAe;EACf,eAAe;EACf,YAAY;AACd;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,gBAAgB;AAClB;;AAEA;EACE,eAAe;EACf,eAAe;EACf,qBAAqB;EACrB,oBAAoB;AACtB;;AAEA,iBAAiB;AACjB;EACE,YAAY;EACZ,8BAA8B;EAC9B,aAAa;EACb,sBAAsB;EACtB,mBAAmB;AACrB;;AAEA;EACE,eAAe;EACf,cAAc;EACd,wDAAwD;AAC1D;;AAEA;EACE,OAAO;EACP,aAAa;EACb,YAAY;EACZ,YAAY;EACZ,wDAAwD;EACxD,eAAe;EACf,gBAAgB;EAChB,mBAAmB;EACnB,cAAc;AAChB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,iBAAiB;EACjB,6BAA6B;EAC7B,aAAa;EACb,8BAA8B;EAC9B,mBAAmB;EACnB,eAAe;EACf,mBAAmB;AACrB;;AAEA;EACE,gBAAgB;EAChB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,cAAc;EACd,eAAe;AACjB;;AAEA,kBAAkB;AAClB;EACE,iBAAiB;EACjB,mBAAmB;EACnB,cAAc;EACd,6BAA6B;EAC7B,eAAe;AACjB;;AAEA,gBAAgB;AAChB;EACE,aAAa;EACb,mBAAmB;EACnB,uBAAuB;EACvB,YAAY;EACZ,cAAc;EACd,eAAe;AACjB;;AAEA,iBAAiB;AACjB;EACE,kBAAkB;EAClB,mBAAmB;EACnB,yBAAyB;EACzB,kBAAkB;EAClB,yCAAyC;EACzC,cAAc;EACd,aAAa;EACb,gBAAgB;AAClB;;AAEA;EACE,WAAW;EACX,iBAAiB;EACjB,gBAAgB;EAChB,YAAY;EACZ,gBAAgB;EAChB,eAAe;EACf,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,mBAAmB;AACrB","sourcesContent":["/* Base styles */\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nhtml, body {\n  height: 100%;\n  overflow: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n  font-size: 14px;\n}\n\n.app {\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n  background: #ffffff;\n}\n\n/* Toolbar */\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 16px;\n  background: #f8f9fa;\n  border-bottom: 1px solid #e9ecef;\n  min-height: 40px;\n}\n\n.status {\n  font-size: 13px;\n  color: #6c757d;\n}\n\n.actions {\n  display: flex;\n  gap: 8px;\n}\n\n.actions button {\n  padding: 4px 12px;\n  font-size: 13px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.actions button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n/* Workspace */\n.workspace {\n  display: flex;\n  flex: 1;\n  overflow: hidden;\n}\n\n/* Style Panel */\n.style-panel {\n  width: 280px;\n  border-right: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  background: #ffffff;\n  overflow-y: auto;\n}\n\n.panel-header {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e9ecef;\n  background: #f8f9fa;\n}\n\n.panel-title {\n  font-weight: 600;\n  font-size: 14px;\n  display: block;\n  margin-bottom: 4px;\n}\n\n.panel-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.panel-caption.muted {\n  color: #adb5bd;\n}\n\n.panel-body {\n  padding: 16px;\n  flex: 1;\n}\n\n.style-section {\n  margin-bottom: 24px;\n}\n\n.section-heading {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 12px;\n}\n\n.section-heading h3 {\n  font-size: 14px;\n  font-weight: 600;\n}\n\n.section-caption {\n  font-size: 12px;\n  color: #6c757d;\n}\n\n.section-caption.muted {\n  color: #adb5bd;\n}\n\n.style-controls {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.style-control {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.style-control span {\n  font-size: 12px;\n  color: #495057;\n}\n\n.style-control input[type=\"color\"],\n.style-control input[type=\"text\"],\n.style-control input[type=\"number\"],\n.style-control select {\n  padding: 6px;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  font-size: 13px;\n}\n\n.style-control input[type=\"color\"] {\n  height: 36px;\n  cursor: pointer;\n}\n\n.style-control:disabled,\n.style-control[aria-disabled=\"true\"] input,\n.style-control[aria-disabled=\"true\"] select {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.image-control {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.image-control-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.image-control-actions button {\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.image-control-actions button:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n.image-control-meta {\n  font-size: 11px;\n  color: #6c757d;\n}\n\n.image-control-meta.muted {\n  color: #adb5bd;\n}\n\n.style-reset {\n  margin-top: 12px;\n  padding: 6px 12px;\n  font-size: 12px;\n  border: 1px solid #dee2e6;\n  background: #ffffff;\n  border-radius: 4px;\n  cursor: pointer;\n  width: 100%;\n}\n\n.style-reset:hover:not(:disabled) {\n  background: #e9ecef;\n}\n\n/* Diagram Container */\n.diagram-container {\n  flex: 1;\n  position: relative;\n  overflow: hidden;\n  background: #ffffff;\n}\n\n.diagram-wrapper {\n  width: 100%;\n  height: 100%;\n  position: relative;\n}\n\n.diagram {\n  width: 100%;\n  height: 100%;\n  cursor: default;\n}\n\n.diagram .node {\n  cursor: move;\n}\n\n.diagram .node.selected {\n  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .edge {\n  cursor: pointer;\n}\n\n.diagram .edge.selected {\n  filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));\n}\n\n.diagram .handle {\n  fill: #3b82f6;\n  stroke: #ffffff;\n  stroke-width: 2;\n  cursor: move;\n}\n\n.diagram .handle.active {\n  fill: #10b981;\n}\n\n.diagram .handle:hover {\n  fill: #2563eb;\n}\n\n.diagram .subgraph {\n  cursor: grab;\n}\n\n.diagram .subgraph:active {\n  cursor: grabbing;\n}\n\n.diagram .alignment-guide {\n  stroke: #3b82f6;\n  stroke-width: 1;\n  stroke-dasharray: 4 4;\n  pointer-events: none;\n}\n\n/* Source Panel */\n.source-panel {\n  width: 320px;\n  border-left: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  background: #ffffff;\n}\n\n.panel-path {\n  font-size: 11px;\n  color: #6c757d;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n}\n\n.source-editor {\n  flex: 1;\n  padding: 12px;\n  border: none;\n  resize: none;\n  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;\n  font-size: 13px;\n  line-height: 1.5;\n  background: #ffffff;\n  color: #212529;\n}\n\n.source-editor:focus {\n  outline: none;\n}\n\n.panel-footer {\n  padding: 8px 12px;\n  border-top: 1px solid #e9ecef;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 11px;\n  background: #f8f9fa;\n}\n\n.source-status {\n  padding: 2px 6px;\n  border-radius: 3px;\n  font-size: 11px;\n}\n\n.source-status.synced {\n  color: #10b981;\n}\n\n.source-status.pending {\n  color: #f59e0b;\n}\n\n.source-status.saving {\n  color: #3b82f6;\n}\n\n.source-status.error {\n  color: #ef4444;\n}\n\n.selection-label {\n  color: #6c757d;\n  font-size: 11px;\n}\n\n/* Error Message */\n.error {\n  padding: 8px 16px;\n  background: #fee2e2;\n  color: #991b1b;\n  border-top: 1px solid #fecaca;\n  font-size: 13px;\n}\n\n/* Placeholder */\n.placeholder {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  color: #6c757d;\n  font-size: 14px;\n}\n\n/* Context Menu */\n.context-menu {\n  position: absolute;\n  background: #ffffff;\n  border: 1px solid #dee2e6;\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 4px 0;\n  z-index: 1000;\n  min-width: 120px;\n}\n\n.context-menu button {\n  width: 100%;\n  padding: 8px 16px;\n  text-align: left;\n  border: none;\n  background: none;\n  cursor: pointer;\n  font-size: 13px;\n  color: #212529;\n}\n\n.context-menu button:hover {\n  background: #f8f9fa;\n}\n\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/api.js":
/*!*************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/api.js ***!
  \*************************************************************************************************************/
/***/ ((module) => {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
// eslint-disable-next-line func-names
module.exports = function (cssWithMappingToString) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item);

      if (item[2]) {
        return "@media ".concat(item[2], " {").concat(content, "}");
      }

      return content;
    }).join("");
  }; // import a list of modules into the list
  // eslint-disable-next-line func-names


  list.i = function (modules, mediaQuery, dedupe) {
    if (typeof modules === "string") {
      // eslint-disable-next-line no-param-reassign
      modules = [[null, modules, ""]];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var i = 0; i < this.length; i++) {
        // eslint-disable-next-line prefer-destructuring
        var id = this[i][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _i = 0; _i < modules.length; _i++) {
      var item = [].concat(modules[_i]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (mediaQuery) {
        if (!item[2]) {
          item[2] = mediaQuery;
        } else {
          item[2] = "".concat(mediaQuery, " and ").concat(item[2]);
        }
      }

      list.push(item);
    }
  };

  return list;
};

/***/ }),

/***/ "../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/cssWithMappingToString.js":
/*!********************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/css-loader@5.2.7_webpack@5.103.0/node_modules/css-loader/dist/runtime/cssWithMappingToString.js ***!
  \********************************************************************************************************************************/
/***/ ((module) => {



function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

module.exports = function cssWithMappingToString(item) {
  var _item = _slicedToArray(item, 4),
      content = _item[1],
      cssMapping = _item[3];

  if (!cssMapping) {
    return content;
  }

  if (typeof btoa === "function") {
    // eslint-disable-next-line no-undef
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    var sourceURLs = cssMapping.sources.map(function (source) {
      return "/*# sourceURL=".concat(cssMapping.sourceRoot || "").concat(source, " */");
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join("\n");
  }

  return [content].join("\n");
};

/***/ }),

/***/ "../../node_modules/.pnpm/style-loader@2.0.0_webpack@5.103.0/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!**************************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/style-loader@2.0.0_webpack@5.103.0/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \**************************************************************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var isOldIE = function isOldIE() {
  var memo;
  return function memorize() {
    if (typeof memo === 'undefined') {
      // Test for IE <= 9 as proposed by Browserhacks
      // @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
      // Tests for existence of standard globals is to allow style-loader
      // to operate correctly into non-standard environments
      // @see https://github.com/webpack-contrib/style-loader/issues/177
      memo = Boolean(window && document && document.all && !window.atob);
    }

    return memo;
  };
}();

var getTarget = function getTarget() {
  var memo = {};
  return function memorize(target) {
    if (typeof memo[target] === 'undefined') {
      var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

      if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
        try {
          // This will throw an exception if access to iframe is blocked
          // due to cross-origin restrictions
          styleTarget = styleTarget.contentDocument.head;
        } catch (e) {
          // istanbul ignore next
          styleTarget = null;
        }
      }

      memo[target] = styleTarget;
    }

    return memo[target];
  };
}();

var stylesInDom = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDom.length; i++) {
    if (stylesInDom[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var index = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3]
    };

    if (index !== -1) {
      stylesInDom[index].references++;
      stylesInDom[index].updater(obj);
    } else {
      stylesInDom.push({
        identifier: identifier,
        updater: addStyle(obj, options),
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function insertStyleElement(options) {
  var style = document.createElement('style');
  var attributes = options.attributes || {};

  if (typeof attributes.nonce === 'undefined') {
    var nonce =  true ? __webpack_require__.nc : 0;

    if (nonce) {
      attributes.nonce = nonce;
    }
  }

  Object.keys(attributes).forEach(function (key) {
    style.setAttribute(key, attributes[key]);
  });

  if (typeof options.insert === 'function') {
    options.insert(style);
  } else {
    var target = getTarget(options.insert || 'head');

    if (!target) {
      throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    }

    target.appendChild(style);
  }

  return style;
}

function removeStyleElement(style) {
  // istanbul ignore if
  if (style.parentNode === null) {
    return false;
  }

  style.parentNode.removeChild(style);
}
/* istanbul ignore next  */


var replaceText = function replaceText() {
  var textStore = [];
  return function replace(index, replacement) {
    textStore[index] = replacement;
    return textStore.filter(Boolean).join('\n');
  };
}();

function applyToSingletonTag(style, index, remove, obj) {
  var css = remove ? '' : obj.media ? "@media ".concat(obj.media, " {").concat(obj.css, "}") : obj.css; // For old IE

  /* istanbul ignore if  */

  if (style.styleSheet) {
    style.styleSheet.cssText = replaceText(index, css);
  } else {
    var cssNode = document.createTextNode(css);
    var childNodes = style.childNodes;

    if (childNodes[index]) {
      style.removeChild(childNodes[index]);
    }

    if (childNodes.length) {
      style.insertBefore(cssNode, childNodes[index]);
    } else {
      style.appendChild(cssNode);
    }
  }
}

function applyToTag(style, options, obj) {
  var css = obj.css;
  var media = obj.media;
  var sourceMap = obj.sourceMap;

  if (media) {
    style.setAttribute('media', media);
  } else {
    style.removeAttribute('media');
  }

  if (sourceMap && typeof btoa !== 'undefined') {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    while (style.firstChild) {
      style.removeChild(style.firstChild);
    }

    style.appendChild(document.createTextNode(css));
  }
}

var singleton = null;
var singletonCounter = 0;

function addStyle(obj, options) {
  var style;
  var update;
  var remove;

  if (options.singleton) {
    var styleIndex = singletonCounter++;
    style = singleton || (singleton = insertStyleElement(options));
    update = applyToSingletonTag.bind(null, style, styleIndex, false);
    remove = applyToSingletonTag.bind(null, style, styleIndex, true);
  } else {
    style = insertStyleElement(options);
    update = applyToTag.bind(null, style, options);

    remove = function remove() {
      removeStyleElement(style);
    };
  }

  update(obj);
  return function updateStyle(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap) {
        return;
      }

      update(obj = newObj);
    } else {
      remove();
    }
  };
}

module.exports = function (list, options) {
  options = options || {}; // Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
  // tags it will allow on a page

  if (!options.singleton && typeof options.singleton !== 'boolean') {
    options.singleton = isOldIE();
  }

  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    if (Object.prototype.toString.call(newList) !== '[object Array]') {
      return;
    }

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDom[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDom[_index].references === 0) {
        stylesInDom[_index].updater();

        stylesInDom.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

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

/***/ "./lib/DiagramCanvas.js":
/*!******************************!*\
  !*** ./lib/DiagramCanvas.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DiagramCanvas: () => (/* binding */ DiagramCanvas)
/* harmony export */ });
/* harmony import */ var _types_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./types.js */ "./lib/types.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./lib/utils.js");
// DiagramCanvas - Core rendering and interaction (converted from React component)







// Helper functions
function interiorPoints(route) {
  if (route.length <= 2) {
    return [];
  }
  return route.slice(1, route.length - 1).map(point => ({ ...point }));
}

function labelCenterForRoute(route) {
  if (route.length === 0) {
    return { x: 0, y: -_types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_VERTICAL_OFFSET };
  }

  const fallback = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.centroid)(route);
  if (route.length <= 2) {
    return { x: fallback.x, y: fallback.y - _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_VERTICAL_OFFSET };
  }

  const candidates = route.slice(1, route.length - 1);
  if (candidates.length === 0) {
    return { x: fallback.x, y: fallback.y - _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_VERTICAL_OFFSET };
  }

  if (candidates.length === 1) {
    return { ...candidates[0] };
  }

  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of candidates) {
    const distance = Math.hypot(point.x - fallback.x, point.y - fallback.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }

  return { ...best };
}

function defaultHandleForRoute(route, start, end) {
  const interior = interiorPoints(route);
  if (interior.length > 0) {
    const index = Math.floor(interior.length / 2);
    return { ...interior[index] };
  }
  return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.midpoint)(start, end);
}

function createNodeBox(position, width, height) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return {
    left: position.x - halfWidth,
    right: position.x + halfWidth,
    centerX: position.x,
    top: position.y - halfHeight,
    bottom: position.y + halfHeight,
    centerY: position.y,
  };
}

function resolveNodeDimensions(id, dimensions) {
  const dims = dimensions.get(id);
  if (dims) {
    return dims;
  }
  if (id.startsWith('edge:')) {
    return { width: 0, height: 0 };
  }
  return { width: _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH, height: _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT };
}

function computeNodeAlignment(nodeId, proposed, nodes, threshold, dimensions) {
  const movingDimensions = resolveNodeDimensions(nodeId, dimensions);
  const movingBox = createNodeBox(proposed, movingDimensions.width, movingDimensions.height);
  let bestVertical = null;
  let bestHorizontal = null;

  for (const [otherId, point] of nodes) {
    if (otherId === nodeId) {
      continue;
    }
    const otherDimensions = resolveNodeDimensions(otherId, dimensions);
    const otherBox = createNodeBox(point, otherDimensions.width, otherDimensions.height);

    const verticalCandidates = [
      { diff: otherBox.left - movingBox.left, value: () => proposed.x + (otherBox.left - movingBox.left), kind: 'edge', line: otherBox.left },
      { diff: otherBox.right - movingBox.left, value: () => proposed.x + (otherBox.right - movingBox.left), kind: 'edge', line: otherBox.right },
      { diff: otherBox.left - movingBox.right, value: () => proposed.x + (otherBox.left - movingBox.right), kind: 'edge', line: otherBox.left },
      { diff: otherBox.right - movingBox.right, value: () => proposed.x + (otherBox.right - movingBox.right), kind: 'edge', line: otherBox.right },
      { diff: otherBox.centerX - movingBox.centerX, value: () => proposed.x + (otherBox.centerX - movingBox.centerX), kind: 'center', line: otherBox.centerX },
    ];

    for (const candidate of verticalCandidates) {
      const absDiff = Math.abs(candidate.diff);
      if (absDiff > threshold) {
        continue;
      }
      if (bestVertical && Math.abs(bestVertical.diff) <= absDiff) {
        continue;
      }
      const alignedX = candidate.value();
      const alignedBox = createNodeBox({ x: alignedX, y: proposed.y }, movingDimensions.width, movingDimensions.height);
      bestVertical = {
        diff: candidate.diff,
        value: alignedX,
        guide: {
          axis: 'vertical',
          x: candidate.kind === 'center' ? alignedBox.centerX : candidate.line,
          y1: Math.min(alignedBox.top, otherBox.top),
          y2: Math.max(alignedBox.bottom, otherBox.bottom),
          kind: candidate.kind,
          sourceId: nodeId,
          targetId: otherId,
        },
      };
    }

    const horizontalCandidates = [
      { diff: otherBox.top - movingBox.top, value: () => proposed.y + (otherBox.top - movingBox.top), kind: 'edge', line: otherBox.top },
      { diff: otherBox.bottom - movingBox.top, value: () => proposed.y + (otherBox.bottom - movingBox.top), kind: 'edge', line: otherBox.bottom },
      { diff: otherBox.top - movingBox.bottom, value: () => proposed.y + (otherBox.top - movingBox.bottom), kind: 'edge', line: otherBox.top },
      { diff: otherBox.bottom - movingBox.bottom, value: () => proposed.y + (otherBox.bottom - movingBox.bottom), kind: 'edge', line: otherBox.bottom },
      { diff: otherBox.centerY - movingBox.centerY, value: () => proposed.y + (otherBox.centerY - movingBox.centerY), kind: 'center', line: otherBox.centerY },
    ];

    for (const candidate of horizontalCandidates) {
      const absDiff = Math.abs(candidate.diff);
      if (absDiff > threshold) {
        continue;
      }
      if (bestHorizontal && Math.abs(bestHorizontal.diff) <= absDiff) {
        continue;
      }
      const alignedY = candidate.value();
      const alignedBox = createNodeBox({ x: proposed.x, y: alignedY }, movingDimensions.width, movingDimensions.height);
      bestHorizontal = {
        diff: candidate.diff,
        value: alignedY,
        guide: {
          axis: 'horizontal',
          y: candidate.kind === 'center' ? alignedBox.centerY : candidate.line,
          x1: Math.min(alignedBox.left, otherBox.left),
          x2: Math.max(alignedBox.right, otherBox.right),
          kind: candidate.kind,
          sourceId: nodeId,
          targetId: otherId,
        },
      };
    }
  }

  const guides = {};
  let appliedX = false;
  let appliedY = false;

  let finalX = proposed.x;
  if (bestVertical) {
    finalX = bestVertical.value;
    guides.vertical = bestVertical.guide;
    appliedX = true;
  }

  let finalY = proposed.y;
  if (bestHorizontal) {
    finalY = bestHorizontal.value;
    guides.horizontal = bestHorizontal.guide;
    appliedY = true;
  }

  const finalPosition = { x: finalX, y: finalY };
  const finalBox = createNodeBox(finalPosition, movingDimensions.width, movingDimensions.height);

  if (guides.vertical) {
    const targetPoint = nodes.find(entry => entry[0] === guides.vertical.targetId)?.[1];
    if (targetPoint) {
      const targetDimensions = resolveNodeDimensions(guides.vertical.targetId, dimensions);
      const targetBox = createNodeBox(targetPoint, targetDimensions.width, targetDimensions.height);
      guides.vertical.x = guides.vertical.kind === 'center' ? finalBox.centerX : guides.vertical.x;
      guides.vertical.y1 = Math.min(finalBox.top, targetBox.top);
      guides.vertical.y2 = Math.max(finalBox.bottom, targetBox.bottom);
    }
  }

  if (guides.horizontal) {
    const targetPoint = nodes.find(entry => entry[0] === guides.horizontal.targetId)?.[1];
    if (targetPoint) {
      const targetDimensions = resolveNodeDimensions(guides.horizontal.targetId, dimensions);
      const targetBox = createNodeBox(targetPoint, targetDimensions.width, targetDimensions.height);
      guides.horizontal.y = guides.horizontal.kind === 'center' ? finalBox.centerY : guides.horizontal.y;
      guides.horizontal.x1 = Math.min(finalBox.left, targetBox.left);
      guides.horizontal.x2 = Math.max(finalBox.right, targetBox.right);
    }
  }

  return {
    position: finalPosition,
    guides: (guides.vertical || guides.horizontal) ? guides : {},
    appliedX,
    appliedY,
  };
}

function guidesEqual(a, b) {
  if (!!a.vertical !== !!b.vertical) return false;
  if (a.vertical && b.vertical) {
    if (a.vertical.x !== b.vertical.x || a.vertical.y1 !== b.vertical.y1 || 
        a.vertical.y2 !== b.vertical.y2 || a.vertical.kind !== b.vertical.kind) {
      return false;
    }
  }
  if (!!a.horizontal !== !!b.horizontal) return false;
  if (a.horizontal && b.horizontal) {
    if (a.horizontal.y !== b.horizontal.y || a.horizontal.x1 !== b.horizontal.x1 || 
        a.horizontal.x2 !== b.horizontal.x2 || a.horizontal.kind !== b.horizontal.kind) {
      return false;
    }
  }
  return true;
}

class DiagramCanvas {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    
    // State
    this.diagram = null;
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.dragState = null;
    this.draftNodes = {};
    this.draftEdges = {};
    this.draftSubgraphs = {};
    this.alignmentGuides = {};
    this.contextMenu = { visible: false, x: 0, y: 0, target: null };
    this.bounds = { width: 800, height: 600, offsetX: 0, offsetY: 0 };
    this.nodeDimensions = new Map();
    
    // Callbacks
    this.onNodeMove = options.onNodeMove || (() => {});
    this.onEdgeMove = options.onEdgeMove || (() => {});
    this.onLayoutUpdate = options.onLayoutUpdate || null;
    this.onSelectNode = options.onSelectNode || (() => {});
    this.onSelectEdge = options.onSelectEdge || (() => {});
    this.onDragStateChange = options.onDragStateChange || (() => {});
    this.onDeleteNode = options.onDeleteNode || (() => {});
    this.onDeleteEdge = options.onDeleteEdge || (() => {});
    
    // DOM elements
    this.wrapper = null;
    this.svg = null;
    
    this.init();
  }
  
  init() {
    // Create wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'diagram-wrapper';
    this.container.appendChild(this.wrapper);
    
    // Create SVG
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'diagram');
    this.wrapper.appendChild(this.svg);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Create arrow markers
    this.createArrowMarkers();
  }
  
  setupEventListeners() {
    this.svg.addEventListener('pointerdown', (e) => this.handleCanvasPointerDown(e));
    this.svg.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.svg.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.svg.addEventListener('pointercancel', (e) => this.handlePointerCancel(e));
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.closeContextMenu();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }
  
  createArrowMarkers() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Arrow end marker
    const markerEnd = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    markerEnd.setAttribute('id', 'arrow-end');
    markerEnd.setAttribute('markerWidth', '12');
    markerEnd.setAttribute('markerHeight', '12');
    markerEnd.setAttribute('refX', '10');
    markerEnd.setAttribute('refY', '6');
    markerEnd.setAttribute('orient', 'auto');
    markerEnd.setAttribute('markerUnits', 'strokeWidth');
    const pathEnd = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEnd.setAttribute('d', 'M2,2 L10,6 L2,10 z');
    pathEnd.setAttribute('fill', 'context-stroke');
    markerEnd.appendChild(pathEnd);
    
    // Arrow start marker
    const markerStart = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    markerStart.setAttribute('id', 'arrow-start');
    markerStart.setAttribute('markerWidth', '12');
    markerStart.setAttribute('markerHeight', '12');
    markerStart.setAttribute('refX', '2');
    markerStart.setAttribute('refY', '6');
    markerStart.setAttribute('orient', 'auto');
    markerStart.setAttribute('markerUnits', 'strokeWidth');
    const pathStart = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathStart.setAttribute('d', 'M10,2 L2,6 L10,10 z');
    pathStart.setAttribute('fill', 'context-stroke');
    markerStart.appendChild(pathStart);
    
    defs.appendChild(markerEnd);
    defs.appendChild(markerStart);
    this.svg.appendChild(defs);
  }
  
  setDiagram(diagram) {
    this.diagram = diagram;
    
    // Update node dimensions
    this.nodeDimensions.clear();
    for (const node of diagram.nodes) {
      const width = Number.isFinite(node.width) && node.width > 0 ? node.width : _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH;
      const height = Number.isFinite(node.height) && node.height > 0 ? node.height : _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT;
      this.nodeDimensions.set(node.id, { width, height });
    }
    
    this.updateBounds();
    this.render();
  }
  
  setSelectedNode(id) {
    this.selectedNodeId = id;
    if (id) {
      this.selectedEdgeId = null;
    }
    this.render();
  }
  
  setSelectedEdge(id) {
    this.selectedEdgeId = id;
    if (id) {
      this.selectedNodeId = null;
    }
    this.render();
  }
  
  updateBounds() {
    if (!this.diagram) {
      return;
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    const extend = (point, halfWidth = 0, halfHeight = 0) => {
      minX = Math.min(minX, point.x - halfWidth);
      maxX = Math.max(maxX, point.x + halfWidth);
      minY = Math.min(minY, point.y - halfHeight);
      maxY = Math.max(maxY, point.y + halfHeight);
    };
    
    // Include nodes
    for (const node of this.diagram.nodes) {
      const position = this.draftNodes[node.id] ?? node.overridePosition ?? node.renderedPosition;
      const width = node.width ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH;
      const height = node.height ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT;
      extend(position, width / 2, height / 2);
    }
    
    // Include edges
    for (const edge of this.diagram.edges) {
      const route = this.getEdgeRoute(edge);
      for (const point of route) {
        extend(point);
      }
    }
    
    if (!Number.isFinite(minX)) {
      minX = -_types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH / 2;
      maxX = _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH / 2;
      minY = -_types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT / 2;
      maxY = _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT / 2;
    }
    
    const width = Math.max(maxX - minX, _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH) + _types_js__WEBPACK_IMPORTED_MODULE_0__.LAYOUT_MARGIN * 2;
    const height = Math.max(maxY - minY, _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT) + _types_js__WEBPACK_IMPORTED_MODULE_0__.LAYOUT_MARGIN * 2;
    const offsetX = _types_js__WEBPACK_IMPORTED_MODULE_0__.LAYOUT_MARGIN - minX;
    const offsetY = _types_js__WEBPACK_IMPORTED_MODULE_0__.LAYOUT_MARGIN - minY;
    
    this.bounds = { width, height, offsetX, offsetY };
  }
  
  getEdgeRoute(edge) {
    const from = this.getNodePosition(edge.from);
    const to = this.getNodePosition(edge.to);
    
    if (!from || !to) {
      return [];
    }
    
    const draftOverride = this.draftEdges[edge.id];
    const hasDraftOverride = draftOverride !== undefined;
    const baseOverrides = draftOverride ?? edge.overridePoints ?? [];
    const overridePoints = baseOverrides.map(point => ({ x: point.x, y: point.y }));
    const hasOverride = overridePoints.length > 0;
    
    const renderedRoute = (edge.renderedPoints && edge.renderedPoints.length >= 2)
      ? edge.renderedPoints.map(point => ({ x: point.x, y: point.y }))
      : (edge.autoPoints && edge.autoPoints.length >= 2)
        ? edge.autoPoints.map(point => ({ x: point.x, y: point.y }))
        : [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
    
    if (hasDraftOverride) {
      return [{ x: from.x, y: from.y }, ...overridePoints, { x: to.x, y: to.y }];
    }
    
    return renderedRoute;
  }
  
  getNodePosition(nodeId) {
    const node = this.diagram.nodes.find(n => n.id === nodeId);
    if (!node) {
      return null;
    }
    return this.draftNodes[nodeId] ?? node.overridePosition ?? node.renderedPosition ?? node.autoPosition;
  }
  
  toScreen(point) {
    return {
      x: point.x + this.bounds.offsetX,
      y: point.y + this.bounds.offsetY,
    };
  }
  
  getDiagramPointFromClient(clientX, clientY) {
    if (!this.svg) {
      return null;
    }
    const point = this.svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) {
      return null;
    }
    const transformed = point.matrixTransform(ctm.inverse());
    return {
      x: transformed.x - this.bounds.offsetX,
      y: transformed.y - this.bounds.offsetY,
    };
  }
  
  render() {
    if (!this.diagram) {
      return;
    }
    
    this.updateBounds();
    
    // Update SVG viewBox
    this.svg.setAttribute('viewBox', `0 0 ${this.bounds.width} ${this.bounds.height}`);
    
    // Clear existing content (except defs)
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) {
      this.svg.appendChild(defs);
    }
    
    // Render subgraphs
    this.renderSubgraphs();
    
    // Render edges
    this.renderEdges();
    
    // Render nodes
    this.renderNodes();
    
    // Render alignment guides
    this.renderAlignmentGuides();
  }
  
  renderSubgraphs() {
    if (!this.diagram.subgraphs) {
      return;
    }
    
    const subgraphs = [...this.diagram.subgraphs].sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });
    
    for (const subgraph of subgraphs) {
      const offset = this.draftSubgraphs[subgraph.id] ?? { x: 0, y: 0 };
      const topLeft = this.toScreen({ x: subgraph.x + offset.x, y: subgraph.y + offset.y });
      const bottomRight = this.toScreen({
        x: subgraph.x + subgraph.width + offset.x,
        y: subgraph.y + subgraph.height + offset.y,
      });
      const labelPoint = this.toScreen({
        x: subgraph.labelX + offset.x,
        y: subgraph.labelY + offset.y,
      });
      
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'subgraph');
      g.setAttribute('data-id', subgraph.id);
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', topLeft.x);
      rect.setAttribute('y', topLeft.y);
      rect.setAttribute('width', bottomRight.x - topLeft.x);
      rect.setAttribute('height', bottomRight.y - topLeft.y);
      rect.setAttribute('rx', _types_js__WEBPACK_IMPORTED_MODULE_0__.SUBGRAPH_BORDER_RADIUS);
      rect.setAttribute('ry', _types_js__WEBPACK_IMPORTED_MODULE_0__.SUBGRAPH_BORDER_RADIUS);
      rect.setAttribute('fill', _types_js__WEBPACK_IMPORTED_MODULE_0__.SUBGRAPH_FILL);
      rect.setAttribute('fill-opacity', '0.7');
      rect.setAttribute('stroke', _types_js__WEBPACK_IMPORTED_MODULE_0__.SUBGRAPH_STROKE);
      rect.setAttribute('stroke-width', '1.5');
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', labelPoint.x);
      text.setAttribute('y', labelPoint.y);
      text.setAttribute('fill', _types_js__WEBPACK_IMPORTED_MODULE_0__.SUBGRAPH_LABEL_COLOR);
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '600');
      text.setAttribute('text-anchor', 'start');
      text.setAttribute('dominant-baseline', 'hanging');
      text.textContent = subgraph.label;
      
      g.appendChild(rect);
      g.appendChild(text);
      
      // Event handlers for subgraph
      g.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSubgraphPointerDown(subgraph.id, e);
      });
      
      this.svg.appendChild(g);
    }
  }
  
  gatherSubgraphDescendants(rootId) {
    const result = [];
    const stack = [rootId];
    const subgraphChildren = new Map();
    
    // Build children map
    for (const subgraph of this.diagram.subgraphs ?? []) {
      if (subgraph.parentId) {
        const existing = subgraphChildren.get(subgraph.parentId);
        if (existing) {
          existing.push(subgraph.id);
        } else {
          subgraphChildren.set(subgraph.parentId, [subgraph.id]);
        }
      }
    }
    
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      result.push(current);
      const children = subgraphChildren.get(current);
      if (children) {
        for (const child of children) {
          stack.push(child);
        }
      }
    }
    return result;
  }
  
  handleSubgraphPointerDown(id, e) {
    const diagramPoint = this.getDiagramPointFromClient(e.clientX, e.clientY);
    if (!diagramPoint) {
      return;
    }
    
    const subgraph = this.diagram.subgraphs?.find(item => item.id === id);
    if (!subgraph) {
      return;
    }
    
    // Get nodes in this subgraph
    const members = this.getSubgraphNodes(id);
    
    if (members.length === 0) {
      return;
    }
    
    const offsetEntry = this.draftSubgraphs[id];
    const currentTopLeft = {
      x: subgraph.x + (offsetEntry?.x ?? 0),
      y: subgraph.y + (offsetEntry?.y ?? 0),
    };
    
    const nodeOffsets = {};
    for (const nodeId of members) {
      const position = this.getNodePosition(nodeId);
      if (position) {
        nodeOffsets[nodeId] = {
          x: position.x - currentTopLeft.x,
          y: position.y - currentTopLeft.y,
        };
      }
    }
    
    if (Object.keys(nodeOffsets).length === 0) {
      return;
    }
    
    const offset = {
      x: diagramPoint.x - currentTopLeft.x,
      y: diagramPoint.y - currentTopLeft.y,
    };
    
    const subgraphIds = this.gatherSubgraphDescendants(id);
    
    const memberSet = new Set(members);
    const edgeOverrides = {};
    for (const edge of this.diagram.edges) {
      const baseOverride = this.draftEdges[edge.id] ?? edge.overridePoints;
      if (!baseOverride || baseOverride.length === 0) {
        continue;
      }
      if (!memberSet.has(edge.from) && !memberSet.has(edge.to)) {
        continue;
      }
      edgeOverrides[edge.id] = baseOverride.map(point => ({ x: point.x, y: point.y }));
    }
    
    this.dragState = {
      type: 'subgraph',
      id,
      offset,
      origin: currentTopLeft,
      members,
      nodeOffsets,
      subgraphIds,
      edgeOverrides,
      delta: { x: 0, y: 0 },
      moved: false,
    };
    
    // Initialize draft positions
    for (const nodeId of members) {
      const position = this.getNodePosition(nodeId);
      if (position) {
        this.draftNodes[nodeId] = position;
      }
    }
    
    for (const subgraphId of subgraphIds) {
      this.draftSubgraphs[subgraphId] = this.draftSubgraphs[subgraphId] ?? { x: 0, y: 0 };
    }
    
    this.onDragStateChange(true);
    this.onSelectNode(null);
    this.onSelectEdge(null);
    
    // 安全地设置指针捕获
    try {
      if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      console.warn('Failed to set pointer capture:', err);
    }
  }
  
  renderEdges() {
    for (const edge of this.diagram.edges) {
      this.renderEdge(edge);
    }
  }
  
  renderEdge(edge) {
    const route = this.getEdgeRoute(edge);
    if (route.length < 2) {
      return;
    }
    
    const screenRoute = route.map(p => this.toScreen(p));
    const isSelected = this.selectedEdgeId === edge.id;
    const color = edge.color ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_EDGE_COLOR;
    const arrowDirection = edge.arrowDirection ?? 'forward';
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', isSelected ? 'edge selected' : 'edge');
    g.setAttribute('data-edge-id', edge.id);
    
    // Create path
    let pathElement;
    if (screenRoute.length === 2) {
      pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      pathElement.setAttribute('x1', screenRoute[0].x);
      pathElement.setAttribute('y1', screenRoute[0].y);
      pathElement.setAttribute('x2', screenRoute[1].x);
      pathElement.setAttribute('y2', screenRoute[1].y);
    } else {
      pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      const points = screenRoute.map(p => `${p.x},${p.y}`).join(' ');
      pathElement.setAttribute('points', points);
    }
    
    pathElement.setAttribute('stroke', color);
    pathElement.setAttribute('stroke-width', '2');
    pathElement.setAttribute('fill', 'none');
    
    if (edge.kind === 'dashed') {
      pathElement.setAttribute('stroke-dasharray', '8 6');
    }
    
    // Arrow markers
    if (arrowDirection === 'backward' || arrowDirection === 'both') {
      pathElement.setAttribute('marker-start', 'url(#arrow-start)');
    }
    if (arrowDirection === 'forward' || arrowDirection === 'both') {
      pathElement.setAttribute('marker-end', 'url(#arrow-end)');
    }
    
    // Event handlers
    pathElement.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.onSelectEdge(edge.id);
    });
    
    pathElement.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const diagramPoint = this.getDiagramPointFromClient(e.clientX, e.clientY);
      if (diagramPoint) {
        this.handleEdgeDoubleClick(edge, route, diagramPoint);
      }
    });
    
    g.appendChild(pathElement);
    
    // Render edge label
    if (edge.label) {
      this.renderEdgeLabel(g, edge, route, screenRoute, isSelected, color);
    }
    
    // Render handles
    this.renderEdgeHandles(g, edge, route);
    
    this.svg.appendChild(g);
  }
  
  renderEdgeLabel(g, edge, route, screenRoute, isSelected, color) {
    const labelLines = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.normalizeLabelLines)(edge.label);
    const labelSize = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.measureLabelBox)(labelLines);
    const labelPoint = labelCenterForRoute(route);
    const labelScreen = this.toScreen(labelPoint);
    
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'edge-label-group');
    labelGroup.setAttribute('transform', `translate(${labelScreen.x}, ${labelScreen.y})`);
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', -labelSize.width / 2);
    rect.setAttribute('y', -labelSize.height / 2);
    rect.setAttribute('width', labelSize.width);
    rect.setAttribute('height', labelSize.height);
    rect.setAttribute('rx', _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_BORDER_RADIUS);
    rect.setAttribute('ry', _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_BORDER_RADIUS);
    rect.setAttribute('fill', _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_BACKGROUND);
    rect.setAttribute('fill-opacity', _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_BACKGROUND_OPACITY);
    rect.setAttribute('stroke', isSelected ? '#f472b6' : color);
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('pointer-events', 'none');
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'edge-label');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_FONT_SIZE);
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('pointer-events', 'none');
    
    if (labelLines.length === 1) {
      text.textContent = labelLines[0];
    } else {
      const baselineStart = -((labelLines.length - 1) * _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_LINE_HEIGHT) / 2;
      labelLines.forEach((line, idx) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '0');
        tspan.setAttribute('y', baselineStart + idx * _types_js__WEBPACK_IMPORTED_MODULE_0__.EDGE_LABEL_LINE_HEIGHT);
        tspan.setAttribute('dominant-baseline', 'middle');
        tspan.textContent = line;
        text.appendChild(tspan);
      });
    }
    
    labelGroup.appendChild(rect);
    labelGroup.appendChild(text);
    g.appendChild(labelGroup);
  }
  
  renderEdgeHandles(g, edge, route) {
    const draftOverride = this.draftEdges[edge.id];
    const hasOverride = draftOverride !== undefined && draftOverride.length > 0;
    const overridePoints = hasOverride ? draftOverride : [];
    
    const handlePoints = hasOverride
      ? overridePoints
      : [defaultHandleForRoute(route, route[0], route[route.length - 1])];
    
    handlePoints.forEach((point, index) => {
      const screen = this.toScreen(point);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', hasOverride ? 'handle active' : 'handle');
      circle.setAttribute('cx', screen.x);
      circle.setAttribute('cy', screen.y);
      circle.setAttribute('r', _types_js__WEBPACK_IMPORTED_MODULE_0__.HANDLE_RADIUS);
      circle.setAttribute('data-edge-id', edge.id);
      circle.setAttribute('data-handle-index', index);
      
      circle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleHandlePointerDown(edge.id, index, handlePoints, hasOverride, e);
      });
      
      circle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.onEdgeMove(edge.id, null);
      });
      
      g.appendChild(circle);
    });
  }
  
  renderNodes() {
    for (const node of this.diagram.nodes) {
      this.renderNode(node);
    }
  }
  
  renderNode(node) {
    const position = this.getNodePosition(node.id);
    if (!position) {
      return;
    }
    
    const screen = this.toScreen(position);
    const isSelected = this.selectedNodeId === node.id;
    const nodeWidth = node.width ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_WIDTH;
    const nodeHeight = node.height ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_HEIGHT;
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', isSelected ? 'node selected' : 'node');
    g.setAttribute('data-node-id', node.id);
    g.setAttribute('transform', `translate(${screen.x}, ${screen.y})`);
    
    // Render shape
    this.renderNodeShape(g, node, nodeWidth, nodeHeight, isSelected);
    
    // Render label
    this.renderNodeLabel(g, node, nodeWidth, nodeHeight);
    
    // Render image if present
    if (node.image) {
      this.renderNodeImage(g, node, nodeWidth, nodeHeight);
    }
    
    // Event handlers
    g.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleNodePointerDown(node.id, e);
    });
    
    g.addEventListener('dblclick', () => {
      this.onNodeMove(node.id, null);
    });
    
    this.svg.appendChild(g);
  }
  
  renderNodeShape(g, node, width, height, isSelected) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const defaultFill = _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_COLORS[node.shape] ?? '#ffffff';
    const fillColor = node.fillColor ?? defaultFill;
    const strokeColor = node.strokeColor ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_STROKE;
    
    const shapeComponents = this.createShapeComponents(node.shape, halfWidth, halfHeight, width, height, fillColor, strokeColor);
    
    // Add clip path if needed
    if (node.image && shapeComponents.clip) {
      const clipId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.svgSafeId)('node-clip-', node.id);
      let defs = this.svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        this.svg.insertBefore(defs, this.svg.firstChild);
      }
      
      let clipPath = defs.querySelector(`clipPath[id="${clipId}"]`);
      if (!clipPath) {
        clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        clipPath.appendChild(shapeComponents.clip.cloneNode(true));
        defs.appendChild(clipPath);
      }
    }
    
    // Append shape and outline
    // 设置 shape 元素的 pointer-events，让事件能够冒泡到父元素 g
    if (shapeComponents.shape) {
      if (Array.isArray(shapeComponents.shape)) {
        shapeComponents.shape.forEach(el => {
          el.setAttribute('pointer-events', 'all');
          g.appendChild(el);
        });
      } else {
        shapeComponents.shape.setAttribute('pointer-events', 'all');
        g.appendChild(shapeComponents.shape);
      }
    }
    
    if (shapeComponents.outline) {
      if (Array.isArray(shapeComponents.outline)) {
        shapeComponents.outline.forEach(el => {
          el.setAttribute('pointer-events', 'none');
          g.appendChild(el);
        });
      } else {
        shapeComponents.outline.setAttribute('pointer-events', 'none');
        g.appendChild(shapeComponents.outline);
      }
    }
  }
  
  createShapeComponents(shape, halfWidth, halfHeight, width, height, fillColor, strokeColor) {
    const createRect = (rx, ry) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', -halfWidth);
      el.setAttribute('y', -halfHeight);
      el.setAttribute('width', width);
      el.setAttribute('height', height);
      el.setAttribute('rx', rx);
      el.setAttribute('ry', ry);
      return el;
    };
    
    const createEllipse = () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      el.setAttribute('cx', '0');
      el.setAttribute('cy', '0');
      el.setAttribute('rx', halfWidth);
      el.setAttribute('ry', halfHeight);
      return el;
    };
    
    const createPolygon = (points) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      el.setAttribute('points', (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.polygonPoints)(points));
      return el;
    };
    
    const createPath = (d) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', d);
      return el;
    };
    
    const createLine = (x1, y1, x2, y2) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', x1);
      el.setAttribute('y1', y1);
      el.setAttribute('x2', x2);
      el.setAttribute('y2', y2);
      el.setAttribute('stroke', strokeColor);
      el.setAttribute('stroke-width', '2');
      return el;
    };
    
    switch (shape) {
      case 'rectangle': {
        const shapeEl = createRect(8, 8);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createRect(8, 8);
        const outlineEl = createRect(8, 8);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'stadium': {
        const shapeEl = createRect(30, 30);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createRect(30, 30);
        const outlineEl = createRect(30, 30);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'circle': {
        const shapeEl = createEllipse();
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createEllipse();
        const outlineEl = createEllipse();
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'double-circle': {
        const innerRx = Math.max(halfWidth - 6, halfWidth * 0.65);
        const innerRy = Math.max(halfHeight - 6, halfHeight * 0.65);
        const shapeEl = createEllipse();
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createEllipse();
        const outerOutline = createEllipse();
        outerOutline.setAttribute('fill', 'none');
        outerOutline.setAttribute('stroke', strokeColor);
        outerOutline.setAttribute('stroke-width', '2');
        const innerOutline = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        innerOutline.setAttribute('cx', '0');
        innerOutline.setAttribute('cy', '0');
        innerOutline.setAttribute('rx', innerRx);
        innerOutline.setAttribute('ry', innerRy);
        innerOutline.setAttribute('fill', 'none');
        innerOutline.setAttribute('stroke', strokeColor);
        innerOutline.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: [outerOutline, innerOutline] };
      }
      
      case 'diamond': {
        const points = [[0, -halfHeight], [halfWidth, 0], [0, halfHeight], [-halfWidth, 0]];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'subroutine': {
        const inset = 12;
        const shapeEl = createRect(8, 8);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createRect(8, 8);
        const outlineEl = createRect(8, 8);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        const line1 = createLine(-halfWidth + inset, -halfHeight, -halfWidth + inset, halfHeight);
        const line2 = createLine(halfWidth - inset, -halfHeight, halfWidth - inset, halfHeight);
        return { shape: shapeEl, clip: clipEl, outline: [outlineEl, line1, line2] };
      }
      
      case 'cylinder': {
        const rx = halfWidth;
        const ry = height / 6;
        const top = -halfHeight;
        const bottom = halfHeight;
        const topCenter = top + ry;
        const bottomCenter = bottom - ry;
        const bodyPath = `M ${-halfWidth},${topCenter} A ${rx},${ry} 0 0 1 ${halfWidth},${topCenter} L ${halfWidth},${bottomCenter} A ${rx},${ry} 0 0 1 ${-halfWidth},${bottomCenter} Z`;
        const topPath = `M ${-halfWidth},${topCenter} A ${rx},${ry} 0 0 1 ${halfWidth},${topCenter}`;
        const shapeEl = createPath(bodyPath);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPath(bodyPath);
        const bodyOutline = createPath(bodyPath);
        bodyOutline.setAttribute('fill', 'none');
        bodyOutline.setAttribute('stroke', strokeColor);
        bodyOutline.setAttribute('stroke-width', '2');
        const topOutline = createPath(topPath);
        topOutline.setAttribute('fill', 'none');
        topOutline.setAttribute('stroke', strokeColor);
        topOutline.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: [bodyOutline, topOutline] };
      }
      
      case 'hexagon': {
        const offset = width * 0.25;
        const points = [
          [-halfWidth + offset, -halfHeight],
          [halfWidth - offset, -halfHeight],
          [halfWidth, 0],
          [halfWidth - offset, halfHeight],
          [-halfWidth + offset, halfHeight],
          [-halfWidth, 0],
        ];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'parallelogram': {
        const skew = height * 0.35;
        const points = [
          [-halfWidth + skew, -halfHeight],
          [halfWidth, -halfHeight],
          [halfWidth - skew, halfHeight],
          [-halfWidth, halfHeight],
        ];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'parallelogram-alt': {
        const skew = height * 0.35;
        const points = [
          [-halfWidth, -halfHeight],
          [halfWidth - skew, -halfHeight],
          [halfWidth, halfHeight],
          [-halfWidth + skew, halfHeight],
        ];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'trapezoid': {
        const topInset = width * 0.22;
        const bottomInset = width * 0.08;
        const points = [
          [-halfWidth + topInset, -halfHeight],
          [halfWidth - topInset, -halfHeight],
          [halfWidth - bottomInset, halfHeight],
          [-halfWidth + bottomInset, halfHeight],
        ];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'trapezoid-alt': {
        const topInset = width * 0.08;
        const bottomInset = width * 0.22;
        const points = [
          [-halfWidth + topInset, -halfHeight],
          [halfWidth - topInset, -halfHeight],
          [halfWidth - bottomInset, halfHeight],
          [-halfWidth + bottomInset, halfHeight],
        ];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      case 'asymmetric': {
        const skew = height * 0.45;
        const points = [
          [-halfWidth, -halfHeight],
          [halfWidth - skew, -halfHeight],
          [halfWidth, 0],
          [halfWidth - skew, halfHeight],
          [-halfWidth, halfHeight],
        ];
        const shapeEl = createPolygon(points);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createPolygon(points);
        const outlineEl = createPolygon(points);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
      
      default: {
        // Default to rectangle
        const shapeEl = createRect(8, 8);
        shapeEl.setAttribute('fill', fillColor);
        const clipEl = createRect(8, 8);
        const outlineEl = createRect(8, 8);
        outlineEl.setAttribute('fill', 'none');
        outlineEl.setAttribute('stroke', strokeColor);
        outlineEl.setAttribute('stroke-width', '2');
        return { shape: shapeEl, clip: clipEl, outline: outlineEl };
      }
    }
  }
  
  renderNodeLabel(g, node, width, height) {
    const labelLines = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.normalizeLabelLines)(node.label);
    const hasLabel = labelLines.length > 0;
    if (!hasLabel) {
      return;
    }
    
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const imageData = node.image ?? null;
    const textColor = node.textColor ?? _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_TEXT;
    
    // Calculate label area for nodes with images
    const labelLineCount = Math.max(1, labelLines.length);
    const labelAreaHeight = imageData
      ? Math.max(_types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_LABEL_HEIGHT, labelLineCount * _types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT)
      : 0;
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('fill', textColor);
    text.setAttribute('font-size', '14');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('pointer-events', 'none');
    
    if (imageData && labelAreaHeight > 0) {
      // Node with image - label at top
      if (labelLines.length === 1) {
        const baseline = -halfHeight + labelAreaHeight / 2;
        text.setAttribute('x', '0');
        text.setAttribute('y', baseline);
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = labelLines[0];
      } else {
        const totalTextHeight = _types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT * labelLines.length;
        const labelTop = -halfHeight;
        const startY = labelTop + (labelAreaHeight - totalTextHeight) / 2 + _types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT / 2;
        labelLines.forEach((line, idx) => {
          const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan.setAttribute('x', '0');
          tspan.setAttribute('y', startY + idx * _types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT);
          tspan.setAttribute('dominant-baseline', 'middle');
          tspan.textContent = line;
          text.appendChild(tspan);
        });
      }
    } else {
      // Node without image - label centered
      if (labelLines.length === 1) {
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = labelLines[0];
      } else {
        const startY = -_types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT * (labelLines.length - 1) / 2;
        labelLines.forEach((line, idx) => {
          const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan.setAttribute('x', '0');
          tspan.setAttribute('y', startY + idx * _types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT);
          tspan.setAttribute('dominant-baseline', 'middle');
          tspan.textContent = line;
          text.appendChild(tspan);
        });
      }
    }
    
    g.appendChild(text);
  }
  
  renderNodeImage(g, node, width, height) {
    const imageData = node.image;
    if (!imageData) {
      return;
    }
    
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const imagePadding = Math.max(0, Number.isFinite(imageData.padding) ? imageData.padding : 0);
    
    // Calculate label area
    const labelLines = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.normalizeLabelLines)(node.label);
    const labelLineCount = Math.max(1, labelLines.length);
    const labelAreaHeight = Math.max(_types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_LABEL_HEIGHT, labelLineCount * _types_js__WEBPACK_IMPORTED_MODULE_0__.NODE_TEXT_LINE_HEIGHT);
    
    // Calculate image dimensions
    const imageHeight = Math.max(0, height - labelAreaHeight - imagePadding * 2);
    const imageWidth = Math.max(0, width - imagePadding * 2);
    
    if (imageWidth <= 0.5 || imageHeight <= 0.5) {
      return;
    }
    
    // Render label background if needed
    const defaultFill = _types_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_NODE_COLORS[node.shape] ?? '#ffffff';
    const baseFillColor = node.fillColor ?? defaultFill;
    const labelFillColor = node.labelFillColor ?? baseFillColor;
    
    if (labelAreaHeight > 0) {
      const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      labelBg.setAttribute('x', -halfWidth);
      labelBg.setAttribute('y', -halfHeight);
      labelBg.setAttribute('width', width);
      labelBg.setAttribute('height', labelAreaHeight);
      labelBg.setAttribute('fill', labelFillColor);
      labelBg.setAttribute('pointer-events', 'none');
      const clipId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.svgSafeId)('node-clip-', node.id);
      labelBg.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(labelBg);
    }
    
    // Render image
    const imageFillColor = node.imageFillColor ?? '#ffffff';
    const imageBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    imageBg.setAttribute('x', -halfWidth + imagePadding);
    imageBg.setAttribute('y', -halfHeight + labelAreaHeight + imagePadding);
    imageBg.setAttribute('width', imageWidth);
    imageBg.setAttribute('height', imageHeight);
    imageBg.setAttribute('fill', imageFillColor);
    imageBg.setAttribute('pointer-events', 'none');
    g.appendChild(imageBg);
    
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('pointer-events', 'none');
    image.setAttribute('x', -halfWidth + imagePadding);
    image.setAttribute('y', -halfHeight + labelAreaHeight + imagePadding);
    image.setAttribute('width', imageWidth);
    image.setAttribute('height', imageHeight);
    image.setAttribute('href', `data:${imageData.mimeType};base64,${imageData.data}`);
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    
    const clipId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.svgSafeId)('node-clip-', node.id);
    image.setAttribute('clip-path', `url(#${clipId})`);
    
    g.appendChild(image);
  }
  
  renderAlignmentGuides() {
    if (!this.alignmentGuides || (!this.alignmentGuides.vertical && !this.alignmentGuides.horizontal)) {
      return;
    }
    
    if (this.alignmentGuides.vertical) {
      const guide = this.alignmentGuides.vertical;
      const start = this.toScreen({ x: guide.x, y: guide.y1 });
      const end = this.toScreen({ x: guide.x, y: guide.y2 });
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', `alignment-guide alignment-guide-vertical alignment-guide-${guide.kind}`);
      line.setAttribute('x1', start.x);
      line.setAttribute('y1', start.y);
      line.setAttribute('x2', end.x);
      line.setAttribute('y2', end.y);
      this.svg.appendChild(line);
    }
    
    if (this.alignmentGuides.horizontal) {
      const guide = this.alignmentGuides.horizontal;
      const start = this.toScreen({ x: guide.x1, y: guide.y });
      const end = this.toScreen({ x: guide.x2, y: guide.y });
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', `alignment-guide alignment-guide-horizontal alignment-guide-${guide.kind}`);
      line.setAttribute('x1', start.x);
      line.setAttribute('y1', start.y);
      line.setAttribute('x2', end.x);
      line.setAttribute('y2', end.y);
      this.svg.appendChild(line);
    }
  }
  
  // Event handlers
  handleCanvasPointerDown(e) {
    if (e.target === this.svg) {
      this.onSelectNode(null);
      this.onSelectEdge(null);
    }
  }
  
  handleNodePointerDown(nodeId, e) {
    const diagramPoint = this.getDiagramPointFromClient(e.clientX, e.clientY);
    if (!diagramPoint) {
      return;
    }
    
    const position = this.getNodePosition(nodeId);
    if (!position) {
      return;
    }
    
    const offset = {
      x: diagramPoint.x - position.x,
      y: diagramPoint.y - position.y,
    };
    
    this.dragState = {
      type: 'node',
      id: nodeId,
      offset,
      current: position,
      moved: false,
    };
    
    this.draftNodes[nodeId] = position;
    this.onDragStateChange(true);
    this.onSelectNode(nodeId);
    
    // 安全地设置指针捕获
    try {
      if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      console.warn('Failed to set pointer capture:', err);
    }
  }
  
  handleHandlePointerDown(edgeId, index, handlePoints, hasOverride, e) {
    e.preventDefault();
    e.stopPropagation();
    
    const basePoints = hasOverride
      ? handlePoints.map(p => ({ ...p }))
      : [handlePoints[index] ?? handlePoints[0]];
    
    this.dragState = {
      type: 'edge',
      id: edgeId,
      index: hasOverride ? index : 0,
      points: basePoints,
      moved: false,
      hasOverride,
    };
    
    this.draftEdges[edgeId] = basePoints;
    this.onDragStateChange(true);
    this.onSelectEdge(edgeId);
    
    // 安全地设置指针捕获
    try {
      if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      console.warn('Failed to set pointer capture:', err);
    }
  }
  
  handleEdgeDoubleClick(edge, route, diagramPoint) {
    const handlePoints = this.draftEdges[edge.id] ?? edge.overridePoints ?? [];
    const basePoints = handlePoints.map(p => ({ ...p }));
    
    if (basePoints.some(p => (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isClose)(p, diagramPoint))) {
      return;
    }
    
    if (basePoints.length === 0) {
      basePoints.push(diagramPoint);
    } else {
      let bestSegment = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < route.length - 1; i++) {
        const distance = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.distanceToSegment)(diagramPoint, route[i], route[i + 1]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSegment = i;
        }
      }
      basePoints.splice(Math.min(bestSegment, basePoints.length), 0, diagramPoint);
    }
    
    this.draftEdges[edge.id] = basePoints;
    this.onEdgeMove(edge.id, basePoints);
    this.onSelectEdge(edge.id);
  }
  
  handlePointerMove(e) {
    if (!this.dragState) {
      return;
    }
    
    const diagramPoint = this.getDiagramPointFromClient(e.clientX, e.clientY);
    if (!diagramPoint) {
      return;
    }
    
    if (this.dragState.type === 'node') {
      const proposed = {
        x: diagramPoint.x - this.dragState.offset.x,
        y: diagramPoint.y - this.dragState.offset.y,
      };
      
      // Compute alignment
      const nodeEntries = Array.from(this.getFinalPositions().entries());
      const alignment = computeNodeAlignment(
        this.dragState.id,
        proposed,
        nodeEntries,
        _types_js__WEBPACK_IMPORTED_MODULE_0__.ALIGN_THRESHOLD,
        this.nodeDimensions
      );
      
      const snappedPosition = {
        x: alignment.appliedX ? alignment.position.x : (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.snapToGrid)(alignment.position.x, _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE),
        y: alignment.appliedY ? alignment.position.y : (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.snapToGrid)(alignment.position.y, _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE),
      };
      
      if (!guidesEqual(this.alignmentGuides, alignment.guides)) {
        this.alignmentGuides = alignment.guides;
      }
      
      this.dragState.current = snappedPosition;
      this.dragState.moved = true;
      this.draftNodes[this.dragState.id] = snappedPosition;
      this.render();
    } else if (this.dragState.type === 'edge') {
      const handleId = `edge:${this.dragState.id}:handle:${this.dragState.index}`;
      const nodeEntries = Array.from(this.getFinalPositions().entries());
      const alignment = computeNodeAlignment(
        handleId,
        diagramPoint,
        nodeEntries,
        _types_js__WEBPACK_IMPORTED_MODULE_0__.ALIGN_THRESHOLD,
        this.nodeDimensions
      );
      
      const snappedPoint = {
        x: alignment.appliedX ? alignment.position.x : (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.snapToGrid)(alignment.position.x, _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE),
        y: alignment.appliedY ? alignment.position.y : (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.snapToGrid)(alignment.position.y, _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE),
      };
      
      if (!guidesEqual(this.alignmentGuides, alignment.guides)) {
        this.alignmentGuides = alignment.guides;
      }
      
      const nextPoints = this.dragState.points.map((p, idx) =>
        idx === this.dragState.index ? snappedPoint : p
      );
      
      this.dragState.points = nextPoints;
      this.dragState.moved = true;
      this.draftEdges[this.dragState.id] = nextPoints;
      this.render();
    } else if (this.dragState.type === 'subgraph') {
      const targetTopLeft = {
        x: diagramPoint.x - this.dragState.offset.x,
        y: diagramPoint.y - this.dragState.offset.y,
      };
      const proposedDelta = {
        x: targetTopLeft.x - this.dragState.origin.x,
        y: targetTopLeft.y - this.dragState.origin.y,
      };
      
      // Simplified subgraph delta resolution (full implementation would handle separation)
      const resolvedDelta = proposedDelta;
      const newTopLeft = {
        x: this.dragState.origin.x + resolvedDelta.x,
        y: this.dragState.origin.y + resolvedDelta.y,
      };
      const moved = this.dragState.moved ||
        Math.abs(resolvedDelta.x) > _types_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON ||
        Math.abs(resolvedDelta.y) > _types_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON;
      
      this.alignmentGuides = {};
      this.dragState.delta = resolvedDelta;
      this.dragState.moved = moved;
      this.dragState.offset = {
        x: diagramPoint.x - newTopLeft.x,
        y: diagramPoint.y - newTopLeft.y,
      };
      
      // Update draft nodes
      for (const nodeId of this.dragState.members) {
        const offset = this.dragState.nodeOffsets[nodeId];
        if (offset) {
          this.draftNodes[nodeId] = {
            x: newTopLeft.x + offset.x,
            y: newTopLeft.y + offset.y,
          };
        }
      }
      
      // Update draft subgraphs
      for (const subgraphId of this.dragState.subgraphIds) {
        this.draftSubgraphs[subgraphId] = { x: resolvedDelta.x, y: resolvedDelta.y };
      }
      
      // Update draft edges
      if (Object.keys(this.dragState.edgeOverrides).length > 0) {
        for (const [edgeId, basePoints] of Object.entries(this.dragState.edgeOverrides)) {
          this.draftEdges[edgeId] = basePoints.map(point => ({
            x: point.x + resolvedDelta.x,
            y: point.y + resolvedDelta.y,
          }));
        }
      }
      
      this.render();
    }
  }
  
  getFinalPositions() {
    const map = new Map();
    for (const node of this.diagram.nodes) {
      const override = this.draftNodes[node.id] ?? node.overridePosition ?? node.renderedPosition;
      map.set(node.id, override);
    }
    return map;
  }
  
  handlePointerUp(e) {
    if (!this.dragState) {
      return;
    }
    
    const currentDrag = this.dragState;
    this.onDragStateChange(false);
    this.alignmentGuides = {};
    
    if (currentDrag.type === 'node') {
      if (currentDrag.moved) {
        const node = this.diagram.nodes.find(n => n.id === currentDrag.id);
        const current = currentDrag.current;
        const auto = node?.autoPosition;
        const result = auto && current && (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isClose)(current, auto, _types_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) ? null : current;
        this.onNodeMove(currentDrag.id, result);
      }
      delete this.draftNodes[currentDrag.id];
    } else if (currentDrag.type === 'edge') {
      if (currentDrag.moved) {
        const normalized = currentDrag.points.map(p => ({ ...p }));
        const shouldClear = normalized.length === 0;
        this.onEdgeMove(currentDrag.id, shouldClear ? null : normalized);
      }
      delete this.draftEdges[currentDrag.id];
    } else if (currentDrag.type === 'subgraph') {
      if (currentDrag.moved) {
        const nodeUpdates = {};
        const edgeUpdates = {};
        const finalTopLeft = {
          x: currentDrag.origin.x + currentDrag.delta.x,
          y: currentDrag.origin.y + currentDrag.delta.y,
        };
        
        for (const nodeId of currentDrag.members) {
          const offset = currentDrag.nodeOffsets[nodeId];
          if (!offset) continue;
          const node = this.diagram.nodes.find(n => n.id === nodeId);
          const finalPoint = {
            x: finalTopLeft.x + offset.x,
            y: finalTopLeft.y + offset.y,
          };
          const auto = node?.autoPosition;
          nodeUpdates[nodeId] = auto && (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isClose)(finalPoint, auto, _types_js__WEBPACK_IMPORTED_MODULE_0__.EPSILON) ? null : finalPoint;
        }
        
        for (const [edgeId, basePoints] of Object.entries(currentDrag.edgeOverrides)) {
          if (!basePoints || basePoints.length === 0) continue;
          edgeUpdates[edgeId] = basePoints.map(point => ({
            x: point.x + currentDrag.delta.x,
            y: point.y + currentDrag.delta.y,
          }));
        }
        
        if (this.onLayoutUpdate) {
          const payload = {};
          if (Object.keys(nodeUpdates).length > 0) {
            payload.nodes = nodeUpdates;
          }
          if (Object.keys(edgeUpdates).length > 0) {
            payload.edges = {};
            for (const [edgeId, points] of Object.entries(edgeUpdates)) {
              payload.edges[edgeId] = { points };
            }
          }
          if (payload.nodes || payload.edges) {
            this.onLayoutUpdate(payload);
          }
        }
      }
      
      for (const nodeId of currentDrag.members) {
        delete this.draftNodes[nodeId];
      }
      for (const edgeId of Object.keys(currentDrag.edgeOverrides)) {
        delete this.draftEdges[edgeId];
      }
      for (const subgraphId of currentDrag.subgraphIds) {
        delete this.draftSubgraphs[subgraphId];
      }
    }
    
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    this.dragState = null;
    this.render();
  }
  
  handlePointerCancel(e) {
    if (!this.dragState) {
      return;
    }
    
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    this.onDragStateChange(false);
    this.alignmentGuides = {};
    
    if (this.dragState.type === 'node') {
      delete this.draftNodes[this.dragState.id];
    } else if (this.dragState.type === 'edge') {
      delete this.draftEdges[this.dragState.id];
    } else if (this.dragState.type === 'subgraph') {
      for (const nodeId of this.dragState.members) {
        delete this.draftNodes[nodeId];
      }
      for (const edgeId of Object.keys(this.dragState.edgeOverrides)) {
        delete this.draftEdges[edgeId];
      }
      for (const subgraphId of this.dragState.subgraphIds) {
        delete this.draftSubgraphs[subgraphId];
      }
    }
    
    this.dragState = null;
    this.render();
  }
  
  handleKeyDown(e) {
    if (this.selectedNodeId && !this.dragState) {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'INPUT' ||
        active.isContentEditable
      )) {
        return;
      }
      
      const { key } = e;
      if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
        return;
      }
      
      const current = this.getNodePosition(this.selectedNodeId);
      if (!current) {
        return;
      }
      
      const step = e.shiftKey ? _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE : 1;
      let deltaX = 0;
      let deltaY = 0;
      
      switch (key) {
        case 'ArrowUp':
          deltaY = -step;
          break;
        case 'ArrowDown':
          deltaY = step;
          break;
        case 'ArrowLeft':
          deltaX = -step;
          break;
        case 'ArrowRight':
          deltaX = step;
          break;
      }
      
      if (deltaX === 0 && deltaY === 0) {
        return;
      }
      
      e.preventDefault();
      
      const next = {
        x: current.x + deltaX,
        y: current.y + deltaY,
      };
      const adjusted = e.shiftKey
        ? { x: (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.snapToGrid)(next.x, _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE), y: (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.snapToGrid)(next.y, _types_js__WEBPACK_IMPORTED_MODULE_0__.GRID_SIZE) }
        : next;
      
      this.draftNodes[this.selectedNodeId] = adjusted;
      this.onNodeMove(this.selectedNodeId, adjusted);
      this.render();
    }
    
    // Delete key
    if ((e.key === 'Delete' || e.key === 'Backspace') && !this.dragState) {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'INPUT' ||
        active.isContentEditable
      )) {
        return;
      }
      
      if (this.selectedNodeId) {
        e.preventDefault();
        this.onDeleteNode(this.selectedNodeId);
      } else if (this.selectedEdgeId) {
        e.preventDefault();
        this.onDeleteEdge(this.selectedEdgeId);
      }
    }
  }
  
  closeContextMenu() {
    this.contextMenu = { visible: false, x: 0, y: 0, target: null };
  }
  
  destroy() {
    // Cleanup
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
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

/***/ "./lib/types.js":
/*!**********************!*\
  !*** ./lib/types.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ALIGN_THRESHOLD: () => (/* binding */ ALIGN_THRESHOLD),
/* harmony export */   ARROW_DIRECTION_OPTIONS: () => (/* binding */ ARROW_DIRECTION_OPTIONS),
/* harmony export */   BOUNDS_EPSILON: () => (/* binding */ BOUNDS_EPSILON),
/* harmony export */   BOUNDS_SMOOTHING: () => (/* binding */ BOUNDS_SMOOTHING),
/* harmony export */   DEFAULT_EDGE_COLOR: () => (/* binding */ DEFAULT_EDGE_COLOR),
/* harmony export */   DEFAULT_NODE_COLORS: () => (/* binding */ DEFAULT_NODE_COLORS),
/* harmony export */   DEFAULT_NODE_HEIGHT: () => (/* binding */ DEFAULT_NODE_HEIGHT),
/* harmony export */   DEFAULT_NODE_STROKE: () => (/* binding */ DEFAULT_NODE_STROKE),
/* harmony export */   DEFAULT_NODE_TEXT: () => (/* binding */ DEFAULT_NODE_TEXT),
/* harmony export */   DEFAULT_NODE_WIDTH: () => (/* binding */ DEFAULT_NODE_WIDTH),
/* harmony export */   EDGE_LABEL_BACKGROUND: () => (/* binding */ EDGE_LABEL_BACKGROUND),
/* harmony export */   EDGE_LABEL_BACKGROUND_OPACITY: () => (/* binding */ EDGE_LABEL_BACKGROUND_OPACITY),
/* harmony export */   EDGE_LABEL_BORDER_RADIUS: () => (/* binding */ EDGE_LABEL_BORDER_RADIUS),
/* harmony export */   EDGE_LABEL_FONT_SIZE: () => (/* binding */ EDGE_LABEL_FONT_SIZE),
/* harmony export */   EDGE_LABEL_HORIZONTAL_PADDING: () => (/* binding */ EDGE_LABEL_HORIZONTAL_PADDING),
/* harmony export */   EDGE_LABEL_LINE_HEIGHT: () => (/* binding */ EDGE_LABEL_LINE_HEIGHT),
/* harmony export */   EDGE_LABEL_MIN_HEIGHT: () => (/* binding */ EDGE_LABEL_MIN_HEIGHT),
/* harmony export */   EDGE_LABEL_MIN_WIDTH: () => (/* binding */ EDGE_LABEL_MIN_WIDTH),
/* harmony export */   EDGE_LABEL_VERTICAL_OFFSET: () => (/* binding */ EDGE_LABEL_VERTICAL_OFFSET),
/* harmony export */   EDGE_LABEL_VERTICAL_PADDING: () => (/* binding */ EDGE_LABEL_VERTICAL_PADDING),
/* harmony export */   EPSILON: () => (/* binding */ EPSILON),
/* harmony export */   GRID_SIZE: () => (/* binding */ GRID_SIZE),
/* harmony export */   HANDLE_RADIUS: () => (/* binding */ HANDLE_RADIUS),
/* harmony export */   HEX_COLOR_RE: () => (/* binding */ HEX_COLOR_RE),
/* harmony export */   LAYOUT_MARGIN: () => (/* binding */ LAYOUT_MARGIN),
/* harmony export */   LINE_STYLE_OPTIONS: () => (/* binding */ LINE_STYLE_OPTIONS),
/* harmony export */   MAX_IMAGE_FILE_BYTES: () => (/* binding */ MAX_IMAGE_FILE_BYTES),
/* harmony export */   NODE_LABEL_HEIGHT: () => (/* binding */ NODE_LABEL_HEIGHT),
/* harmony export */   NODE_TEXT_LINE_HEIGHT: () => (/* binding */ NODE_TEXT_LINE_HEIGHT),
/* harmony export */   PADDING_EPSILON: () => (/* binding */ PADDING_EPSILON),
/* harmony export */   PADDING_PRECISION: () => (/* binding */ PADDING_PRECISION),
/* harmony export */   SUBGRAPH_BORDER_RADIUS: () => (/* binding */ SUBGRAPH_BORDER_RADIUS),
/* harmony export */   SUBGRAPH_FILL: () => (/* binding */ SUBGRAPH_FILL),
/* harmony export */   SUBGRAPH_LABEL_COLOR: () => (/* binding */ SUBGRAPH_LABEL_COLOR),
/* harmony export */   SUBGRAPH_SEPARATION: () => (/* binding */ SUBGRAPH_SEPARATION),
/* harmony export */   SUBGRAPH_STROKE: () => (/* binding */ SUBGRAPH_STROKE)
/* harmony export */ });
// Type definitions (converted from TypeScript)

const DEFAULT_NODE_COLORS = {
  rectangle: "#FDE68A",
  stadium: "#C4F1F9",
  circle: "#E9D8FD",
  "double-circle": "#BFDBFE",
  diamond: "#FBCFE8",
  subroutine: "#FED7AA",
  cylinder: "#BBF7D0",
  hexagon: "#FCA5A5",
  parallelogram: "#C7D2FE",
  "parallelogram-alt": "#A5F3FC",
  trapezoid: "#FCE7F3",
  "trapezoid-alt": "#FCD5CE",
  asymmetric: "#F5D0FE",
};

const DEFAULT_EDGE_COLOR = "#2d3748";
const DEFAULT_NODE_TEXT = "#1a202c";
const DEFAULT_NODE_STROKE = "#2d3748";

const LINE_STYLE_OPTIONS = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
];

const ARROW_DIRECTION_OPTIONS = [
  { value: "forward", label: "向前" },
  { value: "backward", label: "向后" },
  { value: "both", label: "双向" },
  { value: "none", label: "无" },
];

const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;
const PADDING_PRECISION = 1000;
const PADDING_EPSILON = 0.001;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;

// Canvas constants
const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 60;
const NODE_LABEL_HEIGHT = 28;
const NODE_TEXT_LINE_HEIGHT = 16;
const LAYOUT_MARGIN = 80;
const HANDLE_RADIUS = 6;
const EPSILON = 0.5;
const GRID_SIZE = 10;
const ALIGN_THRESHOLD = 8;
const BOUNDS_SMOOTHING = 0.18;
const BOUNDS_EPSILON = 0.5;
const EDGE_LABEL_MIN_WIDTH = 36;
const EDGE_LABEL_MIN_HEIGHT = 28;
const EDGE_LABEL_LINE_HEIGHT = 16;
const EDGE_LABEL_FONT_SIZE = 13;
const EDGE_LABEL_HORIZONTAL_PADDING = 16;
const EDGE_LABEL_VERTICAL_PADDING = 12;
const EDGE_LABEL_VERTICAL_OFFSET = 10;
const EDGE_LABEL_BORDER_RADIUS = 6;
const EDGE_LABEL_BACKGROUND = "white";
const EDGE_LABEL_BACKGROUND_OPACITY = 0.96;
const SUBGRAPH_FILL = "#edf2f7";
const SUBGRAPH_STROKE = "#a0aec0";
const SUBGRAPH_LABEL_COLOR = "#2d3748";
const SUBGRAPH_BORDER_RADIUS = 16;
const SUBGRAPH_SEPARATION = 140;



/***/ }),

/***/ "./lib/utils.js":
/*!**********************!*\
  !*** ./lib/utils.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   blobToBase64: () => (/* binding */ blobToBase64),
/* harmony export */   centroid: () => (/* binding */ centroid),
/* harmony export */   distanceToSegment: () => (/* binding */ distanceToSegment),
/* harmony export */   ensureImageWithinLimit: () => (/* binding */ ensureImageWithinLimit),
/* harmony export */   formatByteSize: () => (/* binding */ formatByteSize),
/* harmony export */   formatPaddingValue: () => (/* binding */ formatPaddingValue),
/* harmony export */   isClose: () => (/* binding */ isClose),
/* harmony export */   loadImageFromBlob: () => (/* binding */ loadImageFromBlob),
/* harmony export */   measureLabelBox: () => (/* binding */ measureLabelBox),
/* harmony export */   midpoint: () => (/* binding */ midpoint),
/* harmony export */   normalizeColorInput: () => (/* binding */ normalizeColorInput),
/* harmony export */   normalizeLabelLines: () => (/* binding */ normalizeLabelLines),
/* harmony export */   normalizePadding: () => (/* binding */ normalizePadding),
/* harmony export */   polygonPoints: () => (/* binding */ polygonPoints),
/* harmony export */   resizeImageToLimit: () => (/* binding */ resizeImageToLimit),
/* harmony export */   resolveColor: () => (/* binding */ resolveColor),
/* harmony export */   snapToGrid: () => (/* binding */ snapToGrid),
/* harmony export */   svgSafeId: () => (/* binding */ svgSafeId)
/* harmony export */ });
// Utility functions

function formatByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode image."));
        return;
      }
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Failed to encode image."));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to encode image."));
    };
    reader.readAsDataURL(blob);
  });
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image file."));
    };
    image.src = url;
  });
}

async function resizeImageToLimit(image, sourceBlob, maxBytes) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas support is required to resize images.");
  }

  if (sourceBlob.size <= maxBytes) {
    return { blob: sourceBlob, resized: false, fits: true };
  }

  const MIN_SCALE = 0.05;
  const STEP = 0.75;

  let currentScale = Math.sqrt(maxBytes / sourceBlob.size);
  if (!Number.isFinite(currentScale) || currentScale >= 0.99) {
    currentScale = 0.95;
  }
  currentScale = Math.min(currentScale, 0.95);
  currentScale = Math.max(currentScale, MIN_SCALE);

  let blob = null;
  let fits = false;
  let attempts = 0;

  while (attempts < 10 && currentScale >= MIN_SCALE) {
    const targetWidth = Math.max(1, Math.round(image.width * currentScale));
    const targetHeight = Math.max(1, Math.round(image.height * currentScale));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (!blob) {
      throw new Error("Failed to encode resized image.");
    }

    if (blob.size <= maxBytes) {
      fits = true;
      break;
    }

    currentScale *= STEP;
    attempts += 1;
  }

  if (!blob) {
    throw new Error("Failed to process image.");
  }

  return { blob, resized: true, fits };
}

async function ensureImageWithinLimit(file, maxBytes) {
  if (file.size <= maxBytes) {
    const base64 = await blobToBase64(file);
    return {
      base64,
      resized: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  const image = await loadImageFromBlob(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    throw new Error("Unable to read image dimensions.");
  }

  const { blob, fits } = await resizeImageToLimit(image, file, maxBytes);

  if (!fits || blob.size > maxBytes) {
    throw new Error(
      `Image is too large to upload. Please use an image smaller than ${formatByteSize(
        maxBytes
      )}.`
    );
  }

  const base64 = await blobToBase64(blob);
  return {
    base64,
    resized: true,
    originalSize: file.size,
    finalSize: blob.size,
  };
}

function formatPaddingValue(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const rounded = Math.round(value * 1000) / 1000;
  const fixed = rounded.toFixed(3);
  const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed;
}

function normalizePadding(value) {
  if (!Number.isFinite(value) || Number.isNaN(value) || value < 0) {
    return 0;
  }
  const clamped = Math.max(0, value);
  return Math.round(clamped * 1000) / 1000;
}

function resolveColor(value, fallback) {
  const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;
  const base = value ?? fallback;
  if (HEX_COLOR_RE.test(base)) {
    return base.toLowerCase();
  }
  if (HEX_COLOR_RE.test(fallback)) {
    return fallback.toLowerCase();
  }
  return "#000000";
}

function normalizeColorInput(value) {
  return value.trim().toLowerCase();
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isClose(a, b, epsilon = 0.5) {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

function centroid(points) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

function distanceToSegment(point, start, end) {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const lengthSquared = vx * vx + vy * vy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  let t = (wx * vx + wy * vy) / lengthSquared;
  if (t < 0) {
    t = 0;
  } else if (t > 1) {
    t = 1;
  }

  const projectionX = start.x + t * vx;
  const projectionY = start.y + t * vy;
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

function normalizeLabelLines(label) {
  return label
    .split("\n")
    .map((line) => (line.length === 0 ? "\u00A0" : line));
}

function measureLabelBox(lines) {
  const EDGE_LABEL_MIN_WIDTH = 36;
  const EDGE_LABEL_HORIZONTAL_PADDING = 16;
  const EDGE_LABEL_MIN_HEIGHT = 28;
  const EDGE_LABEL_LINE_HEIGHT = 16;
  const EDGE_LABEL_VERTICAL_PADDING = 12;

  let maxChars = 0;
  for (const line of lines) {
    maxChars = Math.max(maxChars, line.length);
  }

  const width = Math.max(
    EDGE_LABEL_MIN_WIDTH,
    7.4 * maxChars + EDGE_LABEL_HORIZONTAL_PADDING
  );
  const height = Math.max(
    EDGE_LABEL_MIN_HEIGHT,
    EDGE_LABEL_LINE_HEIGHT * lines.length + EDGE_LABEL_VERTICAL_PADDING
  );

  return { width, height };
}

function snapToGrid(value, gridSize = 10) {
  if (gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

function svgSafeId(prefix, id) {
  return `${prefix}${id.replace(/[^a-zA-Z0-9_:-]/g, "_")}`;
}

function polygonPoints(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
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
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./app/app.js ***!
  \********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _styles_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./styles.css */ "./app/styles.css");
/* harmony import */ var _lib_StateManager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/StateManager.js */ "./lib/StateManager.js");
/* harmony import */ var _lib_DiagramCanvas_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/DiagramCanvas.js */ "./lib/DiagramCanvas.js");
/* harmony import */ var _lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/vscodeApi.js */ "./lib/vscodeApi.js");
/* harmony import */ var _lib_utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/utils.js */ "./lib/utils.js");
/* harmony import */ var _lib_types_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/types.js */ "./lib/types.js");
// Main application entry point








// Application class
class MermaidEditorApp {
  constructor() {
    this.stateManager = new _lib_StateManager_js__WEBPACK_IMPORTED_MODULE_1__.StateManager();
    this.diagramCanvas = null;
    this.saveTimer = null;
    this.lastSubmittedSource = null;
    this.isSaving = false; // 标记是否正在保存，避免保存后触发重新加载
    
    // DOM elements
    this.elements = {
      statusMessage: document.getElementById('status-message'),
      errorMessage: document.getElementById('error-message'),
      resetOverridesBtn: document.getElementById('reset-overrides-btn'),
      deleteSelectedBtn: document.getElementById('delete-selected-btn'),
      stylePanel: document.getElementById('style-panel'),
      panelCaption: document.getElementById('panel-caption'),
      stylePanelBody: document.getElementById('style-panel-body'),
      diagramContainer: document.getElementById('diagram-container'),
      sourcePanel: document.getElementById('source-panel'),
      sourcePath: document.getElementById('source-path'),
      sourceEditor: document.getElementById('source-editor'),
      sourceStatus: document.getElementById('source-status'),
      selectionLabel: document.getElementById('selection-label'),
    };
    
    this.init();
  }
  
  init() {
    // Initialize diagram canvas
    this.diagramCanvas = new _lib_DiagramCanvas_js__WEBPACK_IMPORTED_MODULE_2__.DiagramCanvas(this.elements.diagramContainer, {
      onNodeMove: (id, position) => this.handleNodeMove(id, position),
      onEdgeMove: (id, points) => this.handleEdgeMove(id, points),
      onLayoutUpdate: (update) => this.handleLayoutUpdate(update),
      onSelectNode: (id) => this.handleSelectNode(id),
      onSelectEdge: (id) => this.handleSelectEdge(id),
      onDragStateChange: (dragging) => this.handleDragStateChange(dragging),
      onDeleteNode: (id) => this.handleDeleteNode(id),
      onDeleteEdge: (id) => this.handleDeleteEdge(id),
    });
    
    // Subscribe to state changes
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup VSCode message listener (before loading diagram)
    if (_lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_3__.isVSCodeWebview) {
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'load' || data.type === 'load-response') {
          // 如果正在保存，忽略加载消息（避免保存后触发重新加载导致闪烁）
          if (this.isSaving) {
            return;
          }
          if (data.diagram) {
            this.handleDiagramLoad(data.diagram);
          }
        }
      });
      
      // Check for pending diagram data (stored by inline script)
      if (window.pendingDiagram) {
        console.log('[MermaidEditor] Found pending diagram data, loading it');
        this.handleDiagramLoad(window.pendingDiagram);
        window.pendingDiagram = null; // Clear after use
      } else {
        // Load initial diagram if no pending data
        this.loadDiagram();
      }
    } else {
      // Not in VSCode, load diagram normally
      this.loadDiagram();
    }
  }
  
  setupEventListeners() {
    // Reset overrides button
    this.elements.resetOverridesBtn.addEventListener('click', () => {
      this.handleResetOverrides();
    });
    
    // Delete selected button
    this.elements.deleteSelectedBtn.addEventListener('click', () => {
      this.handleDeleteSelection();
    });
    
    // Source editor
    this.elements.sourceEditor.addEventListener('input', (e) => {
      this.handleSourceChange(e.target.value);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveSource();
      }
    });
  }
  
  handleDiagramLoad(diagram) {
    // Unified method to handle diagram loading from any source
    this.stateManager.setState({
      diagram,
      loading: false,
      error: null,
      source: diagram.source || '',
      sourceDraft: diagram.source || '',
    });
    this.diagramCanvas.setDiagram(diagram);
    if (diagram.source) {
      this.elements.sourceEditor.value = diagram.source;
    }
    if (diagram.sourcePath) {
      this.elements.sourcePath.textContent = diagram.sourcePath;
    }
  }
  
  async loadDiagram() {
    try {
      this.stateManager.setState({ loading: true, error: null });
      const diagram = await (0,_lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_3__.fetchDiagram)();
      this.handleDiagramLoad(diagram);
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: error.message,
        diagram: null,
      });
    }
  }
  
  async saveDiagram() {
    const diagram = this.stateManager.diagram;
    if (!diagram) {
      return;
    }
    
    try {
      this.isSaving = true; // 标记正在保存
      this.stateManager.setState({ saving: true, error: null });
      await (0,_lib_vscodeApi_js__WEBPACK_IMPORTED_MODULE_3__.saveDiagram)(diagram);
      this.stateManager.setState({ saving: false });
      
      // 延迟重置标志，给 VSCode 时间处理保存事件
      setTimeout(() => {
        this.isSaving = false;
      }, 500);
    } catch (error) {
      this.isSaving = false;
      this.stateManager.setState({ 
        saving: false,
        error: error.message 
      });
    }
  }
  
  async handleNodeMove(id, position) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 更新 diagram 状态
    const node = diagram.nodes.find(n => n.id === id);
    if (node) {
      if (position) {
        node.overridePosition = position;
        node.renderedPosition = position;
      } else {
        node.overridePosition = undefined;
        node.renderedPosition = node.autoPosition;
      }
      await this.saveDiagram();
    }
  }
  
  async handleEdgeMove(id, points) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 更新 diagram 状态
    const edge = diagram.edges.find(e => e.id === id);
    if (edge) {
      if (points && points.length > 0) {
        edge.overridePoints = points;
        edge.renderedPoints = points;
      } else {
        edge.overridePoints = undefined;
        edge.renderedPoints = edge.autoPoints;
      }
      await this.saveDiagram();
    }
  }
  
  async handleLayoutUpdate(update) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 更新 nodes
    if (update.nodes) {
      for (const [nodeId, position] of Object.entries(update.nodes)) {
        const node = diagram.nodes.find(n => n.id === nodeId);
        if (node) {
          if (position) {
            node.overridePosition = position;
            node.renderedPosition = position;
          } else {
            node.overridePosition = undefined;
            node.renderedPosition = node.autoPosition;
          }
        }
      }
    }
    
    // 更新 edges
    if (update.edges) {
      for (const [edgeId, edgeUpdate] of Object.entries(update.edges)) {
        const edge = diagram.edges.find(e => e.id === edgeId);
        if (edge && edgeUpdate) {
          if (edgeUpdate.points) {
            edge.overridePoints = edgeUpdate.points;
            edge.renderedPoints = edgeUpdate.points;
          } else if (edgeUpdate.points === null) {
            edge.overridePoints = undefined;
            edge.renderedPoints = edge.autoPoints;
          }
        }
      }
    }
    
    await this.saveDiagram();
  }
  
  async handleDeleteNode(id) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 创建新的 diagram 对象，避免直接修改原对象
    const newDiagram = {
      ...diagram,
      nodes: diagram.nodes.filter(n => n.id !== id),
      edges: diagram.edges.filter(e => e.from !== id && e.to !== id),
    };
    
    // 清除选中状态
    if (this.stateManager.selectedNodeId === id) {
      this.stateManager.setState({ selectedNodeId: null });
    }
    
    // 更新 stateManager 的 diagram 状态
    this.stateManager.setState({ diagram: newDiagram });
    
    // 更新 canvas 显示
    this.diagramCanvas.setDiagram(newDiagram);
    
    // 保存更改
    await this.saveDiagram();
  }
  
  async handleDeleteEdge(id) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 创建新的 diagram 对象，避免直接修改原对象
    const newDiagram = {
      ...diagram,
      edges: diagram.edges.filter(e => e.id !== id),
    };
    
    // 清除选中状态
    if (this.stateManager.selectedEdgeId === id) {
      this.stateManager.setState({ selectedEdgeId: null });
    }
    
    // 更新 stateManager 的 diagram 状态
    this.stateManager.setState({ diagram: newDiagram });
    
    // 更新 canvas 显示
    this.diagramCanvas.setDiagram(newDiagram);
    
    // 保存更改
    await this.saveDiagram();
  }
  
  handleSelectNode(id) {
    this.stateManager.setState({ selectedNodeId: id });
    if (id) {
      this.stateManager.setState({ selectedEdgeId: null });
    }
    this.updateStylePanel();
  }
  
  handleSelectEdge(id) {
    this.stateManager.setState({ selectedEdgeId: id });
    if (id) {
      this.stateManager.setState({ selectedNodeId: null });
    }
    this.updateStylePanel();
  }
  
  handleDragStateChange(dragging) {
    this.stateManager.setState({ dragging });
  }
  
  handleDeleteSelection() {
    if (this.stateManager.selectedNodeId) {
      this.handleDeleteNode(this.stateManager.selectedNodeId);
    } else if (this.stateManager.selectedEdgeId) {
      this.handleDeleteEdge(this.stateManager.selectedEdgeId);
    }
  }
  
  async handleResetOverrides() {
    const diagram = this.stateManager.diagram;
    if (!diagram) {
      return;
    }
    
    const nodesUpdate = {};
    const edgesUpdate = {};
    
    for (const node of diagram.nodes) {
      if (node.overridePosition) {
        nodesUpdate[node.id] = null;
      }
    }
    
    for (const edge of diagram.edges) {
      if (edge.overridePoints && edge.overridePoints.length > 0) {
        edgesUpdate[edge.id] = { points: null };
      }
    }
    
    if (Object.keys(nodesUpdate).length === 0 && Object.keys(edgesUpdate).length === 0) {
      return;
    }
    
    await this.handleLayoutUpdate({ nodes: nodesUpdate, edges: edgesUpdate });
  }
  
  async handleAddEdgeJoint() {
    const selectedEdge = this.stateManager.getSelectedEdge();
    if (!selectedEdge) {
      return;
    }
    
    const diagram = this.stateManager.diagram;
    if (!diagram) {
      return;
    }
    
    const edge = diagram.edges.find(e => e.id === selectedEdge.id);
    if (!edge) {
      return;
    }
    
    const route = edge.renderedPoints;
    if (route.length < 2) {
      return;
    }
    
    // 找到最长的线段
    let bestSegment = 0;
    let bestLength = -Infinity;
    for (let index = 0; index < route.length - 1; index++) {
      const start = route[index];
      const end = route[index + 1];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length > bestLength) {
        bestLength = length;
        bestSegment = index;
      }
    }
    
    const start = route[bestSegment];
    const end = route[bestSegment + 1];
    const newPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
    
    const currentOverrides = edge.overridePoints
      ? edge.overridePoints.map(point => ({ ...point }))
      : [];
    
    // 检查是否已经存在
    const alreadyPresent = currentOverrides.some(point => {
      const dx = point.x - newPoint.x;
      const dy = point.y - newPoint.y;
      return Math.hypot(dx, dy) < 0.25;
    });
    if (alreadyPresent) {
      return;
    }
    
    const insertIndex = Math.min(bestSegment, currentOverrides.length);
    currentOverrides.splice(insertIndex, 0, newPoint);
    
    edge.overridePoints = currentOverrides;
    edge.renderedPoints = currentOverrides;
    
    await this.saveDiagram();
    this.diagramCanvas.setDiagram(diagram);
  }
  
  handleSourceChange(value) {
    this.stateManager.setState({
      sourceDraft: value,
      sourceError: null,
    });
    this.lastSubmittedSource = null;
    
    // Auto-save with debounce
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.saveSource();
    }, 700);
  }
  
  async saveSource() {
    const sourceDraft = this.stateManager.sourceDraft;
    const source = this.stateManager.source;
    
    if (sourceDraft === source) {
      this.stateManager.setState({ sourceSaving: false, sourceError: null });
      this.lastSubmittedSource = sourceDraft;
      return;
    }
    
    if (this.lastSubmittedSource === sourceDraft) {
      return;
    }
    
    try {
      this.stateManager.setState({ sourceSaving: true });
      
      // 更新 diagram 的 source
      const diagram = this.stateManager.diagram;
      if (diagram) {
        diagram.source = sourceDraft;
        await this.saveDiagram();
      }
      
      this.stateManager.setState({
        source: sourceDraft,
        sourceSaving: false,
        sourceError: null,
      });
      this.lastSubmittedSource = sourceDraft;
    } catch (error) {
      this.stateManager.setState({
        sourceSaving: false,
        sourceError: error.message,
        error: error.message,
      });
    }
  }
  
  updateStylePanel() {
    const state = this.stateManager.getState();
    const selectedNode = state.selectedNodeId ? this.stateManager.getSelectedNode() : null;
    const selectedEdge = state.selectedEdgeId ? this.stateManager.getSelectedEdge() : null;
    
    // Update caption
    if (selectedNode) {
      this.elements.panelCaption.textContent = `节点: ${selectedNode.label || selectedNode.id}`;
    } else if (selectedEdge) {
      this.elements.panelCaption.textContent = `边: ${selectedEdge.label || `${selectedEdge.from}→${selectedEdge.to}`}`;
    } else {
      this.elements.panelCaption.textContent = '选择一个元素';
      this.elements.panelCaption.className = 'panel-caption muted';
    }
    
    // Clear existing controls
    this.elements.stylePanelBody.innerHTML = '';
    
    if (selectedNode) {
      this.renderNodeStyleControls(selectedNode, state);
    } else if (selectedEdge) {
      this.renderEdgeStyleControls(selectedEdge, state);
    }
  }
  
  renderNodeStyleControls(node, state) {
    const section = document.createElement('section');
    section.className = 'style-section';
    
    const header = document.createElement('header');
    header.className = 'section-heading';
    header.innerHTML = `
      <h3>节点</h3>
      <span class="section-caption">${node.label || node.id}</span>
    `;
    
    const controls = document.createElement('div');
    controls.className = 'style-controls';
    controls.setAttribute('aria-disabled', state.saving || !node);
    
    // Fill color
    if (!node.image) {
      const fillControl = this.createColorControl('填充', 'node-fill', node.fillColor, _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_NODE_COLORS[node.shape], (value) => {
        this.handleNodeFillChange(node.id, value);
      });
      controls.appendChild(fillControl);
    }
    
    // Stroke color
    const strokeControl = this.createColorControl('描边', 'node-stroke', node.strokeColor, _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_EDGE_COLOR, (value) => {
      this.handleNodeStrokeChange(node.id, value);
    });
    controls.appendChild(strokeControl);
    
    // Text color
    const textControl = this.createColorControl('文本', 'node-text', node.textColor, _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_NODE_TEXT, (value) => {
      this.handleNodeTextColorChange(node.id, value);
    });
    controls.appendChild(textControl);
    
    // Image controls (if node has image)
    if (node.image) {
      const imageControl = this.createImageControl(node, state);
      controls.appendChild(imageControl);
      
      // Title background color
      const labelFillControl = this.createColorControl(
        '标题背景',
        'node-label-fill',
        node.labelFillColor,
        node.fillColor ?? _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_NODE_COLORS[node.shape],
        (value) => {
          this.handleNodeLabelFillChange(node.id, value);
        }
      );
      controls.appendChild(labelFillControl);
      
      // Image background color
      const imageFillControl = this.createColorControl(
        '图片背景',
        'node-image-fill',
        node.imageFillColor,
        '#ffffff',
        (value) => {
          this.handleNodeImageFillChange(node.id, value);
        }
      );
      controls.appendChild(imageFillControl);
    }
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'style-reset';
    resetBtn.textContent = '重置节点样式';
    resetBtn.disabled = state.saving || !node;
    resetBtn.addEventListener('click', () => {
      this.handleNodeStyleReset(node.id);
    });
    
    section.appendChild(header);
    section.appendChild(controls);
    section.appendChild(resetBtn);
    this.elements.stylePanelBody.appendChild(section);
  }
  
  renderEdgeStyleControls(edge, state) {
    const section = document.createElement('section');
    section.className = 'style-section';
    
    const header = document.createElement('header');
    header.className = 'section-heading';
    header.innerHTML = `
      <h3>边</h3>
      <span class="section-caption">${edge.label || `${edge.from}→${edge.to}`}</span>
    `;
    
    const controls = document.createElement('div');
    controls.className = 'style-controls';
    controls.setAttribute('aria-disabled', state.saving || !edge);
    
    // Color
    const colorControl = this.createColorControl('颜色', 'edge-color', edge.color, _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_EDGE_COLOR, (value) => {
      this.handleEdgeColorChange(edge.id, value);
    });
    controls.appendChild(colorControl);
    
    // Line style
    const lineControl = this.createSelectControl('线条', 'edge-line', _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.LINE_STYLE_OPTIONS, edge.kind || 'solid', (value) => {
      this.handleEdgeLineStyleChange(edge.id, value);
    });
    controls.appendChild(lineControl);
    
    // Arrow direction
    const arrowControl = this.createSelectControl('箭头', 'edge-arrow', _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.ARROW_DIRECTION_OPTIONS, edge.arrowDirection || 'forward', (value) => {
      this.handleEdgeArrowChange(edge.id, value);
    });
    controls.appendChild(arrowControl);
    
    // Add control point button
    const addJointBtn = document.createElement('button');
    addJointBtn.type = 'button';
    addJointBtn.className = 'style-reset';
    addJointBtn.textContent = '添加控制点';
    addJointBtn.disabled = state.saving || !edge;
    addJointBtn.addEventListener('click', () => {
      this.handleAddEdgeJoint();
    });
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'style-reset';
    resetBtn.textContent = '重置边样式';
    resetBtn.disabled = state.saving || !edge;
    resetBtn.addEventListener('click', () => {
      this.handleEdgeStyleReset(edge.id);
    });
    
    section.appendChild(header);
    section.appendChild(controls);
    section.appendChild(addJointBtn);
    section.appendChild(resetBtn);
    this.elements.stylePanelBody.appendChild(section);
  }
  
  createColorControl(label, id, value, fallback, onChange) {
    const control = document.createElement('div');
    control.className = 'style-control';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'color';
    input.id = id;
    input.value = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.resolveColor)(value, fallback);
    input.addEventListener('change', (e) => {
      onChange(e.target.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(input);
    return control;
  }
  
  createSelectControl(label, id, options, value, onChange) {
    const control = document.createElement('div');
    control.className = 'style-control';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    
    const select = document.createElement('select');
    select.id = id;
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      if (option.value === value) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });
    select.addEventListener('change', (e) => {
      onChange(e.target.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(select);
    return control;
  }
  
  createImageControl(node, state) {
    const control = document.createElement('div');
    control.className = 'style-control image-control';
    
    const label = document.createElement('span');
    label.textContent = '图片';
    
    const actions = document.createElement('div');
    actions.className = 'image-control-actions';
    
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.textContent = node.image ? '替换 PNG' : '上传 PNG';
    uploadBtn.disabled = state.saving;
    uploadBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png';
      input.addEventListener('change', (e) => {
        this.handleNodeImageFileChange(node.id, e.target.files[0]);
      });
      input.click();
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '移除';
    removeBtn.disabled = state.saving || !node.image;
    removeBtn.addEventListener('click', () => {
      this.handleNodeImageRemove(node.id);
    });
    
    actions.appendChild(uploadBtn);
    actions.appendChild(removeBtn);
    
    const meta = document.createElement('span');
    meta.className = node.image ? 'image-control-meta' : 'image-control-meta muted';
    meta.textContent = node.image
      ? `${node.image.width}x${node.image.height}px (内边距 ${(0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(node.image.padding)}px)`
      : '未附加图片';
    
    control.appendChild(label);
    control.appendChild(actions);
    control.appendChild(meta);
    
    // Add padding input if node has image
    if (node.image) {
      const paddingControl = document.createElement('div');
      paddingControl.className = 'style-control';
      
      const paddingLabel = document.createElement('span');
      paddingLabel.textContent = '图片内边距 (px)';
      
      const paddingInput = document.createElement('input');
      paddingInput.type = 'number';
      paddingInput.min = '0';
      paddingInput.step = '1';
      paddingInput.value = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(node.image.padding);
      paddingInput.disabled = state.saving || !node.image;
      
      let paddingValue = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(node.image.padding);
      let commitTimer = null;
      
      paddingInput.addEventListener('input', (e) => {
        paddingValue = e.target.value;
        if (commitTimer) {
          clearTimeout(commitTimer);
        }
      });
      
      const commitPadding = async () => {
        const parsed = parseFloat(paddingValue);
        if (!isFinite(parsed)) {
          paddingInput.value = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(node.image.padding);
          return;
        }
        
        const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizePadding)(Math.max(0, parsed));
        const current = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizePadding)(node.image.padding);
        const PADDING_EPSILON = 0.001;
        
        if (Math.abs(normalized - current) < PADDING_EPSILON) {
          paddingInput.value = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(current);
          return;
        }
        
        try {
          this.stateManager.setState({ saving: true });
          const diagram = this.stateManager.diagram;
          if (diagram) {
            const nodeToUpdate = diagram.nodes.find(n => n.id === node.id);
            if (nodeToUpdate && nodeToUpdate.image) {
              nodeToUpdate.image.padding = normalized;
              await this.saveDiagram();
              this.diagramCanvas.setDiagram(diagram);
            }
          }
        } catch (error) {
          this.stateManager.setState({ error: error.message });
          paddingInput.value = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(current);
        } finally {
          this.stateManager.setState({ saving: false });
        }
      };
      
      paddingInput.addEventListener('blur', () => {
        commitPadding();
      });
      
      paddingInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitPadding();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          paddingInput.value = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatPaddingValue)(node.image.padding);
          paddingInput.blur();
        }
      });
      
      paddingControl.appendChild(paddingLabel);
      paddingControl.appendChild(paddingInput);
      control.appendChild(paddingControl);
    }
    
    return control;
  }
  
  async handleNodeFillChange(nodeId, value) {
    const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizeColorInput)(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { fill: normalized } },
    });
  }
  
  async handleNodeStrokeChange(nodeId, value) {
    const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizeColorInput)(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { stroke: normalized } },
    });
  }
  
  async handleNodeTextColorChange(nodeId, value) {
    const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizeColorInput)(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { text: normalized } },
    });
  }
  
  async handleNodeLabelFillChange(nodeId, value) {
    const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizeColorInput)(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { labelFill: normalized } },
    });
  }
  
  async handleNodeImageFillChange(nodeId, value) {
    const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizeColorInput)(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { imageFill: normalized } },
    });
  }
  
  async handleEdgeColorChange(edgeId, value) {
    const normalized = (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.normalizeColorInput)(value);
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: { color: normalized } },
    });
  }
  
  async handleEdgeLineStyleChange(edgeId, value) {
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: { line: value } },
    });
  }
  
  async handleEdgeArrowChange(edgeId, value) {
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: { arrow: value } },
    });
  }
  
  async handleNodeStyleReset(nodeId) {
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: null },
    });
  }
  
  async handleEdgeStyleReset(edgeId) {
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: null },
    });
  }
  
  async submitStyleUpdate(update) {
    const hasNodeStyles = update.nodeStyles && Object.keys(update.nodeStyles).length > 0;
    const hasEdgeStyles = update.edgeStyles && Object.keys(update.edgeStyles).length > 0;
    if (!hasNodeStyles && !hasEdgeStyles) {
      return;
    }
    
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    try {
      this.stateManager.setState({ saving: true, error: null });
      
      // 更新节点样式
      if (update.nodeStyles) {
        for (const [nodeId, styleUpdate] of Object.entries(update.nodeStyles)) {
          const node = diagram.nodes.find(n => n.id === nodeId);
          if (!node) continue;
          
          if (styleUpdate === null) {
            // 重置样式
            node.fillColor = undefined;
            node.strokeColor = undefined;
            node.textColor = undefined;
            node.labelFillColor = undefined;
            node.imageFillColor = undefined;
          } else {
            if (styleUpdate.fill !== undefined) node.fillColor = styleUpdate.fill;
            if (styleUpdate.stroke !== undefined) node.strokeColor = styleUpdate.stroke;
            if (styleUpdate.text !== undefined) node.textColor = styleUpdate.text;
            if (styleUpdate.labelFill !== undefined) node.labelFillColor = styleUpdate.labelFill;
            if (styleUpdate.imageFill !== undefined) node.imageFillColor = styleUpdate.imageFill;
          }
        }
      }
      
      // 更新边样式
      if (update.edgeStyles) {
        for (const [edgeId, styleUpdate] of Object.entries(update.edgeStyles)) {
          const edge = diagram.edges.find(e => e.id === edgeId);
          if (!edge) continue;
          
          if (styleUpdate === null) {
            // 重置样式
            edge.color = undefined;
            edge.kind = 'solid';
            edge.arrowDirection = 'forward';
          } else {
            if (styleUpdate.color !== undefined) edge.color = styleUpdate.color;
            if (styleUpdate.line !== undefined) edge.kind = styleUpdate.line;
            if (styleUpdate.arrow !== undefined) edge.arrowDirection = styleUpdate.arrow;
          }
        }
      }
      
      // 更新 stateManager 的 diagram 状态
      this.stateManager.setState({ diagram });
      
      // 更新 canvas 显示
      this.diagramCanvas.setDiagram(diagram);
      
      await this.saveDiagram();
    } catch (error) {
      this.stateManager.setState({ error: error.message });
    } finally {
      this.stateManager.setState({ saving: false });
    }
  }
  
  async handleNodeImageFileChange(nodeId, file) {
    if (!file) {
      return;
    }
    
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    const declaredType = file.type ? file.type.toLowerCase() : '';
    const effectiveType = declaredType || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : '');
    
    if (effectiveType !== 'image/png') {
      this.stateManager.setState({ error: 'Only PNG images are supported for nodes.' });
      return;
    }
    
    try {
      const preparedImage = await (0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.ensureImageWithinLimit)(file, _lib_types_js__WEBPACK_IMPORTED_MODULE_5__.MAX_IMAGE_FILE_BYTES);
      
      if (preparedImage.resized) {
        alert(
          `The selected image was ${(0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatByteSize)(preparedImage.originalSize)}. We resized it to ${(0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatByteSize)(preparedImage.finalSize)} to stay under the ${(0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatByteSize)(_lib_types_js__WEBPACK_IMPORTED_MODULE_5__.MAX_IMAGE_FILE_BYTES)} limit.`
        );
      }
      
      this.stateManager.setState({ saving: true, error: null });
      
      // 更新节点图片 - 需要获取实际图片尺寸
      const node = diagram.nodes.find(n => n.id === nodeId);
      if (node) {
        // 从base64数据创建图片以获取尺寸
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = `data:${effectiveType};base64,${preparedImage.base64}`;
        });
        
        const existingPadding = node.image?.padding ?? 0;
        node.image = {
          mimeType: effectiveType,
          data: preparedImage.base64,
          width: img.naturalWidth || img.width || 100,
          height: img.naturalHeight || img.height || 100,
          padding: existingPadding,
        };
      }
      
      await this.saveDiagram();
      this.diagramCanvas.setDiagram(diagram);
    } catch (error) {
      this.stateManager.setState({ error: error.message });
      alert(`${error.message} Maximum allowed size is ${(0,_lib_utils_js__WEBPACK_IMPORTED_MODULE_4__.formatByteSize)(_lib_types_js__WEBPACK_IMPORTED_MODULE_5__.MAX_IMAGE_FILE_BYTES)}.`);
    } finally {
      this.stateManager.setState({ saving: false });
    }
  }
  
  async handleNodeImageRemove(nodeId) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    try {
      this.stateManager.setState({ saving: true, error: null });
      
      const node = diagram.nodes.find(n => n.id === nodeId);
      if (node) {
        node.image = undefined;
      }
      
      await this.saveDiagram();
      this.diagramCanvas.setDiagram(diagram);
    } catch (error) {
      this.stateManager.setState({ error: error.message });
    } finally {
      this.stateManager.setState({ saving: false });
    }
  }
  
  onStateChange(state) {
    // Update status message
    let statusMessage = '未选择图表';
    if (state.loading) {
      statusMessage = '正在加载图表...';
    } else if (state.saving) {
      statusMessage = '正在保存更改...';
    } else if (state.sourceSaving) {
      statusMessage = '正在同步源代码...';
    } else if (state.error) {
      statusMessage = `错误: ${state.error}`;
    } else if (state.diagram) {
      statusMessage = `正在编辑 ${state.diagram.sourcePath || '图表'}`;
    }
    this.elements.statusMessage.textContent = statusMessage;
    
    // Update error message
    if (state.error) {
      this.elements.errorMessage.textContent = state.error;
      this.elements.errorMessage.style.display = 'block';
    } else {
      this.elements.errorMessage.style.display = 'none';
    }
    
    // Update buttons
    this.elements.resetOverridesBtn.disabled = !this.stateManager.hasOverrides() || state.saving || state.sourceSaving;
    const hasSelection = state.selectedNodeId !== null || state.selectedEdgeId !== null;
    this.elements.deleteSelectedBtn.disabled = !hasSelection || state.saving || state.sourceSaving;
    
    // Update source status
    let sourceStatusText = '已同步';
    let sourceStatusClass = 'synced';
    if (state.sourceError) {
      sourceStatusText = state.sourceError;
      sourceStatusClass = 'error';
    } else if (state.sourceSaving) {
      sourceStatusText = '正在保存更改…';
      sourceStatusClass = 'saving';
    } else if (state.sourceDraft !== state.source) {
      sourceStatusText = '待处理更改…';
      sourceStatusClass = 'pending';
    }
    this.elements.sourceStatus.textContent = sourceStatusText;
    this.elements.sourceStatus.className = `source-status ${sourceStatusClass}`;
    
    // Update selection label
    let selectionLabel = '未选择';
    if (state.selectedNodeId) {
      selectionLabel = `已选择节点: ${state.selectedNodeId}`;
    } else if (state.selectedEdgeId) {
      selectionLabel = `已选择边: ${state.selectedEdgeId}`;
    }
    this.elements.selectionLabel.textContent = selectionLabel;
    
    // Update style panel
    this.updateStylePanel();
    
    // Update diagram canvas selection
    if (this.diagramCanvas) {
      this.diagramCanvas.setSelectedNode(state.selectedNodeId);
      this.diagramCanvas.setSelectedEdge(state.selectedEdgeId);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new MermaidEditorApp();
  });
} else {
  window.app = new MermaidEditorApp();
}


})();

/******/ })()
;
//# sourceMappingURL=app.js.map