<?php
// Пример конфигурации. Скопируйте в config.php и положите НА УРОВЕНЬ ВЫШЕ public_html.
// config.php в репозиторий не коммитить.
return [
    'telegram' => [
        'bot_token' => 'TODO',     // токен бота от @BotFather
        'chat_id'   => 'TODO',     // id чата/группы, куда приходят заявки
    ],
    'smtp' => [
        'host'     => 'smtp.yandex.ru',
        'port'     => 465,
        'secure'   => 'ssl',
        'user'     => 'TODO@yandex.ru',
        'password' => 'TODO',      // пароль приложения Яндекса
        'from'     => 'TODO@yandex.ru',
        'to'       => 'ray@mail.ru',
    ],
    'captcha' => [
        'server_key' => 'TODO',    // Яндекс SmartCaptcha
    ],
    'rate_limit' => [ 'max' => 3, 'window_sec' => 600 ],
    'mysql' => null,               // опционально: ['dsn'=>'mysql:host=localhost;dbname=...;charset=utf8mb4','user'=>'','pass'=>'']
];
