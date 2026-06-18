const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

// Add needsAI and needsManual logic at the top of saveNewQuestion
code = code.replace(
  'const src = state.currentLang.code;',
  'const src = state.currentLang.code;\n    const mode = state.verificationMode || \'AI_ONLY\';\n    const needsAI = mode === \'AI_ONLY\' || mode === \'BOTH\';\n    const needsManual = mode === \'MANUAL_ONLY\' || mode === \'BOTH\';'
);

// Wrap AI checks
code = code.replace(
  'btn.innerText = "בודק תוכן בענן...";\r\n            const agentStatus = await filterContentWithAgent({\r\n                type: \'trivia\', text: qText, options: opts, mediaUrl: qMediaUrl\r\n            });\r\n            if (agentStatus === "REJECT") {\r\n                showToast("השאלה נחסמה: זוהה תוכן לא הולם (מילים פוגעניות או תמונות)", "error", 5000);\r\n                btn.innerText = "שמור שאלה"; btn.disabled = false;\r\n                return;\r\n            }',
  'if (needsAI) {\n                btn.innerText = "בודק תוכן בענן...";\n                const agentStatus = await filterContentWithAgent({\n                    type: \'trivia\', text: qText, options: opts, mediaUrl: qMediaUrl\n                });\n                if (agentStatus === "REJECT") {\n                    showToast("השאלה נחסמה: זוהה תוכן לא הולם (מילים פוגעניות או תמונות)", "error", 5000);\n                    btn.innerText = "שמור שאלה"; btn.disabled = false;\n                    return;\n                }\n            }'
);

code = code.replace(
  'btn.innerText = "בודק תוכן בענן...";\n            const agentStatus = await filterContentWithAgent({\n                type: \'trivia\', text: qText, options: opts, mediaUrl: qMediaUrl\n            });\n            if (agentStatus === "REJECT") {\n                showToast("השאלה נחסמה: זוהה תוכן לא הולם (מילים פוגעניות או תמונות)", "error", 5000);\n                btn.innerText = "שמור שאלה"; btn.disabled = false;\n                return;\n            }',
  'if (needsAI) {\n                btn.innerText = "בודק תוכן בענן...";\n                const agentStatus = await filterContentWithAgent({\n                    type: \'trivia\', text: qText, options: opts, mediaUrl: qMediaUrl\n                });\n                if (agentStatus === "REJECT") {\n                    showToast("השאלה נחסמה: זוהה תוכן לא הולם (מילים פוגעניות או תמונות)", "error", 5000);\n                    btn.innerText = "שמור שאלה"; btn.disabled = false;\n                    return;\n                }\n            }'
);

code = code.replace(
  'btn.innerText = "בודק תוכן בענן...";\r\n            const agentStatus = await filterContentWithAgent({\r\n                type: \'hangman\', word: word\r\n            });\r\n            if (agentStatus === "REJECT") {\r\n                showToast("הביטוי נחסם: זוהה תוכן לא הולם", "error", 5000);\r\n                btn.innerText = "שמור שאלה"; btn.disabled = false;\r\n                return;\r\n            }',
  'if (needsAI) {\n                btn.innerText = "בודק תוכן בענן...";\n                const agentStatus = await filterContentWithAgent({\n                    type: \'hangman\', word: word\n                });\n                if (agentStatus === "REJECT") {\n                    showToast("הביטוי נחסם: זוהה תוכן לא הולם", "error", 5000);\n                    btn.innerText = "שמור שאלה"; btn.disabled = false;\n                    return;\n                }\n            }'
);
code = code.replace(
  'btn.innerText = "בודק תוכן בענן...";\n            const agentStatus = await filterContentWithAgent({\n                type: \'hangman\', word: word\n            });\n            if (agentStatus === "REJECT") {\n                showToast("הביטוי נחסם: זוהה תוכן לא הולם", "error", 5000);\n                btn.innerText = "שמור שאלה"; btn.disabled = false;\n                return;\n            }',
  'if (needsAI) {\n                btn.innerText = "בודק תוכן בענן...";\n                const agentStatus = await filterContentWithAgent({\n                    type: \'hangman\', word: word\n                });\n                if (agentStatus === "REJECT") {\n                    showToast("הביטוי נחסם: זוהה תוכן לא הולם", "error", 5000);\n                    btn.innerText = "שמור שאלה"; btn.disabled = false;\n                    return;\n                }\n            }'
);


code = code.replace(
  'btn.innerText = "בודק תוכן בענן...";\r\n            const agentStatus = await filterContentWithAgent({\r\n                type: \'match_pair\', pairs: pairs\r\n            });\r\n            if (agentStatus === "REJECT") {\r\n                showToast("הזוגות נחסמו: זוהה תוכן לא הולם", "error", 5000);\r\n                btn.innerText = "שמור שאלה"; btn.disabled = false;\r\n                return;\r\n            }',
  'if (needsAI) {\n                btn.innerText = "בודק תוכן בענן...";\n                const agentStatus = await filterContentWithAgent({\n                    type: \'match_pair\', pairs: pairs\n                });\n                if (agentStatus === "REJECT") {\n                    showToast("הזוגות נחסמו: זוהה תוכן לא הולם", "error", 5000);\n                    btn.innerText = "שמור שאלה"; btn.disabled = false;\n                    return;\n                }\n            }'
);
code = code.replace(
  'btn.innerText = "בודק תוכן בענן...";\n            const agentStatus = await filterContentWithAgent({\n                type: \'match_pair\', pairs: pairs\n            });\n            if (agentStatus === "REJECT") {\n                showToast("הזוגות נחסמו: זוהה תוכן לא הולם", "error", 5000);\n                btn.innerText = "שמור שאלה"; btn.disabled = false;\n                return;\n            }',
  'if (needsAI) {\n                btn.innerText = "בודק תוכן בענן...";\n                const agentStatus = await filterContentWithAgent({\n                    type: \'match_pair\', pairs: pairs\n                });\n                if (agentStatus === "REJECT") {\n                    showToast("הזוגות נחסמו: זוהה תוכן לא הולם", "error", 5000);\n                    btn.innerText = "שמור שאלה"; btn.disabled = false;\n                    return;\n                }\n            }'
);

// Modify hangman saving
code = code.replace(
  'await window.addDoc(window.collection(window.db, "hangmanWords"), {\r\n                word: word,\r\n                category: category,\r\n                lang: state.currentLang.code,\r\n                addedAt: window.serverTimestamp()\r\n            });\r\n            showToast("✅ מילת ההגמן נשמרה בהצלחה!", \'success\', 3500);',
  'const docData = {\n                word: word,\n                category: category,\n                lang: state.currentLang.code,\n                addedAt: window.serverTimestamp()\n            };\n            if (needsManual) {\n                await window.addDoc(window.collection(window.db, "pendingQuestions"), { ...docData, targetCollection: "hangmanWords" });\n                showToast("✅ נשלח לאישור מנהל!", \'success\', 3500);\n            } else {\n                await window.addDoc(window.collection(window.db, "hangmanWords"), docData);\n                showToast("✅ מילת ההגמן נשמרה בהצלחה!", \'success\', 3500);\n            }'
);
code = code.replace(
  'await window.addDoc(window.collection(window.db, "hangmanWords"), {\n                word: word,\n                category: category,\n                lang: state.currentLang.code,\n                addedAt: window.serverTimestamp()\n            });\n            showToast("✅ מילת ההגמן נשמרה בהצלחה!", \'success\', 3500);',
  'const docData = {\n                word: word,\n                category: category,\n                lang: state.currentLang.code,\n                addedAt: window.serverTimestamp()\n            };\n            if (needsManual) {\n                await window.addDoc(window.collection(window.db, "pendingQuestions"), { ...docData, targetCollection: "hangmanWords" });\n                showToast("✅ נשלח לאישור מנהל!", \'success\', 3500);\n            } else {\n                await window.addDoc(window.collection(window.db, "hangmanWords"), docData);\n                showToast("✅ מילת ההגמן נשמרה בהצלחה!", \'success\', 3500);\n            }'
);

// Modify questions saving
code = code.replace(
  '// Save to Firebase Firestore\r\n        await window.addDoc(window.collection(window.db, "questions"), newQuestion);\r\n        showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", \'success\', 3500);',
  '// Save to Firebase Firestore\n        if (needsManual) {\n            await window.addDoc(window.collection(window.db, "pendingQuestions"), { ...newQuestion, targetCollection: "questions" });\n            showToast("✅ נשלח לאישור מנהל!", \'success\', 3500);\n        } else {\n            await window.addDoc(window.collection(window.db, "questions"), newQuestion);\n            showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", \'success\', 3500);\n        }'
);
code = code.replace(
  '// Save to Firebase Firestore\n        await window.addDoc(window.collection(window.db, "questions"), newQuestion);\n        showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", \'success\', 3500);',
  '// Save to Firebase Firestore\n        if (needsManual) {\n            await window.addDoc(window.collection(window.db, "pendingQuestions"), { ...newQuestion, targetCollection: "questions" });\n            showToast("✅ נשלח לאישור מנהל!", \'success\', 3500);\n        } else {\n            await window.addDoc(window.collection(window.db, "questions"), newQuestion);\n            showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", \'success\', 3500);\n        }'
);

fs.writeFileSync('public/app.js', code);
console.log('Modifications complete');
