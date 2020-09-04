window.t = (eng) => {
    const translations = {
        'Spectators': 'Наблюдают',
        'Enter': 'Войти',
        'Not enough players': 'Слишком мало игроков',
        'Host can start game': 'Хост может начать игру',
        'Wait for players to write their hints': 'Подождите, пока игроки напишут подсказки',
        'Write your hint': 'Напишите подсказку',
        'Wait for players to delete duplicates': 'Подождите, пока игроки удалят однокоренные слова',
        'Delete duplicates': 'Удалите однокоренные слова',
        'Now try guess the original word': 'Теперь попробуйте угадать исходное слово',
        'Now ': 'Теперь ',
        ' should guess original word': ' должен угадать исходное слово',
        'Next round': 'Следующий раунд',
        'The winner is': 'Победил',
        'Ready': 'Готов',
        'Not ready': 'Не готов'
    };
    if (translations.hasOwnProperty(eng)) {
        return translations[eng];
    } else {
        return eng;
    }
}