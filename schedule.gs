function joinChannel(channel) {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const join_api_url = "https://slack.com/api/conversations.join";
 
  // send message
  var options = {
    "method" : "POST",
    "payload" : { 
        token: token,
        channel: channel
    }
  };
  
  var api_response = UrlFetchApp.fetch(join_api_url, options);
}


function sendToSlack(channel, body, thread_ts) {

  console.log("func sendToSlack called")

  const token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const post_api_url = "https://slack.com/api/chat.postMessage";
 
  // send message
  var options = {
    "method" : "POST",
    "payload" : { 
        token: token,
        channel: channel,
        username: "Adjustman"
      }
  };
  
  if(body.attachments != undefined) {
    options.payload.attachments = body.attachments;
    options.payload.text = body.text;
  } else {
    options.payload.text = body;
  }
  
  // 合ってる?
  if(thread_ts != undefined) {
    //put parent message timestamp, if it exists
    options.payload['thread_ts'] = thread_ts;
  }
  
  var api_response = UrlFetchApp.fetch(post_api_url, options);
  var timestamp = JSON.parse(api_response.getContentText())['ts'];
  
  console.log("func sendToSlack; return timestamp: " + timestamp);
  
  return timestamp;
}


function addReactions(channel, ts)
{
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const reaction_api_url = "https://slack.com/api/reactions.add";

  // add reaction
  const reactions = ["o", "さんかく", "00"];
  
  reactions.every( function (reaction) {
    var options = {
      "method" : "POST",
      "payload" : { 
          token : token,
          channel : channel,
          name : reaction,
          timestamp : ts
        }
    };
    UrlFetchApp.fetch(reaction_api_url, options);
    return true;
  });
}

// params: {channel: String, times: String[], date: String[], thread_ts: int }
// 実行時間問題(Slackのchat.postMessageは1秒に1回、GASのタイムアウト上限は6分)のため、再帰で非同期実行する
// GAS limitation: https://developers.google.com/apps-script/guides/services/quotas
var postScheduleRecursive = function(params)
{

  const start = (new Date()).valueOf();
  const margin = 10000; // milliseconds?

  log(JSON.stringify(params, indent=4) + "\nStart date: " + start);
  
  while((new Date()).valueOf() - start < margin) { // マージンギリギリまで
    var date = params.dates.shift();//最初の日付を取得
    if(date == undefined) {
      return;
    }
    if(params.times.length>0){
      params.times.every( function(time) {
          var ts = sendToSlack(params.channel, date + ' ' + time, params.thread_ts);
          addReactions(params.channel, ts);
          return true;
        });
    }else{
      var ts = sendToSlack(params.channel, date, params.thread_ts);
      addReactions(params.channel, ts);
    }
  }
  
  if(params.date.length > 0) {
    setAsync('postScheduleRecursive', params, 500);
  }
}

// params: { title: String, start_date: String, end_date: String, times: String[], channel: Id }
var sendScheduleAdjustment = function (params)
{
  console.log("sendScheduleAdjustment called");
  var date_1 = new Date(params.start_date);
  var date_2 = new Date(params.end_date);
  date_1.setHours(0, 0, 0);
  
  var params = {
    channel: params.channel,
    times: params.times.filter(function (time) {return time != "";} ),
    thread_ts: params.thread_ts,
    dates: []
  };
  
  //paramsのdatesにすべての日付（開始日から終了日まで）を追加
  for (var date = date_1; date <= date_2; date.setDate(date.getDate() + 1)) {
    params.dates.push(Utilities.formatDate(date,"JST","yyyy/MM/dd (E)"));
  }

  //駒小ドライブにログを保存
  //admin>syslog>schedule_adjustment
  log("@sendScheduleAdjustment; setAsync postScheduleRecursive" + JSON.stringify(params, indent=4));
  //setAsync('postScheduleRecursive', params, 500);
  postScheduleRecursive(params);
}

