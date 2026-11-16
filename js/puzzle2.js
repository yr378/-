// puzzle2.js - 第二章 4x4 集市拼图（终极修复版，专门解决竖图重合和越界）
const config = {
    width: 600,      // 竖图宽度设小一点
    height: 800,     // 高度设大一点
    cols: 4,         
    rows: 4,         
    imageSrc: 'img/screen_ch2.png', 
    pieces: [],
    ctx: null,
    canvas: null,
    draggingPiece: null,
    fixedCount: 0,
    snapDistance: 35, // 吸附范围加大到 35px，更好拼
    flashTimer: null
};

window.onload = init;

function init() {
    config.canvas = document.getElementById('game');
    if (!config.canvas) return;
    config.ctx = config.canvas.getContext('2d');
    
    config.canvas.addEventListener('pointerdown', onPointerDown);
    config.canvas.addEventListener('pointermove', onPointerMove);
    config.canvas.addEventListener('pointerup', onPointerUp);
    config.canvas.addEventListener('pointerleave', onPointerUp);

    loadImage();
}

function loadImage() {
    const img = new Image();
    img.onload = () => {
        // 【核心修复1】动态获取图片真实比例
        const maxWidth = 600;
        const scale = maxWidth / img.width;
        config.width = maxWidth;
        config.height = img.height * scale; 

        config.canvas.style.width = config.width + 'px';
        config.canvas.style.height = config.height + 'px';

        const dpr = window.devicePixelRatio || 1;
        config.canvas.width = config.width * dpr;
        config.canvas.height = config.height * dpr;
        
        config.ctx.setTransform(1, 0, 0, 1, 0, 0);
        config.ctx.scale(dpr, dpr);

        createPieces(img);
        randomizePieces();
        drawAll();
    };
    img.onerror = () => {
        alert("图片加载失败！请确认 img 文件夹里有 screen_ch2.png！");
    };
    img.src = config.imageSrc;
}

function createPieces(img) {
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const id = row * config.cols + col;
            config.pieces.push({
                id: id,
                sourceX: col * cellW,
                sourceY: row * cellH,
                curX: col * cellW,
                curY: row * cellH,
                targetX: col * cellW,
                targetY: row * cellH,
                zIndex: 0,
                img: img,
                isFixed: false,
                homeX: 0,
                homeY: 0,
                flashAlpha: 0
            });
        }
    }
}

// 【核心修复2】确保碎片不重叠，且不超出画布边界
function randomizePieces() {
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;
    
    for (let i = 0; i < config.pieces.length; i++) {
        const piece = config.pieces[i];
        let canPlace = false;
        let attempts = 0;
        
        while (!canPlace && attempts < 300) {
            // 严格限制在画布内
            piece.curX = Math.random() * (config.width - cellW);
            piece.curY = Math.random() * (config.height - cellH);
            canPlace = true;
            
            for (let j = 0; j < i; j++) {
                if (isOverlapping(piece, config.pieces[j], cellW, cellH)) {
                    canPlace = false;
                    break;
                }
            }
            attempts++;
        }
        piece.homeX = piece.curX;
        piece.homeY = piece.curY;
    }
}

function isOverlapping(a, b, w, h) {
    return a.curX < b.curX + w && a.curX + w > b.curX &&
           a.curY < b.curY + h && a.curY + h > b.curY;
}

function drawAll() {
    if (!config.ctx) return;
    config.ctx.clearRect(0, 0, config.width, config.height);
    drawTargetGrid();
    
    const sortedPieces = [...config.pieces].sort((a, b) => a.zIndex - b.zIndex);
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;

    for (const piece of sortedPieces) {
        config.ctx.drawImage(
            piece.img,
            piece.sourceX, piece.sourceY, cellW, cellH,
            piece.curX, piece.curY, cellW, cellH
        );
        if (piece.flashAlpha > 0) {
            config.ctx.fillStyle = `rgba(255, 215, 0, ${piece.flashAlpha})`;
            config.ctx.fillRect(piece.curX, piece.curY, cellW, cellH);
        }
        config.ctx.strokeStyle = piece.isFixed ? 'rgba(0,0,0,0.3)' : '#ffffff';
        config.ctx.lineWidth = 1;
        config.ctx.strokeRect(piece.curX, piece.curY, cellW, cellH);
    }
}

function drawTargetGrid() {
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;
    config.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    config.ctx.lineWidth = 1;
    config.ctx.setLineDash([5, 5]);
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            config.ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        }
    }
    config.ctx.setLineDash([]);
}

function onPointerDown(e) {
    const rect = config.canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const w = config.width / config.cols;
    const h = config.height / config.rows;
    for (let i = config.pieces.length - 1; i >= 0; i--) {
        const piece = config.pieces[i];
        if (piece.isFixed) continue;
        if (pointerX >= piece.curX && pointerX <= piece.curX + w &&
            pointerY >= piece.curY && pointerY <= piece.curY + h) {
            config.draggingPiece = piece;
            piece.homeX = piece.curX;
            piece.homeY = piece.curY;
            piece.zIndex = Math.max(...config.pieces.map(p => p.zIndex)) + 1;
            drawAll();
            break;
        }
    }
}

function onPointerMove(e) {
    if (!config.draggingPiece) return;
    const rect = config.canvas.getBoundingClientRect();
    const w = config.width / config.cols;
    const h = config.height / config.rows;
    config.draggingPiece.curX = e.clientX - rect.left - w / 2;
    config.draggingPiece.curY = e.clientY - rect.top - h / 2;
    drawAll();
}

function onPointerUp() {
    const piece = config.draggingPiece;
    if (!piece) return;
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;
    const cx = piece.curX + cellW / 2;
    const cy = piece.curY + cellH / 2;
    const tx = piece.targetX + cellW / 2;
    const ty = piece.targetY + cellH / 2;
    const dist = Math.hypot(cx - tx, cy - ty);
    const isOccupied = config.pieces.some(p => p !== piece && p.isFixed && p.targetX === piece.targetX && p.targetY === piece.targetY);

    if (dist <= config.snapDistance && !isOccupied) {
        piece.curX = piece.targetX;
        piece.curY = piece.targetY;
        piece.isFixed = true;
        config.fixedCount++;
        startFlash(piece);
        if (config.fixedCount === 16) {
            setTimeout(() => {
                alert("太棒了！第二章拼图完成！");
            }, 500);
        }
    } else {
        shakeBack(piece);
    }
    config.draggingPiece = null;
    drawAll();
}

function startFlash(piece) {
    piece.flashAlpha = 0.8;
    let step = 0;
    const timer = setInterval(() => {
        step++;
        piece.flashAlpha -= 0.1;
        if (piece.flashAlpha <= 0 || step >= 10) {
            piece.flashAlpha = 0;
            clearInterval(timer);
        }
        drawAll();
    }, 30);
}

function shakeBack(piece) {
    let dir = 1;
    let step = 0;
    const originX = piece.homeX;
    const timer = setInterval(() => {
        step++;
        piece.curX = originX + (dir * 5);
        dir *= -1;
        if (step >= 4) {
            piece.curX = originX;
            clearInterval(timer);
        }
        drawAll();
    }, 50);
}