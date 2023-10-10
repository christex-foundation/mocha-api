import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

/**
 * @description send SMS message
 * @param {string} phone
 */
export async function sendSMS(phone, body) {
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await twilioClient.messages.create({
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: phone,
  });
}

/**
 * @description fetch wallet address associated with phone number
 * @param {string} phone
 */
export async function fetchWalletAddress(phone) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  let { data: users, error } = await supabase.from('users').select('address').eq('phone', phone);

  return users[0]?.address;
}

export function validatePhoneNumber(phone, response) {
  if (!phone) {
    response.status(400).send({ error: 'phone number is required' });
  }

  if (typeof phone !== 'string') {
    response.status(400).send({ error: 'phone number must be a string' });
  }
}

export function validateAddress(address, response) {
  if (!address) {
    response.status(400).send({ error: 'no address found for phone number' });
  }
}
