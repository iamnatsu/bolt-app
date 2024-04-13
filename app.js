const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // ソケットモードではポートをリッスンしませんが、アプリを OAuth フローに対応させる場合、
  // 何らかのポートをリッスンする必要があります
  port: process.env.PORT || 3000
});

// "hello" を含むメッセージをリッスンします
app.message('hello', async ({ message, say }) => {
  // イベントがトリガーされたチャンネルに say() でメッセージを送信します
  await say(`Hey there <@${message.user}>!`);
});

app.event("app_mention", async ({ event, client, say }) => {
    await say(`Hey!`);
});

// この echo コマンドは ただ、その引数を（やまびこのように）おうむ返しする
app.command('/echo', async ({ command, ack, respond }) => {
    // コマンドリクエストを確認
    await ack();
  
    await respond(`${command.text}`);
});

// コマンド起動をリッスン
app.command('/ticket', async ({ command, ack, body, client, logger }) => {
    // コマンドのリクエストを確認
    await ack();

    console.dir(command.channel_id)
    try {
      const result = await client.views.open({
        // 適切な trigger_id を受け取ってから 3 秒以内に渡す
        trigger_id: body.trigger_id,
        // view の値をペイロードに含む
        view: {
          type: 'modal',
          // callback_id が view を特定するための識別子
          callback_id: 'view_1',
          private_metadata: command.channel_id, 
          title: {
            type: 'plain_text',
            text: 'Modal title'
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Welcome to a modal with _blocks_'
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Click me!'
                },
                action_id: 'button_abc'
              }
            },
            {
              type: 'input',
              block_id: 'input_c',
              label: {
                type: 'plain_text',
                text: 'What are your hopes and dreams?'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'dreamy_input',
                multiline: true
              }
            }
          ],
          submit: {
            type: 'plain_text',
            text: 'Submit'
          }
        }
      });
      logger.info(result);
    }
    catch (error) {
      logger.error(error);
    }
});

// モーダルでのデータ送信リクエストを処理します
app.view('view_1', async ({ ack, context, body, view, client, logger, say }) => {
    // モーダルでのデータ送信リクエストを確認
    await ack();

    const channelId = view.private_metadata;

    console.log('#####')
    console.log(channelId)

    // 入力値を使ってやりたいことをここで実装 - ここでは DB に保存して送信内容の確認を送っている
  
    // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
    const val = view['state']['values']['input_c']['dreamy_input'];
    const user = body['user']['id'];
  
    // ユーザーに対して送信するメッセージ
    let msg = val;
    // DB に保存
    // const results = await db.set(user.input, val);
  
    // if (results) {
    //   // DB への保存が成功
    //   msg = 'Your submission was successful';
    // } else {
    //   msg = 'There was an error with your submission';
    // }
  
    // ユーザーにメッセージを送信
    try {
      await client.chat.postMessage({
        channel: channelId,
        text: msg,
        blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": `Message from <@${user}>: ${body.user.name}`
              },
            },
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": val.value
              },
            },
            {
                "type": "actions",
                "elements": [
                  {
                    "type": "button",
                    "text": {
                      "type": "plain_text",
                      "text": "Approve"
                    },
                    "action_id": "button_click"
                  }
                ]
            }
          ]
      });
    }
    catch (error) {
      logger.error(error);
    }
  
  });

app.action("button_click", async ({ ack, body, client }) => {
await ack();

const result = await client.chat.update({
    channel: body.channel.id,
    ts: body.message.ts,
    text: "Approved: " + body.message.text,
    blocks: body.message.blocks
});

console.log(result);
});

(async () => {
  // アプリを起動します
  await app.start();

  console.log('⚡️ Bolt app is running!');
})();
