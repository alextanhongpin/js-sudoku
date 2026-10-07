const status = document.getElementById('status');
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
document.getElementById('takePhoto').onclick = () => { if (!busy) cameraInput.click(); };
cameraInput.onchange = event => importFile(event.target.files[0]);
const cells = [];
let ocr, busy = false;
const sample = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const board = document.getElementById('sudokuGrid');
for (let i = 0; i < 81; i++) {
  const input = document.createElement('input');
  input.className = 'cell'; input.inputMode = 'numeric'; input.maxLength = 1;
  input.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}`);
  if (i % 9 === 2 || i % 9 === 5) input.classList.add('box-right');
  if (Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5) input.classList.add('box-bottom');
  input.addEventListener('input', () => { input.value = input.value.replace(/[^1-9]/g, ''); input.classList.remove('solved', 'uncertain'); validate(); });
  input.addEventListener('keydown', e => {
    const offset = {ArrowRight:1, ArrowLeft:-1, ArrowDown:9, ArrowUp:-9}[e.key];
    if (offset && cells[i + offset]) { e.preventDefault(); cells[i + offset].focus(); }
  });
  cells.push(input); board.append(input);
}
function clearBoard() { cells.forEach(c => { c.value = ''; c.classList.remove('conflict', 'solved', 'uncertain'); }); }
function values() { return cells.map(c => Number(c.value)); }
function peers(a,b) { return Math.floor(a/9) === Math.floor(b/9) || a%9 === b%9 || (Math.floor(a/27) === Math.floor(b/27) && Math.floor(a%9/3) === Math.floor(b%9/3)); }
function validate() {
  const v = values(); let valid = true;
  cells.forEach((c,i) => { const conflict = !!v[i] && v.some((n,j) => i !== j && n === v[i] && peers(i,j)); c.classList.toggle('conflict', conflict); if(conflict) valid = false; });
  document.getElementById('filled').textContent = `${v.filter(Boolean).length} / 81 cells`;
  return valid;
}
function solve(v) {
  let target = -1, options;
  for(let i=0;i<81;i++) if(!v[i]) {
    const candidates = [1,2,3,4,5,6,7,8,9].filter(n => !v.some((x,j) => x===n && peers(i,j)));
    if(!candidates.length) return false;
    if(!options || candidates.length < options.length) { target=i; options=candidates; }
  }
  if(target === -1) return true;
  for(const n of options) { v[target]=n; if(solve(v)) return true; }
  v[target]=0; return false;
}
document.getElementById('solve').onclick = () => {
  if(!validate()) { status.textContent = 'Resolve the highlighted duplicates before solving.'; return; }
  const v=values();
  if(!v.some(Boolean)) { status.textContent='Add a puzzle or try the example first.'; return; }
  if(solve(v)) { cells.forEach((c,i) => { if(!c.value) c.classList.add('solved'); c.value=v[i]; }); validate(); status.textContent='Puzzle solved. Added digits are shown in green.'; }
  else status.textContent='This puzzle has no solution. Check the extracted digits.';
};
document.getElementById('clear').onclick = () => { clearBoard(); validate(); status.textContent='Grid cleared. Enter digits or import a puzzle.'; };
document.getElementById('example').onclick = () => { clearBoard(); cells.forEach((c,i) => c.value = sample[i] === '0' ? '' : sample[i]); validate(); status.textContent='Example loaded. Select any cell to edit it.'; };
async function getOCR() {
  if (ocr) return;
  status.textContent = 'Loading digit recognition…';
  if (!window.Tesseract) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not download digit recognition. Check your connection and try again'));
      document.head.append(script);
    });
  }
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: event => {
      if (event.status !== 'recognizing text') status.textContent = `Loading recognition: ${event.status} ${Math.round((event.progress || 0) * 100)}%`;
    },
  });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '123456789',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR,
      user_defined_dpi: '300',
    });
    ocr = worker;
  } catch (error) { await worker.terminate(); throw error; }
}
async function waitCV() {
  if (typeof cv === 'undefined') throw new Error('Image processing could not load. Refresh and try again.');
  if(cv instanceof Promise) window.cv = await cv;
  if(!cv.Mat) await new Promise((resolve,reject) => { const timer=setTimeout(() => reject(new Error('Image processing timed out. Refresh and try again.')),30000); cv.onRuntimeInitialized=() => {clearTimeout(timer);resolve();}; });
}
async function importFile(file) {
  if(!file || busy) return;
  if(!file.type.startsWith('image/')) { status.textContent='Choose a JPG, PNG, or other image file.'; return; }
  busy=true; document.querySelectorAll('button, .cell').forEach(el => el.disabled=true); fileInput.disabled=true; cameraInput.disabled=true;
  const url=URL.createObjectURL(file); let src;
  try {
    const img=new Image(); img.src=url; await img.decode();
    const canvas=document.getElementById('canvasInput'); canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').drawImage(img,0,0);
    document.getElementById('preview').classList.add('has-image'); document.getElementById('filename').textContent=file.name;
    status.textContent = 'Preparing your photo…';
    if (window.matchMedia('(max-width: 760px)').matches) document.querySelector('.board-panel').scrollIntoView({behavior:'smooth',block:'start'});
    await waitCV(); src=cv.imread(img); await processSudokuGrid(src); validate();
  } catch(e) { status.textContent=`Import failed: ${e.message}. You can still enter digits manually.`; }
  finally { if(src) src.delete();URL.revokeObjectURL(url);busy=false;document.querySelectorAll('button, .cell').forEach(el => el.disabled=false);fileInput.disabled=false;cameraInput.disabled=false;fileInput.value='';cameraInput.value=''; }
}
fileInput.onchange=e => importFile(e.target.files[0]);
const drop=document.getElementById('dropzone');
['dragenter','dragover'].forEach(name => drop.addEventListener(name,e => {e.preventDefault();drop.classList.add('dragging');}));
['dragleave','drop'].forEach(name => drop.addEventListener(name,e => {e.preventDefault();drop.classList.remove('dragging');}));
drop.addEventListener('drop',e => importFile(e.dataTransfer.files[0]));
validate();
async function processSudokuGrid(src) {
  status.textContent = 'Finding the puzzle grid…';
  const allocated = [];
  const keep = mat => { allocated.push(mat); return mat; };
  try {
    const gray = keep(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const blurred = keep(new cv.Mat());
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    const threshold = keep(new cv.Mat());
    cv.adaptiveThreshold(blurred, threshold, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 8);
    const contours = keep(new cv.MatVector());
    const hierarchy = keep(new cv.Mat());
    cv.findContours(threshold, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    let corners, bestArea = 0;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i), approx = new cv.Mat();
      try {
        const area = cv.contourArea(contour);
        if (area < src.rows * src.cols * 0.4 || area <= bestArea) continue;
        cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);
        if (approx.rows !== 4 || !cv.isContourConvex(approx)) continue;
        corners = Array.from({length: 4}, (_, j) => ({x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1]}));
        bestArea = area;
      } finally { contour.delete(); approx.delete(); }
    }
    if (!corners) {
      // Screenshots often omit the outside border. Use the span of long grid lines.
      const horizontal = keep(new cv.Mat()), vertical = keep(new cv.Mat());
      const hk = keep(cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(Math.max(15,Math.floor(src.cols / 3)),1)));
      const vk = keep(cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(1,Math.max(15,Math.floor(src.rows / 3)))));
      cv.morphologyEx(threshold,horizontal,cv.MORPH_OPEN,hk);
      cv.morphologyEx(threshold,vertical,cv.MORPH_OPEN,vk);
      const lines = keep(new cv.Mat()); cv.add(horizontal,vertical,lines);
      let left=lines.cols, right=-1, top=lines.rows, bottom=-1;
      for (let y=0;y<lines.rows;y++) for(let x=0;x<lines.cols;x++) {
        if(lines.data[y*lines.cols+x]) {left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      const width=right-left+1, height=bottom-top+1;
      if (width > src.cols * 0.6 && height > src.rows * 0.6 && Math.abs(width / height - 1) < 0.15) {
        corners = [{x:left,y:top},{x:right,y:top},{x:left,y:bottom},{x:right,y:bottom}];
      }
    }
    if (!corners) throw new Error('No complete Sudoku grid found. Include all four corners in the photo');
    corners.sort((a,b) => a.y-b.y);
    const top = corners.slice(0,2).sort((a,b) => a.x-b.x);
    const bottom = corners.slice(2).sort((a,b) => a.x-b.x);
    const from = keep(cv.matFromArray(4,1,cv.CV_32FC2,[top[0].x,top[0].y,top[1].x,top[1].y,bottom[1].x,bottom[1].y,bottom[0].x,bottom[0].y]));
    const to = keep(cv.matFromArray(4,1,cv.CV_32FC2,[0,0,575,0,575,575,0,575]));
    const transform = keep(cv.getPerspectiveTransform(from,to));
    const warped = keep(new cv.Mat());
    cv.warpPerspective(gray,warped,transform,new cv.Size(576,576));
    const binary = keep(new cv.Mat());
    cv.adaptiveThreshold(warped,binary,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY_INV,31,10);
    await getOCR();
    await segmentAndPredict(binary);
  } finally { allocated.reverse().forEach(mat => mat.delete()); }
}

async function segmentAndPredict(grid) {
  // Crop inside each cell to exclude grid lines, then isolate the digit from paper noise.
  const results = [], uncertain = [];
  for (let i = 0; i < 81; i++) {
    status.textContent = `Reading cell ${i + 1} of 81…`;
    const cell = grid.roi(new cv.Rect((i % 9) * 64 + 3, Math.floor(i / 9) * 64 + 3, 58, 58));
    try {
      const canvas = prepareDigit(cell);
      if (!canvas) { results.push(''); continue; }
      let {data} = await ocr.recognize(canvas);
      if (!/^[1-9]$/.test(data.text.trim())) {
        try {
          for (const mode of [Tesseract.PSM.SINGLE_BLOCK, Tesseract.PSM.RAW_LINE]) {
            await ocr.setParameters({tessedit_pageseg_mode: mode});
            ({data} = await ocr.recognize(canvas));
            if (/^[1-9]$/.test(data.text.trim())) break;
          }
        } finally { await ocr.setParameters({tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR}); }
      }
      const text = data.text.trim();
      results.push(/^[1-9]$/.test(text) ? text : '');
      if (!/^[1-9]$/.test(text) || data.confidence < 70) uncertain.push(i);
    } finally { cell.delete(); }
  }
  if (!results.some(Boolean)) throw new Error('No digits could be read. Try a sharper photo with better lighting');
  clearBoard();
  cells.forEach((cell, i) => { cell.value = results[i]; cell.classList.toggle('uncertain', uncertain.includes(i)); });
  const valid = validate();
  status.textContent = `Read ${results.filter(Boolean).length} digits. ${uncertain.length ? `${uncertain.length} marked cells need review. ` : ''}${valid ? 'Compare the grid with your photo before solving.' : 'Check the highlighted duplicates against your photo.'}`;
}

function prepareDigit(cell) {
  const labels = new cv.Mat(), stats = new cv.Mat(), centroids = new cv.Mat();
  try {
    const count = cv.connectedComponentsWithStats(cell, labels, stats, centroids, 8, cv.CV_32S);
    let best = -1, bestArea = 0;
    for (let i = 1; i < count; i++) {
      const [x,y,w,h,area] = stats.data32S.slice(i * 5, i * 5 + 5);
      // Ignore paper specks and long grid lines while keeping narrow or off-center digits.
      if (area < 40 || h < 14 || w > cell.cols * 0.8 || h > cell.rows * 0.9 || w / h > 1.3) continue;
      if (area > bestArea) { best = i; bestArea = area; }
    }
    if (best < 0) return null;
    const [x,y,w,h] = stats.data32S.slice(best * 5,best * 5 + 4);
    const digit = document.createElement('canvas'); digit.width=w; digit.height=h;
    const context = digit.getContext('2d');
    const pixels = context.createImageData(w,h);
    for (let py=0;py<h;py++) for(let px=0;px<w;px++) {
      const offset=(py*w+px)*4;
      const color=labels.data32S[(y+py)*cell.cols+x+px] === best ? 0 : 255;
      pixels.data.set([color,color,color,255],offset);
    }
    context.putImageData(pixels,0,0);
    const canvas=document.createElement('canvas');canvas.width=112;canvas.height=112;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,112,112);
    const scale=72/Math.max(w,h);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(digit,(112-w*scale)/2,(112-h*scale)/2,w*scale,h*scale);
    return canvas;
  } finally { labels.delete();stats.delete();centroids.delete(); }
}
