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

  //console.log("func sendToSlack called")

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

  var api_response;
  try{
    api_response = UrlFetchApp.fetch(post_api_url, options);
  }catch(e){
    console.log("error: " + e);
    errorCheck(api_response, post_api_url, options);
  }
  var timestamp = JSON.parse(api_response.getContentText())['ts'];
  return timestamp;

}

function errorCheck(api_response, url, options){
  if(api_response['ok']){
    return true;
  }else{
    switch(api_response['error']){
      case "ratelimited":
      case "rate_limited":
        var retryTime = api_response['Retry-After'];//seconds
        console.log(api_response);
        Utilities.sleep(retryTime * 1000);
        var response = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
        return errorCheck(response, url, options);
      case "already_reacted":
        return true;
      default:
        console.log('An error occured in func addReactions(): ' + error);
        return false;
  }
}}
/*
@params ts: リアクションを付ける対象のメッセージ
*/
function addReactions(channel, ts){
  //adding reactions: tier 3, 50＋ per min is allowed
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const reaction_api_url = "https://slack.com/api/reactions.add";

  // add reaction
  const reactions = ["o", "さんかく", "00"];
  if(!reactions.every( function (reaction) {
    //このcallback functionの処理の結果、trueが返ってくればreactions.everyは続行する。
    //functionがfalseを返すと、everyも即時にfalseを返す。

    var options = {
      "method" : "POST",
      "payload" : { 
          token : token,
          channel : channel,
          name : reaction,
          timestamp : ts
        }
    };
    var api_response;
    //エラー処理
    try{
      api_response = JSON.parse(UrlFetchApp.fetch(reaction_api_url, options).getContentText());
      Utilities.sleep(50);
    }catch(e){
      console.log("error: " + e);
      return errorCheck(api_response, post_api_url, options);
    }
    return true;
  })){
    //もしreactions.everyのcallback関数（78~108行目)がエラーで途中終了した場合、addReactionsはfalseを返す。
    return false;
  }
  return true;
}

// params: {channel: String, times: String[], dates: String[], thread_ts: int }
// 実行時間問題(Slackのchat.postMessageは1秒に1回、GASのタイムアウト上限は6分)のため、再帰で非同期実行する
// GAS limitation: https://developers.google.com/apps-script/guides/services/quotas
var postScheduleRecursive = function(params){

  var date = params.dates.shift(); //日付の格納用  配列の最初の要素を取り出す
  var timeStamp = "";
  const start = (new Date()).valueOf();
  var current = (new Date()).valueOf();
  //const margin = 180000; // milliseconds(3 min)
  const margin = 30000;
  const sleep = 500; //milliseconds(0.5sec)

  log(JSON.stringify(params, indent=4) + "\nStart date: " + start);
  
  while(current - start < margin) { // マージンギリギリまで
    if(params.times.length>0){
      params.times.every( function(time) {
          timeStamp = sendToSlack(params.channel, date + ' ' + time, params.thread_ts);
          addReactions(params.channel, timeStamp);
          Utilities.sleep(sleep);
          return true;
        });
    }else{
      timeStamp = sendToSlack(params.channel, date, params.thread_ts);
      addReactions(params.channel, timeStamp);
      Utilities.sleep(sleep);
    }

    current = (new Date()).valueOf();
    console.log("latest timestamp: " + timeStamp + "\nCurrent time: " + current + "\nCurrent - start: " + (current - start));
    date = params.dates.shift();
    if(date == undefined){return;}
  }

  //マージン内でメッセージ送信が終わらなかった場合、トリガーを用いて再度発火する。
  if(params.dates.length > 0) {
    setAsync('postScheduleRecursive', params, 500);
    return;
  }
  console.log("postScheduleRecursive; exit");
  return;
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
  postScheduleRecursive(params);
}