document.addEventListener('DOMContentLoaded', () => {
  loadCsvAndBuildHtml('hints.csv');
});

async function loadCsvAndBuildHtml(csvPath) {
  const container = document.getElementById('accordion-container');
  try {
    const response = await fetch(csvPath);
    if (!response.ok) throw new Error('CSV読込エラー');
    let csvText = await response.text();
    
    // BOM(0xFEFF)があれば削除（Excel保存対策）
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    const tree = buildTreeFromCsvText(csvText);
    container.innerHTML = buildHtmlRecursive(tree);
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p style="color: red;">エラー: ${error.message}</p>`;
  }
}

function buildTreeFromCsvText(csvText) {
  const tree = {};
  const rows = csvText.trim().split('\n');
  rows.shift(); // ヘッダー削除
  
  rows.forEach(rowText => {
    if (rowText.trim() === "") return; 
    const row = [];
    let inQuote = false;
    let field = "";
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        if (inQuote && rowText[i+1] === '"') { field += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (char === ',' && !inQuote) {
        row.push(field); field = "";
      } else { field += char; }
    }
    row.push(field);

    let currentLevel = tree;
    const content = row[row.length - 1]; 
    const levels = row.slice(0, -1); 
    let lastValidLevelIndex = -1;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (levels[i]) { lastValidLevelIndex = i; break; }
    }
    for (let i = 0; i < levels.length; i++) {
      const levelName = levels[i];
      if (!levelName) continue; 
      if (i === lastValidLevelIndex) {
        currentLevel[levelName] = content; break;
      } else {
        if (!currentLevel[levelName]) currentLevel[levelName] = {};
        currentLevel = currentLevel[levelName];
      }
    }
  });
  return tree;
}

function buildHtmlRecursive(treeNode) {
  if (typeof treeNode === 'object' && treeNode !== null) {
    let html = '<ul class="accordion-list">'; // 改行を削除
    for (const key in treeNode) {
      // <li>...</li> の間にも改行を入れないように繋げます
      html += `<li><details><summary>${key}</summary>${buildHtmlRecursive(treeNode[key])}</details></li>`;
    }
    html += '</ul>'; // 改行を削除
    return html;
  } else if (typeof treeNode === 'string') {
    // <div>の直後に改行やスペースを入れず、直接文字列を連結します
    // また、念のためここでも .trim() をかけると安全です
    return `<div class="hint-content">${treeNode.trim()}</div>`;
  }
  return '';
}