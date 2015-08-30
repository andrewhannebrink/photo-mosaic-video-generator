//
//  Bot
//  class for performing various twitter actions
//
var fs = require('fs');
var http = require('http');
var utf8 = require('utf8');
var Twit = require('./node_modules/twit/lib/twitter');
var exec = require('child_process').exec;
var request = require('request');


var Bot = module.exports = function(config) { 
  this.twit = new Twit(config);
  this.replies = JSON.parse(fs.readFileSync('./replies.json', 'utf8'));
  this.givePicsLock = false;
  console.log(this.replies);
};

// make childproc belong to bot to avoid memory leak
Bot.prototype.childProc;
//locks childProc for downloading photos and remojiing them so i can always use downloaded.png as a file name

Bot.prototype.validateTweet = function(tweet) {
  if (tweet.entities.hasOwnProperty('media') && tweet.user.screen_name !== 'tiny_peon') {
    if (tweet.entities.media.length === 1 && tweet.entities.media[0].type === 'photo') {
      return true;
    } else {
      return false;
    }
  } else{
    return false;
  }
};

Bot.prototype.countHashTags = function(tweet) {
  if (tweet.entities.hasOwnProperty('hashtags')) {
    return tweet.entities.hashtags.length;
  } else {
    return 0;
  }
};

Bot.prototype.givePics = function(callback) {
  var thisbot = this;
  var stream = this.twit.stream('statuses/filter', { track: '@tiny_peon' });
  stream.on('tweet', function(tweet) {
    var validated = thisbot.validateTweet(tweet)
    if (thisbot.givePicsLock === true) {
      if (validated === true) {
        console.log('givePics BLOCKED HERE by givePicsLock');
      }
    } else {
      if (validated === true) {
        thisbot.givePicsLock = true;
        console.log('givePicsLock now true');
        var id = Date.now().toString() + Math.floor(Math.random()*100);
        var tempFile = 'givePic' + id;
        var opName = 'giveop' + id;
        var text = thisbot.makeText(tweet);
        thisbot.DlPic(tweet.entities.media[0].media_url, tweet, tempFile, text, opName);
        /*setTimeout(function() {
          console.log('givePicsLock now FALSE... released from givePics()');
          thisbot.givePicsLock = false;
        }, 60000);*/
      }
    }
  });
};

Bot.prototype.makeSen = function() {
  var text = randIndex(this.replies.kaomoji) + ' ' + randIndex(this.replies.sen.nv) + randIndex(this.replies.sen.art) + randIndex(this.replies.sen.adj) + randIndex(this.replies.sen.n) + '\n[' + randIndex(this.replies.tags) + ']\n[by @tiny_icon]';
  return text;
};

Bot.prototype.makeText = function(tweet) {
  var text = '@' + tweet.user.screen_name + ' ' + randIndex(this.replies.kaomoji) + ' ' + randIndex(this.replies.kaomoji) + '\n' + randIndex(this.replies.tellToGive);
  return text;
};


Bot.prototype.DlPic = function(url, tweet, tempFile, text, opName) {
  var thisbot = this;
  console.log('DOWNLOADING pic to GIVE BACK');
  console.log('  ' + url);
  console.log('  ' + tempFile);
  console.log('  ' + text);
  console.log('  ' + opName);
  var file = fs.createWriteStream('./public/'+tempFile+'.jpg');
  file.on('close', function() {
    console.log('finished downloading pic');
    thisbot.convertRemojiTweet(tweet, tempFile, text, opName);
  });
  request(url).pipe(file);
};

//function for replying to tweets with a remojified twitpic
Bot.prototype.convertRemojiTweet = function(tweet, tempFile, text, opName) {
  var thisbot = this;
  setTimeout(function() {
    thisbot.childProc = exec('convert public/'+tempFile+'.jpg public/'+tempFile+'.png', function(error, stdout, stderr) {
      /*console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);*/
      hashTagCount = thisbot.countHashTags(tweet);
      var dir;
      if (hashTagCount > 0) {
        dir = 'win/';
      } else {
        dir = 'emoji/';
      }
      thisbot.remoji(dir, 1, 10, 'public/'+tempFile+'.png', text, tweet, opName);
    });
  }, 5000);
};

Bot.prototype.picpost = function(text, pic, tweet2Reply2, callback) {
  console.log(pic);
  var png = fs.readFileSync(pic, { encoding: 'base64'});
  var thisbot = this;
  thisbot.givePicsLock = false;
  console.log('UNLOCKED givePicsLock inside of picpost()');
  thisbot.twit.post('media/upload', { media: png}, function (err, data, response) {
    var mediaIdStr = data.media_id_string;
    var paramas = { status: text, media_ids: [mediaIdStr] };
    if (tweet2Reply2 !== null) {
      paramas.in_reply_to_status_id = tweet2Reply2.id_str;
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

Bot.prototype.remoji = function (dir, scale, reso, inputPath, text, tweet2Reply2, opName) {
  var thisbot = this;
  var opPath = 'public/' + opName + '.png';
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

/*Bot.prototype.randRemoji = function () {
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
};*/

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
