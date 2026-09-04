/**
 * Розробка.
 *
 * Свідомо localhost, а не жива адреса: інакше експерименти з правилами
 * й видаленням підуть у бойову базу школи. Підняти бекенд локально:
 *
 *     cd ..\pavlysh-school-api
 *     .venv\Scripts\python -m uvicorn app.main:app --reload
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
};
