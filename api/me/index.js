import { fetchWalletAddress, sendSMS, validateAddress, validatePhoneNumber } from '../_utils.js';

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  let phone = request.query.phone.replace(/\D/g, '');
  validatePhoneNumber(phone, response);

  const address = await fetchWalletAddress(phone);
  validateAddress(address, response);

  await sendSMS(phone, `Your wallet address is: \n\n${address}`);

  response.status(200).json({});
}
