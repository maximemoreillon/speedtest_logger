const speedTest = require('speedtest-net');
const mongodb = require('mongodb');
const schedule = require ('node-schedule');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

var MongoClient = mongodb.MongoClient;
var app = express();
var http_server = http.Server(app);

// Config
var APP_PORT = 8097;

var DB_config = {
  DB_URL: "mongodb://localhost:27017/",
  DB_name: "speedtest",
  collection_name: "speedtest"
}

// Express configuration
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Express routes
app.get('/', function(req, res) {
  MongoClient.connect(DB_config.DB_URL, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db(DB_config.DB_name);
    dbo.collection(DB_config.collection_name).find({}).toArray(function(err, find_result){
      if (err) throw err;
      db.close();
      res.render('index',{data:find_result});
    });
  });
});


// Scrape periodically
schedule.scheduleJob('0/30 * * * *', () => {
  console.log("[Speedtest] Running speedtest...")
  var test = speedTest({maxTime: 5000});

  //callback for speedtest
  test.on('data', data => {
    console.log(`[Speedtest] Download: ${data.speeds.download}, upload: ${data.speeds.upload}`)
    MongoClient.connect(DB_config.DB_URL,{ useNewUrlParser: true }, function(err, db) {
      if (err) throw err;
      var dbo = db.db(DB_config.DB_name);
      var myobj = { date: new Date(), download: data.speeds.download, upload: data.speeds.upload };
      dbo.collection(DB_config.collection_name).insertOne(myobj, function(err, res) {
        if (err) throw err;
        console.log("[MongoDB] 1 document inserted");
        db.close();
      });
    });
  });

  test.on('error', err => {
    console.error(err);
  });
});



// Start server
http_server.listen(APP_PORT, function(){
  console.log(`[HTTP] listening on *:${APP_PORT}`);
});
