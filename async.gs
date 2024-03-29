function setAsync(func_name, params, delay){

  console.log("setAsync called; go to google Drive for further log");

  if(delay == undefined) {
    delay = 300; // ms
  }

  const cache = CacheService.getScriptCache();
  ScriptApp.getProjectTriggers().every(function (trigger) { ScriptApp.deleteTrigger(trigger) }); //トリガーをすべて削除？
  
  cache.putAll({
    "func": func_name,
    "params": JSON.stringify(params)
    });

  log("setAsync called; cache[func] = " + cache.get('func') + " ; cache[params] = " + cache.get('params') + "; \n func = " + func_name + "; params = " + JSON.stringify(params));
  
  //トリガーを設定
  ScriptApp.newTrigger('popAsync').timeBased().after(delay).create();
  
  console.log("new trigger popAsysnc was created");
}

function popAsync() 
{
  const cache = CacheService.getScriptCache();
  const params = cache.get("params");
  const func = cache.get("func");

  console.log("popAsync() called; params=" + params + ", func=" + func);
  log("popAsync() called; params=" + params + ", func=" + func);
  
  if( func != null ) {
    //eval(func + '(JSON.parse(params));');
    this[func](JSON.parse(params));
  }
  
  cache.removeAll(["func", "params"]);
}

function showCache()
{
  const cache = CacheService.getScriptCache();
  const params = cache.get("params");
  const func = cache.get("func");
  
  Logger.log("func: " + func);
  Logger.log("params: " + params);
}