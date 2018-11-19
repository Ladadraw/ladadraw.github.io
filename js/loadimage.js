'use strict';

// Загрузка изображения
function uploadFileFromInput(event) {
    hideItem(errorNode);
    const input = document.createElement('input');
    input.setAttribute('id', 'fileInput');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg, image/png');
    hideItem(input);
    menu.appendChild(input);
    document.querySelector('#fileInput').addEventListener('change', event => {
        const files = Array.from(event.currentTarget.files);

        if (currentImage.dataset.load === 'load') {
            removeForm();
            curves = [];
        }

        sendFile(files);
    });

    input.click();
    menu.removeChild(input);
}

// drag & drop Image
function onFilesDrop(event) {
    event.preventDefault();
    hideItem(errorNode);
    const files = Array.from(event.dataTransfer.files);

    //выдаем ошибку, при повторном drop изображении
    if (currentImage.dataset.load === 'load') {
        showItem(errorNode);
        errorNode.lastElementChild.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
        errorRemove();
        return;
    }

    //проверяем загружаемый файл, если файл нужного типа, то загружаем, иначе показываем ошибку.
    files.forEach(file => {
        if ((file.type === 'image/jpeg') || (file.type === 'image/png')) {
            sendFile(files);
        } else {
            showItem(errorNode)
        }
    });
}

// загрузка изображения на сервер
function sendFile(files) {
    const formData = new FormData();

    files.forEach(file => {
        const fileTitle = delExtension(file.name);
        formData.append('title', fileTitle);
        formData.append('image', file);
    });

    showItem(imageLoader);

    fetch(`${urlApi}/pic`, {
            body: formData,
            credentials: 'same-origin',
            method: 'POST'
        })
        .then(res => {
            if (res.status >= 200 && res.status < 300) {
                return res;
            }
            throw new Error(res.statusText);
        })
        .then(res => res.json())
        .then(res => {
            getImageData(res.id);
        })
        .catch(er => {
            console.log(er);
            hideItem(imageLoader);
        });
}

// удаление форм комментариев, при загрузке нового изображения
function removeForm() {
    const formComment = wrap.querySelectorAll('.comments__form');
    Array.from(formComment).forEach(item => {
        item.remove()
    });
}

// получаем информацию о файле
function getImageData(id) {
    const xhrGetInfo = new XMLHttpRequest();
    xhrGetInfo.open(
        'GET',
        `${urlApi}/pic/${id}`,
        false
    );
    xhrGetInfo.send();

    dataGetParse = JSON.parse(xhrGetInfo.responseText);
    curHost = `${window.location.origin}${window.location.pathname}?id=${dataGetParse.id}`;
    localStorage.curHost = curHost;
    wss();
    setcurrentImage(dataGetParse);
    burger.style.cssText = ``;
    showMenu();
    history.pushState(null, null, curHost); // querystring для сохранения данных об изображении

    currentImage.addEventListener('load', () => {
        hideItem(imageLoader);
        createWrapforCanvasComment();
        createCanvas();
        currentImage.dataset.load = 'load';
        updateCommentForm(dataGetParse.comments);
        minimizeAllCommentForms();
    });

    // updateCommentForm(dataGetParse.comments);
}

// убираем расширение файла
function delExtension(inputText) {
    let regExp = new RegExp(/\.[^.]+$/gi);

    return inputText.replace(regExp, '');
}
