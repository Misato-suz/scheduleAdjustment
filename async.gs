function setAsync(func_name, params, delay){

  console.log("setAsync called; go to google Drive for further log");

  if(delay == undefined) {
    delay = 300; // ms
  }

  const cache = CacheService.getScriptCache();
  ScriptApp.getProjectTriggers().every(function (trigger) { ScriptApp.deleteTrigger(trigger) }); //トリガーをすべて削除
  
  cache.putAll({
    "func": func_name,
    "params": JSON.stringify(params)
    });

  log("setAsync() called; cache[func] = " + cache.get('func') + " ; cache[params] = " + cache.get('params') + "; \n func = " + func_name + "; params = " + JSON.stringify(params));
  
  //トリガーを設定
  ScriptApp.newTrigger('popAsync').timeBased().after(delay).create();
  
  console.log("new trigger popAsysnc was created");
}

function popAsync() {
  const cache = CacheService.getScriptCache();
  const params = cache.get("params");
  const func = cache.get("func");

  console.log("popAsync() called; params=" + params + ", func=" + func);
  log("popAsync() called; params=" + params + ", func=" + func);
  
  if( func != null ) {
    //eval(func + '(JSON.parse(params));');
    this[func](JSON.parse(params));
  }
  
  //cache.removeAll(["func", "params"]);　これやるとうまく動かないよ
}

function showCache(){
  const cache = CacheService.getScriptCache();
  const channel = cache.get("channel");
  const params = cache.get("params");
  const func = cache.get("func");
  const timeStamps = cache.get("timeStamps");
  
  Logger.log("func: " + func);
  Logger.log("params: " + params);
  Logger.log("channel: " + channel);
  Logger.log("timeStamps: " + timeStamps);
}

function fireAddReactions(event){
  //トリガーのidに基づいて、保存した引数を取り出す
  var scriptProperties = PropertiesService.getScriptProperties();
  var triggerData = JSON.parse(scriptProperties.getProperty(event.triggerUid));

  addReactions(triggerData[CHANNEL_KEY], triggerData[PARENT_TS_KEY]);

  deleteTriggerByUid(event.triggerUid);
}

function deleteTriggerByUid(triggerUid) {
  if (!ScriptApp.getProjectTriggers().some(function (trigger) {
    if (trigger.getUniqueId() === triggerUid) {
      ScriptApp.deleteTrigger(trigger);
      return true;
    }

    return false;
  })) {
    console.error("id '%s' のトリガーが見つかりませんでした。", triggerUid);
  }
  PropertiesService.getScriptProperties().deleteProperty(triggerUid);
}