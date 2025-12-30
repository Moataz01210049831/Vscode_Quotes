"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let QUOTES = [];
const COLORS = [
    "#FF5555",
    "#FFAA00",
    "#FFD700",
    "#00DD88",
    "#00C0FF",
    "#0099FF",
    "#AA66FF",
    "#FF66CC"
];
function loadData(context) {
    try {
        const mode = vscode.workspace
            .getConfiguration()
            .get('hukmQuotes.mode', 'quotes');
        let fileName;
        if (mode === 'azkar') {
            fileName = 'azkar.json';
        }
        else if (mode === 'ayat') {
            fileName = 'ayat.json';
        }
        else {
            fileName = 'quotes.json';
        }
        const filePath = path.join(context.extensionPath, fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`[hukm] File not found: ${filePath}`);
            QUOTES = [];
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                QUOTES = parsed;
            }
            else {
                console.error('[hukm] JSON is not an array');
                QUOTES = [];
            }
        }
        catch (jsonErr) {
            console.error('[hukm] Failed to parse JSON:', jsonErr);
            QUOTES = [];
        }
    }
    catch (err) {
        console.error('[hukm] loadData failed:', err);
        QUOTES = [];
    }
}
function randomItem() {
    if (!QUOTES.length)
        return 'حكمة اليوم 🌟';
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}
/* -------- Bubble HTML (used in the tab) -------- */
function getBubbleHtml(quote) {
    const safeQuote = quote || 'حكمة اليوم 🌟';
    return /* html */ `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .bubble {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 20%, #ffffffaa, #ffc857, #f77f00);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 16px;
          box-sizing: border-box;
          color: #222;
          box-shadow: 0 10px 25px rgba(0,0,0,0.35);
          position: relative;
          animation: float 3s ease-in-out infinite;
        }
          @keyframes float {
  0%   { transform: translateY(0px); }
  25%  { transform: translateY(-15px); }
  50%  { transform: translateY(0px); }
  75%  { transform: translateY(15px); }
  100% { transform: translateY(0px); }
}

        .bubble::after {
          content: "💡";
          position: absolute;
          top: 8px;
          left: 12px;
          font-size: 20px;
        }

        .quote {
          font-size: 13px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="bubble">
        <div class="quote">${safeQuote}</div>
      </div>
    </body>
    </html>
  `;
}
/* ---------------- Main Extension Logic ---------------- */
let bubblePanel;
function activate(context) {
    // Load quotes safely
    loadData(context);
    function createOrShowBubble() {
        const column = vscode.ViewColumn.Two;
        // If the panel already exists, just reveal it
        if (bubblePanel) {
            bubblePanel.reveal(column);
            return;
        }
        // Otherwise create a new panel
        bubblePanel = vscode.window.createWebviewPanel('hukmBubble', // internal id
        'Hukm', // tab title
        column, // where to show
        {
            enableScripts: false,
            retainContextWhenHidden: true
        });
        bubblePanel.webview.html = getBubbleHtml(randomItem());
        bubblePanel.onDidDispose(() => {
            bubblePanel = undefined;
        });
    }
    // 1) Create bubble once at startup
    createOrShowBubble();
    // 2) Status bar item
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    // Clicking the status bar will reopen the bubble
    status.command = 'hukm.openBubble';
    status.show();
    let currentText = randomItem();
    function update() {
        if (!QUOTES.length) {
            const emptyText = '﴾ لا توجد بيانات ﴿';
            // status bar
            status.text = emptyText;
            status.tooltip = 'لم يتم تحميل أي عناصر.';
            status.color = undefined;
            currentText = '';
            // tab bubble
            if (bubblePanel) {
                bubblePanel.webview.html = getBubbleHtml(emptyText);
            }
            return;
        }
        const text = randomItem();
        currentText = text;
        const color = randomColor();
        const shortText = text.length > 30 ? text.slice(0, 30) + '…' : text;
        // status bar
        status.text = `﴾ ${shortText} ﴿`;
        status.tooltip = text;
        status.color = color;
        // tab bubble
        if (bubblePanel) {
            bubblePanel.webview.html = getBubbleHtml(text);
        }
    }
    // Command: show full quote in notification
    const showQuoteCmd = vscode.commands.registerCommand('hukm.showQuote', () => {
        if (currentText) {
            vscode.window.showInformationMessage(currentText);
        }
        else {
            vscode.window.showInformationMessage('لا يوجد نص حالياً.');
        }
    });
    // Command: (re)open the bubble tab
    const openBubbleCmd = vscode.commands.registerCommand('hukm.openBubble', () => {
        createOrShowBubble();
        // also refresh its content to current quote
        if (bubblePanel) {
            bubblePanel.webview.html = getBubbleHtml(currentText || randomItem());
        }
    });
    const INTERVAL = 10 * 1000;
    const timer = setInterval(update, INTERVAL);
    // initial update
    update();
    context.subscriptions.push(showQuoteCmd, openBubbleCmd, status, {
        dispose() {
            clearInterval(timer);
        }
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map