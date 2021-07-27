const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const client = twilio(config.twilio.accountSid, config.twilio.authToken);

const app = new express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.post('/token/:identity', (request, response) => {
  const identity = request.params.identity;
  const accessToken = twilio.jwt.AccessToken;
  const ChatGrant = accessToken.ChatGrant;
  const token = new accessToken(config.twilio.accountSid, config.twilio.apiKey, config.twilio.apiSecret);
  const chatGrant = new ChatGrant({
    serviceSid: config.twilio.chatServiceSid,
  });
  token.addGrant(chatGrant);
  token.identity = identity;
  response.set('Content-Type', 'application/json');
  response.send(JSON.stringify({
    token: token.toJwt(),
    identity: identity
  }));
})

app.post('/conversations', async (req, res) => {
  res.send(await createConversations(req.body.friendlyName));
});

app.post('/participants', async (req, res) => {
  res.send(await participantsConversations(req.body.conversationSid, req.body.identity));
});

app.listen(config.port, () => {
  console.log(`Application started at localhost:${config.port}`);
});

// ============================================
// ============================================
// ====== HANDLE NEW-CONVERSATION HOOK ========
// ============================================
// ============================================

app.post('/chat', (req, res) => {
  console.log("Received a webhook:", req.body);
  if (req.body.EventType === 'onConversationAdded') {
    const me = "Tackleton";
    client.conversations.v1.conversations(req.body.ConversationSid)
      .participants
      .create({
        identity: me
      })
      .then(participant => console.log(`Added ${participant.identity} to ${req.body.ConversationSid}.`))
      .catch(err => console.error(`Failed to add a member to ${req.body.ConversationSid}!`, err));
  }

  console.log("(200 OK!)");
  res.sendStatus(200);
});

app.post('/outbound-status', (req, res) => {
  console.log(`Message ${req.body.SmsSid} to ${req.body.To} is ${req.body.MessageStatus}`);
  res.sendStatus(200);
})

function createConversations(friendlyName) {
  return client.conversations.conversations
    .create({ friendlyName });
}

function participantsConversations(conversationSid, identity) {
  return client.conversations.conversations(conversationSid)
    .participants
    .create({ identity })
}