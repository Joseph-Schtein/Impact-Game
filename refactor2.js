const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

code = code.replace(
  'function initDB() {\n    // Listen to the "questions" collection in your existing Firestore',
  'function initDB() {\n    if (!window.db) return;\n    window.onSnapshot(window.doc(window.db, "system", "config"), (docSnap) => {\n        if (docSnap.exists()) {\n            state.verificationMode = docSnap.data().verificationMode || "AI_ONLY";\n        } else {\n            state.verificationMode = "AI_ONLY";\n        }\n    });\n    // Listen to the "questions" collection in your existing Firestore'
);
code = code.replace(
  'function initDB() {\r\n    // Listen to the "questions" collection in your existing Firestore',
  'function initDB() {\n    if (!window.db) return;\n    window.onSnapshot(window.doc(window.db, "system", "config"), (docSnap) => {\n        if (docSnap.exists()) {\n            state.verificationMode = docSnap.data().verificationMode || "AI_ONLY";\n        } else {\n            state.verificationMode = "AI_ONLY";\n        }\n    });\n    // Listen to the "questions" collection in your existing Firestore'
);

fs.writeFileSync('public/app.js', code);
console.log('Modifications complete');
