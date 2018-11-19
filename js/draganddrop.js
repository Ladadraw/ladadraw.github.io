'use strict';

// drag & drop
function dragStart(event) {
    if (!event.target.classList.contains('drag')) {
        return;
    }

    movedPiece = event.target.parentElement;
    minX = wrap.offsetLeft;
    minY = wrap.offsetTop;

    maxX = wrap.offsetLeft + wrap.offsetWidth - movedPiece.offsetWidth;
    maxY = wrap.offsetTop + wrap.offsetHeight - movedPiece.offsetHeight;

    shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
    shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
}

function drag(event) {
    if (!movedPiece) {
        return;
    }

    let x = event.pageX - shiftX;
    let y = event.pageY - shiftY;
    x = Math.min(x, maxX);
    y = Math.min(y, maxY);
    x = Math.max(x, minX);
    y = Math.max(y, minY);
    movedPiece.style.left = x + 'px';
    movedPiece.style.top = y + 'px';
}

function drop(event) {
    if (movedPiece) {
        movedPiece = null;
    }
}

// ограничения частоты запуска функции
function throttle(func, delay = 0) {
    let isWaiting = false;

    return function (...res) {
        if (!isWaiting) {
            func.apply(this, res);
            isWaiting = true;
            setTimeout(() => {
                isWaiting = false;
            }, delay);
        }
    }
}

// отложенный запуск функции, после завершения события
function debounce(func, delay = 0) {
    let timeout;

    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func();
        }, delay);
    };
}
