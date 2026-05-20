const twilio = require('twilio');

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const FROM = process.env.TWILIO_PHONE_NUMBER;

async function sendSms(to, body) {
  if (!client || !FROM || !to) return;
  try {
    await client.messages.create({ from: FROM, to, body });
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

const STATUS_MESSAGES = {
  accepted:        (brewery) => `🍺 Beer Me: ${brewery} confirmed your order and is getting it ready!`,
  preparing:       (brewery) => `🍺 Beer Me: ${brewery} is now preparing your order.`,
  ready:           ()        => `📦 Beer Me: Your order is packed and waiting for your driver.`,
  driver_assigned: ()        => `🚗 Beer Me: A driver has been assigned to your order!`,
  en_route:        ()        => `🚗 Beer Me: Your driver is on the way — almost there!`,
  delivered:       ()        => `🎉 Beer Me: Delivered! Enjoy your beer. Cheers!`,
  failed_id:       ()        => `❌ Beer Me: Your order was returned — the ID check did not pass.`,
};

module.exports = { sendSms, STATUS_MESSAGES };
