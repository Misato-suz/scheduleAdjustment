
//ドライブにログを保存
//@params content 保存内容　String
function log(content)
{
  const ts = Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd-HH-mm-ss");
  DriveApp.getFolderById("1V530cNlGgwSbIr84p2zTtMZlIcb2ldb1").createFile(ts + ".log", content);
}

function sendModal(trigger_id)
{
  const api_token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const oauth_token = PropertiesService.getScriptProperties().getProperty('SLACK_OAUTH_TOKEN');
  const dialog_api_url = "https://slack.com/api/views.open";

  const payload = {
    token: api_token,
    trigger_id: trigger_id,
    view: getView()
  };
  
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": "Bearer " + oauth_token
  };
  
  const option = {
    "method": "POST",
    "headers": headers,
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  var res = UrlFetchApp.fetch(dialog_api_url, option);
  
  return res.getContentText();
}

function updateModal()
{
  const api_token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const oauth_token = PropertiesService.getScriptProperties().getProperty('SLACK_OAUTH_TOKEN');
  const dialog_api_url = "https://slack.com/api/views.update";

  const payload = {
    token: api_token,
    trigger_id: trigger_id,
    view: getView()
  };
  
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": "Bearer " + oauth_token
  };
  
  const option = {
    "method": "POST",
    "headers": headers,
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  var res = UrlFetchApp.fetch(dialog_api_url, option);
  
  return res.getContentText();
}


function doPost(e)
{
  if (e.parameter.command === "/adjust") {
  
    // Slash CommandのPOSTを受けたとき
    CacheService.getScriptCache().put("channel", e.parameter.channel_id, 3600 * 6);//チャンネル名をキャッシュに投入、6時間(システム上のmax)
    //trigger id expires in 3 sec. Can only be used once. Is neccessary to open modal.
    sendModal(e.parameter.trigger_id);
    joinChannel(e.parameter.channel_id);
    return ContentService.createTextOutput("入力後、少しすると投稿されます");
    
  } else {
    
    const payload = JSON.parse(e.parameter.payload);
    
    switch(payload.type) {
      case "view_submission":        //modalが送信された時(調整するボタンを押したとき)
        /*
        ちなみにcloseボタンはmodalのほうでデフォルトで存在する
        view_closedを受けた時の動作もデフォルトで存在するので記述の必要はない
        オプションで付けることもできる
        参考：https://api.slack.com/reference/interaction-payloads/views#view_closed
        */

        var values = payload.view.state.values;

        var times = [];         //ユーザーが入力した時刻を配列に入れたもの
        //ユーザーが入力した時刻1，2，3,　... を取得する。
        for(var n=1; values["block_time_" + n] != null; ++n) {
          if(values["block_time_" + n]["time_" + n].value != "") {
            times.push(values["block_time_" + n]["time_" + n].value);
          }
        }

        //start_date: ユーザーが入力した開始日
        //end_date: ユーザーが入力した最終日
        const start_date = values.block_date_1.date_1.selected_date;
        const end_date = values.block_date_2.date_2.selected_date;
        
        //slackの日程調整スレッドに書く用のやつ、使いまわさない
        var candidate = start_date + ' ~ ' + end_date + '\n\n';
        if(times != undefined) {
          candidate += times.join('\n');
        }
        
        //sendToSlackの戻り値はthread_ts
        //ここでは親スレッド（つまり今送ったやつ）のタイムスタンプが返ってくる（はず）
        //第二引数の中身、titleは「総務部会」「人事会議」などのタイトル（ユーザー入力）
        // todo: ts: (newDate()).valueof()は必要か？
        const ts = sendToSlack(CacheService.getScriptCache().get("channel"),
          {
            "text": "スレッドで日程調整に答えて下さい。",
            "attachments": JSON.stringify([
              {
                "fallback": "日程調整",
                "color": "#e6378e",
                "fields": [
                  {
                    "title": values.block_title.title.value,
                    "value": candidate
                  }
                ],
                "footer": "Komasho App",
                "footer_icon": "https://i.imgur.com/57ZXIcT.png",
                "ts": (new Date()).valueOf()  
              }
            ])
          });
              
        var params = {
          channel: CacheService.getScriptCache().get("channel"),
          thread_ts: ts,
          start_date: start_date,
          end_date: end_date,
          times: times,
        };
        console.log(params);
        setAsync('sendScheduleAdjustment', params, 2000);
        return ContentService.createTextOutput();
        
      case "block_actions":
        //add ボタンをおしたときの動作
        //Todo
        //setAsync('updateModal');
        return ContentService.createTextOutput();
        
      default:
        log("test: \n" + JSON.stringify(e, indent=4));
        return ContentService.createTextOutput();
    }
  }
  
  return ContentService.createTextOutput("wtf");
}