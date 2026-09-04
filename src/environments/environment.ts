/**
 * Робоче середовище (production).
 *
 * Тут не має бути жодних секретів: усе, що потрапляє в бандл, віддається
 * браузеру й читається з main.js. Ключі API — ніколи, навіть «тимчасово».
 * В адмінку заходять логіном, токен живе в пам'яті вкладки.
 */
export const environment = {
  production: true,
  apiUrl: 'https://pavlysh-school-api-cte7btdcazhcahg3.northeurope-01.azurewebsites.net',
};
