const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'frontend', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Tools butonu ve dropdown'ı bir wrapper içine al
// Mevcut: <button class="tools-btn"...>...</button><div class="panel-container tools-dropdown"...>
// Yeni: <div class="tools-wrapper"><button...></button><div class="panel-container...></div></div>

// Tools butonunu bul ve wrapper ekle
const toolsBtnStart = /<button type="button" class="tools-btn" id="welcome-tools-btn">/;
const toolsBtnMatch = content.match(toolsBtnStart);

if (toolsBtnMatch) {
    // Wrapper başlangıcını ekle
    content = content.replace(
        /<button type="button" class="tools-btn" id="welcome-tools-btn">/,
        '<div class="tools-wrapper" style="position: relative; display: inline-block;"><button type="button" class="tools-btn" id="welcome-tools-btn">'
    );

    // tools-dropdown kapanışından sonra wrapper kapanışını ekle
    // panel-content tools-options </div></div> sonrasına </div> ekle
    content = content.replace(
        /(<div class="panel-container tools-dropdown" id="welcome-tools-dropdown">[\s\S]*?<!-- Options will be populated by JavaScript -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/,
        '$1</div>'
    );

    console.log('✅ Tools wrapper eklendi!');
} else {
    console.log('❌ Tools butonu bulunamadı');
}

fs.writeFileSync(htmlPath, content, 'utf8');
