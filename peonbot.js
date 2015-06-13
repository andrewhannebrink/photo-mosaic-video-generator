//
//  Bot
//  class for performing various twitter actions
//
var fs = require('fs');
var http = require('http');
var utf8 = require('utf8');
var Twit = require('./node_modules/twit/lib/twitter');
var exec = require('child_process').exec;

var Bot = module.exports = function(config) { 
  this.twit = new Twit(config);
  this.emojiWiki = fs.readFileSync('./public/emojiWiki.txt', 'utf8');
  this.emojiWiki = modifyEmojiWiki(this.emojiWiki)
};

// make childproc belong to bot to avoid memory leak
Bot.prototype.childProc;
//locks childProc for downloading photos and remojiing them so i can always use downloaded.png as a file name
Bot.prototype.spamLock = false;
Bot.prototype.givePicLock = false;

var modifyEmojiWiki = function(emojiText) {
  var regex = /\./gi, result, indices = [];
  while ( (result = regex.exec(emojiText)) ) {
    indices.push(result.index);
  };
  var sentences = [];
  for (var i = 0; i < indices.length - 1; i++) {
    var distance = indices[i+1] - indices[i];
    if (distance > 100) {
      var sentence = emojiText.substring(indices[i] + 1, indices[i] + 100)
    } else {
      var sentence = emojiText.substring(indices[i] + 1, indices[i] + distance);
    }
    sentences.push(sentence);
  }
  /*console.log(sentences);
  for (var i = 0; i < sentences.length; i++) {
    console.log(sentences[i].length);
  };*/
  return sentences;
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

Bot.prototype.emojiSpam = function(callback) {
  var thisbot = this;
  var stream = this.twit.stream('statuses/filter', { track: 'emoji' });
  stream.on('tweet', function (tweet) {
    if (tweet.entities.hasOwnProperty('media')) {
      /*console.log(tweet.user.screen_name);
      console.log(tweet.text);
      console.log(tweet.entities.media);*/
      if (tweet.entities.media.length === 1 && tweet.entities.media[0].type === 'photo') {
       // if (tweet.user.followers_count >= 420 && tweet.user.followers_count < 5000) {
          if (thisbot.spamLock === false) {
            console.log('spam lock now true');
            thisbot.spamLock = true;
            //var screen_name = tweet.user.screen_name;
            console.log('downloading pic');
            thisbot.DlPic(tweet.entities.media[0].media_url, thisbot.convertRemojiTweet(tweet));
            //spamLock helps this bot from spamming too often
            setTimeout(function() {
              thisbot.spamLock = false;
              console.log('spamLock now false');
            }, 195000);
          }
        //}
      var debugProgStr = ((Math.random()<.5) ? '' : '=');
      console.log('======================================' + debugProgStr);
      }
    }
  });
};

Bot.prototype.DlPic = function(url, callback) {
  var thisbot = this;
  var file = fs.createWriteStream('./public/downloaded.jpg');
  var request = http.get(url, function(response) {
    response.pipe(file);
  });
};

//function for replying to tweets with a remojified twitpic
Bot.prototype.convertRemojiTweet = function(tweet) {
  var thisbot = this;
  var text = '@' + tweet.user.screen_name + ' what about emojis? https://vimeo.com/125338493 @tiny_icon';
  setTimeout(function() {
    thisbot.childProc = exec('convert public/downloaded.jpg public/downloaded.png', function(error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      thisbot.remoji('emoji/', 1, 8, 'public/downloaded.png', text, tweet);
    });
  }, 5000);
};

Bot.prototype.picpost = function(text, pic, tweet2Reply2, callback) {
  console.log(pic);
  var png = fs.readFileSync(pic, { encoding: 'base64'});
  var thisbot = this;
  thisbot.twit.post('media/upload', { media: png}, function (err, data, response) {
    var mediaIdStr = data.media_id_string;
    var paramas = { status: text, media_ids: [mediaIdStr] };
    if (tweet2Reply2 !== null) {
      paramas.in_reply_to_status_id = tweet2Reply2.id;
      console.log('in_reply_to_status_id: ' + paramas.in_reply_to_status_id);
    } else {
       console.log('not in replay to a tweet');
    }
    thisbot.twit.post('statuses/update', paramas, function(err, data, response) {
      if (err) {
        console.log(err);
      }
      console.log('data: ' + data);
    });
  });
};

Bot.prototype.remoji = function (dir, scale, reso, inputPath, text, tweet2Reply2) {
  var thisbot = this;
  var opName = 'test.png';
  var opPath = 'public/' + opName;
  var cmd = 'python remoji.py -s ' + inputPath + ' ' + dir + ' ' + opPath + ' ' + scale + ' ' + reso;
  console.log(cmd);
  var opExists = false;
  this.childProc = exec(cmd, function(error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    thisbot.picpost(text, './' + opPath, tweet2Reply2, function(err, reply) {
      if (err) return handleError(err);
    });
  });
};

Bot.prototype.randRemoji = function () {
  var possDirs = ['emoji/', 'win/'];
  var bigImgDir = randIndex(possDirs);
  var lilImgDir = randIndex(possDirs);
  var scale = 15;
  var reso = Math.floor(Math.random() * (40 - 7) + 7); 
  var thisbot = this;
  var jsdir = './' + bigImgDir;
  fs.readdir(jsdir, function (err, files) {
    if (err) {
      throw err;
      return
    }
    else {
      var file = bigImgDir + randIndex(files);
      var text = wordScramble(randIndex(thisbot.emojiWiki)) + ' @tiny_icon';
      var tweet2Reply2 = null;
      thisbot.remoji(lilImgDir, scale, reso, file, text, tweet2Reply2);
    }
  });
};

var wordScramble = function(emojiText) {
  var emojiText = emojiText.replace(/\sthe\s/g, randIndex([' his ', ' her ']));
  emojiText = emojiText.replace(/\sThe\s/g, randIndex([' His ', ' Her ']));
  emojiText = emojiText.replace(/\sand\s/g, 'but not');
  return emojiText;
};

function randIndex (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
};
