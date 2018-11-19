'use strict';

// веб-сокет
function wss() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${dataGetParse.id}`);
    connection.addEventListener('message', event => {
        if (JSON.parse(event.data).event === 'pic') {
            if (JSON.parse(event.data).pic.mask) {
                canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
            } else {
                canvas.style.background = ``;
            }
        }

        if (JSON.parse(event.data).event === 'comment') {
            insertWssCommentForm(JSON.parse(event.data).comment);
        }

        if (JSON.parse(event.data).event === 'mask') {
            canvas.style.background = `url(${JSON.parse(event.data).url})`;
        }
    });
}

//закрываем соединение при уходе со страницы
window.addEventListener('beforeunload', () => {
    connection.close();
    console.log('Веб-сокет закрыт')
});
