import { fetchWalletAddress, sendSMS } from '../_utils.js';

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  let phone = request.query.phone.replace(/\D/g, '');

  if (!phone) {
    response.status(400).send({ error: 'phone number is required' });
  }

  if (typeof phone !== 'string') {
    response.status(400).send({ error: 'phone number must be a string' });
  }

  const address = await fetchWalletAddress(phone);

  if (!address) {
    response.status(400).send({ error: 'no address found for phone number' });
  }

  await sendSMS(phone, `Your wallet address is:`);
  await sendSMS(phone, `${address}`);

  response.status(200).json({});
}
