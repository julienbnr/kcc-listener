const { Webhook } = require('discord-webhook-node');
const hook = new Webhook("https://discord.com/api/webhooks/865526439512113182/Ox4EVge3IQ0IEkIl-OefbLk-TujPtR6C7-N_412lpctImR9od-ntN44US4hCimfG7h6K");

const sendWebhook = async (msg) => {
  hook.send(msg);
};

exports.sendWebhook = sendWebhook;

