'use strict';

const urlApi = 'https://neto-api.herokuapp.com';

const wrapCommentsCanvas = document.createElement('div');
const canvas = document.createElement('canvas');


const wrap = document.querySelector('.wrap');
const currentImage = document.querySelector('.current-image');

// меню
const menu = document.querySelector('.menu');
const burger = document.querySelector('.burger');
const comments = document.querySelector('.comments');
const draw = document.querySelector('.draw');
const share = document.querySelector('.share');
const menuUrl = document.querySelector('.menu__url');
const modeHTMLElements = document.querySelectorAll('.mode');
const copyButton = document.querySelector('.menu_copy');

//сервис
const imageLoader = document.querySelector('.image-loader');
const errorMessage = document.querySelector('.error__message');
const errorNode = document.querySelector('.error');

// комментарии 
const allCommentsForms = document.querySelectorAll('.comments__marker');

// рисование
const ctx = canvas.getContext('2d');
const BRUSH_RADIUS = 4; //размер кисти
let curves = [];
let drawing = false;
let needsRepaint = false;


let connection;
let dataGetParse;
let showComments = {};
let currentColor;
let curHost;

let movedPiece = null;
let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;

let url = new URL(`${window.location.href}`);
let paramId = url.searchParams.get('id');

document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', throttle(drag));
document.addEventListener('mouseup', drop);


// init
currentImage.src = ''; // фон пустой

menu.dataset.state = 'initial';
wrap.dataset.state = '';
hideItem(burger);
wrap.removeChild(document.querySelector('.comments__form'));
menu.querySelector('.new').addEventListener('click', uploadFileFromInput);

wrap.addEventListener('drop', onFilesDrop);
wrap.addEventListener('dragover', event => event.preventDefault());

burger.addEventListener('click', showMenu);
canvas.addEventListener('click', checkComment);

// переключатель видимости комментария
document.querySelector('.menu__toggle-title_on').addEventListener('click', markerCheckboxOn);
document.querySelector('#comments-on').addEventListener('click', markerCheckboxOn);

document.querySelector('.menu__toggle-title_off').addEventListener('click', markerCheckboxOff);
document.querySelector('#comments-off').addEventListener('click', markerCheckboxOff);

// копирование ссылки Поделиться
copyButton.addEventListener('click', () => {
    menuUrl.select();
    document.execCommand('copy');
});

urlId(paramId);

// canvas
canvas.addEventListener("mousedown", (event) => {
    if (!(menu.querySelector('.draw').dataset.state === 'selected')) return;
    drawing = true;

    const curve = [];
    curve.color = currentColor;

    curve.push(makePoint(event.offsetX, event.offsetY));
    curves.push(curve);
    needsRepaint = true;
});

canvas.addEventListener("mouseup", (event) => {
    menu.style.zIndex = '1';
    drawing = false;
});

canvas.addEventListener("mouseleave", (event) => {
    drawing = false;
});

canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
        menu.style.zIndex = '0';
        curves[curves.length - 1].push(makePoint(event.offsetX, event.offsetY));
        needsRepaint = true;
        debounceSendMask();
    }
});


// выбор цвета пера
Array.from(menu.querySelectorAll('.menu__color')).forEach(color => {
    if (color.checked) {
        currentColor = getComputedStyle(color.nextElementSibling).backgroundColor;
    }
    color.addEventListener('click', (event) => {
        currentColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor;
    });
});

tick();

// раскрытие пунктов меню
function showMenu() {
    menu.dataset.state = 'default';
    Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {
        modeItem.dataset.state = '';
        modeItem.addEventListener('click', () => {

            if (!modeItem.classList.contains('new')) {
                menu.dataset.state = 'selected';
                modeItem.dataset.state = 'selected';
            }

            if (modeItem.classList.contains('share')) {
                menu.querySelector('.menu__url').value = curHost;
            }
        })
    })
}

// скрываем текст ошибки
function errorRemove() {
    setTimeout(function () {
        hideItem(errorNode)
    }, 5000);
}

// скрываем элементы
function hideItem(el) {
    el.style.display = 'none';
}

// показываем элементы
function showItem(el) {
    el.style.display = '';
}

// проверяем ссылку на параметр id
function urlId(id) {
    if (!id) {
        return;
    }
    getImageData(id);
    showMenuComments();
}


function tick() {
    if (menu.offsetHeight > 66) {
        //menu.style.left = (wrap.offsetWidth - menu.offsetWidth) - 10 + 'px';
        menu.style.left = (wrap.offsetWidth - menu.offsetWidth) - 1 + 'px';
    }

    if (needsRepaint) {
        repaint();
        needsRepaint = false;
    }

    window.requestAnimationFrame(tick);
};
