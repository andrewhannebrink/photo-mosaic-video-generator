//
//  Bot
//  class for performing various twitter actions
//
var fs = require('fs');
var utf8 = require('utf8');
var Twit = require('./node_modules/twit/lib/twitter');
var exec = require('child_process').exec;

var Bot = module.exports = function(config) { 
  this.twit = new Twit(config);
};

//
//  post a tweet
//
Bot.prototype.tweet = function (status, callback) {
  if(typeof status !== 'string') {
    return callback(new Error('tweet must be of type String'));
  } else if(status.length > 140) {
    return callback(new Error('tweet is too long: ' + status.length));
  }
  this.twit.post('statuses/update', { status: status }, callback);
};

Bot.prototype.search = function(term, date, callback) {
  if(typeof term !== 'string') {
    return callback(new Error('search term must be of type String'));
  }
  this.twit.get('search/tweets', {q: term + ' since:' + date, count: 100 }, function(err, data, response) {
    //randomTweet = randIndex(data)
    console.log(data);
    /*for (var i = 0; i < data.statuses.length; i++) {
      console.log(data.statuses[i]);
    }*/
  });
};

Bot.prototype.stream = function(term, callback) {
  if(typeof term !== 'string') {
    return callback(new Error('search term must be of type String'));
  }
  var stream = this.twit.stream('statuses/filter', { track: term });
  stream.on('tweet', function (tweet) {
    console.log(tweet);
    console.log('====================================================');
  });
};

Bot.prototype.picpost = function(text, pic, callback) {
  console.log(pic);
  var png = fs.readFileSync(pic, { encoding: 'base64'});
  var thisbot = this;
  thisbot.twit.post('media/upload', { media: png}, function (err, data, response) {
    var mediaIdStr = data.media_id_string;
    var paramas = { status: text, media_ids: [mediaIdStr] };
    thisbot.twit.post('statuses/update', paramas, function(err, data, response) {
      console.log('data: ' + data);
    });
  });
};

Bot.prototype.remoji = function (dir, scale, reso, inputPath) {
  var thisbot = this;
  var opName = 'test.png';
  var opPath = 'public/' + opName;
  var cmd = 'python remoji.py -s ' + inputPath + ' ' + dir + ' ' + opPath + ' ' + scale + ' ' + reso;
  console.log(cmd);
  var opExists = false;
  exec(cmd, function(error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    thisbot.picpost('i do it for @tiny_icon', './' + opPath, function(err, reply) {
      if (err) return handleError(err);
    });
  });
  
  /*while (opExists === false) {
    setInterval(function () {
      fs.exists('./' + opPath, function (exists) {
        if (exists === true) {
          opExists = true;
        } else {
          console.log(opPath + ' does not exist...');
        }
      });
    }, 3000);
  }
  console.log('finally, it exists');*/
};

Bot.prototype.randRemoji = function (dir, scale, reso) {
  var thisbot = this;
  var jsdir = './' + dir;
  fs.readdir(jsdir, function (err, files) {
    if (err) {
      throw err;
      return
    }
    else {
      var file = dir + '/' + randIndex(files);
      thisbot.remoji(dir, scale, reso, file);
    }
  });
};

function randIndex (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
};
