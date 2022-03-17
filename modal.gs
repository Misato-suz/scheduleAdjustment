
// Modal can be created on (https://api.slack.com/tools/block-kit-builder).
function getView() {
  const today = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd");
  return {
      "type": "modal",
      "title": {
          "type": "plain_text",
          "text": "日程調整",
          "emoji": true
      },
      "submit": {
          "type": "plain_text",
          "text": "調整する",
          "emoji": true
      },
      "close": {
          "type": "plain_text",
          "text": "キャンセル",
          "emoji": true
      },
      "blocks": [
          {
              "block_id": "block_title",
              "type": "input",
              "element": {
                  "action_id": "title",
                  "type": "plain_text_input",
                  "placeholder": {
                      "type": "plain_text",
                      "text": "(例): 総務部会",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "イベント名 :man_dancing:",
                  "emoji": true
              }
          },
          {
              "block_id": "block_date_1",
              "type": "input",
              "element": {
                  "action_id": "date_1",
                  "type": "datepicker",
                  "initial_date": today,
                  "placeholder": {
                      "type": "plain_text",
                      "text": "Select a date",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "開始日",
                  "emoji": true
              }
          },
          {
              "block_id": "block_date_2",
              "type": "input",
              "element": {
                  "action_id": "date_2",
                  "type": "datepicker",
                  "initial_date": today,
                  "placeholder": {
                      "type": "plain_text",
                      "text": "Select a date",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "最終日",
                  "emoji": true
              }
          },
          {
              "block_id": "block_time_1",
              "type": "input",
              "optional": true,
              "element": {
                  "action_id": "time_1",
                  "type": "plain_text_input",
                  "placeholder": {
                      "type": "plain_text",
                      "text": "空白にすると日付だけの調整になります",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "時刻1",
                  "emoji": true
              }
          },
          {
              "block_id": "block_time_2",
              "type": "input",
              "optional": true,
              "element": {
                  "action_id": "time_2",
                  "type": "plain_text_input",
                  "placeholder": {
                      "type": "plain_text",
                      "text": "(例) 12:00 ~",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "時刻2",
                  "emoji": true
              }
          },
          {
              "block_id": "block_time_3",
              "type": "input",
              "optional": true,
              "element": {
                  "action_id": "time_3",
                  "type": "plain_text_input",
                  "placeholder": {
                      "type": "plain_text",
                      "text": "(例) 午後",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "時刻3",
                  "emoji": true
              }
          },
          {
              "block_id": "block_append",
              "type": "section",
              "text": {
                  "type": "mrkdwn",
                  "text": "項目を追加できます。"
              },
              "accessory": {
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "text": "add",
                      "emoji": true
                  },
                  "value": "hoge"
              }
		}
      ]
  };
}

function addField(view)
{
  return view;
}

function block(type, num){
  switch (type){
    case "block_append":
      return  {
              "block_id": "block_append",
              "type": "section",
              "text": {
                  "type": "mrkdwn",
                  "text": "項目を追加できます。"
              },
              "accessory": {
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "text": "add",
                      "emoji": true
                  },
                  "value": "hoge"
              }
		};
    case "time":
      return  {
              "block_id": "block_time_" + num,
              "type": "input",
              "optional": true,
              "element": {
                  "action_id": "time_" + num,
                  "type": "plain_text_input",
                  "placeholder": {
                      "type": "plain_text",
                      "text": "(例) 午後",
                      "emoji": true
                  }
              },
              "label": {
                  "type": "plain_text",
                  "text": "時刻" + num,
                  "emoji": true
              }
          }
    default: 
      return getView();
  }
}

function addTimeBlock(num){
  var view = getView();
  console.log(view.blocks.length)

  var number;
  if(num == undefined){
    number = view.blocks.length - 3;
  }else{number = num}
  console.log("number is " + number)

  view.blocks.pop();
  view.blocks.push(block("time",number))
  view.blocks.push(block("block_append"));
  console.log(view.blocks);

  return view;
}

function viewTest(){
  for(var i = 0; i < 5; i ++){
    updateView();
  }
  return;
}