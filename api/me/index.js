/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default function handler(request, response) {
  response.status(200).json({
    body: '',
  });
}
