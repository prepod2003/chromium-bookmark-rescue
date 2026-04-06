# Chromium Bookmark Rescue

[English version](README.md)

Расширение для Chrome, которое **полностью заменяет** закладки Chrome на закладки из любого Chromium-браузера — даже из тех, где нет встроенного экспорта.

Поддерживает **Comet** (Perplexity), **Arc**, **Brave**, **Vivaldi**, **Opera**, **Edge**, **Яндекс Браузер** и любой другой браузер на базе Chromium.

## Зачем?

Некоторые Chromium-браузеры (например, [Comet от Perplexity](https://comet.perplexity.ai/)) не позволяют экспортировать закладки. Просто скопировать файл `Bookmarks` тоже не получится:

- Встроенный **импорт закладок** в Chrome складывает всё в отдельную папку (например, *"Выполнен импорт"*) вместо того, чтобы заменить существующие.
- Если включена **синхронизация Google**, подменённый файл перезаписывается облачными данными при следующем запуске.

Это расширение решает обе проблемы, используя официальный API `chrome.bookmarks`. Chrome воспринимает изменения как обычные действия пользователя и корректно синхронизирует их.

## Быстрый старт

### 1. Найдите файл закладок

Найдите файл `Bookmarks` в профиле исходного браузера.

<details>
<summary><strong>Windows</strong></summary>

- **Comet** — `%LocalAppData%\Perplexity\Comet\User Data\Default\Bookmarks`
- **Arc** — `%LocalAppData%\Arc\User Data\Default\Bookmarks`
- **Brave** — `%LocalAppData%\BraveSoftware\Brave-Browser\User Data\Default\Bookmarks`
- **Vivaldi** — `%LocalAppData%\Vivaldi\User Data\Default\Bookmarks`
- **Opera** — `%AppData%\Opera Software\Opera Stable\Bookmarks`
- **Opera GX** — `%AppData%\Opera Software\Opera GX Stable\Bookmarks`
- **Edge** — `%LocalAppData%\Microsoft\Edge\User Data\Default\Bookmarks`
- **Яндекс** — `%LocalAppData%\Yandex\YandexBrowser\User Data\Default\Bookmarks`

</details>

<details>
<summary><strong>macOS</strong></summary>

- **Comet** — `~/Library/Application Support/Perplexity/Comet/Default/Bookmarks`
- **Arc** — `~/Library/Application Support/Arc/User Data/Default/Bookmarks`
- **Brave** — `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks`
- **Vivaldi** — `~/Library/Application Support/Vivaldi/Default/Bookmarks`
- **Opera** — `~/Library/Application Support/com.operasoftware.Opera/Bookmarks`
- **Edge** — `~/Library/Application Support/Microsoft Edge/Default/Bookmarks`
- **Chrome** — `~/Library/Application Support/Google/Chrome/Default/Bookmarks`

</details>

<details>
<summary><strong>Linux</strong></summary>

- **Brave** — `~/.config/BraveSoftware/Brave-Browser/Default/Bookmarks`
- **Vivaldi** — `~/.config/vivaldi/Default/Bookmarks`
- **Opera** — `~/.config/opera/Bookmarks`
- **Edge** — `~/.config/microsoft-edge/Default/Bookmarks`
- **Chrome** — `~/.config/google-chrome/Default/Bookmarks`
- **Chromium** — `~/.config/chromium/Default/Bookmarks`

</details>

Или используйте вспомогательный скрипт для автоматического поиска:

```bash
python extract_bookmarks.py
```

### 2. Установите расширение

1. Скачайте или клонируйте этот репозиторий
2. Откройте **chrome://extensions/** в Chrome
3. Включите **Режим разработчика** (переключатель в правом верхнем углу)
4. Нажмите **"Загрузить распакованное расширение"** и выберите эту папку
5. Закрепите иконку расширения на панели инструментов

### 3. Замените закладки

1. Нажмите на иконку расширения на панели инструментов
2. Нажмите на кнопку нужного браузера — путь к файлу скопируется автоматически
3. В открывшемся окне вставьте путь в адресную строку (Ctrl+V) и выберите файл **Bookmarks**
4. Проверьте количество закладок и нажмите **"Заменить"**

Все текущие закладки Chrome будут удалены и заменены новыми. Если синхронизация включена, новые закладки автоматически загрузятся в ваш аккаунт Google.

## Как это работает

Расширение использует API [`chrome.bookmarks`](https://developer.chrome.com/docs/extensions/reference/api/bookmarks):

1. Удаляет все существующие закладки из Панели закладок и Других закладок
2. Воссоздаёт полную структуру папок и закладок из загруженного файла

Поскольку изменения проходят через официальный API (а не через подмену файлов), Chrome воспринимает их как обычные действия пользователя. Синхронизация Google подхватывает изменения и распространяет их на все устройства.

## Часто задаваемые вопросы

**Удалятся ли мои пароли или другие синхронизированные данные?**
Нет. Расширение работает только с закладками. Пароли, история, расширения и все остальные данные остаются нетронутыми.

**Работает ли с включённой синхронизацией Google?**
Да — именно для этого расширение и создано. Прямая подмена файла не работает при включённой синхронизации, а изменения через API синхронизируются корректно.

**Можно ли отменить замену?**
Нет. Замена необратима. Если нужна возможность откатиться — сохраните копию файла `Bookmarks` из Chrome перед заменой.

**Сохраняется ли структура папок?**
Да. Полная иерархия папок и закладок воссоздаётся в точности как в исходном браузере.

**Какие браузеры поддерживаются?**
Любой браузер на базе Chromium: Comet (Perplexity), Arc, Brave, Vivaldi, Opera, Opera GX, Microsoft Edge, Яндекс Браузер, Chromium и другие. Если браузер хранит закладки в стандартном JSON-формате Chromium, он будет работать.

## Автор

**Сергей Радзивиллович** — [prepod2003@yandex.ru](mailto:prepod2003@yandex.ru)

## Лицензия

[MIT](LICENSE)
