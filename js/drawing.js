'use strict';


const debounceSendMask = debounce(sendMaskState, 1000);

//создаем холст для рисования	
function createCanvas() {
    const width = getComputedStyle(wrap.querySelector('.current-image')).width.slice(0, -2);
    const height = getComputedStyle(wrap.querySelector('.current-image')).height.slice(0, -2);
    canvas.width = width;
    canvas.height = height;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';

    wrapCommentsCanvas.appendChild(canvas);
}

// кисть
function circle(point) {
    ctx.beginPath();
    ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
    ctx.fill();
}

// плавная кривая между точками
function smoothCurveBetween(p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    ctx.quadraticCurveTo(...p1, ...cp);
}

// рисуем линию
function smoothCurve(points) {
    ctx.beginPath();
    ctx.lineWidth = BRUSH_RADIUS;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.moveTo(...points[0]);

    for (let i = 1; i < points.length - 1; i++) {
        smoothCurveBetween(points[i], points[i + 1]);
    }

    ctx.stroke();
}

// координаты положения курсора
function makePoint(x, y) {
    return [x, y];
}

// перерисовка canvas
function repaint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curves.forEach((curve) => {
        ctx.strokeStyle = curve.color;
        ctx.fillStyle = curve.color;

        circle(curve[0]);
        smoothCurve(curve);

    });
};

// отправка канвас на сервер
function sendMaskState() {
    canvas.toBlob(function (blob) {
        connection.send(blob);
        console.log(connection);
    });
};
