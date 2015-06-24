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
  this.replies = JSON.parse(fs.readFileSync('./replies.json', 'utf8'));
  console.log(this.replies);
};

// make childproc belong to bot to avoid memory leak
Bot.prototype.childProc;
//locks childProc for downloading photos and remojiing them so i can always use downloaded.png as a file name
Bot.prototype.spamLock = false;
Bot.prototype.givePicsLock = false;

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

Bot.prototype.givePics = function(callback) {
  var thisbot = this;
  var stream = this.twit.stream('statuses/filter', { track: '@tiny_peon' });
  stream.on('tweet', function(tweet) {
    if (thisbot.givePicsLock === true) {
      var status = '@' + tweet.user.screen_name + ' oops, something went wrong... try again';
      console.log('givePicsLock BLOCKED HERE ');
      thisbot.twit.post('statuses/update', { status: status }, function() {
        return;
      });
    } else {
      if (tweet.entities.hasOwnProperty('media') && tweet.user.screen_name !== 'tiny_peon') {
        if (tweet.entities.media.length === 1 && tweet.entities.media[0].type === 'photo') {
          thisbot.givePicsLock = true;
          console.log('givePicksLock now true');
          console.log('DOWNLOADING pic to GIVE BACK');
          var tempFile = 'givePic';
          var ranbin = randIndex([0, 1]);
          if (ranbin === 0) {
            var text = '@' + tweet.user.screen_name + ' ' + randIndex(thisbot.replies.tellToGive) +'\n\n'+ randIndex(thisbot.replies.kaomoji)+' [by @tiny_icon]';
          } else {
            var text = '@' + tweet.user.screen_name + ' ' + randIndex(thisbot.replies.tellToGive) +'\n\n[by @tiny_icon][vimeo.com/125338493]';
          }
          thisbot.DlPic(tweet.entities.media[0].media_url, tempFile, thisbot.convertRemojiTweet(tweet, tempFile, text));
          setTimeout(function() {
            thisbot.givePicsLock = false;
            setTimeout(function() {
              thisbot.spamLock = false;
            }, 60000);
          }, 12000);
        }
      }
    }
  });
};

Bot.prototype.emojiSpam = function(callback) {
  var thisbot = this;
  var stream = this.twit.stream('statuses/filter', { track: 'emoji' });
  stream.on('tweet', function (tweet) {
    if (thisbot.spamLock === false && thisbot.givePicsLock === false) {
      if (tweet.entities.hasOwnProperty('media')) {
        /*console.log(tweet.user.screen_name);
        console.log(tweet.text);
        console.log(tweet.entities.media);*/
        if (tweet.entities.media.length === 1 && tweet.entities.media[0].type === 'photo') {
         // if (tweet.user.followers_count >= 420 && tweet.user.followers_count < 5000) {
            console.log('spam lock now true');
            thisbot.spamLock = true;
            console.log('downloading pic');
            var tempFile = 'downloaded';
            var text = '@' + tweet.user.screen_name + ' ' + randIndex(thisbot.replies.tellToGive) + ' by @tiny_icon';
            thisbot.DlPic(tweet.entities.media[0].media_url, tempFile, thisbot.convertRemojiTweet(tweet, tempFile, text));
            //spamLock helps this bot from spamming too often
            setTimeout(function() {
              thisbot.spamLock = false;
              thisbot.givePicsLock = false;
              console.log('spamLock now false');
            }, 120000);
        }
        var debugProgStr = ((Math.random()<.5) ? '' : '=');
        console.log('======================================' + debugProgStr);
      }
    }
  });
};

Bot.prototype.DlPic = function(url, tempFile, callback) {
  var thisbot = this;
  var file = fs.createWriteStream('./public/'+tempFile+'.jpg');
  var request = http.get(url, function(response) {
    response.pipe(file);
  });
};

//function for replying to tweets with a remojified twitpic
Bot.prototype.convertRemojiTweet = function(tweet, tempFile, text) {
  var thisbot = this;
  setTimeout(function() {
    thisbot.childProc = exec('convert public/'+tempFile+'.jpg public/'+tempFile+'.png', function(error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      thisbot.remoji('emoji/', 1, 10, 'public/'+tempFile+'.png', text, tweet);
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
  if (this.givePicsLock === false) {
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
        //var text = wordScramble(randIndex(thisbot.emojiWiki)) + ' @tiny_icon';
        var text = '(✤❛⃘ͫ Ʉ̮ ❛⃘ͫ)';
        var tweet2Reply2 = null;
        thisbot.remoji(lilImgDir, scale, reso, file, text, tweet2Reply2);
      }
    });
  }
};

var wordScramble = function(emojiText) {
  var emojiText = emojiText.replace(/\sthe\s/g, randIndex([' his ', ' her ']));
  emojiText = emojiText.replace(/\sThe\s/g, randIndex([' His ', ' Her ']));
  emojiText = emojiText.replace(/\sand\s/g, ' but not ');
  return emojiText;
};

function randIndex (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
};

//
//  post a tweet
//
//Bot.prototype.tweet = function (status, callback) {
//  if(typeof status !== 'string') {
//    return callback(new Error('tweet must be of type String'));
//  } else if(status.length > 140) {
//    return callback(new Error('tweet is too long: ' + status.length));
//  }
//  this.twit.post('statuses/update', { status: status }, callback);
//};


//Bot.prototype.search = function(term, date, callback) {
//  if(typeof term !== 'string') {
//    return callback(new Error('search term must be of type String'));
//  }
//  this.twit.get('search/tweets', {q: term + ' since:' + date, count: 100 }, function(err, data, response) {
//    //randomTweet = randIndex(data)
//    console.log(data);
//    /*for (var i = 0; i < data.statuses.length; i++) {
//      console.log(data.statuses[i]);
//    }*/
//  });
//};
