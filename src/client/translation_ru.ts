export const t = (eng: string): string => {
    const translations: Record<string, string> = {
        'Spectators': 'Наблюдают',
        'Enter': 'Войти',
        'Not enough players (minimum 3)': 'Слишком мало игроков (минимум 3)',
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
        'Not ready': 'Не готов',
        'player time': 'Время на подсказку',
        'team time': 'Время на удаление дублей',
        'master time': 'Время на отгадывание',
        'reveal time': 'Время на лайк',
        'words level': 'Уровень слов',
        'goal': 'Очки для победы',
        'empty': 'Пусто'
    };
    if (translations.hasOwnProperty(eng)) {
        return translations[eng];
    } else {
        return eng;
    }
}