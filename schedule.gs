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

/*
@params {channel: params.channel, timeStamps_key: TIMESTAMPS_KEY}
*/
function addReactions(params){
  //adding reactions: tier 3, 50 per min is allowed
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_API_TOKEN');
  const reaction_api_url = "https://slack.com/api/reactions.add";

  //retreive cache
  const TIMESTAMPS_KEY = params.timeStamps_key;
  const cache = CacheService.getScriptCache();
  var timeStamps = cache.get(TIMESTAMPS_KEY).split(",");//array スレッドの返信のすべてのタイムスタンプ

  // add reaction
  const reactions = ["o", "さんかく", "00"];

  while(timeStamps.length>0){
    var ts = timeStamps.shift(); //String
    if(!reactions.every( function (reaction) {
      //このcallback functionの処理の結果、trueが返ってくればreactions.everyは続行する。
      //functionがfalseを返すと、everyも即時にfalseを返す。

      var options = {
        "method" : "POST",
        "payload" : { 
            token : token,
            channel : params.channel,
            name : reaction,
            timestamp : ts
          }
      };
      var api_response = JSON.parse(UrlFetchApp.fetch(reaction_api_url, options).getContentText());
      Utilities.sleep(600);

      //エラー処理
      if(api_response['ok']){
        return true;
      }else{
        var error = api_response['error'];
        switch(error){
          case "ratelimited":
            var retryTime = api_response['Retry-After'];//seconds
            setAsync('addReactions', JSON.stringify({channel: params.channel, timeStamps_key: TIMESTAMPS_KEY}), retryTime * 1000)
            //timeStampをcacheに入れる
            timeStamps.unshift(ts);
            cache.put(TIMESTAMPS_KEY, timeStamps.join());
            return false;
          case "already_reacted":
            return true;
          default:
            console.log('An error occured in func addReactions(): ' + error);
            return false;
        }
      }
    })){
      //もしreactions.everyのcallback関数（78~108行目)がエラーで途中終了した場合、addReactionsはfalseを返す。
      return false;
    }
  }
  cache.remove(TIMESTAMPS_KEY);
  return true;
}

// params: {channel: String, times: String[], dates: String[], thread_ts: int }
// 実行時間問題(Slackのchat.postMessageは1秒に1回、GASのタイムアウト上限は6分)のため、再帰で非同期実行する
// GAS limitation: https://developers.google.com/apps-script/guides/services/quotas
var postScheduleRecursive = function(params){

  var date = ""; //日付の格納用  
  var timeStamps = [];//返答メッセージのtimestamp格納用
  const start = (new Date()).valueOf();
  const margin = 180000; // milliseconds
  const sleep = 1000; //milliseconds
  const TIMESTAMPS_KEY = String(params.thread_ts);
  var cache = CacheService.getScriptCache();

  log(JSON.stringify(params, indent=4) + "\nStart date: " + start);
  
  while((new Date()).valueOf() - start < margin) { // マージンギリギリまで
    if(date == undefined) {
      return;
    }
    date = params.dates.shift();//配列の最初の日付を取りだす（要素が1減る）
    if(params.times.length>0){
      params.times.every( function(time) {
          timeStamps.push(sendToSlack(params.channel, date + ' ' + time, params.thread_ts));
          Utilities.sleep(sleep);
          return true;
        });
    }else{
      timeStamps.push(sendToSlack(params.channel, date, params.thread_ts));
      Utilities.sleep(sleep);
    }
  }

  //スレッド内の返答メッセージのtimestampをcacheに保存
  var value = cache.get(TIMESTAMPS_KEY);
  if(value == null){
    cache.put(TIMESTAMPS_KEY, timeStamps.join());
  }else{
    cache.put(TIMESTAMPS_KEY, value + "," + timeStamps.join());
  }
  showCache();

  //マージン内でメッセージ送信が終わらなかった場合、トリガーを用いて再度発火する。
  if(params.date.length > 0) {
    setAsync('postScheduleRecursive', params, 500);
    return;
  }

  addReactions({channel: params.channel, timeStamps_key: TIMESTAMPS_KEY});
  showCache();
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

