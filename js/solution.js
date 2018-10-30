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
const allCommentsForms = document.querySelectorAll('.comments__form');
const commentsOnInput = document.querySelector('.comments-on');
const commentsOffInput = document.querySelector('.comments-off');

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


const ctx = canvas.getContext('2d');
const BRUSH_RADIUS = 4; //размер кисти
let curves = [];
let drawing = false;
let needsRepaint = false;

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

const debounceSendMask = debounce(sendMaskState, 1000);

tick();

//закрываем соединение при уходе со страницы
window.addEventListener('beforeunload', () => { connection.close(); console.log('Веб-сокет закрыт') }); 

// убираем расширение файла
function delExtension(inputText) { 
	let regExp = new RegExp(/\.[^.]+$/gi);

	return inputText.replace(regExp, '');  
}

// разбивка timestamp на читаемое отображение даты и времени
function getDate(timestamp) {
	const options = {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	};
	const date = new Date(timestamp);
	const dateStr = date.toLocaleString('ru-RU', options);

	return dateStr.slice(0, 8) + dateStr.slice(9);
}

// скрываем текст ошибки
function errorRemove() {
	setTimeout(function() {		
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


// drag & drop
function dragStart(event) {
	if (!event.target.classList.contains('drag')) { return; }

	movedPiece = event.target.parentElement;
	minX = wrap.offsetLeft;
	minY = wrap.offsetTop;
		
	maxX = wrap.offsetLeft + wrap.offsetWidth - movedPiece.offsetWidth;
	maxY = wrap.offsetTop + wrap.offsetHeight - movedPiece.offsetHeight;
		
	shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
	shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
}

function drag(event) {
	if (!movedPiece) {return; }

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
		.then( res => {
			if (res.status >= 200 && res.status < 300) {
				return res;
			}
			throw new Error (res.statusText);
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
	Array.from(formComment).forEach(item => {item.remove()});
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
	//localStorage.host = `${window.location.origin}${window.location.pathname}?id=${dataGetParse.id}`;
    curHost = `${window.location.origin}${window.location.pathname}?id=${dataGetParse.id}`;
	wss();	
	setcurrentImage(dataGetParse);
	burger.style.cssText = ``;
	showMenu();
	

	currentImage.addEventListener('load', () => {
		hideItem(imageLoader);
		createWrapforCanvasComment();
		createCanvas();
		currentImage.dataset.load = 'load';
		updateCommentForm(dataGetParse.comments);
	});

	// updateCommentForm(dataGetParse.comments);
}

// раскрытие пунктов меню
function showMenu() {
	menu.dataset.state = 'default';
	Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {
		modeItem.dataset.state = '';
		modeItem.addEventListener('click', () => {
			
			if (!modeItem.classList.contains('new')){
				menu.dataset.state = 'selected';
				modeItem.dataset.state = 'selected';
			}
			
			if (modeItem.classList.contains('share')) {
				//menu.querySelector('.menu__url').value = localStorage.host;
                menu.querySelector('.menu__url').value = curHost;
			}
		})
	})
}

// показываем меню "Комментарии"
function showMenuComments() {
	menu.dataset.state = 'default';

	Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {
		if (!modeItem.classList.contains('comments')) { return; }
			
		menu.dataset.state = 'selected';
		modeItem.dataset.state = 'selected';
	})
}

// добавляем фон 
function setcurrentImage(fileInfo) {
	currentImage.src = fileInfo.url;
}

//чекбокс "скрыть комментарии"
function markerCheckboxOff() {
	Array.from(allCommentsForms).forEach(form => {
		form.style.display = 'none';
	 })
}

//чекбокс "показать комментарии"
function markerCheckboxOn() {
	Array.from(allCommentsForms).forEach(form => {
		form.style.display = '';
	})
}

//создаем формы на обертке для комментариев
function checkComment(event) {
	if (!(menu.querySelector('.comments').dataset.state === 'selected') || !wrap.querySelector('#comments-on').checked) { return; }
	wrapCommentsCanvas.appendChild(createCommentForm(event.offsetX, event.offsetY));
}

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

// создаем обертку для комментариев
function createWrapforCanvasComment() {
	const width = getComputedStyle(wrap.querySelector('.current-image')).width;
	const height = getComputedStyle(wrap.querySelector('.current-image')).height;
	wrapCommentsCanvas.style.cssText = `
		width: ${width};
		height: ${height};
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: block;
	`;
	wrap.appendChild(wrapCommentsCanvas);

	// отображаем комментарии (по клику) поверх остальных
	wrapCommentsCanvas.addEventListener('click', event => {
		if (event.target.closest('form.comments__form')) {
			Array.from(wrapCommentsCanvas.querySelectorAll('form.comments__form')).forEach(form => {
				form.style.zIndex = 2;
			});
			event.target.closest('form.comments__form').style.zIndex = 3;
		}
	});
}

//форма для комментариев
function createCommentForm(x, y) {
	const formComment = document.createElement('form');
	formComment.classList.add('comments__form');
	formComment.innerHTML = `
		<span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
		<div class="comments__body">
			<div class="comment">
				<div class="loader">
					<span></span>
					<span></span>
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
			<textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
			<input class="comments__close" type="button" value="Закрыть">
			<input class="comments__submit" type="submit" value="Отправить">
		</div>`;

	//смещение, чтобы маркер встал туда, куда кликнули
	const left = x - 22;
	const top = y - 14;

	formComment.style.cssText = `
		top: ${top}px;
		left: ${left}px;
		z-index: 2;
	`;
	formComment.dataset.left = left;
	formComment.dataset.top = top;
    formComment.querySelector('.comments__marker-checkbox').checked = true;
	hideItem(formComment.querySelector('.loader').parentElement);

	//кнопка "закрыть"
    formComment.querySelector('.comments__close').addEventListener('click', () => {
		formComment.querySelector('.comments__marker-checkbox').checked = false;
	});

	// кнопка "отправить"
	formComment.addEventListener('submit', messageSend);
	formComment.querySelector('.comments__input').addEventListener('keydown', keySendMessage);

	// отправка комментария при нажатии Ctrl + Enter
	function keySendMessage(event) {
		if (event.repeat) { return; }
		if (!event.ctrlKey) { return; }

		switch (event.code) {
			case 'Enter':
				messageSend();
			break;
		}
	}

	// отправляем комментарии
	function messageSend(event) {
		if (event) {
			event.preventDefault();
		}
		const message = formComment.querySelector('.comments__input').value;
		const messageSend = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
		commentsSend(messageSend);
		showItem(formComment.querySelector('.loader').parentElement);
		formComment.querySelector('.comments__input').value = '';
	}

	// отправка комментария на сервер
	function commentsSend(message) {
		fetch(`${urlApi}/pic/${dataGetParse.id}/comments`, {
				method: 'POST',
				body: message,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
			})
			.then( res => {
				if (res.status >= 200 && res.status < 300) {
					return res;
				}
				throw new Error (res.statusText);
			})
			.then(res => res.json())
			.catch(er => {
				console.log(er);
				formComment.querySelector('.loader').parentElement.style.display = 'none';
			});
	}

	return formComment;
}

//добавляем комментарий в форму
function addMessageComment(message, form) {
	let parentLoaderDiv = form.querySelector('.loader').parentElement;

	const newMessageDiv = document.createElement('div');
	newMessageDiv.classList.add('comment');
	newMessageDiv.dataset.timestamp = message.timestamp;
		
	const commentTimeP = document.createElement('p');
	commentTimeP.classList.add('comment__time');
	commentTimeP.textContent = getDate(message.timestamp);
	newMessageDiv.appendChild(commentTimeP);

	const commentMessageP = document.createElement('p');
	commentMessageP.classList.add('comment__message');
	commentMessageP.textContent = message.message;
	newMessageDiv.appendChild(commentMessageP);

	form.querySelector('.comments__body').insertBefore(newMessageDiv, parentLoaderDiv);
}

//обновление форм с комментариями
function updateCommentForm(newComment) {
	if (!newComment) return;
	Object.keys(newComment).forEach(id => {
		if (id in showComments) return;
			
		showComments[id] = newComment[id];
		let needCreateNewForm = true;

		Array.from(wrap.querySelectorAll('.comments__form')).forEach(form => {
			
			//добавляем сообщение в форму с заданными координатами left и top
			if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
				form.querySelector('.loader').parentElement.style.display = 'none';
				addMessageComment(newComment[id], form); 
				needCreateNewForm = false;
			}
		});

		//создаем форму и добавляем в нее сообщение
		if (needCreateNewForm) {
			const newForm = createCommentForm(newComment[id].left + 22, newComment[id].top + 14);
			newForm.dataset.left = newComment[id].left;
			newForm.dataset.top = newComment[id].top;
			newForm.style.left = newComment[id].left + 'px';
			newForm.style.top = newComment[id].top + 'px';
			wrapCommentsCanvas.appendChild(newForm);
			addMessageComment(newComment[id], newForm);

			if (!wrap.querySelector('#comments-on').checked) {
				newForm.style.display = 'none';
			}
		}
	});
}

//вставка полученных с сервера комментариев
function insertWssCommentForm(wssComment) {
	const wsCommentEdited = {};
	wsCommentEdited[wssComment.id] = {};
	wsCommentEdited[wssComment.id].left = wssComment.left;
	wsCommentEdited[wssComment.id].message = wssComment.message;
	wsCommentEdited[wssComment.id].timestamp = wssComment.timestamp;
	wsCommentEdited[wssComment.id].top = wssComment.top;
	updateCommentForm(wsCommentEdited);
}

// веб-сокет
function wss() {
	connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${dataGetParse.id}`);
	connection.addEventListener('message', event => {
		if (JSON.parse(event.data).event === 'pic'){
			if (JSON.parse(event.data).pic.mask) {
				canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
			} else {
				canvas.style.background = ``;
			}
		}

		if (JSON.parse(event.data).event === 'comment'){
			insertWssCommentForm(JSON.parse(event.data).comment);
		}

		if (JSON.parse(event.data).event === 'mask'){
			canvas.style.background = `url(${JSON.parse(event.data).url})`;
		}
	});
}

// проверяем ссылку на параметр id
function urlId(id) {
	if (!id) { return;	}
	getImageData(id);
	showMenuComments();
}

// выбор цвета пера
Array.from(menu.querySelectorAll('.menu__color')).forEach(color => {
	if (color.checked) {  
		currentColor = getComputedStyle(color.nextElementSibling).backgroundColor;  
	}
	color.addEventListener('click', (event) => {  
		currentColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor; 
	});
});

// кисть
function circle(point) {
	ctx.beginPath();
	ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
	ctx.fill();
}

// плавная кривая между точками
function smoothCurveBetween (p1, p2) {
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

	for(let i = 1; i < points.length - 1; i++) {
		smoothCurveBetween(points[i], points[i + 1]);
	}

	ctx.stroke();
}

// координаты положения курсора
function makePoint(x, y) {
	return [x, y];
}

// перерисовка canvas
function repaint () {
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

function tick () {
	if (menu.offsetHeight > 66) {
		menu.style.left = (wrap.offsetWidth - menu.offsetWidth) - 10 + 'px';
	}

	if(needsRepaint) {
		repaint();
		needsRepaint = false;
	}

	window.requestAnimationFrame(tick);
};