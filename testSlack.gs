var slacktest = function(body)
{
  var ts = sendToSlack('C59FMTTV4', body);
  console.log(ts);
}

function hogeAsync()
{
  //setAsync('slacktest', 'hogehoge');
  this.slacktest("hogehoge");
}

function test()
{
  sendScheduleAdjustment({
    title: "hoge",
    start_date: "2020-01-01",
    end_date: "2020-01-02",
    times: ["hoge", "", "fuga", ""],
    thread_ts:"1646989967.937419",//3/11
    channel: "C59FMTTV4"
  });
}

function test_rec()
{
  var date_1 = new Date();
  var date_2 = new Date();
  date_1.setHours(0, 0, 0);
  date_2.setDate(30);
  
  var candidate = "12/01 ~ 12/10 \n\n";
  candidate += ["12:00", "13:00", "14:00"].join('\n');
  
  var params = {
    channel: "C59FMTTV4", //sandbox
    times: ["12:00", "13:00", "14:00"].filter(function (time) {return time != "";} ),
    dates: []
  };
  
  for (var date = date_1; date <= date_2; date.setDate(date.getDate() + 1)) {
    params.dates.push(Utilities.formatDate(date,"JST","yyyy/MM/dd (E)"));
  }
  
  setAsync('postScheduleRecursive', params);
}

function test_join()
{
  joinChannel("C59FMTTV4");//sandbox
}
