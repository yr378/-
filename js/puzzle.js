// puzzle.js - 3x3 拼图游戏（吸附 + 通关灯河演出）
const config = {
    width: 900,
    height: 600,
    cols: 3,
    rows: 3,
    imageSrc: 'img/screen_ch1.png',
    pieces: [],
    ctx: null,
    draggingPiece: null,
    fixedCount: 0,
    snapDistance: 24,
    flashTimer: null
};

// 初始化
function init() {
    const canvas = document.getElementById('game');
    if (!canvas) {
        console.error('找不到 id 为 "game" 的 canvas 元素');
        return;
    }
    canvas.style.width = config.width + 'px';
    canvas.style.height = config.height + 'px';

    const dpr = window.devicePixelRatio || 1;
    canvas.width = config.width * dpr;
    canvas.height = config.height * dpr;

    config.ctx = canvas.getContext('2d');
    config.ctx.scale(dpr, dpr);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    bindContinueBtn();
    loadPiece(config.imageSrc);
}

// 加载图片，等比居中裁切，生成碎片
function loadPiece(src) {
    const img = new Image();
    img.onload = () => {
        const canvasRatio = config.width / config.height;
        const imgRatio = img.width / img.height;

        let sourceW, sourceH, sourceX, sourceY;
        if (imgRatio > canvasRatio) {
            sourceH = img.height;
            sourceW = sourceH * canvasRatio;
            sourceX = (img.width - sourceW) / 2;
            sourceY = 0;
        } else {
            sourceW = img.width;
            sourceH = sourceW / canvasRatio;
            sourceX = 0;
            sourceY = (img.height - sourceH) / 2;
        }

        const cellW = config.width / config.cols;
        const cellH = config.height / config.rows;
        const srcCellW = sourceW / config.cols;
        const srcCellH = sourceH / config.rows;

        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const id = row * config.cols + col;
                config.pieces.push({
                    id: id,
                    sourceX: sourceX + col * srcCellW,
                    sourceY: sourceY + row * srcCellH,
                    sourceW: srcCellW,
                    sourceH: srcCellH,
                    curX: col * cellW,
                    curY: row * cellH,
                    targetX: col * cellW,
                    targetY: row * cellH,
                    zIndex: 0,
                    img: img,
                    isFixed: false,
                    homeX: col * cellW,
                    homeY: row * cellH,
                    flashAlpha: 0
                });
            }
        }
        randomizePieces();
        drawAll();
    };
    img.src = src;
}

// 随机打乱，不重叠
function randomizePieces() {
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;

    for (let i = 0; i < config.pieces.length; i++) {
        const piece = config.pieces[i];
        let canPlace = false;
        let attempts = 0;

        while (!canPlace && attempts < 100) {
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

// 重叠检测
function isOverlapping(a, b, w, h) {
    return a.curX < b.curX + w &&
           a.curX + w > b.curX &&
           a.curY < b.curY + h &&
           a.curY + h > b.curY;
}

// 绘制：虚影格 → 固定碎片置底 → 未固定在上层
function drawAll() {
    if (!config.ctx) return;
    config.ctx.clearRect(0, 0, config.width, config.height);

    drawTargetGrid();

    const sortedPieces = [...config.pieces].sort((a, b) => {
        if (a.isFixed !== b.isFixed) return a.isFixed ? -1 : 1;
        return a.zIndex - b.zIndex;
    });

    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;

    for (const piece of sortedPieces) {
        config.ctx.drawImage(
            piece.img,
            piece.sourceX, piece.sourceY, piece.sourceW, piece.sourceH,
            piece.curX, piece.curY, cellW, cellH
        );

        if (piece.flashAlpha > 0) {
            config.ctx.fillStyle = `rgba(255,255,255,${piece.flashAlpha})`;
            config.ctx.fillRect(piece.curX, piece.curY, cellW, cellH);
        }

        config.ctx.strokeStyle = '#fff';
        config.ctx.lineWidth = 2;
        config.ctx.strokeRect(piece.curX, piece.curY, cellW, cellH);
    }
}

// 画 3×3 虚影目标格
function drawTargetGrid() {
    const cellW = config.width / config.cols;
    const cellH = config.height / config.rows;
    config.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    config.ctx.lineWidth = 1;
    config.ctx.setLineDash([6, 6]);

    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            config.ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        }
    }
    config.ctx.setLineDash([]);
}

// ===== 通关灯河演出：全屏黑屏 + 旁白淡入 + 继续按钮 =====
function showCinematic() {
    const mask = document.getElementById('cinematic');
    const l1 = mask.querySelector('.line1');
    const l2 = mask.querySelector('.line2');
    const btn = document.getElementById('continueBtn');

    l1.classList.remove('show');
    l2.classList.remove('show');
    btn.classList.remove('show');

    // 1. 屏幕渐变成全黑（CSS 过渡 1s）
    mask.classList.add('show');

    // 2. 黑屏中间依次浮现两段旁白
    setTimeout(() => l1.classList.add('show'), 1100);
    setTimeout(() => l2.classList.add('show'), 2800);

    // 3. 文字停留 3 秒后，底部【继续】按钮淡入
    setTimeout(() => btn.classList.add('show'), 5800);
}

// 绑定【继续】按钮：点击跳转第二章
function bindContinueBtn() {
    const btn = document.getElementById('continueBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        window.location.href = 'chapter2.html';
    });
}

// 按下：选中碎片（已锁定的不能拖）
function onPointerDown(e) {
    const rect = e.target.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const w = config.width / config.cols;
    const h = config.height / config.rows;

    for (let i = config.pieces.length - 1; i >= 0; i--) {
        const piece = config.pieces[i];
        if (piece.isFixed) continue;

        if (px >= piece.curX && px <= piece.curX + w &&
            py >= piece.curY && py <= piece.curY + h) {
            config.draggingPiece = piece;
            piece.homeX = piece.curX;
            piece.homeY = piece.curY;
            piece.zIndex = Math.max(...config.pieces.map(p => p.zIndex)) + 1;
            break;
        }
    }
}

// 移动：碎片跟随指针
function onPointerMove(e) {
    if (!config.draggingPiece) return;
    const rect = e.target.getBoundingClientRect();
    const w = config.width / config.cols;
    const h = config.height / config.rows;

    config.draggingPiece.curX = e.clientX - rect.left - w / 2;
    config.draggingPiece.curY = e.clientY - rect.top - h / 2;
    drawAll();
}

// 松手：判定吸附 / 回弹
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

    // 目标格是否已被其他固定碎片占用
    const occupied = config.pieces.some(p => p !== piece && p.isFixed && p.targetX === piece.targetX && p.targetY === piece.targetY);

    if (dist <= config.snapDistance && !occupied) {
        piece.curX = piece.targetX;
        piece.curY = piece.targetY;
        piece.isFixed = true;
        config.fixedCount++;
        startFlash(piece);

        if (config.fixedCount === 9) {
            console.log('第一章拼图完成');
            setTimeout(showCinematic, 300);
        }
    } else {
        shakeBack(piece);
    }

    config.draggingPiece = null;
    drawAll();
}

// 吸附发光 0.3s
function startFlash(piece) {
    piece.flashAlpha = 0.8;
    let step = 0;
    config.flashTimer = setInterval(() => {
        step++;
        piece.flashAlpha -= 0.8 / 15;
        if (piece.flashAlpha <= 0 || step >= 15) {
            piece.flashAlpha = 0;
            clearInterval(config.flashTimer);
        }
        drawAll();
    }, 20);
}

// 回弹 + 左右轻晃 0.2s
function shakeBack(piece) {
    let dir = 1;
    let step = 0;
    const originX = piece.homeX;
    const originY = piece.homeY;

    const timer = setInterval(() => {
        step++;
        piece.curX = originX + dir * 3;
        dir *= -1;
        if (step >= 4) {
            piece.curX = originX;
            piece.curY = originY;
            clearInterval(timer);
        }
        drawAll();
    }, 50);
}

window.onload = init;
